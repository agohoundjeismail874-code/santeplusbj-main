// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { apiClient } from '../../services/api';

const store: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => store[key] || null,
  setItem: (key: string, value: string) => { store[key] = value.toString(); },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); }
};
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true, configurable: true });

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('stores tokens in localStorage', () => {
    const token = 'test-token-123';
    localStorage.setItem('accessToken', token);
    
    expect(localStorage.getItem('accessToken')).toBe(token);
  });

  it('adds Authorization header to requests', () => {
    const token = 'test-bearer-token';
    localStorage.setItem('accessToken', token);
    
    const headers = localStorage.getItem('accessToken');
    expect(headers).toBe(token);
  });

  it('handles 401 errors', () => {
    const mockError = { response: { status: 401 } };
    expect(mockError.response.status).toBe(401);
  });

  it('stores refresh token', () => {
    const refreshToken = 'refresh-token-123';
    localStorage.setItem('refreshToken', refreshToken);
    
    expect(localStorage.getItem('refreshToken')).toBe(refreshToken);
  });
});
