/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"
import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, Camera, Users, Clock, TrendingUp, Wifi, WifiOff } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog'; // Assuming you use shadcn for dialogs.
import { DialogOverlay } from '@/components/ui/dialog';

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

interface WebSocketData {
  frame?: string;
  metrics?: Metrics;
  error?: string;
}

export default function AntiCheatMonitor() {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string>('');
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [frame, setFrame] = useState<string>('');
  const [violations, setViolations] = useState<string[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [tabChanges, setTabChanges] = useState(0); // Tab changes tracker
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [warningTitle, setWarningTitle] = useState('');
  const [warningType, setWarningType] = useState<'warning' | 'danger' | 'final'>('warning');
  const [interviewStarted, setInterviewStarted] = useState(false); // To track interview start
  
  // Violation Analysis Warning States
  const [showViolationWarning, setShowViolationWarning] = useState(false);
  const [violationWarningMessage, setViolationWarningMessage] = useState('');
  const [violationWarningTitle, setViolationWarningTitle] = useState('');
  const [violationWarningType, setViolationWarningType] = useState<'warning' | 'danger' | 'final'>('warning');
  const [lastViolationWarningLevel, setLastViolationWarningLevel] = useState<number>(0);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTabHiddenRef = useRef(false);
  const isWindowFocusedRef = useRef(true);

  useEffect(() => {
    // If the interview has started, track the tab visibility and window focus changes
    if (interviewStarted) {
      const handleTabChange = () => {
        // Only count when tab becomes hidden (user switches away)
        if (document.hidden && !isTabHiddenRef.current) {
          isTabHiddenRef.current = true;
          incrementTabChanges();
        } else if (!document.hidden) {
          // Tab becomes visible again
          isTabHiddenRef.current = false;
        }
      };

      const handleWindowFocus = () => {
        if (!isWindowFocusedRef.current) {
          isWindowFocusedRef.current = true;
        }
      };

      const handleWindowBlur = () => {
        if (isWindowFocusedRef.current) {
          isWindowFocusedRef.current = false;
          incrementTabChanges();
        }
      };

      const incrementTabChanges = () => {
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
            // Disconnect WebSocket and redirect
            setTimeout(() => {
              disconnectWebSocket();
              window.location.href = '/careers';
            }, 5000);
          }
          return newTabChanges;
        });
      };

      // Track tab visibility change
      document.addEventListener('visibilitychange', handleTabChange);
      // Track window focus changes
      window.addEventListener('focus', handleWindowFocus);
      window.addEventListener('blur', handleWindowBlur);

      return () => {
        document.removeEventListener('visibilitychange', handleTabChange);
        window.removeEventListener('focus', handleWindowFocus);
        window.removeEventListener('blur', handleWindowBlur);
        if (wsRef.current) {
          wsRef.current.close();
        }
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
      };
    }
  }, [interviewStarted]);

  // Check violation rate and show warnings
  useEffect(() => {
    if (metrics && metrics.total_violation_rate > 0) {
      const rate = metrics.total_violation_rate;
      
      if (rate >= 60 && lastViolationWarningLevel < 60) {
        setViolationWarningType('final');
        setViolationWarningTitle('Interview Terminated - Unethical Practice');
        setViolationWarningMessage(`Your violation rate is ${rate.toFixed(1)}%. You were found engaging in unethical practices. Your interview is now cancelled and you will be redirected in 5 seconds.`);
        setShowViolationWarning(true);
        setLastViolationWarningLevel(60);
        
        // Disconnect and redirect
        setTimeout(() => {
          disconnectWebSocket();
          window.location.href = '/careers';
        }, 5000);
      } else if (rate >= 50 && lastViolationWarningLevel < 50) {
        setViolationWarningType('danger');
        setViolationWarningTitle('Strict Warning - High Violation Rate');
        setViolationWarningMessage(`Your violation rate is ${rate.toFixed(1)}%. This is extremely concerning. Please maintain proper interview conduct or your interview may be terminated.`);
        setShowViolationWarning(true);
        setLastViolationWarningLevel(50);
      } else if (rate >= 40 && lastViolationWarningLevel < 40) {
        setViolationWarningType('warning');
        setViolationWarningTitle('Warning - Elevated Violation Rate');
        setViolationWarningMessage(`Your violation rate is ${rate.toFixed(1)}%. Please maintain proper interview conduct and stay focused on the camera.`);
        setShowViolationWarning(true);
        setLastViolationWarningLevel(40);
      }
    }
  }, [metrics, lastViolationWarningLevel]);

  const connectWebSocket = () => {
    if (isConnecting) return;

    setIsConnecting(true);
    setConnectionError('');

    try {
      // Try connecting to backend
      wsRef.current = new WebSocket('ws://localhost:8000/ws');

      wsRef.current.onopen = () => {
        setIsConnected(true);
        setIsConnecting(false);
        setConnectionError('');
        console.log('✅ Connected to anti-cheat server');
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data: WebSocketData = JSON.parse(event.data);

          if (data.error) {
            setConnectionError(data.error);
            return;
          }

          if (data.frame) {
            setFrame(`data:image/jpeg;base64,${data.frame}`);
          }

          if (data.metrics) {
            setMetrics(data.metrics);

            // Update violations list
            if (data.metrics.current_violations.length > 0) {
              setViolations(prev => [
                ...data.metrics!.current_violations.map(v =>
                  `${new Date().toLocaleTimeString()}: ${v}`
                ),
                ...prev.slice(0, 15) // Keep last 15 violations
              ]);
            }
          }
        } catch (error) {
          console.error('Error parsing WebSocket data:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        setIsConnected(false);
        setIsConnecting(false);

        if (event.code !== 1000) { // Not a normal closure
          setConnectionError('Connection lost. Attempting to reconnect...');
          // Auto-reconnect after 3 seconds
          reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
        setIsConnecting(false);
        setConnectionError('Failed to connect to camera server. Make sure the Python backend is running.');
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      setIsConnecting(false);
      setConnectionError('Connection error. Check if backend is running on localhost:8000');
    }
  };

  const disconnectWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close();
      setIsConnected(false);
    }
  };

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
  const violationDialogStyles = getDialogStyles(violationWarningType);
  const distanceStatus = metrics ? getFaceDistanceStatus(metrics.face_size_ratio) : { status: 'No data', color: 'text-gray-500' };
  const violationLevel = metrics ? getViolationLevel(metrics.total_violation_rate) : { level: 'No data', color: 'text-gray-500', bgColor: 'bg-gray-50' };

  const startInterview = () => {
    setInterviewStarted(true);
    connectWebSocket();
  };
  
  return (
    <div className="min-h-screen bg-gray-100 p-4">
      
      <div className="max-w-7xl mx-auto">
        {/* Start Interview Button */}
        {!interviewStarted && (
          <div className="flex justify-center mb-6">
            <button
              onClick={startInterview}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg"
            >
              Start Interview
            </button>
          </div>
        )}
        
        {/* Tab Change Counter - Debug Info */}
        {interviewStarted && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-blue-800">
              Tab/Window switches: {tabChanges}/4 (Warning will show when switching away from this tab/window)
            </p>
          </div>
        )}
        
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <h1 className="text-2xl font-bold text-gray-800">
                Interview Anti-Cheat Monitor
              </h1>
              <div className="flex items-center text-green-600 text-sm">
                <Wifi className="w-4 h-4 mr-1" />
                Connected
              </div>
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <div>Session: {metrics?.session_duration || 0}s</div>
              <div>Frames: {metrics?.total_frames || 0}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Feed */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <Camera className="mr-2 h-5 w-5" />
                Live Camera Feed with Detection
              </h2>
              <div className="relative">
                {frame ? (
                  <div className="relative">
                    <img
                      src={frame}
                      alt="Camera feed with detection overlays"
                      className="w-full h-auto rounded-lg border-2 border-gray-200"
                    />
                    
                    {/* Live status indicator */}
                    <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs flex items-center">
                      <div className="w-2 h-2 bg-white rounded-full mr-1 animate-pulse"></div>
                      LIVE
                    </div>

                    {/* Current violation overlay */}
                    {metrics && metrics.violation_count > 0 && (
                      <div className="absolute top-2 right-2 bg-red-500 text-white px-3 py-1 rounded-lg flex items-center text-sm">
                        <AlertTriangle className="mr-1 h-4 w-4" />
                        {metrics.violation_count} Issue{metrics.violation_count > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-500 mx-auto mb-2"></div>
                      <p className="text-gray-500">Loading camera feed...</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Metrics Panel */}
          <div className="space-y-6">
            {/* Detection Status */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Detection Status</h3>
              <div className="space-y-3">
                <div className={`p-3 rounded-lg border ${getStatusColor(metrics?.face_detected || false)}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Face Detected</span>
                    <Users className="h-4 w-4" />
                  </div>
                  <span className="text-sm">{metrics?.face_detected ? 'Yes' : 'No'}</span>
                </div>

                <div className={`p-3 rounded-lg border ${getStatusColor(metrics?.looking_straight || false)}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Looking Straight</span>
                    <Camera className="h-4 w-4" />
                  </div>
                  <span className="text-sm">
                    {metrics?.looking_straight ? 'Yes' : 'No'}
                    {metrics?.horizontal_deviation && (
                      <div className="text-xs text-gray-500">
                        Deviation: {(metrics.horizontal_deviation * 100).toFixed(1)}%
                      </div>
                    )}
                  </span>
                </div>

                <div className={`p-3 rounded-lg border ${distanceStatus.status === 'Good distance' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-yellow-100 text-yellow-800 border-yellow-200'}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Distance</span>
                    <Camera className="h-4 w-4" />
                  </div>
                  <span className={`text-sm ${distanceStatus.color}`}>
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
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <TrendingUp className="mr-2 h-5 w-5" />
                Violation Analysis
                {metrics && metrics.total_violation_rate >= 40 && (
                  <AlertTriangle className="ml-2 h-5 w-5 text-red-500 animate-pulse" />
                )}
              </h3>
              <div className={`text-center p-4 rounded-lg ${violationLevel.bgColor} ${metrics && metrics.total_violation_rate >= 40 ? 'ring-2 ring-red-400 ring-opacity-75' : ''}`}>
                <div className="text-3xl font-bold mb-2 text-gray-800">
                  {metrics?.total_violation_rate?.toFixed(1) || 0}%
                </div>
                <div className={`text-sm font-medium ${violationLevel.color}`}>
                  {violationLevel.level}
                </div>
                {metrics && metrics.total_violation_rate >= 40 && (
                  <div className="text-xs text-red-600 mt-1 font-medium">
                    ⚠️ Warning Level Reached
                  </div>
                )}
              </div>

              {/* Violation Breakdown */}
              {metrics?.violations_breakdown && (
                <div className="mt-4 space-y-2">
                  <h4 className="font-medium text-gray-700">Breakdown:</h4>
                  {Object.entries(metrics.violations_breakdown).map(([key, value]) => (
                    value > 0 && (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="capitalize">{key.replace('_', ' ')}:</span>
                        <span className="font-medium">{value}</span>
                      </div>
                    )
                  ))}
                </div>
              )}
            </div>

            {/* Recent Violations */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <Clock className="mr-2 h-5 w-5" />
                Recent Violations
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {violations.length > 0 ? (
                  violations.map((violation, index) => (
                    <div key={index} className="text-sm p-2 bg-red-50 border-l-4 border-red-400 rounded text-red-700">
                      {violation}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 italic">No violations detected</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Active Violations Alert */}
        {metrics && metrics.current_violations.length > 0 && (
          <div className="fixed bottom-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg max-w-sm animate-pulse">
            <div className="flex items-center mb-2">
              <AlertTriangle className="mr-2 h-5 w-5" />
              <span className="font-semibold">Active Violations</span>
            </div>
            <ul className="text-sm space-y-1">
              {metrics.current_violations.map((violation, index) => (
                <li key={index}>• {violation}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Tab/Window Switch Warning Dialog */}
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

      {/* Violation Rate Warning Dialog */}
      <Dialog open={showViolationWarning} onOpenChange={() => violationWarningType !== 'final' && setShowViolationWarning(false)}>
        <DialogOverlay className="bg-black/60" />
        <DialogContent className="max-w-md">
          <DialogHeader className={`${violationDialogStyles.headerBg} -m-6 mb-4 p-6 border-b rounded-t-lg`}>
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-full bg-white/80 ${violationDialogStyles.iconColor}`}>
                <TrendingUp className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className={`text-lg font-semibold ${violationDialogStyles.titleColor}`}>
                  {violationWarningTitle}
                </DialogTitle>
              </div>
            </div>
          </DialogHeader>
          <div className="py-4">
            <DialogDescription className={`text-base leading-relaxed ${violationDialogStyles.descColor}`}>
              {violationWarningMessage}
            </DialogDescription>
          </div>
          {violationWarningType !== 'final' && (
            <DialogFooter>
              <button
                onClick={() => setShowViolationWarning(false)}
                className={`${violationDialogStyles.buttonBg} text-white px-6 py-2 rounded-lg font-medium transition-colors`}
              >
                I Understand
              </button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}