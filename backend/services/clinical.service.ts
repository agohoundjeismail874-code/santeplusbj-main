export type PatientSummary = {
  profile: {
    id: string;
    name: string;
    email: string;
    npi: string;
    bloodGroup: string;
    allergies: string[];
    chronicDiseases: string[];
  };
  healthStatus: 'stable' | 'follow-up' | 'urgent';
  consents: Array<{ id: string; status: 'active' | 'pending' | 'revoked'; doctorId: string; expiresAt?: string }>;
  appointments: {
    next: string | null;
    total: number;
  };
};

export type DoctorSummary = {
  profile: {
    id: string;
    name: string;
    specialty: string;
    hospitalName: string;
  };
  availability: 'available' | 'busy' | 'offline';
  performance: {
    patientsToday: number;
    consultationsThisWeek: number;
  };
};

export function buildPatientSummary(patient: any): PatientSummary {
  const bloodGroup = patient.bloodGroup || 'Non renseigné';
  const allergies = Array.isArray(patient.allergies) ? patient.allergies : [String(patient.allergies || 'Aucune')];
  const chronicDiseases = Array.isArray(patient.chronicDiseases)
    ? patient.chronicDiseases
    : [String(patient.chronicDiseases || 'Aucune')];

  const healthStatus =
    patient.consentStatus === 'active' && patient.lastConsultation
      ? 'stable'
      : 'follow-up';

  return {
    profile: {
      id: patient.id,
      name: patient.name,
      email: patient.email,
      npi: patient.npi,
      bloodGroup,
      allergies,
      chronicDiseases,
    },
    healthStatus,
    consents: [
      {
        id: `consent-${patient.id}`,
        status: patient.consentStatus || 'active',
        doctorId: 'doctor-002',
        expiresAt: patient.nextAppointment || undefined,
      },
    ],
    appointments: {
      next: patient.nextAppointment || null,
      total: 3,
    },
  };
}

export function buildDoctorSummary(doctor: any): DoctorSummary {
  return {
    profile: {
      id: doctor.id,
      name: doctor.name,
      specialty: doctor.specialty,
      hospitalName: doctor.hospitalName,
    },
    availability: doctor.availability || 'available',
    performance: {
      patientsToday: Number(doctor.patientsToday || 0),
      consultationsThisWeek: Number(doctor.consultationsThisWeek || 0),
    },
  };
}
