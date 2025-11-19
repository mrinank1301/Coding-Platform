import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { randomUUID } from 'crypto';

const execAsync = promisify(exec);

interface ExecutionResult {
  output: string;
  error?: string;
  errorType?: 'CE' | 'RTE' | 'MLE' | 'WA';
  exitCode: number;
  executionTime: number;
  memoryUsed: number;
}

interface LeetCodeError {
  line?: number;
  column?: number;
  message: string;
  type: 'CE' | 'RTE' | 'MLE';
}

// Language-specific configurations
const LANGUAGE_CONFIG = {
  c: {
    extension: 'c',
    filename: 'main.c',
    image: 'gcc:latest',
    compileCmd: (file: string) => `gcc -o /tmp/executable ${file} -lm -O2 -std=c11`,
    runCmd: () => `/tmp/executable`,
  },
  cpp: {
    extension: 'cpp',
    filename: 'main.cpp',
    image: 'gcc:latest',
    compileCmd: (file: string) => `g++ -o /tmp/executable ${file} -O2 -std=c++17`,
    runCmd: () => `/tmp/executable`,
  },
  java: {
    extension: 'java',
    filename: 'Main.java',
    image: 'eclipse-temurin:17.0.17_10-jdk-ubi10-minimal',
    compileCmd: (file: string) => `javac ${file}`,
    runCmd: () => `java -cp /tmp Main`,
  },
  python: {
    extension: 'py',
    filename: 'main.py',
    image: 'python:3.12-slim',
    compileCmd: null,
    runCmd: (file: string) => `python3 ${file}`,
  },
};

