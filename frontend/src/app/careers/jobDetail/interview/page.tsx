/* eslint-disable @typescript-eslint/no-require-imports */
'use client';
// frontend/src/app/careers/jobDetail/interview/page.tsx
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface Message {
    type: 'ai' | 'user' | 'system';
    content: string;
}

function InterviewContent() {
    const { useSearchParams } = require('next/navigation');

    const router = useRouter();
    const searchParams = useSearchParams();
    const interviewId = searchParams.get('id');

    // State variables
    const [messages, setMessages] = useState<Message[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isAISpeaking, setIsAISpeaking] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [currentFinalTranscript, setCurrentFinalTranscript] = useState('');
    const [statusMessage, setStatusMessage] = useState('Initializing...');

    // References
    const websocketRef = useRef<WebSocket | null>(null);
    const recognitionRef = useRef<any>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioQueueRef = useRef<Blob[]>([]);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    // Initialize WebSocket and speech recognition on component mount
    useEffect(() => {
        if (!interviewId) {
            addSystemMessage('No interview ID found. Please go back and enter your interview ID.');
            return;
        }

        // Check for speech recognition support
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const hasSpeechRecognition = !!SpeechRecognition;

        if (!hasSpeechRecognition) {
            addSystemMessage('Your browser does not support Speech Recognition. Please use Chrome, Edge, or Safari.');
            return;
        }

        // Request microphone permission
        requestMicrophonePermission();

        // Clean up on component unmount
        return () => {
            if (websocketRef.current) {
                websocketRef.current.close();
            }
            if (recognitionRef.current) {
                recognitionRef.current.stop();
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
            navigator.mediaDevices.getUserMedia({ audio: true })
                .then(() => {
                    setStatusMessage('Microphone access granted.');
                    setupSpeechRecognition();
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

    // Setup speech recognition
    const setupSpeechRecognition = () => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

        if (!SpeechRecognition) {
            addSystemMessage('Speech recognition is not supported on this browser.');
            return false;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
            let interimTranscriptSegment = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                const text = result[0].transcript;

                if (result.isFinal) {
                    setCurrentFinalTranscript(prev => prev + text.trim() + ' ');
                } else {
                    interimTranscriptSegment += text;
                }
            }

            setTranscript((currentFinalTranscript + interimTranscriptSegment).trim());

            if (isListening) {
                setStatusMessage('Listening...');
            }
        };

        recognition.onerror = (event: any) => {
            console.error('Speech recognition error:', event.error);
            let userMessage = `Speech recognition error: ${event.error}.`;

            if (event.error === 'not-allowed') {
                userMessage = 'Microphone access was denied. Please allow microphone access to continue the interview.';
                addSystemMessage(userMessage);
            } else if (event.error === 'no-speech') {
                userMessage = 'No speech detected. Please try speaking when the microphone is on.';
                setStatusMessage(userMessage);
            } else {
                addSystemMessage(userMessage);
            }

            if (isListening) {
                setIsListening(false);
                try {
                    recognition.stop();
                } catch (e) {
                    console.warn("Error trying to stop recognition after an error:", e);
                }
            }

            setStatusMessage(`Error: ${event.error}. Mic turned off.`);
        };

        recognition.onend = () => {
            const wasListeningBeforeOnEnd = isListening;
            setIsListening(false);

            if (wasListeningBeforeOnEnd) {
                if (statusMessage === 'Listening...') {
                    setStatusMessage('Listening session ended. Click "Turn On Mic" to speak again.');
                }
            }
        };

        recognitionRef.current = recognition;
        return true;
    };

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

        // For development, you can hardcode it if needed:
        // const wsUrl = `ws://localhost:8000/ws/interview/${interviewId}/`;

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
                handleAudioMessage(event.data);
            }
        };

        socket.onclose = (event) => {
            console.log('WebSocket connection closed:', event.code, event.reason);
            setIsConnected(false);

            const closeMessage = event.code !== 1000 ?
                `Interview session disconnected (Code: ${event.code}). Please refresh the page to try again.` :
                'Interview session ended.';

            addSystemMessage(closeMessage);

            if (isListening) {
                setIsListening(false);
                try {
                    recognitionRef.current?.stop();
                } catch (e) {
                    console.warn("Error stopping recognition on WS close:", e);
                }
            }

            setCurrentFinalTranscript('');
            setTranscript('');
            setStatusMessage('Disconnected. Please refresh the page.');
        };

        socket.onerror = (error) => {
            console.error('WebSocket error:', error);
            addSystemMessage('Error with the interview connection. Please try refreshing the page.');
            setIsConnected(false);

            if (isListening) {
                setIsListening(false);
                try {
                    recognitionRef.current?.stop();
                } catch (e) {
                    console.warn("Error stopping recognition on WS error:", e);
                }
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
        } else if (message.startsWith('ERROR:')) {
            const errorText = message.substring('ERROR:'.length);
            addSystemMessage(`Server Error: ${errorText}`);
            setStatusMessage(`Server error occurred.`);
        } else {
            addSystemMessage(message);
        }
    };

    // Handle audio messages from server
    const handleAudioMessage = async (audioData: Blob) => {
        if (!initAudioContext()) {
            addSystemMessage("Cannot play AI response: Audio context not available. Please read the question.");
            setStatusMessage("Audio playback error. Read question above.");
            return;
        }

        audioQueueRef.current.push(audioData);
        processAudioQueue();
    };

    // Process audio queue
    const processAudioQueue = async () => {
        if (isAISpeaking || audioQueueRef.current.length === 0 || !audioContextRef.current) return;

        setIsAISpeaking(true);
        setStatusMessage('AI is speaking...');

        if (isListening) {
            setIsListening(false);
            recognitionRef.current?.stop();
            setCurrentFinalTranscript('');
            setTranscript('');
            addSystemMessage('Your microphone was turned off as the AI started speaking.');
        }

        try {
            const audioData = audioQueueRef.current.shift();
            if (!audioData) {
                setIsAISpeaking(false);
                return;
            }

            const arrayBuffer = await audioData.arrayBuffer();

            if (audioContextRef.current.state === 'suspended') {
                await audioContextRef.current.resume();
            }

            const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
            const source = audioContextRef.current.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContextRef.current.destination);

            source.onended = () => {
                setIsAISpeaking(false);

                if (audioQueueRef.current.length > 0) {
                    processAudioQueue();
                } else {
                    setStatusMessage('AI finished. Click "Turn On Microphone" to respond.');
                }
            };

            source.start(0);
        } catch (error) {
            console.error('Error processing audio:', error);
            addSystemMessage(`Error playing AI audio: ${error instanceof Error ? error.message : 'Unknown error'}. You can read the question above.`);
            setIsAISpeaking(false);

            if (audioQueueRef.current.length > 0) {
                processAudioQueue();
            } else {
                setStatusMessage('Error playing audio. Click "Turn On Mic" to respond.');
            }
        }
    };

    // Toggle microphone
    const toggleMicrophoneAndSend = () => {
        if (!recognitionRef.current) {
            setupSpeechRecognition();
            if (!recognitionRef.current) {
                addSystemMessage('Failed to set up speech recognition. Please check permissions and browser.');
                return;
            }
        }

        if (isListening) {
            // User is turning off mic and sending response
            setIsListening(false);
            recognitionRef.current.stop();

            const finalTranscriptToSend = currentFinalTranscript.trim();

            if (finalTranscriptToSend && websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
                sendMessageToServer(finalTranscriptToSend);
                addUserMessage(finalTranscriptToSend);
                setStatusMessage('Response sent. Waiting for AI...');
            } else if (finalTranscriptToSend) {
                setStatusMessage('Mic off. WebSocket not open. Could not send.');
                addSystemMessage('Error: Connection to server lost. Your response was not sent. Please refresh.');
            } else {
                setStatusMessage('Mic off. No speech recorded to send.');
            }

            setTranscript('');
            setCurrentFinalTranscript('');
        } else {
            // User is turning on mic
            if (isAISpeaking) {
                addSystemMessage("Please wait for the AI to finish speaking before turning on your microphone.");
                setStatusMessage("AI is speaking. Please wait...");
                return;
            }

            if (!websocketRef.current || websocketRef.current.readyState !== WebSocket.OPEN) {
                addSystemMessage("Not connected to the server. Cannot start microphone.");
                setStatusMessage("Connection error. Please refresh.");
                return;
            }

            setCurrentFinalTranscript('');
            setTranscript('');

            try {
                recognitionRef.current.start();
                setIsListening(true);
                setStatusMessage('Listening...');
            } catch (error) {
                console.error('Error starting speech recognition:', error);
                setIsListening(false);

                if (error instanceof Error) {
                    if (error.name === 'InvalidStateError') {
                        setStatusMessage('Microphone is already starting or active.');
                    } else {
                        setStatusMessage(`Mic error: ${error.message}`);
                        addSystemMessage(`Error starting microphone: ${error.message}. Please check your microphone and browser permissions.`);
                    }
                }
            }
        }
    };

    // Send message to server
    const sendMessageToServer = (message: string) => {
        if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
            websocketRef.current.send(message);
        } else {
            console.error('WebSocket not open. Cannot send message.');
            addSystemMessage('Cannot send message: Connection lost. Please refresh.');
            setStatusMessage("Failed to send. Connection lost.");
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
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                        </svg>
                    </button>
                    <h1 className="text-xl font-semibold">AI Interview Session</h1>
                </div>
                <div className="flex items-center space-x-4">
                    <div className={`px-3 py-1 rounded-full text-sm ${isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {isConnected ? 'Connected' : 'Disconnected'}
                    </div>
                    {interviewId && (
                        <div className="text-sm text-gray-600">ID: {interviewId}</div>
                    )}
                </div>
            </header>

            {/* Chat Area */}
            <div
                ref={chatContainerRef}
                className="flex-1 p-4 overflow-y-auto"
            >
                {messages.map((message, index) => (
                    <div
                        key={index}
                        className={`mb-4 p-3 rounded-lg max-w-3xl ${message.type === 'user'
                                ? 'ml-auto bg-blue-100 text-blue-900'
                                : message.type === 'ai'
                                    ? 'bg-gray-100 text-gray-900'
                                    : 'mx-auto bg-yellow-100 text-yellow-900 text-sm'
                            }`}
                    >
                        <div className="font-semibold mb-1">
                            {message.type === 'user' ? 'You' : message.type === 'ai' ? 'AI Interviewer' : 'System'}:
                        </div>
                        <div>{message.content}</div>
                    </div>
                ))}
            </div>

            {/* Transcript Area */}
            <div className="bg-gray-50 border-t border-gray-200 p-4">
                <div className="mb-2 flex justify-between items-center">
                    <div className="text-sm font-medium text-gray-700">
                        {statusMessage}
                    </div>
                    <div className={`text-sm font-medium px-2 py-1 rounded ${isListening ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        Microphone: {isListening ? 'On' : 'Off'}
                    </div>
                </div>

                {/* Transcript */}
                <div className="bg-white border border-gray-200 rounded-lg p-3 mb-4 min-h-[60px] max-h-[120px] overflow-y-auto">
                    {transcript || (isListening ? "Speak now..." : "Your speech will appear here...")}
                </div>

                {/* Controls */}
                <div className="flex justify-center">
                    <button
                        onClick={toggleMicrophoneAndSend}
                        disabled={!isConnected || isAISpeaking}
                        className={`px-4 py-2 rounded-lg font-medium ${isListening
                                ? 'bg-red-600 hover:bg-red-700 text-white'
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                            } ${(!isConnected || isAISpeaking) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {isListening ? 'Send Response & Turn Off Mic' : 'Turn On Microphone'}
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