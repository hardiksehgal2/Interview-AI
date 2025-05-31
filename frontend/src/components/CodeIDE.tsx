/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// components/CodeIDE.tsx
"use client"

import React, { useState, useRef } from 'react';
import Editor from '@monaco-editor/react';
import axios from 'axios';

interface TestCase {
  id: number;
  input: string;
  expectedOutput: string;
  description: string;
}

interface Language {
  id: number;
  name: string;
  label: string;
  defaultCode: string;
}

const LANGUAGES: Language[] = [
  {
    id: 71, // Judge0 language ID for Python
    name: 'python',
    label: 'Python 3',
    defaultCode: '# Write your Python code here\nprint("Hello World")'
  },
  {
    id: 62, // Java
    name: 'java',
    label: 'Java',
    defaultCode: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello World");
    }
}`
  },
  {
    id: 63, // JavaScript
    name: 'javascript',
    label: 'JavaScript',
    defaultCode: '// Write your JavaScript code here\nconsole.log("Hello World");'
  },
  {
    id: 54, // C++
    name: 'cpp',
    label: 'C++',
    defaultCode: `#include <iostream>
using namespace std;

int main() {
    cout << "Hello World" << endl;
    return 0;
}`
  },
  {
    id: 50, // C
    name: 'c',
    label: 'C',
    defaultCode: `#include <stdio.h>

