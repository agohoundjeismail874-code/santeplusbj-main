import { describe, it, expect, beforeEach, vi } from 'vitest';
import { doctorWorkspaceStorageKey, readDoctorWorkspace, writeDoctorWorkspace, subscribeDoctorWorkspace } from '../doctorWorkspace';

const createMemoryStorage = () => {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() { return store.size; },
  } as Storage;
};

describe('doctor workspace synchronization', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: createMemoryStorage(),
      configurable: true,
      writable: true,
    });
    vi.restoreAllMocks();
  });

  it('persists and reads a shared doctor workspace state', () => {
    const initial = { activeModule: 'stats', doctorData: { id: 'd1', name: 'Dr. Test' } };

    writeDoctorWorkspace(initial);

    expect(readDoctorWorkspace()).toEqual(initial);
    expect(globalThis.localStorage.getItem(doctorWorkspaceStorageKey)).toContain('stats');
  });

  it('notifies subscribers when the workspace changes', () => {
    const listener = vi.fn();

    const unsubscribe = subscribeDoctorWorkspace(listener);
    writeDoctorWorkspace({ activeModule: 'agenda', doctorData: { id: 'd2', name: 'Dr. A' } });

    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('persists null when returning to the doctor home dashboard', () => {
    writeDoctorWorkspace({ activeModule: 'patients' });
    writeDoctorWorkspace({ activeModule: null });

    expect(readDoctorWorkspace().activeModule).toBeNull();
  });
});
