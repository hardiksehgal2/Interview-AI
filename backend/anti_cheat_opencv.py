import cv2
import numpy as np
import time
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import base64
import asyncio

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For testing
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class OpenCVAntiCheat:
    def __init__(self):
        # These cascades come with OpenCV - no extra downloads needed
        self.face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        self.profile_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_profileface.xml')

        # Violation tracking (No eye-related violations)
        self.violations = {
            'no_face': 0,
            'multiple_faces': 0,
            'looking_away': 0,
            'too_close': 0,
            'too_far': 0
        }

        self.total_frames = 0
        self.start_time = time.time()

        # For movement detection
        self.prev_face_center = None
        self.movement_threshold = 50
        
    def analyze_face_position(self, face, frame_shape):
        """Analyze if person is looking straight or away"""
        x, y, w, h = face

        # Face center
        face_center_x = x + w // 2
        face_center_y = y + h // 2

        # Frame center
        frame_center_x = frame_shape[1] // 2
        frame_center_y = frame_shape[0] // 2

        # Calculate deviations
        horizontal_deviation = abs(face_center_x - frame_center_x)
        vertical_deviation = abs(face_center_y - frame_center_y)

        # Normalize by frame size
        h_dev_ratio = horizontal_deviation / frame_shape[1]
        v_dev_ratio = vertical_deviation / frame_shape[0]

        # Check if looking straight (face centered)
        looking_straight = h_dev_ratio < 0.2 and v_dev_ratio < 0.15

        return {
            'looking_straight': looking_straight,
            'horizontal_deviation': h_dev_ratio,
            'vertical_deviation': v_dev_ratio,
            'face_center': (face_center_x, face_center_y)
        }

    def analyze_face_size(self, face, frame_shape):
        """Determine if person is too close or too far"""
        x, y, w, h = face

        # Face area vs frame area
        face_area = w * h
        frame_area = frame_shape[0] * frame_shape[1]
        face_ratio = face_area / frame_area

        # Classification
        if face_ratio < 0.02:
            return 'too_far', face_ratio
        elif face_ratio > 0.35:
            return 'too_close', face_ratio
        else:
            return 'good_distance', face_ratio

    def check_profile_face(self, gray_frame):
        """Check if person turned to profile (side view)"""
        profiles = self.profile_cascade.detectMultiScale(gray_frame, 1.3, 5)
        return len(profiles) > 0

    def process_frame(self, frame):
        """Main processing function"""
        self.total_frames += 1
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        # Detect frontal faces
        faces = self.face_cascade.detectMultiScale(gray, 1.3, 5)

        violations_this_frame = []
        metrics = {}

        if len(faces) == 0:
            # Check for profile faces
            profile_detected = self.check_profile_face(gray)

            if profile_detected:
                violations_this_frame.append("Person turned to side profile")
                self.violations['looking_away'] += 1
                metrics['face_detected'] = True
                metrics['looking_straight'] = False
            else:
                violations_this_frame.append("No face detected")
                self.violations['no_face'] += 1
                metrics['face_detected'] = False
                metrics['looking_straight'] = False

            metrics['face_size_ratio'] = 0.0

        elif len(faces) > 1:
            # Multiple faces
            violations_this_frame.append("Multiple faces detected")
            self.violations['multiple_faces'] += 1

            # Use largest face
            largest_face = max(faces, key=lambda f: f[2] * f[3])
            faces = [largest_face]

        if len(faces) == 1:
            face = faces[0]
            x, y, w, h = face

            # Draw face rectangle
            cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)

            metrics['face_detected'] = True

            # Analyze face position (gaze direction)
            position_analysis = self.analyze_face_position(face, frame.shape)
            metrics['looking_straight'] = bool(position_analysis['looking_straight'])
            metrics['horizontal_deviation'] = float(position_analysis['horizontal_deviation'])

            if not position_analysis['looking_straight']:
                violations_this_frame.append("Not looking straight at camera")
                self.violations['looking_away'] += 1

            # Analyze face size (distance)
            distance_status, face_ratio = self.analyze_face_size(face, frame.shape)
            metrics['face_size_ratio'] = float(face_ratio)

            if distance_status == 'too_far':
                violations_this_frame.append("Sitting too far from camera")
                self.violations['too_far'] += 1
            elif distance_status == 'too_close':
                violations_this_frame.append("Sitting too close to camera")
                self.violations['too_close'] += 1

            # Track movement (excessive movement detection)
            current_center = position_analysis['face_center']
            if self.prev_face_center is not None:
                movement = np.sqrt((current_center[0] - self.prev_face_center[0]) ** 2 +
                                   (current_center[1] - self.prev_face_center[1]) ** 2)
                if movement > self.movement_threshold:
                    violations_this_frame.append("Excessive movement detected")

            self.prev_face_center = current_center

        # Calculate overall metrics
        total_violations = sum(self.violations.values())
        violation_rate = (total_violations / self.total_frames) * 100 if self.total_frames > 0 else 0
        session_duration = time.time() - self.start_time

        # Compile final metrics - ensure all values are JSON serializable
        metrics.update({
            'current_violations': violations_this_frame,
            'violation_count': int(len(violations_this_frame)),
            'total_violation_rate': float(round(violation_rate, 2)),
            'session_duration': float(round(session_duration, 1)),
            'total_frames': int(self.total_frames),
            'violations_breakdown': {k: int(v) for k, v in self.violations.items()}
        })

        # Add visual indicators to frame
        self.add_visual_feedback(frame, violations_this_frame, metrics)

        return frame, metrics

    def add_visual_feedback(self, frame, violations, metrics):
        """Add text and visual feedback to frame"""
        # Status indicator in top-right
        status_color = (0, 255, 0) if len(violations) == 0 else (0, 0, 255)
        status_text = "✓ OK" if len(violations) == 0 else f"⚠ {len(violations)} Issues"
        cv2.putText(frame, status_text, (frame.shape[1] - 150, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, status_color, 2)

        # List violations
        y_offset = 30
        for violation in violations:
            cv2.putText(frame, f"• {violation}", (10, y_offset),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 1)
            y_offset += 20

        # Session stats at bottom
        stats_text = f"Violations: {sum(self.violations.values())} | Rate: {metrics['total_violation_rate']:.1f}%"
        cv2.putText(frame, stats_text, (10, frame.shape[0] - 40),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)

        time_text = f"Time: {metrics['session_duration']:.1f}s | Frames: {metrics['total_frames']}"
        cv2.putText(frame, time_text, (10, frame.shape[0] - 20),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)


# Global detector
detector = OpenCVAntiCheat()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    cap = None

    try:
        # Try different camera indices
        camera_opened = False
        for camera_index in range(5):
            cap = cv2.VideoCapture(camera_index)
            if cap.isOpened():
                ret, test_frame = cap.read()
                if ret:
                    print(f"✅ Camera {camera_index} working")
                    camera_opened = True
                    break
                else:
                    cap.release()
            else:
                if cap:
                    cap.release()

        if not camera_opened:
            error_msg = {
                'error': 'Could not open camera. Please check camera permissions in System Preferences → Security & Privacy → Camera'
            }
            await websocket.send_text(json.dumps(error_msg))
            return

        # Set camera properties for better performance
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        cap.set(cv2.CAP_PROP_FPS, 10)

        frame_count = 0
        while True:
            ret, frame = cap.read()
            if not ret:
                print("❌ Failed to read frame")
                await asyncio.sleep(0.1)
                continue

            frame_count += 1

            # Process every frame
            try:
                processed_frame, metrics = detector.process_frame(frame)

                # Convert to base64
                _, buffer = cv2.imencode('.jpg', processed_frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
                frame_base64 = base64.b64encode(buffer).decode('utf-8')

                # Create response data
                response_data = {
                    'frame': frame_base64,
                    'metrics': metrics
                }

                # Send to frontend
                await websocket.send_text(json.dumps(response_data))

            except WebSocketDisconnect:
                print("Client disconnected - Closing connection")
                break
            except Exception as e:
                print(f"❌ Frame processing error: {e}")
                continue

            await asyncio.sleep(0.1)  # 10 FPS

    except Exception as e:
        print(f"❌ WebSocket error: {e}")
    finally:
        if cap and cap.isOpened():
            cap.release()
            print("📷 Camera released")


@app.get("/")
async def root():
    return {
        "message": "OpenCV Anti-Cheat API Running",
        "detection_methods": [
            "Face presence detection",
            "Gaze direction estimation", 
            "Distance monitoring",
            "Profile face detection",
            "Multiple person detection"
        ]
    }

@app.get("/test-camera")
async def test_camera():
    """Test if camera is accessible"""
    cap = cv2.VideoCapture(0)
    if cap.isOpened():
        ret, frame = cap.read()
        cap.release()
        return {"camera_status": "OK", "frame_captured": ret}
    return {"camera_status": "ERROR", "message": "Could not open camera"}

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting OpenCV Anti-Cheat System")
    print("📋 Detection Features:")
    print("   ✓ Face detection")
    print("   ✓ Gaze direction (basic)")
    print("   ✓ Distance monitoring")
    print("   ✓ Profile detection")
    print("   ✓ Multiple face detection")
    print("   ✓ Movement tracking")
    print("\n🔗 Connect frontend to: ws://localhost:8000/ws")
    print("🧪 Test camera: http://localhost:8000/test-camera")

    uvicorn.run(app, host="0.0.0.0", port=8000)
