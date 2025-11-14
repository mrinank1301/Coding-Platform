'use client';

import { useEffect, useState, useRef } from 'react';
import AuthGuard from '@/components/AuthGuard';
import LogoutButton from '@/components/LogoutButton';
import CodeEditor from '@/components/CodeEditor';
import { supabase, Question, Submission } from '@/lib/supabase';

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

export default function ClientPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('python');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<any>(null);
  const [questionPanelHeight, setQuestionPanelHeight] = useState(250);
  const [isResizing, setIsResizing] = useState(false);
  const mainContentRef = useRef<HTMLDivElement>(null);
  const initialHeightRef = useRef<number>(0);
  const initialYRef = useRef<number>(0);

  useEffect(() => {
    fetchQuestions();
    // Load saved theme preference
    const savedTheme = localStorage.getItem('editor-theme') as 'light' | 'dark' | null;
    if (savedTheme) setTheme(savedTheme);
    // Load saved panel height preference
    const savedHeight = localStorage.getItem('question-panel-height');
    if (savedHeight) {
      setQuestionPanelHeight(parseInt(savedHeight, 10));
    }
  }, []);

  useEffect(() => {
    // Save theme preference
    localStorage.setItem('editor-theme', theme);
  }, [theme]);

  useEffect(() => {
    // Load template when language changes
    if (selectedQuestion) {
      setCode(LANGUAGE_TEMPLATES[language] || '');
    }
  }, [language, selectedQuestion]);

  const fetchQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuestions(data || []);
      if (data && data.length > 0 && !selectedQuestion) {
        setSelectedQuestion(data[0]);
        setCode(LANGUAGE_TEMPLATES[language] || '');
      }
    } catch (error: any) {
      console.error('Error fetching questions:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedQuestion || !code.trim()) {
      alert('Please select a question and write some code');
      return;
    }

    setSubmitting(true);
    setSubmissionResult(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Submit code to API
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: selectedQuestion.id,
          code,
          language,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Submission failed');
      }

      // Save submission to database
      const { error: dbError } = await supabase
        .from('submissions')
        .insert([
          {
            user_id: user.id,
            question_id: selectedQuestion.id,
            code,
            language,
            status: result.status,
            test_results: result.testResults,
          },
        ]);

      if (dbError) throw dbError;

      setSubmissionResult(result);
    } catch (error: any) {
      alert('Error submitting code: ' + error.message);
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuestionSelect = (question: Question) => {
    setSelectedQuestion(question);
    setCode(LANGUAGE_TEMPLATES[language] || '');
    setSubmissionResult(null);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    if (mainContentRef.current) {
      initialYRef.current = e.clientY;
      initialHeightRef.current = questionPanelHeight;
      setIsResizing(true);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const deltaY = e.clientY - initialYRef.current;
      const newHeight = initialHeightRef.current + deltaY;
      
      // Limit between 200px and 70% of window height
      const minHeight = 200;
      const maxHeight = window.innerHeight * 0.7;
      const clampedHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));
      
      setQuestionPanelHeight(clampedHeight);
      // Save to localStorage
      localStorage.setItem('question-panel-height', clampedHeight.toString());
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ns-resize';
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
  }, [isResizing]);

  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-lg">Loading...</div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="flex h-screen">
          {/* Sidebar */}
          <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-300 dark:border-gray-700 flex flex-col">
            <div className="p-4 border-b border-gray-300 dark:border-gray-700 flex justify-between items-center">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Questions</h1>
              <LogoutButton />
            </div>
            <div className="flex-1 overflow-y-auto">
              {questions.map((question) => (
                <div
                  key={question.id}
                  onClick={() => handleQuestionSelect(question)}
                  className={`p-4 border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                    selectedQuestion?.id === question.id
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-600'
                      : ''
                  }`}
                >
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    {question.title}
                  </h3>
                  <span className={`inline-block px-2 py-1 rounded text-xs ${
                    question.difficulty === 'easy' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                    question.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                    'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }`}>
                    {question.difficulty}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div ref={mainContentRef} className="flex-1 flex flex-col overflow-hidden">
            {/* Question Panel */}
            <div 
              className="bg-white dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700 p-6 overflow-y-auto"
              style={{ height: `${questionPanelHeight}px`, minHeight: '200px', maxHeight: '70vh' }}
            >
              {selectedQuestion ? (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    {selectedQuestion.title}
                  </h2>
                  <div className="prose dark:prose-invert max-w-none">
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {selectedQuestion.description}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">Select a question to start coding</p>
              )}
            </div>

            {/* Resize Handle */}
            <div
              onMouseDown={handleMouseDown}
              className={`h-1 bg-gray-300 dark:bg-gray-700 cursor-ns-resize hover:bg-blue-500 dark:hover:bg-blue-600 transition-colors ${
                isResizing ? 'bg-blue-500 dark:bg-blue-600' : ''
              }`}
              style={{ userSelect: 'none' }}
            >
              <div className="h-full w-full flex items-center justify-center">
                <div className="w-12 h-0.5 bg-gray-400 dark:bg-gray-600"></div>
              </div>
            </div>

            {/* Editor Controls */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700 p-4 flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Language:</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="px-3 py-1 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.value} value={lang.value}>
                      {lang.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Theme:</label>
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value as 'light' | 'dark')}
                  className="px-3 py-1 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>
              <div className="flex-1" />
              <button
                onClick={handleSubmit}
                disabled={submitting || !selectedQuestion}
                className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>

            {/* Code Editor */}
            <div className="flex-1 p-4 overflow-hidden">
              <CodeEditor
                language={language}
                theme={theme}
                value={code}
                onChange={(value) => setCode(value || '')}
                height="100%"
              />
            </div>

            {/* Submission Results */}
            {submissionResult && (
              <div className="bg-white dark:bg-gray-800 border-t border-gray-300 dark:border-gray-700 p-4 max-h-64 overflow-y-auto">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Submission Results</h3>
                <div className={`p-3 rounded ${
                  submissionResult.status === 'accepted'
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                    : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                }`}>
                  <p className="font-medium mb-2">
                    Status: {submissionResult.status === 'accepted' ? '✓ Accepted' : '✗ ' + submissionResult.status}
                  </p>
                  {submissionResult.testResults && (
                    <div className="space-y-2 text-sm">
                      {submissionResult.testResults.map((result: any, index: number) => (
                        <div key={index} className="flex items-center gap-2">
                          <span>{result.passed ? '✓' : '✗'}</span>
                          <span>Test Case {index + 1}: {result.passed ? 'Passed' : 'Failed'}</span>
                          {result.error && <span className="text-xs">({result.error})</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}

