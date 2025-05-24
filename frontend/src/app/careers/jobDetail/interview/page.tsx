/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-require-imports */
'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Mic, Bot, Camera, Users, TrendingUp, Wifi, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { DialogOverlay } from '@/components/ui/dialog';

// Interview-related interfaces
interface Message {
    type: 'ai' | 'user' | 'system';
    content: string;
}

// Camera monitoring interfaces
interface Metrics {
    face_detected: boolean;
    looking_straight: boolean;
    face_size_ratio: number;
    horizontal_deviation: number;
    current_violations: string[];
    violation_count: number;
    total_violation_rate: number;
    session_duration: number;
    total_frames: number;
    violations_breakdown: {
        no_face: number;
        multiple_faces: number;
        looking_away: number;
        too_close: number;
        too_far: number;
    };
}

interface CameraWebSocketData {
    frame?: string;
    metrics?: Metrics;
    error?: string;
}

/**
 * Animated microphone / speaker indicator
 */
function MicIndicator({
    isRecording,
    isAISpeaking
}: {
    isRecording: boolean;
    isAISpeaking: boolean;
}) {
    if (!isRecording && !isAISpeaking) return null;

    const icon = isRecording ? (
        <Mic className="w-4 h-4 text-white" />
    ) : (
        <Bot className="w-4 h-4 text-white" />
    );

    const bgColor = isRecording ? 'bg-red-500' : 'bg-blue-600';

    return (
        <motion.div
            initial={{ scale: 1 }}
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
            className={`flex items-center justify-center ${bgColor} rounded-full p-3 shadow-lg`}
        >
            {icon}
        </motion.div>
    );
}

