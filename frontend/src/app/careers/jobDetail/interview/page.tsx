/* eslint-disable @typescript-eslint/no-require-imports */
'use client';
// frontend/src/app/careers/jobDetail/interview/page.tsx
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */



import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Mic, Bot } from 'lucide-react';

interface Message {
  type: 'ai' | 'user' | 'system';
  content: string;
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

  // State variables
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Initializing...');
  const [audioQueue, setAudioQueue] = useState<string[]>([]);
  const [currentAudioIndex, setCurrentAudioIndex] = useState(0);
  const [isPlayingQueue, setIsPlayingQueue] = useState(false);
  const currentAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Audio recording references
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // References
  const websocketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Initialize WebSocket and audio recording on component mount
  useEffect(() => {
    if (!interviewId) {
      addSystemMessage('No interview ID found. Please go back and enter your interview ID.');
      return;
    }

    // Request microphone permission
    requestMicrophonePermission();

    // Clean up on component unmount
    return () => {
      if (websocketRef.current) {
        websocketRef.current.close();
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
    };
  }, [interviewId]);

  // Scroll to bottom of chat when messages update
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

    // Initialize audio context
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

    // Request microphone permission
    const requestMicrophonePermission = () => {
        setStatusMessage('Requesting microphone access...');

        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            // Request audio with optimal settings for speech recognition
            navigator.mediaDevices.getUserMedia({ 
                audio: {
                    channelCount: 1, // Mono audio as Groq downsamples to mono
                    sampleRate: 16000, // 16kHz as per Groq's preprocessing
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                } 
            })
                .then((stream) => {
                    streamRef.current = stream;
                    setStatusMessage('Microphone access granted.');
                    setupAudioRecording(stream);
                    connectWebSocket();
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

    // Setup audio recording
    const setupAudioRecording = (stream: MediaStream) => {
        try {
            // Use webm/opus for efficiency and compatibility
            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
                ? 'audio/webm;codecs=opus' 
                : 'audio/webm';

            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: mimeType,
                audioBitsPerSecond: 128000 // 128kbps for good quality
            });

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                // Combine all chunks into a single blob
                const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
                audioChunksRef.current = [];

                // Convert blob to array buffer and send via WebSocket
                if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
                    try {
                        const arrayBuffer = await audioBlob.arrayBuffer();
                        const uint8Array = new Uint8Array(arrayBuffer);
                        
                        // Send audio as binary data
                        websocketRef.current.send(uint8Array);
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

    // Connect to WebSocket
    const connectWebSocket = () => {
        if (!interviewId) {
            addSystemMessage('No interview ID found. Please go back and enter your interview ID.');
            return;
        }

        if (websocketRef.current) {
            websocketRef.current.onopen = null;
            websocketRef.current.onmessage = null;
            websocketRef.current.onclose = null;
            websocketRef.current.onerror = null;
            websocketRef.current.close();
        }

        // Use secure WebSocket if page is served over HTTPS
        const backendProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const backendHost = 'localhost:8000';
        const wsUrl = `${backendProtocol}//${backendHost}/ws/interview/${interviewId}/`;

        console.log('Connecting to WebSocket URL:', wsUrl);

        const socket = new WebSocket(wsUrl);
        websocketRef.current = socket;
        setStatusMessage('Connecting to interview session...');

        socket.onopen = () => {
            console.log('WebSocket connection established');
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
                setTimeout(() => connectWebSocket(), 2000);
            }

            console.log('WebSocket connection closed:', event.code, event.reason);
            setIsConnected(false);

            const closeMessage = event.code !== 1000 ?
                `Interview session disconnected (Code: ${event.code}). Please refresh the page to try again.` :
                'Interview session ended.';

            addSystemMessage(closeMessage);

            if (isRecording) {
                stopRecording();
            }

            setStatusMessage('Disconnected. Please refresh the page.');
        };

        socket.onerror = (error) => {
            console.error('WebSocket error:', error);
            addSystemMessage('Error with the interview connection. Please try refreshing the page.');
            setIsConnected(false);

            if (isRecording) {
                stopRecording();
            }

            setStatusMessage('Connection error. Please refresh.');
        };
    };

    // Handle text messages from server
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

    // Handle audio array
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

        // Set the audio queue and start playing
        setAudioQueue(audioBase64Array);
        setCurrentAudioIndex(0);
        playAudioQueue(audioBase64Array, 0);
    };

    // Play audio queue sequentially
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

        // Stop recording if it's active
        if (isRecording) {
            stopRecording();
            addSystemMessage('Your recording was stopped as the AI started speaking.');
        }

        try {
            const audioBase64 = audioArray[startIndex];
            
            // Convert base64 to binary
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

            // Store reference to current audio source for potential stopping
            currentAudioSourceRef.current = source;

            source.onended = () => {
                currentAudioSourceRef.current = null;
                setCurrentAudioIndex(startIndex + 1);
                
                // Play next audio in queue
                if (startIndex + 1 < audioArray.length) {
                    // Small delay between audio segments for smoother transition
                    setTimeout(() => {
                        playAudioQueue(audioArray, startIndex + 1);
                    }, 100);
                } else {
                    // All audio segments completed
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
            
            // Try to continue with next segment
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

    // Start recording
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

        if (!websocketRef.current || websocketRef.current.readyState !== WebSocket.OPEN) {
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

    // Stop recording
    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            setStatusMessage('Processing audio...');
        }
    };

    // Toggle recording
    const toggleRecording = () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    // Add messages to chat
    const addSystemMessage = (content: string) => {
        setMessages(prev => [...prev, { type: 'system', content }]);
    };

    const addUserMessage = (content: string) => {
        setMessages(prev => [...prev, { type: 'user', content }]);
    };

    const addAIMessage = (content: string) => {
        setMessages(prev => [...prev, { type: 'ai', content }]);
    };

    // Go back to careers page
    const handleBackClick = () => {
        if (websocketRef.current) {
            websocketRef.current.close();
        }
        router.push('/careers');
    };

    return (
        <div className="flex flex-col h-screen bg-gray-50">
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
                className={`px-3 py-1 rounded-full text-sm ${
                  isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}
              >
                {isConnected ? 'Connected' : 'Disconnected'}
              </div>
              {interviewId && <div className="text-sm text-gray-600">ID: {interviewId}</div>}
            </div>
          </header>
    
          {/* Chat Area – only AI messages rendered */}
          <div ref={chatContainerRef} className="flex-1 p-4 overflow-y-auto">
            {messages
              .filter((m) => m.type === 'ai')
              .map((message, index) => (
                <div
                  key={index}
                  className="mb-4 p-3 rounded-lg w-1/2 bg-gray-100 text-gray-900"
                >
                  <div className="font-semibold mb-1">AI Interviewer:</div>
                  <div>{message.content}</div>
                </div>
              ))}
          </div>
    
          {/* Recording Status & Controls */}
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
                className={`px-6 py-3 rounded-lg font-medium transition-all shadow-lg ${
                  isRecording
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                } ${!isConnected || isAISpeaking ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isRecording ? 'Stop Recording & Send' : 'Start Recording'}
              </button>
            </div>
          </div>
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
    