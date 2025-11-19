-- Migration: Add test_case_ranges support to questions table
-- This allows admins to define dynamic test case ranges (up to 1000 test cases)

-- Add test_case_ranges column to questions table
ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS test_case_ranges JSONB DEFAULT '[]'::jsonb;

-- Add comment explaining the structure
COMMENT ON COLUMN public.questions.test_case_ranges IS 
'Array of test case range objects. Each range has: {start: number, end: number, generator?: string}. 
Total test cases (static + generated) cannot exceed 1000.';

-- Example structure:
-- test_case_ranges: [
--   { "start": 1, "end": 100, "generator": "optional generator function" },
--   { "start": 101, "end": 200 }
-- ]

