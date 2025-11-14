'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import LogoutButton from '@/components/LogoutButton';
import { supabase, Question } from '@/lib/supabase';

export default function ClientPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'solved' | 'unsolved'>('all');
  const [solvedProblems, setSolvedProblems] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'id' | 'difficulty' | 'title'>('id');

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

  const filteredAndSortedQuestions = questions
    .filter((q) => {
      // Search filter
      if (searchQuery && !q.title.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      // Difficulty filter
      if (difficultyFilter !== 'all' && q.difficulty !== difficultyFilter) {
        return false;
      }
      // Status filter
      if (statusFilter === 'solved' && !solvedProblems.has(q.id)) {
        return false;
      }
      if (statusFilter === 'unsolved' && solvedProblems.has(q.id)) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'id') {
        // Sort by creation order (newest first)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else if (sortBy === 'difficulty') {
        const difficultyOrder = { easy: 1, medium: 2, hard: 3 };
        return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
    } else {
        return a.title.localeCompare(b.title);
      }
    });

  const totalSolved = solvedProblems.size;
  const totalProblems = questions.length;

  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen flex items-center justify-center bg-[#1a1a1a]">
          <div className="text-lg text-white">Loading...</div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0f0f0f] text-white">
        {/* Header */}
        <div className="bg-[#282828] border-b border-[#3d3d3d] px-6 py-5 shadow-lg">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  Problems
                </h1>
                <p className="text-sm text-gray-400 mt-1">
                  Practice coding challenges and improve your skills
                </p>
              </div>
            </div>
            <LogoutButton />
          </div>

          {/* Search and Filters Bar */}
          <div className="flex items-center gap-4 flex-wrap">
            {/* Search */}
            <div className="flex-1 min-w-[300px] relative">
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search questions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-[#1e1e1e] border-2 border-[#3d3d3d] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ffa116] focus:border-transparent transition-all"
              />
            </div>

            {/* Sort */}
            <button
              onClick={() => {
                const options: ('id' | 'difficulty' | 'title')[] = ['id', 'difficulty', 'title'];
                const currentIndex = options.indexOf(sortBy);
                setSortBy(options[(currentIndex + 1) % options.length]);
              }}
              className="px-4 py-3 bg-[#1e1e1e] border-2 border-[#3d3d3d] rounded-xl hover:bg-[#252525] hover:border-[#ffa116] transition-all transform hover:scale-105"
              title={`Sort by: ${sortBy === 'id' ? 'Date' : sortBy === 'difficulty' ? 'Difficulty' : 'Title'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </button>

            {/* Filter */}
            <div className="flex items-center gap-2">
              <select
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value as 'all' | 'easy' | 'medium' | 'hard')}
                className="px-4 py-3 bg-[#1e1e1e] border-2 border-[#3d3d3d] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#ffa116] focus:border-transparent transition-all"
              >
                <option value="all">All Difficulty</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'solved' | 'unsolved')}
                className="px-4 py-3 bg-[#1e1e1e] border-2 border-[#3d3d3d] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#ffa116] focus:border-transparent transition-all"
              >
                <option value="all">All Status</option>
                <option value="solved">Solved</option>
                <option value="unsolved">Unsolved</option>
              </select>
            </div>

            {/* Progress */}
            <div className="flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-[#1e1e1e] to-[#252525] border-2 border-[#3d3d3d] rounded-xl shadow-lg">
              <div className="relative w-10 h-10">
                <svg className="w-10 h-10 transform -rotate-90" viewBox="0 0 36 36">
                  <circle
                    cx="18"
                    cy="18"
                    r="16"
                    fill="none"
                    stroke="#3d3d3d"
                    strokeWidth="3"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="16"
                    fill="none"
                    stroke="#00b8a3"
                    strokeWidth="3"
                    strokeDasharray={`${totalProblems > 0 ? (totalSolved / totalProblems) * 100 : 0} 100`}
                    className="transition-all duration-500"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold text-[#00b8a3]">
                    {totalProblems > 0 ? Math.round((totalSolved / totalProblems) * 100) : 0}%
                  </span>
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white">
                  {totalSolved}/{totalProblems}
                </span>
                <span className="text-xs text-gray-400">Solved</span>
              </div>
            </div>
          </div>
        </div>

        {/* Problems List */}
        <div className="px-6 py-6">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-6 py-4 text-sm font-bold text-gray-400 border-b-2 border-[#3d3d3d] mb-2 bg-[#1e1e1e] rounded-t-xl">
            <div className="col-span-1 flex items-center">
              <span className="flex items-center gap-2">
                Status
              </span>
            </div>
            <div className="col-span-5">Title</div>
            <div className="col-span-2">Acceptance</div>
            <div className="col-span-2">Difficulty</div>
            <div className="col-span-2"></div>
          </div>

          {/* Problems */}
          {filteredAndSortedQuestions.length === 0 ? (
            <div className="bg-[#1e1e1e] border-2 border-[#3d3d3d] rounded-xl p-12 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-gray-800 to-gray-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-300 mb-2">No problems found</h3>
              <p className="text-gray-500">Try adjusting your filters or search query</p>
            </div>
          ) : (
            <div className="bg-[#1e1e1e] border-2 border-[#3d3d3d] rounded-b-xl overflow-hidden">
              {filteredAndSortedQuestions.map((question, index) => {
                const isSolved = solvedProblems.has(question.id);
                const acceptanceRate = 75.5; // Placeholder - can be calculated from submissions later
                
                return (
                  <div
                    key={question.id}
                    onClick={() => router.push(`/problem/${question.id}`)}
                    className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-[#252525] cursor-pointer border-b border-[#3d3d3d] last:border-b-0 transition-all group"
                  >
                    {/* Status */}
                    <div className="col-span-1 flex items-center">
                      {isSolved ? (
                        <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center group-hover:bg-green-500/30 transition-colors">
                          <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                      ) : (
                        <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
                          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Title */}
                    <div className="col-span-5 flex items-center gap-3">
                      <span className="text-gray-500 text-sm font-medium min-w-[2rem]">{index + 1}.</span>
                      <span className="text-white group-hover:text-[#ffa116] transition-colors font-medium">
                        {question.title}
                      </span>
                    </div>

                    {/* Acceptance Rate */}
                    <div className="col-span-2 flex items-center">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-[#3d3d3d] rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-[#00b8a3] transition-all duration-500"
                            style={{ width: `${acceptanceRate}%` }}
                          />
                        </div>
                        <span className="text-gray-400 text-sm font-medium min-w-[3rem]">
                          {acceptanceRate.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    {/* Difficulty */}
                    <div className="col-span-2 flex items-center">
                      <span className={`text-sm font-bold px-3 py-1 rounded-lg ${
                        question.difficulty === 'easy'
                          ? 'bg-[#00b8a3]/20 text-[#00b8a3]'
                          : question.difficulty === 'medium'
                          ? 'bg-[#ffc01e]/20 text-[#ffc01e]'
                          : 'bg-[#ff375f]/20 text-[#ff375f]'
                      }`}>
                        {question.difficulty === 'easy' ? 'Easy' : 
                         question.difficulty === 'medium' ? 'Medium' : 'Hard'}
                      </span>
                    </div>

                    {/* Arrow Icon */}
                    <div className="col-span-2 flex items-center justify-end">
                      <svg className="w-5 h-5 text-gray-500 group-hover:text-[#ffa116] group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
