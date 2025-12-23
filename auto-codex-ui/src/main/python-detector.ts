import { execSync } from 'child_process';

/**
 * Detect and return the best available Python command.
 * Tries multiple candidates and returns the first one that works with Python 3.
 *
 * @returns The Python command to use, or null if none found
 */
export function findPythonCommand(): string | null {
  const isWindows = process.platform === 'win32';

  // On Windows, try py launcher first (most reliable), then python, then python3
  // On Unix, try python3 first, then python
  const candidates = isWindows
    ? ['py -3', 'python', 'python3', 'py']
    : ['python3', 'python'];

  for (const cmd of candidates) {
    try {
      const version = execSync(`${cmd} --version`, {
        stdio: 'pipe',
        timeout: 5000,
        windowsHide: true
      }).toString();

      if (version.includes('Python 3')) {
        return cmd;
      }
    } catch {
      // Command not found or errored, try next
      continue;
    }
  }

  // Fallback to platform-specific default
  return isWindows ? 'python' : 'python3';
}

/**
 * Get the default Python command for the current platform.
 * This is a synchronous fallback that doesn't test if Python actually exists.
 *
 * @returns The default Python command for this platform
 */
export function getDefaultPythonCommand(): string {
  return process.platform === 'win32' ? 'python' : 'python3';
}

function splitCommandLine(commandLine: string): string[] {
  const args: string[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;

  for (let i = 0; i < commandLine.length; i += 1) {
    const char = commandLine[i];

    if (quote) {
      if (char === quote) {
        quote = null;
      } else {
        current += char;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }

    if (/\s/.test(char)) {
      if (current) {
        args.push(current);
        current = '';
      }
      continue;
    }

    current += char;
  }

  if (current) {
    args.push(current);
  }

  return args;
}

/**
 * Parse a Python command string into command and base arguments.
 * Handles space-separated commands like "py -3".
 *
 * @param pythonPath - The Python command string (e.g., "python3", "py -3")
 * @returns Tuple of [command, baseArgs] ready for use with spawn()
 */
export function parsePythonCommand(pythonPath: string): [string, string[]] {
  const trimmed = pythonPath.trim();
  if (!trimmed) {
    return [pythonPath, []];
  }

  const isAbsolutePath = trimmed.startsWith('/') || /^[a-zA-Z]:/.test(trimmed);
  const hasLeadingQuote = trimmed.startsWith('"') || trimmed.startsWith("'");

  // If it's an absolute path with spaces and no quotes, keep it intact to avoid truncation.
  if (isAbsolutePath && !hasLeadingQuote && trimmed.includes(' ')) {
    return [trimmed, []];
  }

  const parts = splitCommandLine(trimmed);
  if (parts.length === 0) {
    return [pythonPath, []];
  }

  return [parts[0], parts.slice(1)];
}