function InterviewContent() {
    const { useSearchParams } = require('next/navigation');

    const router = useRouter();
    const searchParams = useSearchParams();
    const interviewId = searchParams.get('id');

    // INTERVIEW STATE VARIABLES
    const [messages, setMessages] = useState<Message[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [isAISpeaking, setIsAISpeaking] = useState(false);
    const [statusMessage, setStatusMessage] = useState('Initializing...');
    const [audioQueue, setAudioQueue] = useState<string[]>([]);
    const [currentAudioIndex, setCurrentAudioIndex] = useState(0);
    const [isPlayingQueue, setIsPlayingQueue] = useState(false);

    // CAMERA MONITORING STATE VARIABLES
    const [cameraConnected, setCameraConnected] = useState(false);
    const [cameraConnectionError, setCameraConnectionError] = useState<string>('');
    const [metrics, setMetrics] = useState<Metrics | null>(null);
    const [frame, setFrame] = useState<string>('');
    const [cameraConnecting, setCameraConnecting] = useState(false);
    const [tabChanges, setTabChanges] = useState(0);
    const [showWarning, setShowWarning] = useState(false);
    const [warningMessage, setWarningMessage] = useState('');
    const [warningTitle, setWarningTitle] = useState('');
    const [warningType, setWarningType] = useState<'warning' | 'danger' | 'final'>('warning');
    const [monitoringStarted, setMonitoringStarted] = useState(false);

    // INTERVIEW REFERENCES
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    const interviewWebsocketRef = useRef<WebSocket | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const currentAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);

    // CAMERA MONITORING REFERENCES
    const cameraWsRef = useRef<WebSocket | null>(null);
    const cameraReconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isTabHiddenRef = useRef(false);
    const isWindowFocusedRef = useRef(true);

    // Add this with other state variables
    const [showInterviewComplete, setShowInterviewComplete] = useState(false);
    // Add this function with other helper functions
    const copyInterviewId = async () => {
        try {
            await navigator.clipboard.writeText(interviewId || '');
            toast.success('Interview ID copied to clipboard!');
        } catch (error) {
            console.error('Failed to copy:', error);
            toast.error('Failed to copy Interview ID');
        }
    };

    const handleViewResults = () => {
        router.push('/results');
    };

    // Initialize both systems on component mount
    useEffect(() => {
        if (!interviewId) {
            addSystemMessage('No interview ID found. Please go back and enter your interview ID.');
            return;
        }

        // Start both systems
        requestMicrophonePermission();
        startCameraMonitoring();

        // Clean up on component unmount
        return () => {
            // Interview cleanup
            if (interviewWebsocketRef.current) {
                interviewWebsocketRef.current.close();
            }
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
            }
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop());
            }
            if (currentAudioSourceRef.current) {
                currentAudioSourceRef.current.stop();
                currentAudioSourceRef.current = null;
            }
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }

            // Camera cleanup
            if (cameraWsRef.current) {
                cameraWsRef.current.close();
            }
            if (cameraReconnectTimeoutRef.current) {
                clearTimeout(cameraReconnectTimeoutRef.current);
            }
        };
    }, [interviewId]);

    //   Tab/Window monitoring for camera system
    useEffect(() => {
        if (monitoringStarted) {
            let switchTimeout: NodeJS.Timeout | null = null;
            let hasSwitched = false;

            const incrementTabChanges = () => {
                if (hasSwitched) return;

                hasSwitched = true;

                if (switchTimeout) clearTimeout(switchTimeout);
                switchTimeout = setTimeout(() => {
                    hasSwitched = false;
                }, 100);

                setTabChanges((prev) => {
                    const newTabChanges = prev + 1;

                    if (newTabChanges === 1) {
                        setWarningType('warning');
                        setWarningTitle('First Warning');
                        setWarningMessage('You have switched tabs/windows once. Please stay focused on the interview. This is your first warning.');
                        setShowWarning(true);
                    } else if (newTabChanges === 2) {
                        setWarningType('warning');
                        setWarningTitle('Second Warning');
                        setWarningMessage('You have switched tabs/windows twice. Please stay focused on the interview. This is your second warning.');
                        setShowWarning(true);
                    } else if (newTabChanges === 3) {
                        setWarningType('danger');
                        setWarningTitle('Third Warning - Final Warning');
                        setWarningMessage('You have switched tabs/windows three times. This is your final warning. One more tab/window switch will end your interview.');
                        setShowWarning(true);
                    } else if (newTabChanges >= 4) {
                        setWarningType('final');
                        setWarningTitle('Interview Terminated');
                        setWarningMessage('You have switched tabs/windows four times. Your interview has been terminated. You will be redirected in 5 seconds.');
                        setShowWarning(true);
                        setTimeout(() => {
                            disconnectCameraWebSocket();
                            window.location.href = '/careers';
                        }, 5000);
                    }
                    return newTabChanges;
                });
            };

            const handleTabChange = () => {
                if (document.hidden && !isTabHiddenRef.current) {
                    isTabHiddenRef.current = true;
                    incrementTabChanges();
                } else if (!document.hidden) {
                    isTabHiddenRef.current = false;
                }
            };

            const handleWindowFocus = () => {
                if (!isWindowFocusedRef.current) {
                    isWindowFocusedRef.current = true;
                }
            };

            const handleWindowBlur = () => {
                if (isWindowFocusedRef.current && !document.hidden) {
                    isWindowFocusedRef.current = false;
                    incrementTabChanges();
                }
                if (isWindowFocusedRef.current) {
                    isWindowFocusedRef.current = false;
                }
            };

            document.addEventListener('visibilitychange', handleTabChange);
            window.addEventListener('focus', handleWindowFocus);
            window.addEventListener('blur', handleWindowBlur);

            return () => {
                document.removeEventListener('visibilitychange', handleTabChange);
                window.removeEventListener('focus', handleWindowFocus);
                window.removeEventListener('blur', handleWindowBlur);
                if (switchTimeout) {
                    clearTimeout(switchTimeout);
                }
            };
        }
    }, [monitoringStarted]);

    // Scroll to bottom of chat when messages update
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]);

    // CAMERA MONITORING FUNCTIONS
    const startCameraMonitoring = () => {
        setMonitoringStarted(true);
        connectCameraWebSocket();
    };

    const connectCameraWebSocket = () => {
        if (cameraConnecting) return;

        setCameraConnecting(true);
        setCameraConnectionError('');

        try {
            cameraWsRef.current = new WebSocket('ws://localhost:8000/ws');

            cameraWsRef.current.onopen = () => {
                setCameraConnected(true);
                setCameraConnecting(false);
                setCameraConnectionError('');
                console.log('✅ Connected to camera monitoring server');
            };

            cameraWsRef.current.onmessage = (event) => {
                try {
                    const data: CameraWebSocketData = JSON.parse(event.data);

                    if (data.error) {
                        setCameraConnectionError(data.error);
                        return;
                    }

                    if (data.frame) {
                        setFrame(`data:image/jpeg;base64,${data.frame}`);
                    }

                    if (data.metrics) {
                        setMetrics(data.metrics);
                    }
                } catch (error) {
                    console.error('Error parsing camera WebSocket data:', error);
                }
            };

            cameraWsRef.current.onclose = (event) => {
                setCameraConnected(false);
                setCameraConnecting(false);

                if (event.code !== 1000) {
                    setCameraConnectionError('Camera connection lost. Attempting to reconnect...');
                    cameraReconnectTimeoutRef.current = setTimeout(connectCameraWebSocket, 3000);
                }
            };

            cameraWsRef.current.onerror = (error) => {
                console.error('Camera WebSocket error:', error);
                setCameraConnected(false);
                setCameraConnecting(false);
                setCameraConnectionError('Failed to connect to camera server.');
            };
        } catch (error) {
            console.error('Error creating camera WebSocket:', error);
            setCameraConnecting(false);
            setCameraConnectionError('Camera connection error.');
        }
    };

    const disconnectCameraWebSocket = () => {
        if (cameraWsRef.current) {
            cameraWsRef.current.close();
            setCameraConnected(false);
        }
    };

    // INTERVIEW FUNCTIONS
    const initAudioContext = () => {
        try {
            if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            }
            return true;
        } catch (error) {
            console.error('Audio context initialization failed:', error);
            addSystemMessage('Failed to initialize audio playback. Please check your browser settings.');
            return false;
        }
    };

    const requestMicrophonePermission = () => {
        setStatusMessage('Requesting microphone access...');

        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    sampleRate: 16000,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            })
                .then((stream) => {
                    streamRef.current = stream;
                    setStatusMessage('Microphone access granted.');
                    setupAudioRecording(stream);
                    connectInterviewWebSocket();
                })
                .catch((error) => {
                    console.error('Microphone permission denied:', error);
                    addSystemMessage('Microphone access denied. Please allow microphone access to start the interview.');
                    setStatusMessage('Microphone access denied.');
                });
        } else {
            addSystemMessage('Your browser does not support microphone access. Please use a modern browser.');
            setStatusMessage('Microphone access not supported by browser.');
        }
    };

    const setupAudioRecording = (stream: MediaStream) => {
        try {
            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : 'audio/webm';

            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: mimeType,
                audioBitsPerSecond: 128000
            });

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
                audioChunksRef.current = [];

                if (interviewWebsocketRef.current && interviewWebsocketRef.current.readyState === WebSocket.OPEN) {
                    try {
                        const arrayBuffer = await audioBlob.arrayBuffer();
                        const uint8Array = new Uint8Array(arrayBuffer);

                        interviewWebsocketRef.current.send(uint8Array);
                        addUserMessage('[Audio message sent]');
                        setStatusMessage('Audio sent. Waiting for AI...');
                    } catch (error) {
                        console.error('Error sending audio:', error);
                        addSystemMessage('Error sending audio. Please try again.');
                        setStatusMessage('Error sending audio.');
                    }
                } else {
                    addSystemMessage('Connection lost. Your audio was not sent.');
                    setStatusMessage('Connection error. Please refresh.');
                }
            };

            mediaRecorderRef.current = mediaRecorder;
            return true;
        } catch (error) {
            console.error('Error setting up audio recording:', error);
            addSystemMessage('Failed to setup audio recording. Please check your browser compatibility.');
            return false;
        }
    };

    let reconnectAttempts = 0;
    const maxReconnectAttempts = 3;

    const connectInterviewWebSocket = () => {
        if (!interviewId) {
            addSystemMessage('No interview ID found. Please go back and enter your interview ID.');
            return;
        }

        if (interviewWebsocketRef.current) {
            interviewWebsocketRef.current.onopen = null;
            interviewWebsocketRef.current.onmessage = null;
            interviewWebsocketRef.current.onclose = null;
            interviewWebsocketRef.current.onerror = null;
            interviewWebsocketRef.current.close();
        }

        const backendProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const backendHost = 'localhost:8000';
        const wsUrl = `${backendProtocol}//${backendHost}/ws/interview/${interviewId}/`;

        console.log('Connecting to Interview WebSocket URL:', wsUrl);

        const socket = new WebSocket(wsUrl);
        interviewWebsocketRef.current = socket;
        setStatusMessage('Connecting to interview session...');

        socket.onopen = () => {
            console.log('Interview WebSocket connection established');
            setIsConnected(true);
            addSystemMessage('Interview session connected. The AI interviewer will start with the first question.');
            setStatusMessage('Connected. Waiting for AI question.');
        };

        socket.onmessage = (event) => {
            if (typeof event.data === 'string') {
                handleTextMessage(event.data);
            } else {
                console.error('Received non-text message:', event.data);
            }
        };

        socket.onclose = (event) => {
            if (event.code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
                reconnectAttempts++;
                setTimeout(() => connectInterviewWebSocket(), 2000);
            }

            console.log('Interview WebSocket connection closed:', event.code, event.reason);
            setIsConnected(false);

            const closeMessage = event.code !== 1000 ?
                `Interview session disconnected (Code: ${event.code}). Please refresh the page to try again.` :
                'Interview session ended.';

            addSystemMessage(closeMessage);
            setShowInterviewComplete(true);

            if (isRecording) {
                stopRecording();
            }

            setStatusMessage('Disconnected. Please refresh the page.');
        };

        socket.onerror = (error) => {
            console.error('Interview WebSocket error:', error);
            addSystemMessage('Error with the interview connection. Please try refreshing the page.');
            setIsConnected(false);

            if (isRecording) {
                stopRecording();
            }

            setStatusMessage('Connection error. Please refresh.');
        };
    };

    const handleTextMessage = (message: string) => {
        console.log('Received text message:', message);

        if (message.startsWith('AI_QUESTION_TEXT:')) {
            const questionText = message.substring('AI_QUESTION_TEXT:'.length);
            addAIMessage(questionText);
        } else if (message.startsWith('AI_AUDIO_ARRAY:')) {
            const audioArrayData = message.substring('AI_AUDIO_ARRAY:'.length);
            try {
                const parsedAudioData = JSON.parse(audioArrayData);
                if (parsedAudioData.type === 'audio_array' && parsedAudioData.audios) {
                    handleAudioArray(parsedAudioData.audios);
                }
            } catch (error) {
                console.error('Error parsing audio array:', error);
                addSystemMessage('Error processing audio data from server.');
            }
        } else if (message.startsWith('ERROR:')) {
            const errorText = message.substring('ERROR:'.length);
            addSystemMessage(`Server Error: ${errorText}`);
            setStatusMessage(`Server error occurred.`);
        } else {
            addSystemMessage(message);
        }
    };

    const handleAudioArray = (audioBase64Array: string[]) => {
        if (!audioBase64Array || audioBase64Array.length === 0) {
            addSystemMessage("No audio data received from server.");
            return;
        }

        console.log(`Received ${audioBase64Array.length} audio segments`);

        if (!initAudioContext()) {
            addSystemMessage("Cannot play AI response: Audio context not available. Please read the question.");
            setStatusMessage("Audio playback error. Read question above.");
            return;
        }

        setAudioQueue(audioBase64Array);
        setCurrentAudioIndex(0);
        playAudioQueue(audioBase64Array, 0);
    };

    const playAudioQueue = async (audioArray: string[], startIndex: number = 0) => {
        if (!audioContextRef.current || audioArray.length === 0 || startIndex >= audioArray.length) {
            setIsPlayingQueue(false);
            setIsAISpeaking(false);
            setStatusMessage('AI finished. Click "Start Recording" to respond.');
            return;
        }

        if (audioContextRef.current.state === 'suspended') {
            await audioContextRef.current.resume();
        }

        setIsPlayingQueue(true);
        setIsAISpeaking(true);
        setStatusMessage(`AI is speaking... (${startIndex + 1}/${audioArray.length})`);

        if (isRecording) {
            stopRecording();
            addSystemMessage('Your recording was stopped as the AI started speaking.');
        }

        try {
            const audioBase64 = audioArray[startIndex];

            const binaryString = atob(audioBase64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            const arrayBuffer = bytes.buffer;

            if (audioContextRef.current.state === 'suspended') {
                await audioContextRef.current.resume();
            }

            const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
            const source = audioContextRef.current.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContextRef.current.destination);

            currentAudioSourceRef.current = source;

            source.onended = () => {
                currentAudioSourceRef.current = null;
                setCurrentAudioIndex(startIndex + 1);

                if (startIndex + 1 < audioArray.length) {
                    setTimeout(() => {
                        playAudioQueue(audioArray, startIndex + 1);
                    }, 100);
                } else {
                    setIsPlayingQueue(false);
                    setIsAISpeaking(false);
                    setAudioQueue([]);
                    setCurrentAudioIndex(0);
                    setStatusMessage('AI finished. Click "Start Recording" to respond.');
                }
            };

            source.start(0);

        } catch (error) {
            console.error(`Error playing audio segment ${startIndex + 1}:`, error);
            addSystemMessage(`Error playing AI audio segment ${startIndex + 1}: ${error instanceof Error ? error.message : 'Unknown error'}. You can read the question above.`);

            if (startIndex + 1 < audioArray.length) {
                setTimeout(() => {
                    playAudioQueue(audioArray, startIndex + 1);
                }, 500);
            } else {
                setIsPlayingQueue(false);
                setIsAISpeaking(false);
                setAudioQueue([]);
                setCurrentAudioIndex(0);
                setStatusMessage('Error playing audio. Click "Start Recording" to respond.');
            }
        }
    };

    const startRecording = () => {
        if (!mediaRecorderRef.current) {
            addSystemMessage('Audio recording not initialized. Please refresh the page.');
            return;
        }

        if (isAISpeaking || isPlayingQueue) {
            addSystemMessage("Please wait for the AI to finish speaking before recording.");
            setStatusMessage("AI is speaking. Please wait...");
            return;
        }

        if (!interviewWebsocketRef.current || interviewWebsocketRef.current.readyState !== WebSocket.OPEN) {
            addSystemMessage("Not connected to the server. Cannot start recording.");
            setStatusMessage("Connection error. Please refresh.");
            return;
        }

        try {
            audioChunksRef.current = [];
            mediaRecorderRef.current.start();
            setIsRecording(true);
            setStatusMessage('Recording... Click "Stop & Send" when finished.');
        } catch (error) {
            console.error('Error starting recording:', error);
            addSystemMessage('Error starting recording. Please try again.');
            setStatusMessage('Recording error.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            setStatusMessage('Processing audio...');
        }
    };

    const toggleRecording = () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    const addSystemMessage = (content: string) => {
        setMessages(prev => [...prev, { type: 'system', content }]);
    };

    const addUserMessage = (content: string) => {
        setMessages(prev => [...prev, { type: 'user', content }]);
    };

    const addAIMessage = (content: string) => {
        setMessages(prev => [...prev, { type: 'ai', content }]);
    };

    const handleBackClick = () => {
        if (interviewWebsocketRef.current) {
            interviewWebsocketRef.current.close();
        }
        if (cameraWsRef.current) {
            cameraWsRef.current.close();
        }
        router.push('/careers');
    };

    // Helper functions for camera monitoring UI
    const getStatusColor = (isGood: boolean) => {
        return isGood ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200';
    };

    const getViolationLevel = (rate: number) => {
        if (rate < 5) return { level: 'Excellent', color: 'text-green-600', bgColor: 'bg-green-50' };
        if (rate < 15) return { level: 'Good', color: 'text-yellow-600', bgColor: 'bg-yellow-50' };
        if (rate < 30) return { level: 'Concerning', color: 'text-orange-600', bgColor: 'bg-orange-50' };
        if (rate < 40) return { level: 'High Risk', color: 'text-red-600', bgColor: 'bg-red-50' };
        if (rate < 50) return { level: 'Critical', color: 'text-red-700', bgColor: 'bg-red-100' };
        if (rate < 60) return { level: 'Severe', color: 'text-red-800', bgColor: 'bg-red-200' };
        return { level: 'Unethical', color: 'text-red-900', bgColor: 'bg-red-300' };
    };

    const getFaceDistanceStatus = (ratio: number) => {
        if (ratio === 0) return { status: 'No face', color: 'text-gray-500' };
        if (ratio < 0.02) return { status: 'Too far', color: 'text-red-500' };
        if (ratio > 0.35) return { status: 'Too close', color: 'text-red-500' };
        return { status: 'Good distance', color: 'text-green-500' };
    };

    const getDialogStyles = (type: 'warning' | 'danger' | 'final') => {
        switch (type) {
            case 'warning':
                return {
                    headerBg: 'bg-yellow-50 border-yellow-200',
                    iconColor: 'text-yellow-600',
                    titleColor: 'text-yellow-800',
                    descColor: 'text-yellow-700',
                    buttonBg: 'bg-yellow-600 hover:bg-yellow-700',
                };
            case 'danger':
                return {
                    headerBg: 'bg-orange-50 border-orange-200',
                    iconColor: 'text-orange-600',
                    titleColor: 'text-orange-800',
                    descColor: 'text-orange-700',
                    buttonBg: 'bg-orange-600 hover:bg-orange-700',
                };
            case 'final':
                return {
                    headerBg: 'bg-red-50 border-red-200',
                    iconColor: 'text-red-600',
                    titleColor: 'text-red-800',
                    descColor: 'text-red-700',
                    buttonBg: 'bg-red-600 hover:bg-red-700',
                };
        }
    };

    const dialogStyles = getDialogStyles(warningType);
    const distanceStatus = metrics ? getFaceDistanceStatus(metrics.face_size_ratio) : { status: 'No data', color: 'text-gray-500' };
    const violationLevel = metrics ? getViolationLevel(metrics.total_violation_rate) : { level: 'No data', color: 'text-gray-500', bgColor: 'bg-gray-50' };

    return (
        <div className="flex flex-col h-screen bg-gray-50">
            <Toaster
                position="top-right"
                reverseOrder={false}
            />
            {/* Header */}
            <header className="bg-white border-b border-gray-200 px-4 py-2 flex justify-between items-center">
                <div className="flex items-center">
                    <button
                        onClick={handleBackClick}
                        className="mr-4 text-gray-600 hover:text-gray-900"
                    >
                        <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </button>
                    <h1 className="text-xl font-semibold">AI Interview Session</h1>
                </div>
                <div className="flex items-center space-x-4">
                    <div
                        className={`px-3 py-1 rounded-full text-sm ${isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}
                    >
                        {isConnected ? 'Connected' : 'Disconnected'}
                    </div>
                    <div
                        className={`px-3 py-1 rounded-full text-sm ${cameraConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}
                    >
                        {cameraConnected ? 'Camera Connected' : 'Camera Disconnected'}
                    </div>
                    {interviewId && <div className="text-sm text-gray-600">ID: {interviewId}</div>}
                </div>
            </header>

            {/* Main Content Area */}
            <div className="flex-1 flex bg-white">
                {/* Left Side - Chat Area */}
                <div className="flex-1 flex flex-col">
                    {/* Tab Change Warning */}
                    {monitoringStarted && (
                        <div className="bg-indigo-50 border-b border-indigo-200 p-2">
                            <p className="text-xs text-indigo-800">
                                Tab/Window switches: {tabChanges}/4 (Monitoring active)
                            </p>
                        </div>
                    )}

                    {/* Chat Messages */}
                    <div ref={chatContainerRef} className="flex-1 p-4 overflow-y-auto">
                        {messages
                            .filter((m) => m.type === 'ai')
                            .map((message, index) => (
                                <div
                                    key={index}
                                    className="mb-4 p-3 rounded-lg max-w-3xl bg-gray-100 text-gray-900"
                                >
                                    <div className="font-semibold mb-1">AI Interviewer:</div>
                                    <div>{message.content}</div>
                                </div>
                            ))}
                    </div>

                    {/* Recording Controls */}
                    <div className="bg-gray-50 border-t border-gray-200 p-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="text-sm font-medium text-gray-700 flex-1">
                                {statusMessage}
                            </div>
                            <MicIndicator isRecording={isRecording} isAISpeaking={isAISpeaking} />
                        </div>

                        <div className="flex justify-center">
                            <button
                                onClick={toggleRecording}
                                disabled={!isConnected || isAISpeaking}
                                className={`px-6 py-3 rounded-lg font-medium transition-all shadow-lg ${isRecording
                                    ? 'bg-red-600 hover:bg-red-700 text-white'
                                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                                    } ${!isConnected || isAISpeaking ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {isRecording ? 'Stop Recording & Send' : 'Start Recording'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Side - Camera Monitoring */}
                <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
                    {/* Session Info */}
                    <div className="bg-gray-50 border-b border-gray-200 p-3">
                        <div className="flex items-center justify-between text-sm text-gray-600">
                            <div>Session: {metrics?.session_duration || 0}s</div>
                            <div>Frames: {metrics?.total_frames || 0}</div>
                        </div>
                    </div>

                    {/* Camera Feed */}
                    <div className="p-4 border-b border-gray-200">
                        <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
                            <Camera className="mr-2 h-4 w-4" />
                            Live Camera Feed
                        </h3>
                        <div className="relative">
                            {frame ? (
                                <div className="relative">
                                    <img
                                        src={frame}
                                        alt="Camera feed"
                                        className="w-full h-auto rounded-lg border-2 border-gray-200"
                                    />

                                    {/* Live indicator */}
                                    <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs flex items-center">
                                        <div className="w-2 h-2 bg-white rounded-full mr-1 animate-pulse"></div>
                                        LIVE
                                    </div>

                                    {/* Violation indicator */}
                                    {metrics && metrics.violation_count > 0 && (
                                        <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-lg flex items-center text-xs">
                                            <AlertTriangle className="mr-1 h-3 w-3" />
                                            {metrics.violation_count}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="w-full h-32 bg-gray-200 rounded-lg flex items-center justify-center">
                                    <div className="text-center">
                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-500 mx-auto mb-2"></div>
                                        <p className="text-gray-500 text-xs">Loading camera feed...</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Detection Status */}
                    <div className="p-4 border-b border-gray-200">
                        <h3 className="text-sm font-semibold text-gray-800 mb-3">Detection Status</h3>
                        <div className="space-y-2">
                            <div className={`p-2 rounded-lg border min-h-[70px] h-full text-xs ${getStatusColor(metrics?.face_detected || false)}`}>
                                <div className="flex items-center  justify-between">
                                    <span className="font-medium">Face Detected</span>
                                    <Users className="h-3 w-3" />
                                </div>
                                <span>{metrics?.face_detected ? 'Yes' : 'No'}</span>
                            </div>

                            <div className={`p-2 rounded-lg border min-h-[70px] h-full text-xs ${getStatusColor(metrics?.looking_straight || false)}`}>
                                <div className="flex items-center  justify-between">
                                    <span className="font-medium">Looking Straight</span>
                                    <Camera className="h-3 w-3" />
                                </div>
                                <span>
                                    {metrics?.looking_straight ? 'Yes' : 'No'}
                                    {metrics?.horizontal_deviation && (
                                        <div className="text-xs text-gray-500">
                                            Deviation: {(metrics.horizontal_deviation * 100).toFixed(1)}%
                                        </div>
                                    )}
                                </span>
                            </div>

                            <div className={`p-2 rounded-lg border min-h-[70px] h-full text-xs ${distanceStatus.status === 'Good distance' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-yellow-100 text-yellow-800 border-yellow-200'}`}>
                                <div className="flex items-center  justify-between">
                                    <span className="font-medium">Distance</span>
                                    <Camera className="h-3 w-3" />
                                </div>
                                <span className={distanceStatus.color}>
                                    {distanceStatus.status}
                                </span>
                                {metrics?.face_size_ratio && metrics.face_size_ratio > 0 && (
                                    <div className="text-xs text-gray-500">
                                        Ratio: {(metrics.face_size_ratio * 100).toFixed(1)}%
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Violation Analysis */}
                    <div className="p-4">
                        <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
                            <TrendingUp className="mr-2 h-4 w-4" />
                            Violation Analysis
                        </h3>
                        <div className={`text-center p-3 rounded-lg ${violationLevel.bgColor}`}>
                            <div className="text-2xl font-bold mb-1 text-gray-800">
                                {metrics?.total_violation_rate?.toFixed(1) || 0}%
                            </div>
                            <div className={`text-xs font-medium ${violationLevel.color}`}>
                                {violationLevel.level}
                            </div>
                        </div>

                        {/* Violation Breakdown */}
                        {metrics?.violations_breakdown && (
                            <div className="mt-3 space-y-1">
                                <h4 className="font-medium text-gray-700 text-xs">Breakdown:</h4>
                                {Object.entries(metrics.violations_breakdown).map(([key, value]) => (
                                    value > 0 && (
                                        <div key={key} className="flex justify-between text-xs">
                                            <span className="capitalize">{key.replace('_', ' ')}:</span>
                                            <span className="font-medium">{value}</span>
                                        </div>
                                    )
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Warning Dialog */}
            <Dialog open={showWarning} onOpenChange={() => warningType !== 'final' && setShowWarning(false)}>
                <DialogOverlay className="bg-black/60" />
                <DialogContent className="max-w-md">
                    <DialogHeader className={`${dialogStyles.headerBg} -m-6 mb-4 p-6 border-b rounded-t-lg`}>
                        <div className="flex items-center space-x-3">
                            <div className={`p-2 rounded-full bg-white/80 ${dialogStyles.iconColor}`}>
                                <AlertTriangle className="h-6 w-6" />
                            </div>
                            <div>
                                <DialogTitle className={`text-lg font-semibold ${dialogStyles.titleColor}`}>
                                    {warningTitle}
                                </DialogTitle>
                            </div>
                        </div>
                    </DialogHeader>
                    <div className="py-4">
                        <DialogDescription className={`text-base leading-relaxed ${dialogStyles.descColor}`}>
                            {warningMessage}
                        </DialogDescription>
                    </div>
                    {warningType !== 'final' && (
                        <DialogFooter>
                            <button
                                onClick={() => setShowWarning(false)}
                                className={`${dialogStyles.buttonBg} text-white px-6 py-2 rounded-lg font-medium transition-colors`}
                            >
                                I Understand
                            </button>
                        </DialogFooter>
                    )}
                </DialogContent>
            </Dialog>
            {/* Interview Complete Dialog */}
            <Dialog open={showInterviewComplete} onOpenChange={() => { }}>
                <DialogOverlay className="bg-black/60" />
                <DialogContent className="max-w-md">
                    <DialogHeader className="bg-green-50 border-green-200 -m-6 mb-4 p-6 border-b rounded-t-lg">
                        <div className="flex items-center space-x-3">
                            <div className="p-2 rounded-full bg-white/80 text-green-600">
                                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <DialogTitle className="text-lg font-semibold text-green-800">
                                    Interview Completed!
                                </DialogTitle>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="py-4 space-y-4">
                        <DialogDescription className="text-base leading-relaxed text-green-700">
                            Your interview has been successfully completed. To check your results, copy your Interview ID and click the results button below.
                        </DialogDescription>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <label className="text-sm font-medium text-blue-800 block mb-2">Your Interview ID:</label>
                            <div className="flex items-center space-x-2">
                                <div className="flex-1 bg-white border border-blue-300 rounded px-3 py-2 text-sm font-mono">
                                    {interviewId}
                                </div>
                                <button
                                    onClick={copyInterviewId}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
                                >
                                    Copy
                                </button>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="space-x-3">
                        <button
                            onClick={handleViewResults}
                            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors w-full"
                        >
                            View Results
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default function InterviewPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-screen">Loading...</div>}>
            <InterviewContent />
        </Suspense>
    );
}