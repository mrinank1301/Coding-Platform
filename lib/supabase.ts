import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface Question {
  id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  test_cases: TestCase[];
  created_at: string;
  created_by: string;
}

export interface TestCase {
  input: string;
  expected_output: string;
  is_hidden: boolean;
}

export interface Submission {
  id: string;
  user_id: string;
  question_id: string;
  code: string;
  language: string;
  status: 'pending' | 'accepted' | 'wrong_answer' | 'runtime_error' | 'time_limit_exceeded';
  test_results: TestResult[];
  created_at: string;
}

export interface TestResult {
  test_case_id: number;
  passed: boolean;
  output?: string;
  error?: string;
}

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'client';
  created_at: string;
}

