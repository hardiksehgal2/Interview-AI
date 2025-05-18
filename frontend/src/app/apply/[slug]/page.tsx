/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useRef, useState } from 'react';

const ApplyRole = () => {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const recognitionRef = useRef<any>(null);
  const silenceTimeoutRef = useRef<any>(null);

  function handleToggle() {
    if (listening) {
      stopWebSpeech();
    } else {
      setTranscript('');
      setError('');
      startWebSpeech();
    }
  }
  function startWebSpeech() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Speech Recognition not supported in this browser.');
      return;
    }
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = false;
    recognitionRef.current.lang = 'en-US';

    recognitionRef.current.onstart = () => {
      setListening(true);
      setError('');
    };
    recognitionRef.current.onresult = (event: any) => {
      const result = event.results[event.results.length - 1][0].transcript;
      setTranscript((prev) => (prev.length ? prev + ' ' + result : result));
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = setTimeout(() => {
        recognitionRef.current.stop();
      }, 3000); // stop after 3 seconds of silence
    };
    recognitionRef.current.onerror = (event: any) => {
      setError('❌ Error: ' + event.error);
    };
    recognitionRef.current.onend = () => {
      setListening(false);
    };
    recognitionRef.current.start();
  }

  function stopWebSpeech() {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setListening(false);
  }

  return (
    <div className="p-6 max-w-xl mx-auto space-y-8">
      <h2 className="text-xl font-bold mb-4">Browser-native Speech-to-Text (Web Speech API)</h2>
      <button
        onClick={handleToggle}
        className={`mb-6 px-6 py-3 rounded-full font-bold ${
          listening ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'
        }`}
      >
        {listening ? 'Stop Recording' : 'Start Recording'}
      </button>
      <div className="min-h-[48px] bg-gray-100 p-4 rounded-lg text-lg text-gray-800 shadow-inner mb-2">
        {error
          ? <span className="text-red-500">{error}</span>
          : (transcript || <span className="text-gray-400">Press start to speak…</span>)
        }
      </div>
      <div className="text-xs text-gray-400">
        Note: This only works in Chrome &amp; Edge browsers.
      </div>
    </div>
  );
};

export default ApplyRole;
