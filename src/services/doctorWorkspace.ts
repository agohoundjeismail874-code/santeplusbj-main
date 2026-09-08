export const doctorWorkspaceStorageKey = 'sante_doctor_workspace';

export interface DoctorWorkspaceState {
  activeModule: string | null;
  doctorData: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    specialty?: string;
    npi?: string;
    hospitalId?: string;
    hospitalName?: string;
    avatar?: string;
  } | null;
}

const defaultWorkspace: DoctorWorkspaceState = {
  activeModule: null,
  doctorData: null,
};

function getStorage(): Storage | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }

  if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis && !!(globalThis as any).localStorage) {
    return (globalThis as any).localStorage as Storage;
  }

  return null;
}

export function readDoctorWorkspace(): DoctorWorkspaceState {
  const storage = getStorage();
  if (!storage) return defaultWorkspace;

  try {
    const raw = storage.getItem(doctorWorkspaceStorageKey);
    if (!raw) return defaultWorkspace;

    const parsed = JSON.parse(raw) as Partial<DoctorWorkspaceState>;
    return {
      ...defaultWorkspace,
      ...parsed,
      doctorData: parsed.doctorData ?? null,
    };
  } catch {
    return defaultWorkspace;
  }
}

export function writeDoctorWorkspace(nextState: Partial<DoctorWorkspaceState>) {
  const storage = getStorage();
  const current = readDoctorWorkspace();
  const merged = {
    ...current,
    ...nextState,
  };

  if (storage) {
    storage.setItem(doctorWorkspaceStorageKey, JSON.stringify(merged));
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('sante-doctor-workspace', { detail: merged }));
  }
  return merged;
}

export function subscribeDoctorWorkspace(listener: (state: DoctorWorkspaceState) => void) {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<DoctorWorkspaceState>;
    listener(customEvent.detail ?? readDoctorWorkspace());
  };

  window.addEventListener('sante-doctor-workspace', handler);

  return () => {
    window.removeEventListener('sante-doctor-workspace', handler);
  };
}
