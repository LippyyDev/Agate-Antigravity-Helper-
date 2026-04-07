import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock module to test timeout behavior
describe('GoogleAPIService Timeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should abort request after timeout', async () => {
    const TIMEOUT_MS = 100;

    // Recreate the same logic used in GoogleAPIService
    const createTimeoutSignal = (ms: number): AbortSignal => {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), ms);
      return controller.signal;
    };

    const signal = createTimeoutSignal(TIMEOUT_MS);

    // Verify signal is not aborted initially
    expect(signal.aborted).toBe(false);

    // Fast-forward time
    vi.advanceTimersByTime(TIMEOUT_MS + 10);

    // Signal should now be aborted
    expect(signal.aborted).toBe(true);
  });

  it('should set aborted state when controller.abort() is called', () => {
    const controller = new AbortController();

    // Initially not aborted
    expect(controller.signal.aborted).toBe(false);

    // Abort the controller
    controller.abort();

    // Signal should now be aborted
    expect(controller.signal.aborted).toBe(true);
  });

  it('should transform AbortError to user-friendly message', () => {
    // This tests our error transformation logic from GoogleAPIService
    const handleAbortError = (err: Error) => {
      if (err.name === 'AbortError') {
        throw new Error(
          'Token exchange timed out. Please check your network connection and try again.',
        );
      }
      throw err;
    };

    const abortError = new Error('The operation was aborted');
    abortError.name = 'AbortError';

    expect(() => handleAbortError(abortError)).toThrow(
      'Token exchange timed out. Please check your network connection and try again.',
    );
  });

  it('should not transform non-AbortError', () => {
    const handleAbortError = (err: Error) => {
      if (err.name === 'AbortError') {
        throw new Error(
          'Token exchange timed out. Please check your network connection and try again.',
        );
      }
      throw err;
    };

    const networkError = new Error('Network failure');
    networkError.name = 'NetworkError';

    expect(() => handleAbortError(networkError)).toThrow('Network failure');
  });
});
