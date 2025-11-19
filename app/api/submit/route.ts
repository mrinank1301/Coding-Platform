import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { executeCodeInDocker } from '@/lib/docker-executor';

interface TestResult {
  test_case_id: number;
  passed: boolean;
  output?: string;
  expected?: string;
  error?: string;
  errorType?: string;
}

interface TestCaseConfig {
  input: string;
  expected_output: string;
  is_hidden: boolean;
}

interface TestCaseRange {
  start: number;
  end: number;
  generator?: string; // Optional: function to generate test cases
}

interface QuestionWithRanges {
  test_cases?: TestCaseConfig[];
  test_case_ranges?: TestCaseRange[];
}

// Resource limits
const MEMORY_LIMIT_MB = 256;
const TIME_LIMIT_SECONDS = 1;

// Execute code using Docker sandbox
async function executeCode(code: string, language: string, input: string): Promise<{ output: string; error?: string; errorType?: string }> {
  try {
    const result = await executeCodeInDocker(code, language, input, MEMORY_LIMIT_MB, TIME_LIMIT_SECONDS);
    
    if (result.error) {
      return {
        output: result.output || '',
        error: result.error,
        errorType: result.errorType || 'RTE',
      };
    }
    
    return {
      output: result.output,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to execute code';
    return {
      output: '',
      error: errorMessage,
      errorType: 'RTE',
    };
  }
}

// Generate test cases from range (simple implementation - can be extended)
function generateTestCasesFromRange(range: TestCaseRange): TestCaseConfig[] {
  const testCases: TestCaseConfig[] = [];
  // For now, return empty array - this would need a proper generator function
  // In a real implementation, you'd parse the generator string and execute it
  return testCases;
}

function normalizeOutput(output: string): string {
  return output.trim().replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

export async function POST(request: NextRequest) {
  try {
    const { questionId, code, language, singleTestCase, testCaseInput } = await request.json();

    if (!questionId || !code || !language) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get question and test cases
    const { data: question, error: questionError } = await supabase
      .from('questions')
      .select('test_cases, test_case_ranges')
      .eq('id', questionId)
      .single();

    if (questionError || !question) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
    }

    const questionData = question as QuestionWithRanges;

    // Handle single test case execution (for Run button)
    if (singleTestCase && testCaseInput !== undefined) {
      try {
        const result = await executeCode(code, language, testCaseInput);
        
        if (result.error) {
          return NextResponse.json({
            status: result.errorType === 'TLE' ? 'time_limit_exceeded' : 
                   result.errorType === 'CE' ? 'compilation_error' :
                   result.errorType === 'RTE' ? 'runtime_error' :
                   result.errorType === 'MLE' ? 'runtime_error' :
                   result.errorType === 'WA' ? 'wrong_answer' : 'runtime_error',
            output: result.output || '',
            error: result.error,
            errorType: result.errorType,
          });
        }

        return NextResponse.json({
          status: 'accepted',
          output: result.output,
        });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Execution failed';
        return NextResponse.json({
          status: 'runtime_error',
          output: '',
          error: errorMessage,
          errorType: 'RTE',
        });
      }
    }

    // Collect all test cases (static + generated from ranges)
    let allTestCases: TestCaseConfig[] = [];
    
    // Add static test cases
    if (questionData.test_cases && Array.isArray(questionData.test_cases)) {
      allTestCases = [...questionData.test_cases];
    }
    
    // Generate test cases from ranges (if any)
    if (questionData.test_case_ranges && Array.isArray(questionData.test_case_ranges)) {
      for (const range of questionData.test_case_ranges) {
        const generated = generateTestCasesFromRange(range);
        allTestCases = allTestCases.concat(generated);
      }
    }
    
    // Limit to 1000 test cases max
    if (allTestCases.length > 1000) {
      allTestCases = allTestCases.slice(0, 1000);
    }

    if (allTestCases.length === 0) {
      return NextResponse.json(
        { error: 'No test cases found for this question' },
        { status: 400 }
      );
    }

    const testResults: TestResult[] = [];
    let allPassed = true;
    let status = 'accepted';

    // Execute code against each test case - STOP on first failure
    for (let i = 0; i < allTestCases.length; i++) {
      const testCase = allTestCases[i];
      
      try {
        const result = await executeCode(code, language, testCase.input);
        
        if (result.error) {
          testResults.push({
            test_case_id: i,
            passed: false,
            error: result.error,
            errorType: result.errorType,
          });
          allPassed = false;
          status = result.errorType === 'TLE' ? 'time_limit_exceeded' : 
                   result.errorType === 'CE' ? 'compilation_error' :
                   result.errorType === 'RTE' ? 'runtime_error' :
                   result.errorType === 'MLE' ? 'runtime_error' :
                   result.errorType === 'WA' ? 'wrong_answer' : 'runtime_error';
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
          errorType: passed ? undefined : 'WA',
        });

        if (!passed) {
          allPassed = false;
          status = 'wrong_answer';
          break; // Stop on first wrong answer
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Execution failed';
        testResults.push({
          test_case_id: i,
          passed: false,
          error: errorMessage,
          errorType: 'RTE',
        });
        allPassed = false;
        status = 'runtime_error';
        break; // Stop on first exception
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

