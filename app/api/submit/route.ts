import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Judge0 API Types
interface Judge0Status {
  id: number;
  description: string;
}

interface Judge0Result {
  status: Judge0Status;
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  message: string | null;
}

interface TestResult {
  test_case_id: number;
  passed: boolean;
  output?: string;
  expected?: string;
  error?: string;
}

// Judge0 API Configuration
const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY;
const JUDGE0_API_URL = process.env.JUDGE0_API_URL || 'https://judge0-ce.p.rapidapi.com';
const USE_RAPIDAPI = JUDGE0_API_URL.includes('rapidapi.com');

// Map language codes to Judge0 language IDs
function getLanguageId(language: string): number {
  const languageMap: Record<string, number> = {
    'c': 50,
    'cpp': 54,
    'java': 62,
    'python': 71,
  };
  return languageMap[language.toLowerCase()] || 71; // Default to Python
}

// Create a submission in Judge0
async function createSubmission(code: string, language: string, input: string): Promise<string> {
  const languageId = getLanguageId(language);
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (USE_RAPIDAPI) {
    headers['X-RapidAPI-Key'] = JUDGE0_API_KEY || '';
    headers['X-RapidAPI-Host'] = 'judge0-ce.p.rapidapi.com';
  } else {
    headers['Authorization'] = `Bearer ${JUDGE0_API_KEY}`;
  }

  const response = await fetch(`${JUDGE0_API_URL}/submissions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      source_code: code,
      language_id: languageId,
      stdin: input,
      cpu_time_limit: 2, // 2 seconds
      memory_limit: 128000, // 128 MB
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create submission: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.token;
}

// Get submission result from Judge0
async function getSubmissionResult(token: string): Promise<Judge0Result> {
  const headers: Record<string, string> = {};

  if (USE_RAPIDAPI) {
    headers['X-RapidAPI-Key'] = JUDGE0_API_KEY || '';
    headers['X-RapidAPI-Host'] = 'judge0-ce.p.rapidapi.com';
  } else {
    headers['Authorization'] = `Bearer ${JUDGE0_API_KEY}`;
  }

  const response = await fetch(`${JUDGE0_API_URL}/submissions/${token}`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get submission result: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

// Poll for submission result (status 1 = In Queue, 2 = Processing)
async function waitForResult(token: string, maxAttempts = 30): Promise<Judge0Result> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = await getSubmissionResult(token);
    
    // Status 1 = In Queue, 2 = Processing
    if (result.status?.id !== 1 && result.status?.id !== 2) {
      return result;
    }
    
    // Wait before next poll (exponential backoff)
    await new Promise(resolve => setTimeout(resolve, Math.min(1000 * (attempt + 1), 2000)));
  }
  
  throw new Error('Submission timeout: Code execution took too long');
}

// Execute code using Judge0 API
async function executeCode(code: string, language: string, input: string): Promise<{ output: string; error?: string }> {
  if (!JUDGE0_API_KEY) {
    return {
      output: '',
      error: 'Judge0 API key not configured. Please set JUDGE0_API_KEY in your environment variables.',
    };
  }

  try {
    // Create submission
    const token = await createSubmission(code, language, input);
    
    // Poll for result
    const result = await waitForResult(token);
    
    // Judge0 status codes:
    // 3 = Accepted (success)
    // 4 = Wrong Answer
    // 5 = Time Limit Exceeded
    // 6 = Compilation Error
    // 7 = Runtime Error (SIGSEGV)
    // 8 = Runtime Error (SIGXFSZ)
    // 9 = Runtime Error (SIGFPE)
    // 10 = Runtime Error (SIGABRT)
    // 11 = Runtime Error (NZEC)
    // 12 = Runtime Error (Other)
    // 13 = Internal Error
    // 14 = Exec Format Error
    
    const statusId = result.status?.id;
    
    if (statusId === 3) {
      // Accepted - code executed successfully
      return {
        output: result.stdout || '',
      };
    } else if (statusId === 5) {
      return {
        output: '',
        error: 'Time Limit Exceeded',
      };
    } else if (statusId === 6) {
      return {
        output: '',
        error: `Compilation Error: ${result.compile_output || 'Unknown compilation error'}`,
      };
    } else if (statusId >= 7 && statusId <= 12) {
      return {
        output: '',
        error: `Runtime Error: ${result.stderr || result.message || 'Unknown runtime error'}`,
      };
    } else {
      return {
        output: '',
        error: result.message || `Execution failed with status ${statusId}`,
      };
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to execute code';
    return {
      output: '',
      error: errorMessage,
    };
  }
}

function normalizeOutput(output: string): string {
  return output.trim().replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

export async function POST(request: NextRequest) {
  try {
    const { questionId, code, language } = await request.json();

    if (!questionId || !code || !language) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get question and test cases
    const { data: question, error: questionError } = await supabase
      .from('questions')
      .select('test_cases')
      .eq('id', questionId)
      .single();

    if (questionError || !question) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
    }

    const testCases = question.test_cases;
    const testResults: TestResult[] = [];
    let allPassed = true;
    let status = 'accepted';

    // Execute code against each test case
    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      
      try {
        const result = await executeCode(code, language, testCase.input);
        
        if (result.error) {
          testResults.push({
            test_case_id: i,
            passed: false,
            error: result.error,
          });
          allPassed = false;
          status = 'runtime_error';
          break; // Stop on first error
        }

        const normalizedOutput = normalizeOutput(result.output);
        const normalizedExpected = normalizeOutput(testCase.expected_output);
        const passed = normalizedOutput === normalizedExpected;

        testResults.push({
          test_case_id: i,
          passed,
          output: result.output,
          expected: testCase.expected_output,
        });

        if (!passed) {
          allPassed = false;
          status = 'wrong_answer';
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Execution failed';
        testResults.push({
          test_case_id: i,
          passed: false,
          error: errorMessage,
        });
        allPassed = false;
        status = 'runtime_error';
      }
    }

    if (!allPassed && status === 'accepted') {
      status = 'wrong_answer';
    }

    return NextResponse.json({
      status,
      testResults,
      message: allPassed
        ? 'All test cases passed!'
        : 'Some test cases failed.',
    });
  } catch (error: unknown) {
    console.error('Submission error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

