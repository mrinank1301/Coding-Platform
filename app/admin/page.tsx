"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import AdminLayout from "@/components/dashboard/AdminLayout";
import { supabase, Question, TestCase, TestCaseRange } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Save, 
  X, 
  Check, 
  ChevronDown, 
  ChevronUp,
  AlertCircle,
  Code2,
  TestTube,
  Layers,
  BarChart3
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Form State
  const [formData, setFormData] = useState<{
    id?: string;
    title: string;
    description: string;
    difficulty: "easy" | "medium" | "hard";
    test_cases: TestCase[];
    test_case_ranges: TestCaseRange[];
  }>({
    title: "",
    description: "",
    difficulty: "easy",
    test_cases: [],
    test_case_ranges: []
  });

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from("questions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setQuestions(data || []);
    } catch (error) {
      console.error("Error fetching questions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Validate total test cases
      const staticCount = formData.test_cases.length;
      const rangeCount = formData.test_case_ranges.reduce((sum, range) => sum + (range.end - range.start + 1), 0);
      const totalCount = staticCount + rangeCount;
      
      if (totalCount > 1000) {
        alert(`Total test cases (${totalCount}) cannot exceed 1000.`);
        return;
      }

      const questionData = {
        title: formData.title,
        description: formData.description,
        difficulty: formData.difficulty,
        test_cases: formData.test_cases,
        test_case_ranges: formData.test_case_ranges,
        created_by: user.id,
      };

      if (isEditing && formData.id) {
        const { error } = await supabase
          .from("questions")
          .update(questionData)
          .eq("id", formData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("questions")
          .insert([questionData]);
        if (error) throw error;
      }

      setShowForm(false);
      setIsEditing(false);
      resetForm();
      fetchQuestions();
    } catch (error) {
      console.error("Error saving question:", error);
      alert("Error saving question");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this question?")) return;

    try {
      const { error } = await supabase
        .from("questions")
        .delete()
        .eq("id", id);

      if (error) throw error;
      fetchQuestions();
    } catch (error) {
      console.error("Error deleting question:", error);
      alert("Error deleting question. It might have related submissions.");
    }
  };

  const handleEdit = (question: Question) => {
    setFormData({
      id: question.id,
      title: question.title,
      description: question.description,
      difficulty: question.difficulty,
      test_cases: question.test_cases || [],
      test_case_ranges: question.test_case_ranges || [],
    });
    setIsEditing(true);
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      difficulty: "easy",
      test_cases: [],
      test_case_ranges: []
    });
  };

  // Test Case Helpers
  const addTestCase = () => {
    setFormData({
      ...formData,
      test_cases: [...formData.test_cases, { input: "", expected_output: "", is_hidden: false }]
    });
  };

  const updateTestCase = (index: number, field: keyof TestCase, value: any) => {
    const newTestCases = [...formData.test_cases];
    newTestCases[index] = { ...newTestCases[index], [field]: value };
    setFormData({ ...formData, test_cases: newTestCases });
  };

  const removeTestCase = (index: number) => {
    setFormData({
      ...formData,
      test_cases: formData.test_cases.filter((_, i) => i !== index)
    });
  };

  // Range Helpers
  const addTestCaseRange = () => {
    setFormData({
      ...formData,
      test_case_ranges: [...formData.test_case_ranges, { start: 1, end: 10 }]
    });
  };

  const updateTestCaseRange = (index: number, field: keyof TestCaseRange, value: any) => {
    const newRanges = [...formData.test_case_ranges];
    newRanges[index] = { ...newRanges[index], [field]: value };
    setFormData({ ...formData, test_case_ranges: newRanges });
  };

  const removeTestCaseRange = (index: number) => {
    setFormData({
      ...formData,
      test_case_ranges: formData.test_case_ranges.filter((_, i) => i !== index)
    });
  };

  const filteredQuestions = questions.filter(q => 
    q.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <AuthGuard requiredRole="admin">
        <div className="min-h-screen flex items-center justify-center bg-[#030712]">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard requiredRole="admin">
      <AdminLayout>
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Stats Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-card p-6 rounded-2xl border border-white/5 bg-gradient-to-br from-indigo-500/10 to-purple-500/5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Total Questions</h3>
                <Code2 className="w-5 h-5 text-indigo-400" />
              </div>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-bold text-white">{questions.length}</span>
                <span className="text-gray-400 mb-1">Problems</span>
              </div>
            </div>
          </div>

          {/* Header & Actions */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Manage Problems</h1>
              <p className="text-gray-400 mt-1">Create and edit coding challenges</p>
            </div>
            <button
              onClick={() => {
                setIsEditing(false);
                resetForm();
                setShowForm(true);
              }}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-indigo-500/25 transform hover:scale-105 active:scale-95"
            >
              <Plus className="w-5 h-5" />
              Add Question
            </button>
          </div>

          {/* Search */}
          {!showForm && (
            <div className="relative bg-white/5 p-1 rounded-2xl border border-white/10 backdrop-blur-sm">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search questions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#030712]/50 border-none rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
              />
            </div>
          )}

          {/* Form or List */}
          <AnimatePresence mode="wait">
            {showForm ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white/5 border border-white/10 rounded-2xl p-8 space-y-8 backdrop-blur-xl"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-6">
                  <h2 className="text-xl font-semibold text-white">
                    {isEditing ? "Edit Question" : "New Question"}
                  </h2>
                  <button
                    onClick={() => setShowForm(false)}
                    className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Left Column: Basic Info */}
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-300">Title</label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="w-full bg-[#030712] border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                        placeholder="e.g. Two Sum"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-300">Difficulty</label>
                      <select
                        value={formData.difficulty}
                        onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as any })}
                        className="w-full bg-[#030712] border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                      >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-300">Description (Markdown)</label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full h-96 bg-[#030712] border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 font-mono text-sm resize-none transition-all"
                        placeholder="Problem description..."
                      />
                    </div>
                  </div>

                  {/* Right Column: Test Cases */}
                  <div className="space-y-8">
                    {/* Static Test Cases */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                          <TestTube className="w-4 h-4" />
                          Static Test Cases
                        </label>
                        <button
                          onClick={addTestCase}
                          className="text-sm text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
                        >
                          <Plus className="w-4 h-4" />
                          Add Case
                        </button>
                      </div>

                      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {formData.test_cases.map((testCase, index) => (
                          <div key={index} className="bg-[#030712]/50 border border-white/10 rounded-xl p-4 space-y-4 relative group hover:border-indigo-500/30 transition-all">
                            <button
                              onClick={() => removeTestCase(index)}
                              className="absolute top-2 right-2 p-1.5 hover:bg-red-500/20 text-gray-500 hover:text-red-400 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <label className="text-xs text-gray-500">Input</label>
                                <textarea
                                  value={testCase.input}
                                  onChange={(e) => updateTestCase(index, "input", e.target.value)}
                                  className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-sm text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                                  rows={2}
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs text-gray-500">Output</label>
                                <textarea
                                  value={testCase.expected_output}
                                  onChange={(e) => updateTestCase(index, "expected_output", e.target.value)}
                                  className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-sm text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                                  rows={2}
                                />
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id={`hidden-${index}`}
                                checked={testCase.is_hidden}
                                onChange={(e) => updateTestCase(index, "is_hidden", e.target.checked)}
                                className="rounded border-white/10 bg-white/5 text-indigo-500 focus:ring-indigo-500/50"
                              />
                              <label htmlFor={`hidden-${index}`} className="text-sm text-gray-400 select-none cursor-pointer">
                                Hidden Test Case
                              </label>
                            </div>
                          </div>
                        ))}
                        {formData.test_cases.length === 0 && (
                          <div className="text-center py-8 border border-dashed border-white/10 rounded-xl text-gray-500 text-sm">
                            No static test cases added
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Dynamic Ranges */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                          <Layers className="w-4 h-4" />
                          Dynamic Ranges
                        </label>
                        <button
                          onClick={addTestCaseRange}
                          className="text-sm text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1"
                        >
                          <Plus className="w-4 h-4" />
                          Add Range
                        </button>
                      </div>

                      <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {formData.test_case_ranges.map((range, index) => (
                          <div key={index} className="bg-[#030712]/50 border border-white/10 rounded-xl p-4 space-y-4 relative group hover:border-purple-500/30 transition-all">
                            <button
                              onClick={() => removeTestCaseRange(index)}
                              className="absolute top-2 right-2 p-1.5 hover:bg-red-500/20 text-gray-500 hover:text-red-400 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <label className="text-xs text-gray-500">Start Index</label>
                                <input
                                  type="number"
                                  value={range.start}
                                  onChange={(e) => updateTestCaseRange(index, "start", parseInt(e.target.value) || 0)}
                                  className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-sm text-white font-mono focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs text-gray-500">End Index</label>
                                <input
                                  type="number"
                                  value={range.end}
                                  onChange={(e) => updateTestCaseRange(index, "end", parseInt(e.target.value) || 0)}
                                  className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-sm text-white font-mono focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                                />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="text-xs text-gray-500">Generator Script (Optional)</label>
                              <textarea
                                value={range.generator || ""}
                                onChange={(e) => updateTestCaseRange(index, "generator", e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-sm text-white font-mono focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                                rows={2}
                                placeholder="// JS code to generate cases"
                              />
                            </div>
                          </div>
                        ))}
                        {formData.test_case_ranges.length === 0 && (
                          <div className="text-center py-8 border border-dashed border-white/10 rounded-xl text-gray-500 text-sm">
                            No dynamic ranges added
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-4 pt-6 border-t border-white/10">
                  <button
                    onClick={() => setShowForm(false)}
                    className="px-6 py-2.5 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-indigo-500/25 flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Save Question
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 gap-4"
              >
                {filteredQuestions.map((question, index) => (
                  <motion.div
                    key={question.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group relative bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-6 transition-all duration-300 hover:border-indigo-500/50 hover:shadow-[0_0_30px_-10px_rgba(99,102,241,0.3)]"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center group-hover:from-indigo-500/20 group-hover:to-purple-500/20 transition-all">
                          <Code2 className="w-6 h-6 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-white group-hover:text-indigo-400 transition-colors">
                            {question.title}
                          </h3>
                          <div className="flex items-center gap-3 mt-1">
                            <span className={cn(
                              "text-xs px-2 py-0.5 rounded-md font-medium",
                              question.difficulty === "easy" ? "bg-green-500/10 text-green-400" :
                              question.difficulty === "medium" ? "bg-yellow-500/10 text-yellow-400" :
                              "bg-red-500/10 text-red-400"
                            )}>
                              {question.difficulty.toUpperCase()}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(question.created_at).toLocaleDateString()}
                            </span>
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <TestTube className="w-3 h-3" />
                              {question.test_cases?.length || 0} cases
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEdit(question)}
                          className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(question.id)}
                          className="p-2 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}

                {filteredQuestions.length === 0 && (
                  <div className="text-center py-20">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Search className="w-8 h-8 text-gray-500" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">No questions found</h3>
                    <p className="text-gray-400">Try creating a new one</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </AdminLayout>
    </AuthGuard>
  );
}
