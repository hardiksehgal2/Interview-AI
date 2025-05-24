/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
// import { useRouter } from 'next/router';

// Create an axios instance
const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

interface FormData {
  email: string;
  interviewId: string;
}

interface InterviewResult {
  candidate_name: string;
  candidate_email: string;
  status: string;
  analysis: {
    summary: string;
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
  } | null;
  summary_error: string | null;
  message_history?: Array<{
    role: 'assistant' | 'user';
    content: string;
  }>;
}
const useAnimate = () => {
  const [shouldAnimate, setShouldAnimate] = useState(false);

  useEffect(() => {
    setShouldAnimate(true);
  }, []);

  return shouldAnimate;
};
const Results: React.FC = () => {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    email: '',
    interviewId: ''
  });
  const shouldAnimate = useAnimate();
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' | null }>({
    text: '',
    type: null
  });
  const [interviewResult, setInterviewResult] = useState<InterviewResult | null>(null);

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.interviewId) {
      newErrors.interviewId = 'Interview ID is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when user types
    if (errors[name as keyof FormData]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  const handleSubmit = async (e: React.MouseEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    setMessage({ text: '', type: null });
    setInterviewResult(null);

    try {
      // Get interview data using the ID
      const response = await axiosInstance.get<InterviewResult>(`/interview/${formData.interviewId}`);

      // Check if the email matches
      if (response.data.candidate_email.toLowerCase() !== formData.email.toLowerCase()) {
        setMessage({
          text: 'Email does not match the interview record.',
          type: 'error'
        });
        return;
      }

      // Check interview status
      if (response.data.status === 'summary_generated' || 'interview_interrupted') {
        setInterviewResult(response.data);
        setMessage({
          text: 'Interview analysis found!',
          type: 'success'
        });
      } else if (response.data.status === 'summary_error') {
        setMessage({
          text: `Error in interview analysis: ${response.data.summary_error || 'Unknown error'}`,
          type: 'error'
        });
      } else if (response.data.status === 'summary_pending') {
        setMessage({
          text: 'Your interview analysis is being generated. Please check back later.',
          type: 'success'
        });
      } else if (response.data.status === 'interview_completed') {
        setMessage({
          text: 'Your interview is complete but analysis has not started yet. Please check back later.',
          type: 'success'
        });
      } else {
        setMessage({
          text: `Interview status: ${response.data.status}. Please check back later.`,
          type: 'success'
        });
      }

    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          setMessage({
            text: 'Interview not found. Please check your ID and try again.',
            type: 'error'
          });
        } else if (error.response?.status === 400) {
          setMessage({
            text: 'Invalid interview ID format.',
            type: 'error'
          });
        } else {
          setMessage({
            text: `Error: ${error.response?.data?.detail || 'Could not connect to server'}`,
            type: 'error'
          });
        }
      } else {
        setMessage({
          text: 'Error checking interview status. Please try again.',
          type: 'error'
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {!interviewResult ? (
        <div className={`container mx-auto px-4 py-16 max-w-md transition-all duration-700 transform ${shouldAnimate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-8 text-center">
              <h1 className="text-3xl font-bold text-white mb-2">Interview Results</h1>
              <p className="text-blue-100">Check the status of your interview submission</p>
            </div>

            <div className="p-8 space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 rounded-lg border ${errors.email ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                    } focus:border-transparent focus:outline-none focus:ring-2 transition-colors`}
                  placeholder="Enter your email"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.email}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="interviewId" className="block text-sm font-medium text-gray-700 mb-1">
                  Interview ID
                </label>
                <input
                  type="text"
                  id="interviewId"
                  name="interviewId"
                  value={formData.interviewId}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 rounded-lg border ${errors.interviewId ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                    } focus:border-transparent focus:outline-none focus:ring-2 transition-colors`}
                  placeholder="Enter your interview ID"
                />
                {errors.interviewId && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.interviewId}
                  </p>
                )}
              </div>

              {message.text && (
                <div className={`p-4 rounded-lg text-sm animate-fadeIn ${message.type === 'success' ? 'bg-green-100 text-green-800' :
                    message.type === 'error' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                  }`}>
                  {message.text}
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:opacity-70 shadow-md"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Checking...
                  </>
                ) : (
                  'Check Results'
                )}
              </button>

              <div className="text-center mt-4">
                <p className="text-sm text-gray-600">
                  Don&apos;t have an interview ID? <span onClick={() => router.push('/careers')} className="text-blue-600 hover:underline cursor-pointer font-medium">Start an interview</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className={`container mx-auto px-4 py-16 transition-all duration-700 transform ${shouldAnimate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                  <div>
                    <h1 className="text-3xl font-bold text-white mb-1">Interview Analysis</h1>
                    <p className="text-blue-100">Results for {interviewResult.candidate_name}</p>
                  </div>
                  <div className="mt-4 md:mt-0">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${interviewResult.status === 'summary_generated' ? 'bg-green-100 text-green-800' :
                        interviewResult.status === 'summary_error' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'
                      }`}>
                      {interviewResult.status === 'summary_generated' ? 'Analysis Complete' :
                        interviewResult.status === 'summary_error' ? 'Analysis Failed' :
                          interviewResult.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-8">
                {message.text && (
                  <div className={`p-4 mb-6 rounded-lg text-sm animate-fadeIn ${message.type === 'success' ? 'bg-green-100 text-green-800' :
                      message.type === 'error' ? 'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'
                    }`}>
                    {message.text}
                  </div>
                )}

                {interviewResult.analysis && (
                  <div className="space-y-8">
                    {interviewResult.analysis.summary && (
                      <div className="animate-slideUp" style={{ animationDelay: '0ms' }}>
                        <h2 className="text-xl font-semibold text-gray-800 mb-3 border-b pb-2">Summary</h2>
                        <p className="text-gray-700 leading-relaxed">{interviewResult.analysis.summary}</p>
                      </div>
                    )}

                    {interviewResult.analysis.strengths && interviewResult.analysis.strengths.length > 0 && (
                      <div className="animate-slideUp" style={{ animationDelay: '150ms' }}>
                        <h2 className="text-xl font-semibold text-green-700 mb-3 border-b border-green-200 pb-2">Strengths</h2>
                        <ul className="space-y-3 mt-4">
                          {interviewResult.analysis.strengths.map((strength, index) => (
                            <li key={index} className="flex items-start animate-fadeIn" style={{ animationDelay: `${200 + index * 100}ms` }}>
                              <span className="mr-2 mt-1 text-green-500">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                              </span>
                              <span className="text-gray-700">{strength}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {interviewResult.analysis.weaknesses && interviewResult.analysis.weaknesses.length > 0 && (
                      <div className="animate-slideUp" style={{ animationDelay: '300ms' }}>
                        <h2 className="text-xl font-semibold text-red-700 mb-3 border-b border-red-200 pb-2">Areas for Improvement</h2>
                        <ul className="space-y-3 mt-4">
                          {interviewResult.analysis.weaknesses.map((weakness, index) => (
                            <li key={index} className="flex items-start animate-fadeIn" style={{ animationDelay: `${350 + index * 100}ms` }}>
                              <span className="mr-2 mt-1 text-red-500">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                              </span>
                              <span className="text-gray-700">{weakness}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {interviewResult.analysis.suggestions && interviewResult.analysis.suggestions.length > 0 && (
                      <div className="animate-slideUp" style={{ animationDelay: '450ms' }}>
                        <h2 className="text-xl font-semibold text-blue-700 mb-3 border-b border-blue-200 pb-2">Recommendations</h2>
                        <ul className="space-y-3 mt-4">
                          {interviewResult.analysis.suggestions.map((suggestion, index) => (
                            <li key={index} className="flex items-start animate-fadeIn" style={{ animationDelay: `${500 + index * 100}ms` }}>
                              <span className="mr-2 mt-1 text-blue-500">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
                                </svg>
                              </span>
                              <span className="text-gray-700">{suggestion}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {interviewResult.status === 'summary_error' && (
                  <div className="p-5 bg-red-50 rounded-lg text-red-800 mb-6 animate-fadeIn">
                    <p className="font-medium">Error processing your interview:</p>
                    <p>{interviewResult.summary_error || 'Unknown error occurred'}</p>
                  </div>
                )}
            {interviewResult.message_history && interviewResult.message_history.length > 0 && (
              <div className="animate-slideUp mt-20 " style={{ animationDelay: '600ms' }}>
                <h2 className="text-xl font-semibold text-gray-800 mb-3 border-b pb-2">Interview Transcript</h2>
                <div className="space-y-4 mt-4">
                  {interviewResult.message_history.map((message, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg animate-fadeIn ${message.role === 'assistant'
                          ? 'bg-blue-50 border-l-4 border-blue-400'
                          : 'bg-gray-50 border-l-4 border-gray-400'
                        }`}
                      style={{ animationDelay: `${650 + index * 100}ms` }}
                    >
                      <div className="flex items-center mb-2">
                        <div className={`font-semibold text-sm ${message.role === 'assistant' ? 'text-blue-700' : 'text-gray-700'
                          }`}>
                          {message.role === 'assistant' ? 'Interviewer' : 'Candidate'}
                        </div>
                        <div className="ml-2 text-xs text-gray-500">
                          {message.role === 'assistant' ? '🤖' : '👤'}
                        </div>
                      </div>
                      <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {message.content}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
                <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setInterviewResult(null);
                      setFormData({ email: '', interviewId: '' });
                      setMessage({ text: '', type: null });
                    }}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg transition-colors focus:outline-none focus:ring-4 focus:ring-gray-300"
                  >
                    Check Another Interview
                  </button>

                  <button
                    onClick={() => router.push('/careers')}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-4 focus:ring-blue-300"
                  >
                    Start New Interview
                  </button>
                </div>
              </div>
            </div>
            {/* {interviewResult.message_history && interviewResult.message_history.length > 0 && (
              <div className="animate-slideUp mt-20 bg-white px-4 py-16 rounded-lg shadow-xl" style={{ animationDelay: '600ms' }}>
                <h2 className="text-xl font-semibold text-gray-800 mb-3 border-b pb-2">Interview Transcript</h2>
                <div className="space-y-4 mt-4">
                  {interviewResult.message_history.map((message, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg animate-fadeIn ${message.role === 'assistant'
                          ? 'bg-blue-50 border-l-4 border-blue-400'
                          : 'bg-gray-50 border-l-4 border-gray-400'
                        }`}
                      style={{ animationDelay: `${650 + index * 100}ms` }}
                    >
                      <div className="flex items-center mb-2">
                        <div className={`font-semibold text-sm ${message.role === 'assistant' ? 'text-blue-700' : 'text-gray-700'
                          }`}>
                          {message.role === 'assistant' ? 'Interviewer' : 'Candidate'}
                        </div>
                        <div className="ml-2 text-xs text-gray-500">
                          {message.role === 'assistant' ? '🤖' : '👤'}
                        </div>
                      </div>
                      <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {message.content}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )} */}
          </div>

        </div>
      )}

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }
        
        .animate-slideUp {
          animation: slideUp 0.5s ease-out forwards;
        }
      `}</style>

    </div>
  );
};

export default Results;