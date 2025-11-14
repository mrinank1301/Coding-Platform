# Code Submission API

This API endpoint handles code submissions and test case execution.

## Current Implementation

The current implementation is a placeholder that simulates code execution. For production use, you need to integrate with an actual code execution service.

## Options for Code Execution

### Option 1: Judge0 API (Recommended for Quick Setup)

Judge0 is a cloud-based code execution service that supports multiple languages.

1. Sign up at https://judge0.com/
2. Get your API key
3. Add to `.env.local`:
   ```
   JUDGE0_API_KEY=your_api_key
   JUDGE0_API_URL=https://judge0-ce.p.rapidapi.com
   ```
4. Update `route.ts` to use Judge0 API

### Option 2: Custom Docker-based Execution Service

For more control and security, you can build a custom execution service using Docker:

1. Create a separate service that runs code in Docker containers
2. Use Docker API to create isolated execution environments
3. Set resource limits (CPU, memory, time)
4. Implement proper sandboxing

### Option 3: Other Services

- Piston API: https://github.com/engineer-man/piston
- CodeX API: Various code execution APIs available

## Language IDs for Judge0

- C: 50
- C++: 54
- Java: 62
- Python: 71

## Security Considerations

- Always validate and sanitize code before execution
- Use resource limits (time, memory, CPU)
- Run code in isolated containers/environments
- Implement rate limiting
- Log all executions for auditing

