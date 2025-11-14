'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import LogoutButton from '@/components/LogoutButton';
import CodeEditor from '@/components/CodeEditor';
import { supabase, Question } from '@/lib/supabase';

const LANGUAGES = [
  { value: 'c', label: 'C' },
  { value: 'cpp', label: 'C++' },
  { value: 'java', label: 'Java' },
  { value: 'python', label: 'Python' },
];

const LANGUAGE_TEMPLATES: Record<string, string> = {
  c: `#include <stdio.h>

int main() {
    // Your code here
    
    return 0;
}`,
  cpp: `#include <iostream>
using namespace std;

int main() {
    // Your code here
    
    return 0;
}`,
  java: `public class Main {
    public static void main(String[] args) {
        // Your code here
    }
}`,
  python: `# Your code here
`,
};

export default function ProblemPage() {
  const params = useParams();
  const router = useRouter();
  const problemId = params.id as string;
  
  const [question, setQuestion] = useState<Question | null>(null);
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('python');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<any>(null);
  const [testCaseTab, setTestCaseTab] = useState<'testcase' | 'result'>('testcase');
  const [selectedTestCaseIndex, setSelectedTestCaseIndex] = useState(0);
  const [testCaseInputs, setTestCaseInputs] = useState<Record<number, string>>({});
  const [editorTestResults, setEditorTestResults] = useState<any>(null);
  const [runningTest, setRunningTest] = useState(false);
  
  // Resizable panel state
  const [leftPanelWidth, setLeftPanelWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const initialXRef = useRef<number>(0);
  const initialWidthRef = useRef<number>(0);

  useEffect(() => {
    fetchQuestion();
    const savedTheme = localStorage.getItem('editor-theme') as 'light' | 'dark' | null;
    if (savedTheme) setTheme(savedTheme);
    const savedWidth = localStorage.getItem('problem-panel-width');
    if (savedWidth) setLeftPanelWidth(parseInt(savedWidth, 10));
  }, [problemId]);

  useEffect(() => {
    localStorage.setItem('editor-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (question) {
      setCode(LANGUAGE_TEMPLATES[language] || '');
      setSubmissionResult(null);
      setEditorTestResults(null);
      setTestCaseTab('testcase');
      setSelectedTestCaseIndex(0);
      if (question.test_cases) {
        const inputs: Record<number, string> = {};
        question.test_cases.forEach((tc, idx) => {
          if (!tc.is_hidden) {
            inputs[idx] = tc.input;
          }
        });
        setTestCaseInputs(inputs);
      }
    }
  }, [language, question]);

  const fetchQuestion = async () => {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('id', problemId)
        .single();

      if (error) throw error;
      setQuestion(data);
      if (data) {
        setCode(LANGUAGE_TEMPLATES[language] || '');
      }
    } catch (error: any) {
      console.error('Error fetching question:', error.message);
      alert('Question not found');
      router.push('/client');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!question || !code.trim()) {
      alert('Please write some code');
      return;
    }

    setSubmitting(true);
    setSubmissionResult(null);
    setTestCaseTab('result');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: question.id,
          code,
          language,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Submission failed');
      }

      const { error: dbError } = await supabase
        .from('submissions')
        .insert([
          {
            user_id: user.id,
            question_id: question.id,
            code,
            language,
            status: result.status,
            test_results: result.testResults,
          },
        ]);

      if (dbError) throw dbError;

      setSubmissionResult(result);
    } catch (error: any) {
      setSubmissionResult({
        status: 'error',
        error: error.message || 'Error submitting code',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRunTest = async () => {
    if (!question || !code.trim()) {
      alert('Please write some code first');
      return;
    }

    const testCase = question.test_cases[selectedTestCaseIndex];
    if (!testCase) return;

    setRunningTest(true);
    setEditorTestResults(null);
    setTestCaseTab('result');

    try {
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: question.id,
          code,
          language,
          singleTestCase: true,
          testCaseInput: testCaseInputs[selectedTestCaseIndex] || testCase.input,
        }),
      });

      const result = await response.json();
      
      // Check if there's an execution error
      if (result.error) {
        // Execution failed (TLE, RTE, CE, etc.)
        setEditorTestResults({
          passed: false,
          status: result.status || 'runtime_error',
          output: result.output || '',
          expected: testCase.expected_output,
          error: result.error,
          errorType: result.errorType || 'RTE',
          testCaseIndex: selectedTestCaseIndex,
          input: testCaseInputs[selectedTestCaseIndex] || testCase.input,
        });
      } else if (result.status === 'accepted' && result.output !== undefined) {
        // Code executed successfully - compare output
        const normalizedOutput = result.output.trim();
        const normalizedExpected = testCase.expected_output.trim();
        const passed = normalizedOutput === normalizedExpected;

        setEditorTestResults({
          passed,
          status: passed ? 'accepted' : 'wrong_answer',
          output: result.output,
          expected: testCase.expected_output,
          error: passed ? undefined : 'Output does not match expected result',
          errorType: passed ? undefined : 'WA',
          testCaseIndex: selectedTestCaseIndex,
          input: testCaseInputs[selectedTestCaseIndex] || testCase.input,
        });
      } else {
        // Unexpected response format
        setEditorTestResults({
          passed: false,
          status: 'runtime_error',
          output: result.output || '',
          expected: testCase.expected_output,
          error: 'Unexpected response from server',
          errorType: 'RTE',
          testCaseIndex: selectedTestCaseIndex,
          input: testCaseInputs[selectedTestCaseIndex] || testCase.input,
        });
      }
    } catch (error) {
      // Network or other errors
      setEditorTestResults({
        passed: false,
        status: 'runtime_error',
        error: error instanceof Error ? error.message : 'Failed to run test',
        errorType: 'RTE',
        testCaseIndex: selectedTestCaseIndex,
        input: testCaseInputs[selectedTestCaseIndex] || testCase.input,
        expected: testCase.expected_output,
      });
    } finally {
      setRunningTest(false);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    initialXRef.current = e.clientX;
    initialWidthRef.current = leftPanelWidth;
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const deltaX = e.clientX - initialXRef.current;
      const newWidth = initialWidthRef.current + deltaX;
      
      const minWidth = 300;
      const maxWidth = window.innerWidth * 0.7;
      const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
      
      setLeftPanelWidth(clampedWidth);
      localStorage.setItem('problem-panel-width', clampedWidth.toString());
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, leftPanelWidth]);

  const getErrorMessage = (error: string, status?: string, errorType?: string) => {
    if (!error && !status && !errorType) return null;
    
    // Use errorType if available (most accurate)
    if (errorType) {
      switch (errorType) {
        case 'TLE':
          return { type: 'TLE', message: 'Time Limit Exceeded', description: error || 'Your code took too long to execute. Try optimizing your algorithm.' };
        case 'RTE':
          return { type: 'RTE', message: 'Runtime Error', description: error || 'An error occurred during execution. Check your code logic.' };
        case 'CE':
          return { type: 'CE', message: 'Compilation Error', description: error || 'There is a syntax error in your code. Please check and fix it.' };
        case 'WA':
          return { type: 'WA', message: 'Wrong Answer', description: error || 'Your output does not match the expected output.' };
        case 'NF':
          return { type: 'NF', message: 'Not Found', description: error || 'A variable or function was not found. Check for typos.' };
        default:
          return { type: errorType, message: errorType, description: error || 'An error occurred.' };
      }
    }
    
    // Fallback to parsing error/status strings
    const errorLower = (error || '').toLowerCase();
    const statusLower = (status || '').toLowerCase();
    
    if (errorLower.includes('time limit') || statusLower.includes('time_limit') || statusLower === 'tle') {
      return { type: 'TLE', message: 'Time Limit Exceeded', description: error || 'Your code took too long to execute. Try optimizing your algorithm.' };
    }
    if (errorLower.includes('runtime') || statusLower.includes('runtime_error') || statusLower === 'rte') {
      return { type: 'RTE', message: 'Runtime Error', description: error || 'An error occurred during execution. Check your code logic.' };
    }
    if (errorLower.includes('compilation') || errorLower.includes('compile') || errorLower.includes('syntax')) {
      return { type: 'CE', message: 'Compilation Error', description: error || 'There is a syntax error in your code. Please check and fix it.' };
    }
    if (errorLower.includes('wrong answer') || statusLower.includes('wrong_answer')) {
      return { type: 'WA', message: 'Wrong Answer', description: error || 'Your output does not match the expected output.' };
    }
    if (errorLower.includes('not found') || errorLower.includes('undefined')) {
      return { type: 'NF', message: 'Not Found', description: error || 'A variable or function was not found. Check for typos.' };
    }
    
    return { type: 'Error', message: 'Error', description: error || 'An error occurred.' };
  };

  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-lg">Loading...</div>
        </div>
      </AuthGuard>
    );
  }

  if (!question) {
    return (
      <AuthGuard>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg text-gray-500 dark:text-gray-400 mb-4">Question not found</p>
            <button
              onClick={() => router.push('/client')}
              className="px-4 py-2 bg-[#ffa116] text-white rounded-md hover:bg-[#ff9800]"
            >
              Back to Problems
            </button>
          </div>
        </div>
      </AuthGuard>
    );
  }

  const visibleTestCasesWithIndices = question.test_cases?.map((tc, idx) => ({ ...tc, originalIndex: idx })).filter(tc => !tc.is_hidden) || [];
  const currentTestCase = question.test_cases?.[selectedTestCaseIndex];

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#f5f5f5] dark:bg-[#1a1a1a]">
        {/* Header */}
        <div className="bg-white dark:bg-[#282828] border-b border-[#e5e5e5] dark:border-[#3d3d3d] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/client')}
              className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#323232] rounded-md transition-colors"
            >
              ← Back to Problems
            </button>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">{question.title}</h1>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${
              question.difficulty === 'easy' 
                ? 'bg-[#00b8a3] text-white' 
                : question.difficulty === 'medium'
                ? 'bg-[#ffc01e] text-white'
                : 'bg-[#ff375f] text-white'
            }`}>
              {question.difficulty.charAt(0).toUpperCase() + question.difficulty.slice(1)}
            </span>
          </div>
          <LogoutButton />
        </div>

        {/* Main Content with Resizable Split */}
        <div ref={containerRef} className="flex h-[calc(100vh-57px)]">
          {/* Left Panel - Problem Description */}
          <div 
            className="bg-white dark:bg-[#1e1e1e] border-r border-[#e5e5e5] dark:border-[#3d3d3d] overflow-y-auto"
            style={{ width: `${leftPanelWidth}px`, minWidth: '300px', maxWidth: '70%' }}
          >
            <div className="p-6">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                  {question.description}
                </div>
              </div>
            </div>
          </div>

          {/* Resize Handle */}
          <div
            onMouseDown={handleMouseDown}
            className={`w-1 bg-[#e5e5e5] dark:bg-[#3d3d3d] cursor-col-resize hover:bg-[#ffa116] dark:hover:bg-[#ffa116] transition-colors ${
              isResizing ? 'bg-[#ffa116]' : ''
            }`}
            style={{ userSelect: 'none' }}
          >
            <div className="h-full w-full flex items-center justify-center">
              <div className="h-12 w-0.5 bg-gray-400 dark:bg-gray-600 rounded"></div>
            </div>
          </div>

          {/* Right Panel - Code Editor and Test Cases */}
          <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-[#1e1e1e]">
            {/* Editor Toolbar */}
            <div className="bg-[#fafafa] dark:bg-[#252525] border-b border-[#e5e5e5] dark:border-[#3d3d3d] px-4 py-2.5 flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Language:</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="px-3 py-1.5 text-sm border border-[#e5e5e5] dark:border-[#3d3d3d] rounded-md bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#ffa116] focus:border-transparent"
                  >
                    {LANGUAGES.map((lang) => (
                      <option key={lang.value} value={lang.value}>
                        {lang.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Theme:</label>
                  <select
                    value={theme}
                    onChange={(e) => setTheme(e.target.value as 'light' | 'dark')}
                    className="px-3 py-1.5 text-sm border border-[#e5e5e5] dark:border-[#3d3d3d] rounded-md bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#ffa116] focus:border-transparent"
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </select>
                </div>
              </div>
              <div className="flex-1" />
              <button
                onClick={handleRunTest}
                disabled={runningTest || !currentTestCase}
                className="px-4 py-1.5 text-sm bg-white dark:bg-[#1e1e1e] border border-[#e5e5e5] dark:border-[#3d3d3d] text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-[#252525] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {runningTest ? 'Running...' : 'Run'}
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-6 py-1.5 text-sm bg-[#ffa116] hover:bg-[#ff9800] text-white font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm hover:shadow-md"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting...
                  </span>
                ) : (
                  'Submit'
                )}
              </button>
            </div>

            {/* Code Editor */}
            <div className="flex-1 overflow-hidden bg-[#fafafa] dark:bg-[#1e1e1e]">
              <div className="h-full p-4">
                <CodeEditor
                  language={language}
                  theme={theme}
                  value={code}
                  onChange={(value) => setCode(value || '')}
                  height="100%"
                />
              </div>
            </div>

            {/* Test Cases Section */}
            <div className="h-64 bg-white dark:bg-[#1e1e1e] border-t border-[#e5e5e5] dark:border-[#3d3d3d] flex flex-col">
              {/* Tabs */}
              <div className="flex border-b border-[#e5e5e5] dark:border-[#3d3d3d]">
                <button
                  onClick={() => setTestCaseTab('testcase')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    testCaseTab === 'testcase'
                      ? 'border-[#ffa116] text-[#ffa116]'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  Testcase
                </button>
                <button
                  onClick={() => setTestCaseTab('result')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    testCaseTab === 'result'
                      ? 'border-[#ffa116] text-[#ffa116]'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  Test Result
                </button>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto p-4">
                {testCaseTab === 'testcase' ? (
                  <div>
                    {visibleTestCasesWithIndices.length > 0 ? (
                      <>
                        <div className="flex gap-2 mb-4 overflow-x-auto">
                          {visibleTestCasesWithIndices.map((tc, idx) => (
                            <button
                              key={tc.originalIndex}
                              onClick={() => setSelectedTestCaseIndex(tc.originalIndex)}
                              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                                selectedTestCaseIndex === tc.originalIndex
                                  ? 'bg-[#ffa116] text-white'
                                  : 'bg-gray-100 dark:bg-[#252525] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#323232]'
                              }`}
                            >
                              Case {idx + 1}
                            </button>
                          ))}
                        </div>
                        {currentTestCase && (
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                              nums =
                            </label>
                            <textarea
                              value={testCaseInputs[selectedTestCaseIndex] || currentTestCase.input}
                              onChange={(e) => setTestCaseInputs({ ...testCaseInputs, [selectedTestCaseIndex]: e.target.value })}
                              className="w-full px-3 py-2 text-sm border border-[#e5e5e5] dark:border-[#3d3d3d] rounded-md bg-white dark:bg-[#252525] text-gray-900 dark:text-gray-100 font-mono resize-none focus:outline-none focus:ring-2 focus:ring-[#ffa116] focus:border-transparent"
                              rows={4}
                              placeholder="Enter test case input"
                            />
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center text-gray-500 dark:text-gray-400 text-sm py-8">
                        No visible test cases available
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    {runningTest ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <svg className="animate-spin h-8 w-8 mx-auto text-[#ffa116] mb-2" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Running test case...</p>
                        </div>
                      </div>
                    ) : editorTestResults ? (
                      <div className="space-y-3">
                        {(() => {
                          const isAccepted = editorTestResults.passed === true || (editorTestResults.status === 'accepted' && !editorTestResults.error);
                          const errorInfo = isAccepted ? null : getErrorMessage(editorTestResults.error, editorTestResults.status, editorTestResults.errorType);
                          
                          return (
                            <div className={`p-4 rounded-lg border-2 ${
                              isAccepted
                                ? 'bg-[#e8f5e9] dark:bg-[#1b3a1f] border-[#4caf50] dark:border-[#4caf50]'
                                : 'bg-[#ffebee] dark:bg-[#3a1f1f] border-[#f44336] dark:border-[#f44336]'
                            }`}>
                              <div className="flex items-center gap-2 mb-3">
                                {isAccepted ? (
                                  <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                ) : (
                                  <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                  </svg>
                                )}
                                <span className={`font-bold text-base ${
                                  isAccepted
                                    ? 'text-green-700 dark:text-green-400'
                                    : 'text-red-700 dark:text-red-400'
                                }`}>
                                  {isAccepted ? 'Accepted ✓' : (errorInfo?.message || 'Wrong Answer')}
                                </span>
                                {errorInfo && !isAccepted && (
                                  <span className="text-xs px-2.5 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg font-bold">
                                    {errorInfo.type}
                                  </span>
                                )}
                              </div>
                              {errorInfo && !isAccepted && (
                                <div className="text-sm text-red-700 dark:text-red-400 mb-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border-l-4 border-red-500">
                                  <strong className="font-semibold">{errorInfo.type}:</strong> {errorInfo.description}
                                </div>
                              )}
                              {editorTestResults.output !== undefined && (
                                <div className="space-y-2 text-sm">
                                  <div className="p-2 bg-white/50 dark:bg-black/20 rounded">
                                    <span className="font-semibold text-gray-700 dark:text-gray-300">Output: </span>
                                    <span className="font-mono text-gray-900 dark:text-gray-100">{editorTestResults.output || '(empty)'}</span>
                                  </div>
                                  {editorTestResults.expected && (
                                    <div className="p-2 bg-white/50 dark:bg-black/20 rounded">
                                      <span className="font-semibold text-gray-700 dark:text-gray-300">Expected: </span>
                                      <span className="font-mono text-gray-900 dark:text-gray-100">{editorTestResults.expected}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    ) : submissionResult ? (
                      <div className="space-y-2">
                        {(() => {
                          const errorInfo = getErrorMessage(submissionResult.error, submissionResult.status, submissionResult.errorType);
                          return (
                            <div className={`p-3 rounded-md border ${
                              submissionResult.status === 'accepted'
                                ? 'bg-[#e8f5e9] dark:bg-[#1b3a1f] border-[#4caf50] dark:border-[#4caf50]'
                                : 'bg-[#ffebee] dark:bg-[#3a1f1f] border-[#f44336] dark:border-[#f44336]'
                            }`}>
                              <div className="flex items-center gap-2 mb-3">
                                {submissionResult.status === 'accepted' ? (
                                  <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                ) : (
                                  <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                  </svg>
                                )}
                                <span className={`font-semibold text-sm ${
                                  submissionResult.status === 'accepted'
                                    ? 'text-green-700 dark:text-green-400'
                                    : 'text-red-700 dark:text-red-400'
                                }`}>
                                  {submissionResult.status === 'accepted' ? 'Accepted' : (errorInfo?.message || submissionResult.status)}
                                </span>
                                {errorInfo && (
                                  <span className="text-xs px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded">
                                    {errorInfo.type}
                                  </span>
                                )}
                              </div>
                              {errorInfo && (
                                <div className="text-xs text-red-600 dark:text-red-400 mb-3 p-2 bg-red-50 dark:bg-red-900/20 rounded">
                                  <strong>{errorInfo.type}:</strong> {errorInfo.description}
                                </div>
                              )}
                              {submissionResult.testResults && (
                                <div className="space-y-2 text-xs">
                                  {submissionResult.testResults.map((result: any, index: number) => {
                                    const testCase = question.test_cases?.[result.test_case_id];
                                    const resultErrorInfo = getErrorMessage(result.error, result.passed ? 'accepted' : 'wrong_answer', result.errorType);
                                    return (
                                      <div key={index} className="p-2 bg-white/50 dark:bg-black/20 rounded">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className={result.passed ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                                            {result.passed ? '✓' : '✗'}
                                          </span>
                                          <span className="font-medium">Test Case {index + 1}</span>
                                          {resultErrorInfo && !result.passed && (
                                            <span className="text-xs px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded">
                                              {resultErrorInfo.type}
                                            </span>
                                          )}
                                        </div>
                                        {resultErrorInfo && !result.passed && (
                                          <div className="text-xs text-red-600 dark:text-red-400 mb-1 ml-6">
                                            {resultErrorInfo.description}
                                          </div>
                                        )}
                                        {!testCase?.is_hidden && (
                                          <div className="text-xs space-y-1 ml-6">
                                            {result.output !== undefined && (
                                              <div>
                                                <span className="text-gray-600 dark:text-gray-400">Output: </span>
                                                <span className="font-mono">{result.output}</span>
                                              </div>
                                            )}
                                            {result.expected && (
                                              <div>
                                                <span className="text-gray-600 dark:text-gray-400">Expected: </span>
                                                <span className="font-mono">{result.expected}</span>
                                              </div>
                                            )}
                                            {result.error && (
                                              <div className="text-red-600 dark:text-red-400">
                                                Error: {result.error}
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    ) : (
                      <div className="text-center text-gray-500 dark:text-gray-400 text-sm py-8">
                        Run code to see test results
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}

