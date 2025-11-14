'use client';

import { useEffect, useState } from 'react';
import AuthGuard from '@/components/AuthGuard';
import LogoutButton from '@/components/LogoutButton';
import { supabase, Question, TestCase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    difficulty: 'easy' as 'easy' | 'medium' | 'hard',
    testCases: [{ input: '', expected_output: '', is_hidden: false }] as TestCase[],
  });

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuestions(data || []);
    } catch (error) {
      console.error('Error fetching questions:', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const questionData = {
        title: formData.title,
        description: formData.description,
        difficulty: formData.difficulty,
        test_cases: formData.testCases,
        created_by: user.id,
      };

      if (editingQuestion) {
        const { error } = await supabase
          .from('questions')
          .update(questionData)
          .eq('id', editingQuestion.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('questions')
          .insert([questionData]);
        if (error) throw error;
      }

      setShowForm(false);
      setEditingQuestion(null);
      setFormData({
        title: '',
        description: '',
        difficulty: 'easy',
        testCases: [{ input: '', expected_output: '', is_hidden: false }],
      });
      fetchQuestions();
    } catch (error) {
      alert('Error saving question: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (question: Question) => {
    setEditingQuestion(question);
    setFormData({
      title: question.title,
      description: question.description,
      difficulty: question.difficulty,
      testCases: question.test_cases,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this question? This will also delete all related submissions. This action cannot be undone.')) return;

    try {
      // First check if user is admin
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('You must be logged in to delete questions');
        return;
      }

      // Check user role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!profile || profile.role !== 'admin') {
        alert('Only admins can delete questions');
        return;
      }

      // First, delete all submissions related to this question
      // Note: This requires the "Admins can delete submissions" policy in the database
      const { error: submissionsError, data: deletedSubmissions } = await supabase
        .from('submissions')
        .delete()
        .eq('question_id', id)
        .select();

      if (submissionsError) {
        console.error('Error deleting submissions:', submissionsError);
        // If it's a permission error, provide helpful message
        const errorMsg = submissionsError.message || JSON.stringify(submissionsError);
        if (errorMsg.includes('policy') || errorMsg.includes('permission') || errorMsg.includes('RLS')) {
          throw new Error('Permission denied: Admins need a database policy to delete submissions. Please run the migration_add_admin_delete_submissions.sql script in your Supabase SQL editor.');
        }
        // Continue anyway - might be no submissions or other non-critical error
      } else {
        console.log(`Deleted ${deletedSubmissions?.length || 0} submissions for question ${id}`);
      }

      // Then delete the question
      const { data, error } = await supabase
        .from('questions')
        .delete()
        .eq('id', id)
        .select();

      if (error) {
        console.error('Delete error:', error);
        // Check if it's a foreign key constraint error
        if (error.message && error.message.includes('foreign key')) {
          throw new Error('Cannot delete question: It has related submissions. Please delete submissions first or contact database administrator.');
        }
        throw error;
      }

      if (data && data.length > 0) {
        // Success - refresh the list
        fetchQuestions();
      } else {
        alert('Question not found or already deleted');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error deleting question:', error);
      
      // Provide more helpful error messages
      let userMessage = `Error deleting question: ${errorMessage}`;
      
      if (errorMessage.includes('foreign key')) {
        userMessage = 'Cannot delete this question because it has related submissions. The system attempted to delete them automatically but failed. Please contact your database administrator.';
      } else if (errorMessage.includes('permission') || errorMessage.includes('policy')) {
        userMessage = 'Permission denied. Please ensure:\n1. You are logged in as an admin\n2. Your database RLS policies allow deletion\n3. You have the correct permissions';
      }
      
      alert(userMessage);
    }
  };

  const addTestCase = () => {
    setFormData({
      ...formData,
      testCases: [...formData.testCases, { input: '', expected_output: '', is_hidden: false }],
    });
  };

  const removeTestCase = (index: number) => {
    setFormData({
      ...formData,
      testCases: formData.testCases.filter((_, i) => i !== index),
    });
  };

  const updateTestCase = (index: number, field: keyof TestCase, value: string | boolean) => {
    const updated = [...formData.testCases];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, testCases: updated });
  };

  return (
    <AuthGuard requiredRole="admin">
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-[#0a0a0a] dark:via-[#1a1a1a] dark:to-[#0f0f0f]">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          {/* Header */}
          <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-xl border border-gray-200 dark:border-[#3d3d3d] p-6 mb-8">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                    Admin Panel
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Manage coding problems and test cases
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowForm(!showForm)}
                  className={`px-6 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl ${
                    showForm
                      ? 'bg-gray-200 dark:bg-[#3d3d3d] text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-[#4d4d4d]'
                      : 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600'
                  }`}
                >
                  {showForm ? (
                    <span className="flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Cancel
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Question
                    </span>
                  )}
                </button>
                <LogoutButton />
              </div>
            </div>
          </div>

          {showForm && (
            <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-2xl border border-gray-200 dark:border-[#3d3d3d] p-8 mb-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {editingQuestion ? 'Edit Question' : 'Create New Question'}
                </h2>
              </div>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Question Title
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 dark:border-[#3d3d3d] rounded-xl bg-white dark:bg-[#252525] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#ffa116] focus:border-transparent transition-all"
                    placeholder="Enter question title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    required
                    rows={8}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 dark:border-[#3d3d3d] rounded-xl bg-white dark:bg-[#252525] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#ffa116] focus:border-transparent transition-all resize-none"
                    placeholder="Enter problem description..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Difficulty Level
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {(['easy', 'medium', 'hard'] as const).map((diff) => (
                      <button
                        key={diff}
                        type="button"
                        onClick={() => setFormData({ ...formData, difficulty: diff })}
                        className={`px-4 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 ${
                          formData.difficulty === diff
                            ? diff === 'easy'
                              ? 'bg-[#00b8a3] text-white shadow-lg scale-105'
                              : diff === 'medium'
                              ? 'bg-[#ffc01e] text-white shadow-lg scale-105'
                              : 'bg-[#ff375f] text-white shadow-lg scale-105'
                            : 'bg-gray-100 dark:bg-[#252525] text-gray-700 dark:text-gray-300 border-2 border-gray-300 dark:border-[#3d3d3d]'
                        }`}
                      >
                        {diff.charAt(0).toUpperCase() + diff.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-4">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Test Cases ({formData.testCases.length})
                    </label>
                    <button
                      type="button"
                      onClick={addTestCase}
                      className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all transform hover:scale-105 shadow-lg hover:shadow-xl font-semibold flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Test Case
                    </button>
                  </div>
                  <div className="space-y-4">
                    {formData.testCases.map((testCase, index) => (
                      <div key={index} className="p-5 border-2 border-gray-200 dark:border-[#3d3d3d] rounded-xl bg-gradient-to-br from-gray-50 to-white dark:from-[#252525] dark:to-[#1e1e1e] hover:border-[#ffa116] dark:hover:border-[#ffa116] transition-all">
                        <div className="flex justify-between items-center mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                              {index + 1}
                            </div>
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">
                              Test Case {index + 1}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeTestCase(index)}
                            className="px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors font-medium text-sm flex items-center gap-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Remove
                          </button>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Input</label>
                            <textarea
                              required
                              rows={3}
                              value={testCase.input}
                              onChange={(e) => updateTestCase(index, 'input', e.target.value)}
                              className="w-full px-3 py-2 text-sm border-2 border-gray-300 dark:border-[#3d3d3d] rounded-lg bg-white dark:bg-[#252525] text-gray-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-[#ffa116] focus:border-transparent transition-all resize-none"
                              placeholder="Enter input (e.g., [2,7,11,15], 9)"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Expected Output</label>
                            <textarea
                              required
                              rows={3}
                              value={testCase.expected_output}
                              onChange={(e) => updateTestCase(index, 'expected_output', e.target.value)}
                              className="w-full px-3 py-2 text-sm border-2 border-gray-300 dark:border-[#3d3d3d] rounded-lg bg-white dark:bg-[#252525] text-gray-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-[#ffa116] focus:border-transparent transition-all resize-none"
                              placeholder="Enter expected output (e.g., [0,1])"
                            />
                          </div>
                          <div className="flex items-center gap-2 p-3 bg-gray-100 dark:bg-[#252525] rounded-lg">
                            <input
                              type="checkbox"
                              id={`hidden-${index}`}
                              checked={testCase.is_hidden}
                              onChange={(e) => updateTestCase(index, 'is_hidden', e.target.checked)}
                              className="w-5 h-5 text-[#ffa116] border-gray-300 dark:border-[#3d3d3d] rounded focus:ring-2 focus:ring-[#ffa116]"
                            />
                            <label htmlFor={`hidden-${index}`} className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                              Hide from users (premium test case)
                            </label>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-6 py-4 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-xl hover:shadow-2xl flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>{editingQuestion ? 'Update Question' : 'Create Question'}</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Questions List */}
          <div className="space-y-4">
            {questions.length === 0 ? (
              <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-xl border border-gray-200 dark:border-[#3d3d3d] p-12 text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-[#3d3d3d] dark:to-[#2d2d2d] rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No questions yet</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">Create your first coding problem to get started!</p>
                <button
                  onClick={() => setShowForm(true)}
                  className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:from-orange-600 hover:to-red-600 transition-all transform hover:scale-105 shadow-lg hover:shadow-xl font-semibold"
                >
                  Create First Question
                </button>
              </div>
            ) : (
              <div className="grid gap-6">
                {questions.map((question) => (
                  <div
                    key={question.id}
                    className="bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-xl border border-gray-200 dark:border-[#3d3d3d] overflow-hidden hover:shadow-2xl transition-all"
                  >
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white font-bold">
                              Q
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                {question.title}
                              </h3>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Created {new Date(question.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold ${
                              question.difficulty === 'easy' 
                                ? 'bg-[#00b8a3] text-white' 
                                : question.difficulty === 'medium'
                                ? 'bg-[#ffc01e] text-white'
                                : 'bg-[#ff375f] text-white'
                            }`}>
                              {question.difficulty.charAt(0).toUpperCase() + question.difficulty.slice(1)}
                            </span>
                          </div>
                          <p className="text-gray-600 dark:text-gray-400 mb-6 line-clamp-2">{question.description}</p>
                          
                          {/* Test Cases Display */}
                          <div className="bg-gradient-to-br from-gray-50 to-white dark:from-[#252525] dark:to-[#1e1e1e] rounded-xl p-4 border border-gray-200 dark:border-[#3d3d3d]">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <svg className="w-5 h-5 text-[#ffa116]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Test Cases ({question.test_cases.length})
                              </h4>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {question.test_cases.map((testCase, index) => (
                                <div
                                  key={index}
                                  className="p-3 border-2 border-gray-200 dark:border-[#3d3d3d] rounded-lg bg-white dark:bg-[#1e1e1e]"
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-bold text-gray-900 dark:text-white">
                                      Case {index + 1}
                                    </span>
                                    {testCase.is_hidden && (
                                      <span className="text-xs px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded font-semibold">
                                        🔒 Hidden
                                      </span>
                                    )}
                                  </div>
                                  {!testCase.is_hidden && (
                                    <div className="space-y-1.5 text-xs">
                                      <div>
                                        <span className="font-semibold text-gray-600 dark:text-gray-400">Input: </span>
                                        <span className="font-mono text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-[#252525] px-2 py-0.5 rounded">
                                          {testCase.input.length > 30 ? testCase.input.substring(0, 30) + '...' : testCase.input}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="font-semibold text-gray-600 dark:text-gray-400">Output: </span>
                                        <span className="font-mono text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-[#252525] px-2 py-0.5 rounded">
                                          {testCase.expected_output.length > 30 ? testCase.expected_output.substring(0, 30) + '...' : testCase.expected_output}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 ml-4">
                          <button
                            onClick={() => handleEdit(question)}
                            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all transform hover:scale-105 shadow-lg hover:shadow-xl font-semibold text-sm flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(question.id)}
                            className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all transform hover:scale-105 shadow-lg hover:shadow-xl font-semibold text-sm flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}

