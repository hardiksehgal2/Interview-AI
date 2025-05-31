/* eslint-disable @typescript-eslint/no-explicit-any */
// pages/test-ide.tsx (for Pages Router) or app/test-ide/page.tsx (for App Router)
"use client"

import React, { useState } from 'react';
import CodeIDE from '@/components/CodeIDE';

// Sample coding problems for testing
const SAMPLE_PROBLEMS = [
  {
    id: 1,
    title: "Simple Addition",
    difficulty: "Easy",
    question: `Write a program that reads two integers and prints their sum.

Input Format:
Two integers separated by a space on a single line.

Output Format:
A single integer representing the sum.

Example:
Input: 5 3
Output: 8

Constraints:
- Both integers will be between -1000 and 1000`,
    testCases: [
      { id: 1, input: '5 3', expectedOutput: '8', description: 'Basic addition test' },
      { id: 2, input: '10 20', expectedOutput: '30', description: 'Larger positive numbers' },
      { id: 3, input: '0 0', expectedOutput: '0', description: 'Zero addition test' },
      { id: 4, input: '-5 15', expectedOutput: '10', description: 'Mixed positive and negative' },
      { id: 5, input: '-10 -5', expectedOutput: '-15', description: 'Both negative numbers' }
    ]
  },
  {
    id: 2,
    title: "Square of Number",
    difficulty: "Easy",
    question: `Write a program that takes an integer as input and returns its square.

Input Format:
A single integer on one line.

Output Format:
The square of the input integer.

Example:
Input: 5
Output: 25

Constraints:
- The integer will be between -100 and 100`,
    testCases: [
      { id: 1, input: '5', expectedOutput: '25', description: 'Positive number square' },
      { id: 2, input: '0', expectedOutput: '0', description: 'Zero square' },
      { id: 3, input: '10', expectedOutput: '100', description: 'Two digit number' },
      { id: 4, input: '-3', expectedOutput: '9', description: 'Negative number square' },
      { id: 5, input: '-7', expectedOutput: '49', description: 'Another negative square' }
    ]
  },
  {
    id: 3,
    title: "Even or Odd",
    difficulty: "Easy",
    question: `Write a program that determines if a number is even or odd.

Input Format:
A single integer on one line.

Output Format:
Print "Even" if the number is even, "Odd" if the number is odd.

Example:
Input: 4
Output: Even

Constraints:
- The integer will be between -1000 and 1000`,
    testCases: [
      { id: 1, input: '4', expectedOutput: 'Even', description: 'Even positive number' },
      { id: 2, input: '7', expectedOutput: 'Odd', description: 'Odd positive number' },
      { id: 3, input: '0', expectedOutput: 'Even', description: 'Zero is even' },
      { id: 4, input: '-2', expectedOutput: 'Even', description: 'Even negative number' },
      { id: 5, input: '-1', expectedOutput: 'Odd', description: 'Odd negative number' }
    ]
  },
  {
    id: 4,
    title: "Array Sum",
    difficulty: "Medium",
    question: `Write a program that calculates the sum of all elements in an array.

Input Format:
First line: n (number of elements)
Second line: n space-separated integers

Output Format:
A single integer representing the sum of all elements.

Example:
Input:
5
1 2 3 4 5
Output: 15

Constraints:
- n will be between 1 and 100
- Each element will be between -1000 and 1000`,
    testCases: [
      { id: 1, input: '5\n1 2 3 4 5', expectedOutput: '15', description: 'Basic array sum' },
      { id: 2, input: '3\n10 20 30', expectedOutput: '60', description: 'Larger numbers' },
      { id: 3, input: '1\n42', expectedOutput: '42', description: 'Single element' },
      { id: 4, input: '4\n-1 -2 -3 -4', expectedOutput: '-10', description: 'All negative numbers' },
      { id: 5, input: '6\n-5 10 -3 7 -2 8', expectedOutput: '15', description: 'Mixed positive and negative' }
    ]
  },
  {
    id: 5,
    title: "Maximum Number",
    difficulty: "Medium",
    question: `Write a program that finds the maximum number from a list of integers.

Input Format:
First line: n (number of elements)
Second line: n space-separated integers

Output Format:
A single integer representing the maximum value.

Example:
Input:
4
3 7 2 9
Output: 9

Constraints:
- n will be between 1 and 100
- Each element will be between -1000 and 1000`,
    testCases: [
      { id: 1, input: '4\n3 7 2 9', expectedOutput: '9', description: 'Basic maximum test' },
      { id: 2, input: '5\n-1 -5 -2 -8 -3', expectedOutput: '-1', description: 'All negative numbers' },
      { id: 3, input: '1\n100', expectedOutput: '100', description: 'Single element' },
      { id: 4, input: '6\n5 5 5 5 5 5', expectedOutput: '5', description: 'All same numbers' },
      { id: 5, input: '3\n0 -10 10', expectedOutput: '10', description: 'Mix with zero' }
    ]
  }
];