int main() {
    printf("Hello World\\n");
    return 0;
}`
  }
];

interface CodeIDEProps {
  question: string;                    // "Write a program to square a number"
  testCases: TestCase[];              // List of tests to check the code
  onSubmit?: (code: string, language: string, results: any, isManualRun?: boolean) => void;
}

const CodeIDE: React.FC<CodeIDEProps> = ({ question, testCases, onSubmit }) => {
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(LANGUAGES[0]);
  const [code, setCode] = useState<string>(LANGUAGES[0].defaultCode);
  const [output, setOutput] = useState<string>('');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [allTestsPassed, setAllTestsPassed] = useState<boolean>(false);
  const editorRef = useRef<any>(null);

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
  };

  const handleLanguageChange = (languageId: string) => {
    const language = LANGUAGES.find(lang => lang.id.toString() === languageId);
    console.log('Selected languageId:', languageId);
    console.log('Matching language object:', language);

    if (language) {
      console.log('Language found. Setting state with:', {
        selectedLanguage: language,
        defaultCode: language.defaultCode,
      });

      setSelectedLanguage(language);
      setCode(language.defaultCode);
      setOutput('');
      setTestResults([]);
      setAllTestsPassed(false);

      console.log('State updated: code, output, test results, allTestsPassed.');
    } else {
      console.warn('No matching language found for languageId:', languageId);
    }

  };

  const executeCode = async (inputData: string = '') => {
    const JUDGE0_API_URL = 'https://judge0-ce.p.rapidapi.com/submissions';
    const RAPIDAPI_KEY = process.env.NEXT_PUBLIC_RAPIDAPI_KEY;

    console.log('🔧 Executing code with Judge0...', {
      language: selectedLanguage.name,
      languageId: selectedLanguage.id,
      input: inputData,
      hasApiKey: !!RAPIDAPI_KEY
    });

    if (!RAPIDAPI_KEY) {
      console.error('❌ No RapidAPI key found!');
      return {
        stdout: '',
        stderr: 'No API key configured. Check your .env.local file.',
        compile_output: '',
        status: { id: 6, description: 'Configuration Error' },
        time: null,
        memory: null,
      };
    }

    try {
      console.log('📤 Submitting code to Judge0...');

      // Submit code for execution
      const submissionResponse = await axios.post(
        `${JUDGE0_API_URL}?base64_encoded=true&wait=false`,
        {
          language_id: selectedLanguage.id,    // 71 = Python, 62 = Java, etc.
          source_code: btoa(code),             // Convert code to base64
          stdin: btoa(inputData),              // Convert input to base64
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-RapidAPI-Key': RAPIDAPI_KEY,
            'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
          },
        }
      );

      const token = submissionResponse.data.token;
      console.log('📝 Submission token:', token);

      // Poll for result
      let result;
      let attempts = 0;
      const maxAttempts = 10;

      console.log('⏳ Waiting for execution result...');

      do {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second

        const resultResponse = await axios.get(
          `${JUDGE0_API_URL}/${token}?base64_encoded=true`,
          {
            headers: {
              'X-RapidAPI-Key': RAPIDAPI_KEY,
              'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
            },
          }
        );

        result = resultResponse.data;
        attempts++;
        console.log(`🔄 Attempt ${attempts}, Status: ${result.status.description}`);
      } while (result.status.id <= 2 && attempts < maxAttempts); // Status 1-2 means still processing

      const finalResult = {
        stdout: result.stdout ? atob(result.stdout) : '',     // What your code printed
        stderr: result.stderr ? atob(result.stderr) : '',     // Any error messages
        compile_output: result.compile_output ? atob(result.compile_output) : '',
        status: result.status,      // Success/failure info
        time: result.time,          // How long it took
        memory: result.memory,      // Memory used
      };

      console.log('✅ Final execution result:', finalResult);
      return finalResult;

    } catch (error: any) {
      console.error('❌ Error executing code:', error);

      if (error.response) {
        console.error('API Response Error:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
      }

      return {
        stdout: '',
        stderr: `Error executing code: ${error.message}`,
        compile_output: '',
        status: { id: 6, description: 'Execution Error' },
        time: null,
        memory: null,
      };
    }
  };

  const runCode = async () => {
    console.log('🟡 Run Code button clicked');
    setIsRunning(true);
    setOutput('Running...');

    try {
      console.log('🔄 Executing code with Judge0...');
      const result = await executeCode();
      console.log('✅ Execution result:', result);

      if (result.status.id === 3) { // Accepted
        setOutput(result.stdout || 'No output');
        console.log('✅ Code executed successfully');

        // 🔥 FIXED: Send execution to backend but don't claim tests passed
        if (onSubmit) {
          console.log('📤 Sending single execution to backend for tracking...');
          const singleResult = [{
            testCase: { id: 0, input: 'manual_run', expectedOutput: 'N/A', description: 'Manual code execution (not a test)' },
            result: result,
            passed: false  // 🔥 FIXED: Manual runs don't count as "tests passed"
          }];
          onSubmit(code, selectedLanguage.name, singleResult, false); // 🔥 Add flag for manual run
        }
      } else {
        const errorOutput = `Error: ${result.status.description}\n\n` +
          `${result.stderr || result.compile_output || 'Unknown error'}`;
        setOutput(errorOutput);
        console.log('❌ Code execution failed:', result.status.description);
      }
    } catch (error) {
      console.error('❌ Error in runCode:', error);
      setOutput('Error running code - Check browser console for details');
    }

    setIsRunning(false);
  };
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const runTests = async () => {
    console.log('🟡 Run Tests button clicked');
    setIsRunning(true);
    setOutput('Running tests...');
  
    const results = [];
    let passedCount = 0;
  
    console.log(`🧪 Running ${testCases.length} test cases...`);
  
    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      setOutput(`Running test ${i + 1}/${testCases.length}...`);
      console.log(`🔄 Test ${i + 1}: Input = "${testCase.input}", Expected = "${testCase.expectedOutput}"`);
  
      // 🔥 ADD DELAY BETWEEN REQUESTS TO AVOID RATE LIMITING
      if (i > 0) {
        console.log('⏳ Waiting 2 seconds before next test...');
        await delay(2000); // Wait 2 seconds between tests
      }
  
      const result = await executeCode(testCase.input);
  
      const passed = result.status.id === 3 &&
        result.stdout?.trim() === testCase.expectedOutput.trim();
  
      if (passed) {
        passedCount++;
        console.log(`✅ Test ${i + 1} PASSED`);
      } else {
        console.log(`❌ Test ${i + 1} FAILED - Got: "${result.stdout?.trim()}", Expected: "${testCase.expectedOutput}"`);
      }
  
      results.push({
        testCase: testCase,
        result: result,
        passed: passed,
      });
    }
  
    setTestResults(results);
    setAllTestsPassed(passedCount === testCases.length);
  
    const summary = `Tests completed: ${passedCount}/${testCases.length} passed`;
    setOutput(summary);
    console.log(`🏁 Test Summary: ${passedCount}/${testCases.length} passed`);
  
    setIsRunning(false);
  
    // Call onSubmit if all tests passed
    if (passedCount === testCases.length && onSubmit) {
      console.log('🎉 All tests passed! Calling onSubmit...');
      onSubmit(code, selectedLanguage.name, results, false);
    }
  };
  

  return (
    <div className="flex  h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Code Challenge</h2>
          <select
            value={selectedLanguage.id}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.id} value={lang.id}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>

        {/* Question */}
        <div className="bg-gray-100 p-4 rounded-md mb-4">
          <h3 className="font-medium text-gray-800 mb-2">Problem Statement:</h3>
          <p className="text-gray-700 whitespace-pre-wrap">{question}</p>
        </div>

        {/* Test Cases */}
        <div className="bg-blue-50 p-4 rounded-md">
          <h3 className="font-medium text-gray-800 mb-2">Test Cases:</h3>
          <div className="space-y-2">
            {testCases.map((testCase) => (
              <div key={testCase.id} className="text-sm">
                <span className="font-medium">Input:</span> "{testCase.input}" |
                <span className="font-medium"> Expected Output:</span> "{testCase.expectedOutput}"
                {testCase.description && (
                  <span className="text-gray-600"> - {testCase.description}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content - Code Editor and Output */}
      <div className="flex flex-1 overflow-hidden">
        {/* Code Editor */}
        <div className="flex-1 flex flex-col bg-white">
          {/* Editor Toolbar */}
          <div className="bg-gray-100 border-b border-gray-200 p-3">
            <div className="flex space-x-2 items-center">
              <button
                onClick={runCode}
                disabled={isRunning}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 font-medium"
              >
                {isRunning ? 'Running...' : '▶ Run Code'}
              </button>
              <button
                onClick={runTests}
                disabled={isRunning}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 font-medium"
              >
                {isRunning ? 'Testing...' : '🧪 Run Tests'}
              </button>
              {allTestsPassed && (
                <div className="px-3 py-2 bg-green-100 text-green-800 rounded font-medium">
                  🎉 All Tests Passed!
                </div>
              )}
            </div>
          </div>

          {/* Monaco Editor */}
          <div className="flex-1 border border-gray-200" style={{ minHeight: '400px' }}>
            <Editor
              height="100%"
              language={selectedLanguage.name}
              value={code}
              onChange={(value) => setCode(value || '')}
              onMount={handleEditorDidMount}
              theme="vs-dark"
              options={{
                fontSize: 14,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                wordWrap: 'on',
                lineNumbers: 'on',
                folding: true,
                suggestOnTriggerCharacters: true,
              }}
            />
          </div>
        </div>

        {/* Output Panel */}
        <div className="w-1/3 bg-white border-l border-gray-200 flex flex-col">
          <div className="bg-gray-100 p-3 border-b border-gray-200">
            <h3 className="font-medium text-gray-800">Output & Test Results</h3>
          </div>

          <div className="flex-1 p-4 overflow-auto">
            <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono mb-4">
              {output}
            </pre>

            {/* Test Results */}
            {testResults.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium text-gray-800 border-b pb-2">Detailed Test Results:</h4>
                {testResults.map((result, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded border ${result.passed
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                      }`}
                  >
                    <div className="flex items-center mb-2">
                      <span
                        className={`w-4 h-4 rounded-full mr-2 ${result.passed ? 'bg-green-500' : 'bg-red-500'
                          }`}
                      ></span>
                      <span className="font-medium">
                        Test Case {index + 1}: {result.passed ? '✅ PASSED' : '❌ FAILED'}
                      </span>
                    </div>

                    <div className="text-xs space-y-1 text-gray-700">
                      <div><strong>Description:</strong> {result.testCase.description}</div>
                      <div><strong>Input:</strong> "{result.testCase.input}"</div>
                      <div><strong>Expected:</strong> "{result.testCase.expectedOutput}"</div>
                      <div><strong>Your Output:</strong> "{result.result.stdout?.trim() || 'No output'}"</div>
                      {!result.passed && result.result.stderr && (
                        <div className="text-red-600"><strong>Error:</strong> {result.result.stderr}</div>
                      )}
                      {result.passed && (
                        <div className="text-green-600"><strong>Status:</strong> Test passed successfully!</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodeIDE;