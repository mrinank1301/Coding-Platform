'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import LogoutButton from '@/components/LogoutButton';
import CodeEditor from '@/components/CodeEditor';
import { supabase, Question } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Play, 
  Send, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  ChevronRight, 
  Code2, 
  Settings, 
  Maximize2,
  Minimize2,
  Loader2,
  Terminal,
  Cpu
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
      
      if (result.error) {
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
    
    if (errorType) {
      switch (errorType) {
        case 'TLE': return { type: 'TLE', message: 'Time Limit Exceeded', description: error || 'Your code took too long to execute.' };
        case 'RTE': return { type: 'RTE', message: 'Runtime Error', description: error || 'An error occurred during execution.' };
        case 'CE': return { type: 'CE', message: 'Compilation Error', description: error || 'Syntax error in your code.' };
        case 'WA': return { type: 'WA', message: 'Wrong Answer', description: error || 'Output does not match expected result.' };
        case 'NF': return { type: 'NF', message: 'Not Found', description: error || 'Variable or function not found.' };
        default: return { type: errorType, message: errorType, description: error || 'An error occurred.' };
      }
    }
    
    const errorLower = (error || '').toLowerCase();
    const statusLower = (status || '').toLowerCase();
    
    if (errorLower.includes('time limit') || statusLower.includes('time_limit') || statusLower === 'tle') {
      return { type: 'TLE', message: 'Time Limit Exceeded', description: error || 'Your code took too long to execute.' };
    }
    if (errorLower.includes('runtime') || statusLower.includes('runtime_error') || statusLower === 'rte') {
      return { type: 'RTE', message: 'Runtime Error', description: error || 'An error occurred during execution.' };
    }
    if (errorLower.includes('compilation') || errorLower.includes('compile') || errorLower.includes('syntax')) {
      return { type: 'CE', message: 'Compilation Error', description: error || 'Syntax error in your code.' };
    }
    if (errorLower.includes('wrong answer') || statusLower.includes('wrong_answer')) {
      return { type: 'WA', message: 'Wrong Answer', description: error || 'Output does not match expected result.' };
    }
    
    return { type: 'Error', message: 'Error', description: error || 'An error occurred.' };
  };

  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen flex items-center justify-center bg-[#030712]">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </AuthGuard>
    );
  }

  if (!question) {
    return (
      <AuthGuard>
        <div className="min-h-screen flex items-center justify-center bg-[#030712]">
          <div className="text-center space-y-4">
            <p className="text-lg text-gray-400">Question not found</p>
            <button
              onClick={() => router.push('/client')}
              className="px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
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
      <div className="min-h-screen bg-[#030712] text-white flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-white/10 bg-[#030712]/80 backdrop-blur-xl px-6 flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-6">
            <button
              onClick={() => router.push('/client')}
              className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors group"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
            </button>
            <div className="flex items-center gap-4">
              <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                {question.title}
              </h1>
              <span className={cn(
                "px-2.5 py-0.5 rounded-full text-xs font-medium border",
                question.difficulty === 'easy' ? "bg-green-500/10 text-green-400 border-green-500/20" :
                question.difficulty === 'medium' ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" :
                "bg-red-500/10 text-red-400 border-red-500/20"
              )}>
                {question.difficulty.charAt(0).toUpperCase() + question.difficulty.slice(1)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/10">
              <Code2 className="w-4 h-4 text-gray-400" />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-transparent border-none text-sm text-gray-300 focus:outline-none cursor-pointer"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.value} value={lang.value} className="bg-[#030712]">
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>
            <LogoutButton />
          </div>
        </header>

        {/* Main Content */}
        <div ref={containerRef} className="flex-1 flex overflow-hidden">
          {/* Left Panel - Problem Description */}
          <div 
            className="bg-[#030712] overflow-y-auto custom-scrollbar"
            style={{ width: `${leftPanelWidth}px`, minWidth: '300px', maxWidth: '70%' }}
          >
            <div className="p-8 space-y-6">
              <div className="prose prose-invert max-w-none prose-headings:text-white prose-p:text-gray-300 prose-strong:text-white prose-code:text-indigo-400 prose-pre:bg-white/5 prose-pre:border prose-pre:border-white/10">
                <div className="whitespace-pre-wrap leading-relaxed">
                  {question.description}
                </div>
              </div>
            </div>
          </div>

          {/* Resize Handle */}
          <div
            onMouseDown={handleMouseDown}
            className={cn(
              "w-1 bg-white/5 hover:bg-indigo-500/50 transition-colors cursor-col-resize flex items-center justify-center group z-10",
              isResizing && "bg-indigo-500/50"
            )}
          >
            <div className="h-8 w-0.5 bg-white/20 group-hover:bg-white/50 rounded-full transition-colors" />
          </div>

          {/* Right Panel - Editor & Test Cases */}
          <div className="flex-1 flex flex-col min-w-0 bg-[#0a0a0a]">
            {/* Code Editor */}
            <div className="flex-1 relative group">
              <div className="absolute inset-0">
                <CodeEditor
                  language={language}
                  theme="dark"
                  value={code}
                  onChange={(value) => setCode(value || '')}
                  height="100%"
                />
              </div>
            </div>

            {/* Bottom Panel - Test Cases & Results */}
            <div className="h-[40%] border-t border-white/10 bg-[#030712] flex flex-col">
              {/* Toolbar */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-white/5">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setTestCaseTab('testcase')}
                    className={cn(
                      "px-4 py-2 text-sm font-medium rounded-lg transition-all relative",
                      testCaseTab === 'testcase' 
                        ? "text-white bg-white/10" 
                        : "text-gray-400 hover:text-white hover:bg-white/5"
                    )}
                  >
                    Test Cases
                    {testCaseTab === 'testcase' && (
                      <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />
                    )}
                  </button>
                  <button
                    onClick={() => setTestCaseTab('result')}
                    className={cn(
                      "px-4 py-2 text-sm font-medium rounded-lg transition-all relative",
                      testCaseTab === 'result' 
                        ? "text-white bg-white/10" 
                        : "text-gray-400 hover:text-white hover:bg-white/5"
                    )}
                  >
                    Test Results
                    {testCaseTab === 'result' && (
                      <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleRunTest}
                    disabled={runningTest || !currentTestCase}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-gray-300 hover:text-white hover:bg-white/5 hover:border-white/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {runningTest ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    Run
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-lg shadow-lg hover:shadow-indigo-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Submit
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <AnimatePresence mode="wait">
                  {testCaseTab === 'testcase' ? (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-6"
                    >
                      {visibleTestCasesWithIndices.length > 0 ? (
                        <>
                          <div className="flex gap-2 overflow-x-auto pb-2">
                            {visibleTestCasesWithIndices.map((tc, idx) => (
                              <button
                                key={tc.originalIndex}
                                onClick={() => setSelectedTestCaseIndex(tc.originalIndex)}
                                className={cn(
                                  "px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap border",
                                  selectedTestCaseIndex === tc.originalIndex
                                    ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/50"
                                    : "bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 hover:text-white"
                                )}
                              >
                                Case {idx + 1}
                              </button>
                            ))}
                          </div>
                          {currentTestCase && (
                            <div className="space-y-2">
                              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Input</label>
                              <div className="relative group">
                                <textarea
                                  value={testCaseInputs[selectedTestCaseIndex] || currentTestCase.input}
                                  onChange={(e) => setTestCaseInputs({ ...testCaseInputs, [selectedTestCaseIndex]: e.target.value })}
                                  className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl p-4 text-sm text-gray-300 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all resize-none"
                                  rows={4}
                                  spellCheck={false}
                                />
                                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Terminal className="w-4 h-4 text-gray-600" />
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-32 text-gray-500">
                          <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
                          <p>No visible test cases available</p>
                        </div>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="h-full"
                    >
                      {runningTest ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4">
                          <div className="relative">
                            <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                            <Cpu className="w-5 h-5 text-indigo-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                          </div>
                          <p className="animate-pulse">Running test case...</p>
                        </div>
                      ) : editorTestResults ? (
                        <div className="space-y-4">
                          {(() => {
                            const isAccepted = editorTestResults.passed === true || (editorTestResults.status === 'accepted' && !editorTestResults.error);
                            const errorInfo = isAccepted ? null : getErrorMessage(editorTestResults.error, editorTestResults.status, editorTestResults.errorType);
                            
                            return (
                              <div className={cn(
                                "rounded-xl border p-6 space-y-4",
                                isAccepted 
                                  ? "bg-green-500/5 border-green-500/20" 
                                  : "bg-red-500/5 border-red-500/20"
                              )}>
                                <div className="flex items-center gap-3">
                                  <div className={cn(
                                    "w-10 h-10 rounded-lg flex items-center justify-center",
                                    isAccepted ? "bg-green-500/10" : "bg-red-500/10"
                                  )}>
                                    {isAccepted ? (
                                      <CheckCircle2 className="w-6 h-6 text-green-500" />
                                    ) : (
                                      <XCircle className="w-6 h-6 text-red-500" />
                                    )}
                                  </div>
                                  <div>
                                    <h3 className={cn(
                                      "text-lg font-bold",
                                      isAccepted ? "text-green-400" : "text-red-400"
                                    )}>
                                      {isAccepted ? 'Accepted' : (errorInfo?.message || 'Wrong Answer')}
                                    </h3>
                                    {errorInfo && !isAccepted && (
                                      <p className="text-sm text-red-400/80 mt-0.5">
                                        {errorInfo.description}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {editorTestResults.output !== undefined && (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                    <div className="space-y-2">
                                      <label className="text-xs font-medium text-gray-500 uppercase">Your Output</label>
                                      <div className="bg-[#0a0a0a] border border-white/10 rounded-lg p-3 font-mono text-sm text-gray-300">
                                        {editorTestResults.output || <span className="text-gray-600 italic">(empty)</span>}
                                      </div>
                                    </div>
                                    {editorTestResults.expected && (
                                      <div className="space-y-2">
                                        <label className="text-xs font-medium text-gray-500 uppercase">Expected Output</label>
                                        <div className="bg-[#0a0a0a] border border-white/10 rounded-lg p-3 font-mono text-sm text-gray-300">
                                          {editorTestResults.expected}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      ) : submissionResult ? (
                        <div className="space-y-6">
                          {(() => {
                            const errorInfo = getErrorMessage(submissionResult.error, submissionResult.status, submissionResult.errorType);
                            const isAccepted = submissionResult.status === 'accepted';

                            return (
                              <div className="space-y-6">
                                <div className="flex items-center gap-3 mb-4">
                                  <div className={cn(
                                    "w-10 h-10 rounded-lg flex items-center justify-center",
                                    isAccepted ? "bg-green-500/10" : "bg-red-500/10"
                                  )}>
                                    {isAccepted ? (
                                      <CheckCircle2 className="w-6 h-6 text-green-500" />
                                    ) : (
                                      <XCircle className="w-6 h-6 text-red-500" />
                                    )}
                                  </div>
                                  <div>
                                    <h3 className={cn(
                                      "text-lg font-bold",
                                      isAccepted ? "text-green-400" : "text-red-400"
                                    )}>
                                      {isAccepted ? 'Accepted' : (errorInfo?.message || 'Wrong Answer')}
                                    </h3>
                                    {errorInfo && (
                                      <p className="text-sm text-red-400/80 mt-0.5">
                                        {errorInfo.description}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {submissionResult.testResults && submissionResult.testResults.length > 0 && (
                                  <div className="space-y-4">
                                    <div className="flex gap-2 overflow-x-auto pb-2">
                                      {submissionResult.testResults.map((result: any, index: number) => (
                                        <button
                                          key={index}
                                          onClick={() => setSelectedTestCaseIndex(index)}
                                          className={cn(
                                            "px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap border flex items-center gap-2",
                                            selectedTestCaseIndex === index
                                              ? "bg-white/10 text-white border-white/20"
                                              : "bg-transparent text-gray-400 border-transparent hover:bg-white/5 hover:text-white"
                                          )}
                                        >
                                          <div className={cn(
                                            "w-2 h-2 rounded-full",
                                            result.passed ? "bg-green-500" : "bg-red-500"
                                          )} />
                                          Case {index + 1}
                                        </button>
                                      ))}
                                    </div>

                                    {(() => {
                                      const result = submissionResult.testResults[selectedTestCaseIndex];
                                      if (!result) return null;
                                      
                                      // Find the input for this test case
                                      // The result has test_case_id which corresponds to the index in the original test cases array
                                      // But we need to be careful if we only have a subset of test cases or if indices match
                                      // For now, let's assume test_case_id is the index in question.test_cases
                                      const input = question.test_cases?.[result.test_case_id]?.input || 'Hidden';
                                      
                                      return (
                                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                          <div className="space-y-2">
                                            <label className="text-xs font-medium text-gray-500 uppercase">Input</label>
                                            <div className="bg-[#0a0a0a] border border-white/10 rounded-lg p-3 font-mono text-sm text-gray-300 whitespace-pre-wrap">
                                              {input}
                                            </div>
                                          </div>
                                          
                                          <div className="space-y-2">
                                            <label className="text-xs font-medium text-gray-500 uppercase">Your Output</label>
                                            <div className={cn(
                                              "bg-[#0a0a0a] border rounded-lg p-3 font-mono text-sm whitespace-pre-wrap",
                                              result.passed ? "border-white/10 text-gray-300" : "border-red-500/20 text-red-400 bg-red-500/5"
                                            )}>
                                              {result.output || <span className="text-gray-600 italic">(empty)</span>}
                                            </div>
                                          </div>

                                          {result.expected && (
                                            <div className="space-y-2">
                                              <label className="text-xs font-medium text-gray-500 uppercase">Expected Output</label>
                                              <div className="bg-[#0a0a0a] border border-white/10 rounded-lg p-3 font-mono text-sm text-gray-300 whitespace-pre-wrap">
                                                {result.expected}
                                              </div>
                                            </div>
                                          )}
                                          
                                          {result.error && (
                                            <div className="space-y-2">
                                              <label className="text-xs font-medium text-red-500 uppercase">Error</label>
                                              <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3 font-mono text-sm text-red-400 whitespace-pre-wrap">
                                                {result.error}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })()}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-32 text-gray-500">
                          <Play className="w-8 h-8 mb-2 opacity-50" />
                          <p>Run code to see results</p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
