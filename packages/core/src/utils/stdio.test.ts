/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Capture and wrap stdio before module loads to allow suppression during tests
const { setSuppressOutput } = vi.hoisted(() => {
  const realStdoutWrite = process.stdout.write.bind(process.stdout);
  const realStderrWrite = process.stderr.write.bind(process.stderr);
  let suppressOutput = false;

  // Wrap the original write functions
  process.stdout.write = ((
    ...args: Parameters<typeof process.stdout.write>
  ) => {
    if (suppressOutput) {
      return true;
    }
    return realStdoutWrite(...args);
  }) as typeof process.stdout.write;

  process.stderr.write = ((
    ...args: Parameters<typeof process.stderr.write>
  ) => {
    if (suppressOutput) {
      return true;
    }
    return realStderrWrite(...args);
  }) as typeof process.stderr.write;

  return {
    setSuppressOutput: (value: boolean) => {
      suppressOutput = value;
    },
  };
});

import * as stdioModule from './stdio.js';
import { coreEvents } from './events.js';

vi.mock('./events.js', () => ({
  coreEvents: {
    emitOutput: vi.fn(),
  },
}));

describe('stdio utils', () => {
  let originalStdoutWrite: typeof process.stdout.write;
  let originalStderrWrite: typeof process.stderr.write;

  beforeEach(() => {
    originalStdoutWrite = process.stdout.write;
    originalStderrWrite = process.stderr.write;
    setSuppressOutput(false);
  });

  afterEach(() => {
    process.stdout.write = originalStdoutWrite;
    process.stderr.write = originalStderrWrite;
    setSuppressOutput(false);
    vi.restoreAllMocks();
  });

  it('patchStdio redirects stdout and stderr to coreEvents', () => {
    const cleanup = stdioModule.patchStdio();

    process.stdout.write('test stdout');
    expect(coreEvents.emitOutput).toHaveBeenCalledWith(
      false,
      'test stdout',
      undefined,
    );

    process.stderr.write('test stderr');
    expect(coreEvents.emitOutput).toHaveBeenCalledWith(
      true,
      'test stderr',
      undefined,
    );

    cleanup();

    // Verify cleanup
    expect(process.stdout.write).toBe(originalStdoutWrite);
    expect(process.stderr.write).toBe(originalStderrWrite);
  });

  it('createWorkingStdio writes to real stdout/stderr bypassing patch', () => {
    // Enable output suppression for this test
    setSuppressOutput(true);

    const cleanup = stdioModule.patchStdio();
    const { stdout, stderr } = stdioModule.createWorkingStdio();

    stdout.write('working stdout');
    expect(coreEvents.emitOutput).not.toHaveBeenCalled();

    stderr.write('working stderr');
    expect(coreEvents.emitOutput).not.toHaveBeenCalled();

    cleanup();
  });
});