export default function TestIDEPage() {
  const [selectedProblem, setSelectedProblem] = useState(SAMPLE_PROBLEMS[0]);
  const [submissions, setSubmissions] = useState<any[]>([]);

  const handleSubmit = async (code: string, language: string, results: any) => {
    console.log('🎉 handleSubmit called:', { 
      codeLength: code.length, 
      language, 
      resultsCount: results.length 
    });
    
    // Store submission locally for testing
    const submission = {
      id: Date.now(),
      problemId: selectedProblem.id,
      problemTitle: selectedProblem.title,
      code,
      language,
      results,
      timestamp: new Date().toISOString(),
      passed: results.every((r: any) => r.passed),
      passedTests: results.filter((r: any) => r.passed).length,
      totalTests: results.length
    };
    
    console.log('📊 Submission details:', submission);
    
    setSubmissions(prev => [submission, ...prev]);
    
    // Show success message
    if (submission.passed) {
      alert(`🎉 Congratulations! You solved "${selectedProblem.title}"!\n\nAll ${submission.totalTests} test cases passed!`);
    } else {
      console.log(`💡 Partial success: ${submission.passedTests}/${submission.totalTests} tests passed`);
    }

    // 🔥 Send to your FastAPI backend - IMPROVED ERROR HANDLING
    console.log('🚀 Sending to Next.js API route...');
    try {
      // Create the payload in the correct format for your backend
      const backendPayload = {
        user_id: "frontend_user_" + Date.now(),
        problem_id: submission.problemId,
        problem_title: submission.problemTitle,
        code: submission.code,
        language: submission.language,
        test_results: submission.results,
        all_tests_passed: submission.passed,
        passed_tests: submission.passedTests,
        total_tests: submission.totalTests,
        submission_time: submission.timestamp
      };
      
      console.log('📡 Sending payload:', backendPayload);
      
      const response = await fetch('/api/submit-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(backendPayload),
      });
      
      console.log('📡 API Response status:', response.status);
      console.log('📡 API Response headers:', response.headers);
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Backend response:', result);
        alert('✅ Code submitted successfully to backend!');
      } else {
        const errorText = await response.text();
        console.error('❌ API Error:', response.status, errorText);
        alert(`❌ Backend API Error: ${response.status}\n${errorText}`);
      }
    } catch (error) {
      console.error('❌ Error sending to backend:', error);
      alert(`❌ Network Error: ${error}`);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'text-green-600 bg-green-100';
      case 'Medium': return 'text-yellow-600 bg-yellow-100';
      case 'Hard': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getProblemStatus = (problemId: number) => {
    const submission = submissions.find(s => s.problemId === problemId && s.passed);
    return submission ? 'solved' : 'unsolved';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Code Challenge Platform</h1>
              <p className="text-gray-600 mt-1">Practice coding problems and test your solutions</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">
                Problems Solved: <span className="font-semibold text-green-600">
                  {SAMPLE_PROBLEMS.filter(p => getProblemStatus(p.id) === 'solved').length}
                </span> / {SAMPLE_PROBLEMS.length}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Total Submissions: {submissions.length}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Problem Selection Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Problems</h2>
              <div className="space-y-3">
                {SAMPLE_PROBLEMS.map((problem) => {
                  const status = getProblemStatus(problem.id);
                  const isSelected = selectedProblem.id === problem.id;
                  
                  return (
                    <button
                      key={problem.id}
                      onClick={() => setSelectedProblem(problem)}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center  justify-between mb-2">
                        <span className="font-medium text-gray-900">{problem.title}</span>
                        {status === 'solved' && <span className="text-green-500 text-lg">✓</span>}
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${getDifficultyColor(problem.difficulty)}`}>
                          {problem.difficulty}
                        </span>
                        <span className="text-xs text-gray-500">
                          {problem.testCases.length} tests
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Recent Submissions */}
              {submissions.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-md font-semibold mb-3">Recent Submissions</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {submissions.slice(0, 8).map((submission) => (
                      <div key={submission.id} className="p-3 bg-gray-50 rounded-lg text-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-gray-900">{submission.problemTitle}</span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            submission.passed 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {submission.passed ? 'SOLVED' : `${submission.passedTests}/${submission.totalTests}`}
                          </span>
                        </div>
                        <div className="text-gray-600 text-xs">
                          {submission.language} • {new Date(submission.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Main IDE Area */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow overflow-hidden">
              {/* Problem Header */}
              <div className="bg-gray-50 border-b p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">{selectedProblem.title}</h2>
                    <div className="flex items-center mt-1 space-x-3">
                      <span className={`text-sm px-2 py-1 rounded-full font-medium ${getDifficultyColor(selectedProblem.difficulty)}`}>
                        {selectedProblem.difficulty}
                      </span>
                      <span className="text-sm text-gray-600">
                        {selectedProblem.testCases.length} test cases
                      </span>
                      {getProblemStatus(selectedProblem.id) === 'solved' && (
                        <span className="text-sm text-green-600 font-medium">✓ Solved</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* IDE Container - Fixed Height */}
              <div style={{ height: '800px' }}>
                <CodeIDE
                  question={selectedProblem.question}
                  testCases={selectedProblem.testCases}
                  onSubmit={handleSubmit}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}