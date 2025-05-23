// pages/index.tsx - Complete Next.js frontend with warning systems
"use client"
import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, Camera, Eye, EyeOff, Users, Clock, TrendingUp, Wifi, WifiOff } from 'lucide-react';
import { useRouter } from 'next/router';

interface Metrics {
  face_detected: boolean;
  looking_straight: boolean;
  eyes_detected: boolean;
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
    eyes_not_visible: number;
    too_close: number;
    too_far: number;
  };
}

interface WebSocketData {
  frame?: string;
  metrics?: Metrics;
  error?: string;
}

// Warning Modal Component
interface WarningModalProps {
  isOpen: boolean;
  type: 'tab-warning' | 'tab-strict' | 'tab-final' | 'violation-warning' | 'violation-strict' | 'violation-final';
  onClose: () => void;
  onConfirm?: () => void;
  tabChangeCount?: number;
  violationRate?: number;
}

const WarningModal: React.FC<WarningModalProps> = ({ isOpen, type, onClose, onConfirm, tabChangeCount, violationRate }) => {
  const [countdown, setCountdown] = useState(5);
  const router = useRouter();

  useEffect(() => {
    if (isOpen && (type === 'tab-final' || type === 'violation-final')) {
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            router.push('/careers');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isOpen, type, router]);

  if (!isOpen) return null;

  const getModalContent = () => {
    switch (type) {
      case 'tab-warning':
        return {
          title: '⚠️ Warning: Tab Switch Detected',
          message: `You switched tabs or left the interview window. This is your first warning (${tabChangeCount}/3).`,
          description: 'Please stay on this tab during the interview. Further tab switching may result in interview termination.',
          actionText: 'I Understand',
          severity: 'warning'
        };
      
      case 'tab-strict':
        return {
          title: '🚨 Strict Warning: Multiple Tab Switches',
          message: `You have switched tabs ${tabChangeCount} times. This is your final warning!`,
          description: 'One more tab switch will automatically terminate your interview. Please focus on the interview.',
          actionText: 'I Will Not Switch Again',
          severity: 'error'
        };
      
      case 'tab-final':
        return {
          title: '❌ Interview Terminated',
          message: 'You have switched tabs 3 times during the interview.',
          description: `Your interview has been terminated due to multiple tab switches. Redirecting in ${countdown} seconds...`,
          actionText: '',
          severity: 'final'
        };
      
      case 'violation-warning':
        return {
          title: '⚠️ High Violation Rate Detected',
          message: `Your violation rate is ${violationRate?.toFixed(1)}% which is concerning.`,
          description: 'Please ensure you are looking at the camera, sitting at proper distance, and following interview guidelines.',
          actionText: 'I Will Improve',
          severity: 'warning'
        };
      
      case 'violation-strict':
        return {
          title: '🚨 Critical Violation Rate',
          message: `Your violation rate is ${violationRate?.toFixed(1)}% which is very high.`,
          description: 'Immediate improvement is required. Continued violations may result in interview termination.',
          actionText: 'I Understand',
          severity: 'error'
        };
      
      case 'violation-final':
        return {
          title: '❌ Interview Terminated',
          message: 'You were found engaging in unethical practices during the interview.',
          description: `Your violation rate reached ${violationRate?.toFixed(1)}%. Redirecting in ${countdown} seconds...`,
          actionText: '',
          severity: 'final'
        };
      
      default:
        return {
          title: 'Warning',
          message: 'Please follow interview guidelines.',
          description: '',
          actionText: 'OK',
          severity: 'warning'
        };
    }
  };

  const content = getModalContent();
  
  const getBgColor = () => {
    switch (content.severity) {
      case 'warning': return 'bg-yellow-50 border-yellow-200';
      case 'error': return 'bg-red-50 border-red-200';
      case 'final': return 'bg-gray-900 border-gray-700';
      default: return 'bg-white border-gray-200';
    }
  };

  const getTextColor = () => {
    switch (content.severity) {
      case 'final': return 'text-white';
      default: return 'text-gray-900';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`${getBgColor()} ${getTextColor()} p-8 rounded-lg shadow-xl max-w-md w-full mx-4 border-2`}>
        <div className="text-center">
          <h2 className="text-xl font-bold mb-4">{content.title}</h2>
          <p className="text-lg mb-3">{content.message}</p>
          <p className="text-sm mb-6 opacity-80">{content.description}</p>
          
          {content.actionText && (
            <button
              onClick={onConfirm || onClose}
              className={`w-full py-3 px-4 rounded-lg font-medium ${
                content.severity === 'final' 
                  ? 'bg-gray-700 text-white cursor-not-allowed' 
                  : content.severity === 'error'
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-yellow-600 hover:bg-yellow-700 text-white'
              } transition-colors`}
              disabled={content.severity === 'final'}
            >
              {content.actionText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default function AntiCheatMonitor() {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string>('');
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [frame, setFrame] = useState<string>('');
  const [violations, setViolations] = useState<string[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  
  // Warning system states
  const [tabChangeCount, setTabChangeCount] = useState(0);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningType, setWarningType] = useState<'tab-warning' | 'tab-strict' | 'tab-final' | 'violation-warning' | 'violation-strict' | 'violation-final'>('tab-warning');
  const [lastViolationWarning, setLastViolationWarning] = useState(0);
  const [interviewTerminated, setInterviewTerminated] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  // Tab visibility detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isConnected && !interviewTerminated) {
        handleTabChange();
      }
    };

    const handleBeforeUnload = () => {
      disconnectWebSocket();
    };

    const handleUnload = () => {
      disconnectWebSocket();
    };

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('unload', handleUnload);
    window.addEventListener('pagehide', handleUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('unload', handleUnload);
      window.removeEventListener('pagehide', handleUnload);
      disconnectWebSocket();
    };
  }, [isConnected, interviewTerminated]);

  // Monitor violation rates
  useEffect(() => {
    if (metrics && !interviewTerminated) {
      const rate = metrics.total_violation_rate;
      
      if (rate >= 80 && lastViolationWarning < 80) {
        setLastViolationWarning(80);
        setWarningType('violation-final');
        setShowWarningModal(true);
        setInterviewTerminated(true);
        disconnectWebSocket();
      } else if (rate >= 65 && lastViolationWarning < 65) {
        setLastViolationWarning(65);
        setWarningType('violation-strict');
        setShowWarningModal(true);
      } else if (rate >= 50 && lastViolationWarning < 50) {
        setLastViolationWarning(50);
        setWarningType('violation-warning');
        setShowWarningModal(true);
      }
    }
  }, [metrics, lastViolationWarning, interviewTerminated]);

  const handleTabChange = () => {
    const newCount = tabChangeCount + 1;
    setTabChangeCount(newCount);

    if (newCount === 1) {
      setWarningType('tab-warning');
      setShowWarningModal(true);
    } else if (newCount === 2) {
      setWarningType('tab-strict');
      setShowWarningModal(true);
    } else if (newCount >= 3) {
      setWarningType('tab-final');
      setShowWarningModal(true);
      setInterviewTerminated(true);
      disconnectWebSocket();
    }
  };

  const disconnectWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  };

  useEffect(() => {
    if (!interviewTerminated) {
      connectWebSocket();
    }
    return () => {
      disconnectWebSocket();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [interviewTerminated]);

  const connectWebSocket = () => {
    if (isConnecting || interviewTerminated) return;
    
    setIsConnecting(true);
    setConnectionError('');
    
    try {
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
                ...prev.slice(0, 15)
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
        
        if (event.code !== 1000 && !interviewTerminated) {
          setConnectionError('Connection lost. Attempting to reconnect...');
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

  const handleWarningClose = () => {
    setShowWarningModal(false);
  };

  const handleWarningConfirm = () => {
    setShowWarningModal(false);
    if (warningType === 'tab-final' || warningType === 'violation-final') {
      router.push('/careers');
    }
  };

  const getStatusColor = (isGood: boolean) => {
    return isGood ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200';
  };

  const getViolationLevel = (rate: number) => {
    if (rate < 5) return { level: 'Excellent', color: 'text-green-600', bgColor: 'bg-green-50' };
    if (rate < 15) return { level: 'Good', color: 'text-yellow-600', bgColor: 'bg-yellow-50' };
    if (rate < 30) return { level: 'Concerning', color: 'text-orange-600', bgColor: 'bg-orange-50' };
    if (rate < 50) return { level: 'High Risk', color: 'text-red-600', bgColor: 'bg-red-50' };
    if (rate < 65) return { level: 'Critical', color: 'text-red-700', bgColor: 'bg-red-100' };
    return { level: 'Severe', color: 'text-red-800', bgColor: 'bg-red-200' };
  };

  const getFaceDistanceStatus = (ratio: number) => {
    if (ratio === 0) return { status: 'No face', color: 'text-gray-500' };
    if (ratio < 0.02) return { status: 'Too far', color: 'text-red-500' };
    if (ratio > 0.35) return { status: 'Too close', color: 'text-red-500' };
    return { status: 'Good distance', color: 'text-green-500' };
  };

  if (interviewTerminated) {
    return null; // Will be handled by the warning modal
  }

  if (!isConnected && !isConnecting) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md w-full">
          <div className="mb-4">
            {connectionError ? (
              <WifiOff className="mx-auto h-12 w-12 text-red-400 mb-4" />
            ) : (
              <Camera className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            )}
          </div>
          
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Anti-Cheat System
          </h2>
          
          {connectionError ? (
            <div className="text-red-600 mb-4 text-sm">
              <p>{connectionError}</p>
            </div>
          ) : (
            <p className="text-gray-600 mb-4">
              Connecting to camera detection system...
            </p>
          )}
          
          <div className="text-xs text-gray-500 mb-4">
            <p>Make sure the Python backend is running:</p>
            <code className="bg-gray-100 px-2 py-1 rounded">python anti_cheat_opencv.py</code>
          </div>
          
          <button 
            onClick={connectWebSocket}
            disabled={isConnecting}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg transition-colors"
          >
            {isConnecting ? 'Connecting...' : 'Connect to Camera'}
          </button>
        </div>
      </div>
    );
  }

  if (isConnecting) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Connecting to Camera...
          </h2>
          <p className="text-gray-600">
            Please allow camera access when prompted
          </p>
        </div>
      </div>
    );
  }

  const violationLevel = getViolationLevel(metrics?.total_violation_rate || 0);
  const distanceStatus = getFaceDistanceStatus(metrics?.face_size_ratio || 0);

  return (
    <>
      <div className="min-h-screen bg-gray-100 p-4">
        <div className="max-w-7xl mx-auto">
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
                {tabChangeCount > 0 && (
                  <div className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs">
                    Tab Switches: {tabChangeCount}/3
                  </div>
                )}
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
                      <Eye className="h-4 w-4" />
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

                  <div className={`p-3 rounded-lg border ${getStatusColor(metrics?.eyes_detected || false)}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Eyes Visible</span>
                      {metrics?.eyes_detected ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </div>
                    <span className="text-sm">{metrics?.eyes_detected ? 'Yes' : 'No'}</span>
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
                  {metrics && metrics.total_violation_rate >= 50 && (
                    <AlertTriangle className="ml-2 h-4 w-4 text-red-500 animate-pulse" />
                  )}
                </h3>
                <div className={`text-center p-4 rounded-lg ${violationLevel.bgColor}`}>
                  <div className="text-3xl font-bold mb-2 text-gray-800">
                    {metrics?.total_violation_rate?.toFixed(1) || 0}%
                  </div>
                  <div className={`text-sm font-medium ${violationLevel.color}`}>
                    {violationLevel.level}
                  </div>
                </div>
                
                {/* Warning thresholds */}
                <div className="mt-4 text-xs text-gray-600">
                  <div className="flex justify-between">
                    <span>Warning: 50%</span>
                    <span>Critical: 65%</span>
                    <span>Terminate: 80%</span>
                  </div>
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
      </div>

      {/* Warning Modal */}
      <WarningModal
        isOpen={showWarningModal}
        type={warningType}
        onClose={handleWarningClose}
        onConfirm={handleWarningConfirm}
        tabChangeCount={tabChangeCount}
        violationRate={metrics?.total_violation_rate}
      />
    </>
  );
}