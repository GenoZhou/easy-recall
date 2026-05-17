/**
 * Tests for utility functions
 * Testing logging and error handling utilities
 */

import { debug, info, warn, error, safeAsync } from '../utils/';

describe('utils', () => {
  // 保存原始的 console 方法
  const originalConsoleLog = console.log;
  const originalConsoleWarn = console.warn;
  const originalConsoleError = console.error;

  beforeEach(() => {
    // 重置 console 方法为 mock
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
  });

  afterEach(() => {
    // 恢复原始的 console 方法
    console.log = originalConsoleLog;
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
  });

  describe('debug', () => {
    it('should not output when DEBUG is false', () => {
      debug('test message');
      expect(console.log).not.toHaveBeenCalled();
    });
  });

  describe('info', () => {
    it('should always output with prefix', () => {
      info('test message');
      expect(console.log).toHaveBeenCalledWith('[easy-recall]', 'test message');
    });

    it('should handle multiple arguments', () => {
      info('message', 123, { key: 'value' });
      expect(console.log).toHaveBeenCalledWith('[easy-recall]', 'message', 123, { key: 'value' });
    });
  });

  describe('warn', () => {
    it('should output to console.warn with prefix', () => {
      warn('warning message');
      expect(console.warn).toHaveBeenCalledWith('[easy-recall]', 'warning message');
    });
  });

  describe('error', () => {
    it('should output to console.error with prefix', () => {
      error('error message');
      expect(console.error).toHaveBeenCalledWith('[easy-recall]', 'error message');
    });

    it('should handle error objects', () => {
      const err = new Error('test error');
      error('operation failed:', err);
      expect(console.error).toHaveBeenCalledWith('[easy-recall]', 'operation failed:', err);
    });
  });

  describe('safeAsync', () => {
    it('should return result on success', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      const result = await safeAsync(operation, 'error message');
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalled();
      expect(console.error).not.toHaveBeenCalled();
    });

    it('should return null and log error on failure', async () => {
      const testError = new Error('test error');
      const operation = jest.fn().mockRejectedValue(testError);
      const result = await safeAsync(operation, 'operation failed');
      
      expect(result).toBeNull();
      expect(operation).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith('[easy-recall]', 'operation failed', testError);
    });

    it('should handle synchronous errors', async () => {
      const testError = new Error('sync error');
      const operation = jest.fn().mockImplementation(() => {
        throw testError;
      });
      
      const result = await safeAsync(operation, 'sync operation failed');
      
      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith('[easy-recall]', 'sync operation failed', testError);
    });
  });
});
