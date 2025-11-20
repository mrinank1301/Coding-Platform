'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import ClientLayout from '@/components/dashboard/ClientLayout';
import { supabase, Question } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { Search, Filter, ArrowRight, CheckCircle2, Circle, Clock, BarChart3 } from 'lucide-react';

export default function ClientPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'solved' | 'unsolved'>('all');
  const [solvedProblems, setSolvedProblems] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchQuestions();
    fetchSolvedProblems();
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

  const fetchSolvedProblems = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('submissions')
        .select('question_id, status')
        .eq('user_id', user.id)
        .eq('status', 'accepted');

      if (error) throw error;
      
      const solved = new Set<string>();
      data?.forEach((submission) => {
        solved.add(submission.question_id);
      });
      setSolvedProblems(solved);
    } catch (error) {
      console.error('Error fetching solved problems:', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const filteredQuestions = questions.filter((q) => {
    if (searchQuery && !q.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (difficultyFilter !== 'all' && q.difficulty !== difficultyFilter) return false;
    if (statusFilter === 'solved' && !solvedProblems.has(q.id)) return false;
    if (statusFilter === 'unsolved' && solvedProblems.has(q.id)) return false;
    return true;
  });

  const totalSolved = solvedProblems.size;
  const totalProblems = questions.length;

  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen flex items-center justify-center bg-[#030712]">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <ClientLayout>
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Stats Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-card p-6 rounded-2xl border border-white/5 bg-gradient-to-br from-indigo-500/10 to-purple-500/5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Progress</h3>
                <BarChart3 className="w-5 h-5 text-indigo-400" />
              </div>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-bold text-white">{totalSolved}</span>
                <span className="text-gray-400 mb-1">/ {totalProblems} Solved</span>
              </div>
              <div className="mt-4 h-2 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                  style={{ width: `${totalProblems > 0 ? (totalSolved / totalProblems) * 100 : 0}%` }}
                />
              </div>
            </div>
            
            {/* Add more stats cards here if needed */}
          </div>

          {/* Filters & Search */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search problems..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#030712] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
              />
            </div>
            
            <div className="flex gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
              <select
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value as any)}
                className="bg-[#030712] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                <option value="all">All Difficulty</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-[#030712] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                <option value="all">All Status</option>
                <option value="solved">Solved</option>
                <option value="unsolved">Unsolved</option>
              </select>
            </div>
          </div>

          {/* Problems Grid */}
          <div className="grid grid-cols-1 gap-4">
            {filteredQuestions.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-gray-500" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">No problems found</h3>
                <p className="text-gray-400">Try adjusting your filters or search query</p>
              </div>
            ) : (
              filteredQuestions.map((question, index) => {
                const isSolved = solvedProblems.has(question.id);
                return (
                  <motion.div
                    key={question.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => router.push(`/problem/${question.id}`)}
                    className="group relative bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:border-indigo-500/50 hover:shadow-[0_0_30px_-10px_rgba(99,102,241,0.3)]"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          isSolved ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-gray-400'
                        }`}>
                          {isSolved ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-white group-hover:text-indigo-400 transition-colors">
                            {question.title}
                          </h3>
                          <div className="flex items-center gap-3 mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                              question.difficulty === 'easy' ? 'bg-green-500/10 text-green-400' :
                              question.difficulty === 'medium' ? 'bg-yellow-500/10 text-yellow-400' :
                              'bg-red-500/10 text-red-400'
                            }`}>
                              {question.difficulty.charAt(0).toUpperCase() + question.difficulty.slice(1)}
                            </span>
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              15 mins
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="hidden md:block text-right">
                          <p className="text-sm text-gray-400">Acceptance</p>
                          <p className="text-sm font-medium text-white">76%</p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-all">
                          <ArrowRight className="w-5 h-5" />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>
      </ClientLayout>
    </AuthGuard>
  );
}