// Parse LeetCode-style errors from compiler/runtime output
function parseLeetCodeError(errorOutput: string, language: string): LeetCodeError {
  
  // Python syntax errors
  if (language === 'python') {
    const syntaxErrorMatch = errorOutput.match(/File\s+"[^"]+",\s+line\s+(\d+)(?:,\s+in\s+(\w+))?\s*\n\s*(\d+)\s*([\s\S]*?)\n\s*\^+\s*\n(\w+Error):\s*(.+)/);
    if (syntaxErrorMatch) {
      const [, line, , , code, , errorType, message] = syntaxErrorMatch;
      return {
        line: parseInt(line),
        message: `${errorType}: ${message.trim()}\nLine ${line}: ${code.trim()}`,
        type: 'CE',
      };
    }
    
    // Python runtime errors
    const runtimeErrorMatch = errorOutput.match(/(\w+Error):\s*([\s\S]+?)(?:\n\s+File\s+"[^"]+",\s+line\s+(\d+))?/);
    if (runtimeErrorMatch) {
      const [, errorType, message, line] = runtimeErrorMatch;
      return {
        line: line ? parseInt(line) : undefined,
        message: `${errorType}: ${message.trim()}`,
        type: 'RTE',
      };
    }
  }
  
  // C/C++ compilation errors
  if (language === 'c' || language === 'cpp') {
    const compileErrorMatch = errorOutput.match(/([^:]+):(\d+):(\d+):\s*(error|warning):\s*(.+)/);
    if (compileErrorMatch) {
      const [, , line, col, severity, message] = compileErrorMatch;
      if (severity === 'error') {
        return {
          line: parseInt(line),
          column: parseInt(col),
          message: `Line ${line}: ${message.trim()}`,
          type: 'CE',
        };
      }
    }
    
    // C/C++ runtime errors (segmentation fault, etc.)
    if (errorOutput.includes('Segmentation fault') || errorOutput.includes('SIGSEGV')) {
      return {
        message: 'Runtime Error: Segmentation fault (accessing invalid memory)',
        type: 'RTE',
      };
    }
  }
  
  // Java compilation errors
  if (language === 'java') {
    const javaErrorMatch = errorOutput.match(/([^:]+):(\d+):\s*error:\s*(.+)/);
    if (javaErrorMatch) {
      const [, , line, message] = javaErrorMatch;
      return {
        line: parseInt(line),
        message: `Line ${line}: ${message.trim()}`,
        type: 'CE',
      };
    }
    
    // Java runtime errors
    const javaRuntimeMatch = errorOutput.match(/(\w+Exception):\s*([\s\S]+?)(?:\n\s+at\s+[^(]+\([^:]+:(\d+)\))?/);
    if (javaRuntimeMatch) {
      const [, exception, message, line] = javaRuntimeMatch;
      return {
        line: line ? parseInt(line) : undefined,
        message: `${exception}: ${message.trim()}`,
        type: 'RTE',
      };
    }
  }
  
  // Generic error fallback
  return {
    message: errorOutput.trim() || 'Unknown error occurred',
    type: 'CE',
  };
}

// Execute code in Docker container with resource limits
export async function executeCodeInDocker(
  code: string,
  language: string,
  input: string,
  memoryLimitMB: number = 256,
  timeLimitSeconds: number = 1
): Promise<ExecutionResult> {
  const config = LANGUAGE_CONFIG[language as keyof typeof LANGUAGE_CONFIG];
  if (!config) {
    throw new Error(`Unsupported language: ${language}`);
  }

  const containerName = `code-exec-${randomUUID().substring(0, 8)}`;
  
  try {
    // Instead of mounting volumes (which doesn't work reliably on Windows),
    // we'll create files inside the container using base64 encoding
    const codeBase64 = Buffer.from(code).toString('base64');
    const inputBase64 = Buffer.from(input).toString('base64');
    
    // Build execution script that creates files inside the container
    let execScript = '';
    if (config.compileCmd) {
      // Compiled languages: compile then run
      const compileCmd = config.compileCmd(`/tmp/${config.filename}`);
      const runCmd = config.runCmd();
      execScript = `set -e; \
echo "${codeBase64}" | base64 -d > /tmp/${config.filename}; \
echo "${inputBase64}" | base64 -d > /tmp/input.txt; \
${compileCmd} 2>&1 || exit $?; \
${runCmd} < /tmp/input.txt 2>&1`;
    } else {
      // Interpreted languages: run directly
      const runCmd = config.runCmd(`/tmp/${config.filename}`);
      execScript = `set -e; \
echo "${codeBase64}" | base64 -d > /tmp/${config.filename}; \
echo "${inputBase64}" | base64 -d > /tmp/input.txt; \
${runCmd} < /tmp/input.txt 2>&1`;
    }
    
    // Prepare Docker command with resource limits
    const dockerArgs = [
      'run',
      '--rm',
      `--name=${containerName}`,
      `--memory=${memoryLimitMB}m`,
      `--memory-swap=${memoryLimitMB}m`,
      '--cpus=1',
      '--network=none',
      '--tmpfs=/tmp:rw,exec,nosuid,size=100m',
      '-w',
      '/tmp',
      config.image,
      'sh',
      '-c',
      execScript,
    ];
    
    const startTime = Date.now();
    
    // Use spawn instead of exec for better control over timeout
    return new Promise<ExecutionResult>((resolve) => {
      let stdout = '';
      let stderr = '';
      let resolved = false;
      
      const dockerProcess = spawn('docker', dockerArgs, {
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      
      // Set up timeout to kill container after time limit + compilation time
      // TLE error removed for now
      const timeoutHandle = setTimeout(async () => {
        // Timeout disabled
      }, (timeLimitSeconds + 10) * 1000);
      
      if (dockerProcess.stdout) {
        dockerProcess.stdout.on('data', (data) => {
          stdout += data.toString();
        });
      }
      
      if (dockerProcess.stderr) {
        dockerProcess.stderr.on('data', (data) => {
          stderr += data.toString();
        });
      }
      
      dockerProcess.on('close', (code) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeoutHandle);
        
        const executionTime = Date.now() - startTime;
        
        // Check for compilation errors (compiled languages)
        if (config.compileCmd && stderr && stderr.trim()) {
          const filteredStderr = stderr.trim();
          if (filteredStderr && !filteredStderr.match(/^(Note:|warning:)/i)) {
            const leetCodeError = parseLeetCodeError(stderr, language);
            resolve({
              output: '',
              error: leetCodeError.message,
              errorType: leetCodeError.type,
              exitCode: code || 1,
              executionTime,
              memoryUsed: 0,
            });
            return;
          }
        }
        
        // Check for runtime errors (interpreted languages)
        if (!config.compileCmd && stderr && stderr.trim() && code !== 0) {
          const leetCodeError = parseLeetCodeError(stderr, language);
          if (leetCodeError.type === 'RTE' || leetCodeError.type === 'CE') {
            resolve({
              output: stdout || '',
              error: leetCodeError.message,
              errorType: leetCodeError.type,
              exitCode: code || 1,
              executionTime,
              memoryUsed: 0,
            });
            return;
          }
        }
        
        // Check for memory limit (exit code 137 = OOM killed)
        if (code === 137) {
          resolve({
            output: '',
            error: `Memory Limit Exceeded: Your code used more than ${memoryLimitMB}MB of memory.`,
            errorType: 'MLE',
            exitCode: 137,
            executionTime,
            memoryUsed: 0,
          });
          return;
        }
        
        // Success - return output
        resolve({
          output: stdout || '',
          exitCode: code || 0,
          executionTime,
          memoryUsed: 0,
        });
      });
      
      dockerProcess.on('error', (err) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeoutHandle);
        
        const executionTime = Date.now() - startTime;
        resolve({
          output: '',
          error: `Docker execution error: ${err.message}`,
          errorType: 'RTE',
          exitCode: 1,
          executionTime,
          memoryUsed: 0,
        });
      });
      
      // Handle case where process never closes
      // TLE error removed for now
      setTimeout(() => {
        // Timeout disabled
      }, (timeLimitSeconds + 15) * 1000);
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    return {
      output: '',
      error: `Execution setup error: ${err.message || 'Unknown error'}`,
      errorType: 'RTE',
      exitCode: 1,
      executionTime: 0,
      memoryUsed: 0,
    };
  } finally {
    // Cleanup: try to remove container if it still exists
    try {
      await execAsync(`docker rm -f ${containerName} 2>/dev/null || true`);
    } catch {
      // Ignore cleanup errors
    }
  }
}

