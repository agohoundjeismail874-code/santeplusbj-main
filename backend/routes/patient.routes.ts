// ============================================================================
// ROUTES PATIENT SERVICE
// ============================================================================

import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { dbService } from '../services/db.service';
import { publishRealtimeEvent } from '../services/realtime.service';
import { resolvePatientIdentity } from '../services/identity.service';
import { getMedicalRecord, saveMedicalRecord } from '../services/medical-record.service';
import fs from 'node:fs';
import path from 'node:path';

const router = Router();
router.use(requireAuth, requireRole('patient'));

// Mock DB
interface PatientRecord {
  id: number;
  userId: number;
  firstName: string;
  lastName: string;
  npi?: string;
  bloodType?: string;
  allergies?: string[];
  chronicDiseases?: string[];
  dossierData?: any;
}

let patients: PatientRecord[] = [
  {
    id: 1,
    userId: 1,
    firstName: 'Jean',
    lastName: 'Dupont',
    bloodType: 'O+',
    allergies: ['Penicilline'],
    chronicDiseases: ['Asthme'],
    dossierData: {},
  },
];

let nextPatientId = 2;

async function getPatientByUserId(userId: number): Promise<PatientRecord | undefined> {
  if (dbService.getStatus().connected) {
    const result = await dbService.query<PatientRecord>(
      `SELECT id, user_id AS "userId", first_name AS "firstName", last_name AS "lastName",
              npi,
              blood_type AS "bloodType", allergies, chronic_diseases AS "chronicDiseases"
       FROM patients WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    return result?.rows[0];
  }

  const inMemoryPatient = patients.find(patient => patient.userId === userId);
  if (inMemoryPatient) return inMemoryPatient;

  if (!fs.existsSync(path.join(process.cwd(), 'data_db.json'))) return undefined;
  const raw = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data_db.json'), 'utf8'));
  const user = (raw.AUTH_USERS_DB || []).find(
    (candidate: any) => Number(candidate.id) === userId && candidate.role === 'patient',
  );
  if (!user) return undefined;

  const profile = raw.PATIENTS_DB?.[user.email] || {};
  const patient: PatientRecord = {
    id: Number(user.id),
    userId,
    firstName: profile.name?.split(' ')[0] || 'Patient',
    lastName: profile.name?.split(' ').slice(1).join(' ') || '',
    npi: profile.npi,
    bloodType: profile.bloodGroup || undefined,
    allergies: profile.allergies
      ? (Array.isArray(profile.allergies) ? profile.allergies : [profile.allergies])
      : undefined,
    chronicDiseases: profile.chronicDiseases
      ? (Array.isArray(profile.chronicDiseases) ? profile.chronicDiseases : [profile.chronicDiseases])
      : undefined,
    dossierData: {},
  };
  patients.push(patient);
  return patient;
}

// GET /api/patients/profile
router.get('/profile', async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const patient = await getPatientByUserId(userId);

  if (!patient) {
    return res.status(404).json({ success: false, error: 'Patient not found' });
  }

  res.json({
    success: true,
    data: patient,
  });
});

// PUT /api/patients/profile
router.put('/profile', async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { firstName, lastName, bloodType, allergies, chronicDiseases } = req.body;

  if (dbService.getStatus().connected) {
    const result = await dbService.query<PatientRecord>(
      `UPDATE patients
       SET first_name = COALESCE($1, first_name),
           last_name = COALESCE($2, last_name),
           blood_type = COALESCE($3, blood_type),
           allergies = COALESCE($4, allergies),
           chronic_diseases = COALESCE($5, chronic_diseases),
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $6
       RETURNING id, user_id AS "userId", first_name AS "firstName", last_name AS "lastName",
                 blood_type AS "bloodType", allergies, chronic_diseases AS "chronicDiseases"`,
      [firstName, lastName, bloodType, allergies, chronicDiseases, userId]
    );

    if (result?.rows[0]) {
      const identity = await resolvePatientIdentity(String(userId));
      if (identity) {
        const current = await getMedicalRecord(identity.identityUuid, true);
        await saveMedicalRecord(identity.identityUuid, {
          ...(current || {}),
          identityUuid: identity.identityUuid,
          profile: { ...(current?.profile || {}), ...result.rows[0] },
        }, 'VALIDATED', userId);
      }
      const doctors = await dbService.query<{ user_id: number }>(
        `SELECT d.user_id FROM doctor_patients dp JOIN doctors d ON d.id = dp.doctor_user_id
         WHERE dp.patient_id = (SELECT id FROM patients WHERE user_id = $1)`, [userId]
      );
      publishRealtimeEvent({
        type: 'updated', entity: 'patient', entityId: String(result.rows[0].id),
        audienceUserIds: [userId, ...(doctors?.rows || []).map(row => row.user_id)],
      });
      return res.json({ success: true, data: result.rows[0] });
    }
  }

  let patient = patients.find(p => p.userId === userId);

  if (!patient) {
    patient = {
      id: nextPatientId++,
      userId,
      firstName,
      lastName,
      bloodType,
      allergies,
      chronicDiseases,
      dossierData: {},
    };
    patients.push(patient);
  } else {
    if (firstName) patient.firstName = firstName;
    if (lastName) patient.lastName = lastName;
    if (bloodType) patient.bloodType = bloodType;
    if (allergies) patient.allergies = allergies;
    if (chronicDiseases) patient.chronicDiseases = chronicDiseases;
  }

  if (!dbService.getStatus().connected && fs.existsSync(path.join(process.cwd(), 'data_db.json'))) {
    const dbPath = path.join(process.cwd(), 'data_db.json');
    const raw = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    const users = Array.isArray(raw.AUTH_USERS_DB) ? raw.AUTH_USERS_DB : [];
    const user = users.find((candidate: any) => Number(candidate.id) === userId && candidate.role === 'patient');
    if (user) {
      raw.PATIENTS_DB = raw.PATIENTS_DB || {};
      raw.PATIENTS_DB[user.email] = {
        ...(raw.PATIENTS_DB[user.email] || {}),
        name: `${patient.firstName} ${patient.lastName}`.trim(),
        email: user.email,
        phone: user.phone,
        npi: patient.npi,
        bloodGroup: patient.bloodType,
        allergies: patient.allergies,
        chronicDiseases: patient.chronicDiseases,
      };
      fs.writeFileSync(dbPath, JSON.stringify(raw, null, 2), 'utf8');
    }
  }

  const identity = await resolvePatientIdentity(String(userId));
  if (identity) {
    const current = await getMedicalRecord(identity.identityUuid, true);
    await saveMedicalRecord(identity.identityUuid, {
      ...(current || {}),
      identityUuid: identity.identityUuid,
      profile: { ...(current?.profile || {}), ...patient },
    }, 'VALIDATED', userId);
  }
  let doctorIds: number[] = [];
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data_db.json'), 'utf8'));
    doctorIds = (raw.DOCTOR_PATIENTS_DB || [])
      .filter((item: any) => String(item.id) === String(patient.id))
      .map((item: any) => Number(item.doctorId))
      .filter((id: number) => Number.isFinite(id));
  } catch {
    // JSON fallback is best effort; the patient remains the primary audience.
  }
  publishRealtimeEvent({
    type: 'updated', entity: 'patient', entityId: String(patient.id),
    audienceUserIds: [userId, ...doctorIds],
  });
  res.json({
    success: true,
    data: patient,
  });
});

// GET /api/patients/record
router.get('/record', async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const patient = await getPatientByUserId(userId);

  if (!patient) {
    return res.status(404).json({ success: false, error: 'Patient not found' });
  }

  let consultations: any[] = [];
  let prescriptions: any[] = [];
  const identity = await resolvePatientIdentity(String(userId));
  if (dbService.getStatus().connected) {
    const [consultationResult, prescriptionResult] = await Promise.all([
      dbService.query<any>(
        `SELECT c.id, c.consultation_date AS "consultationDate", c.diagnosis,
                c.motive, c.anamnesis, c.clinical_exam AS "clinicalExam",
                c.vital_signs AS "vitalSigns", c.treatment, c.recommendations,
                c.record_hash AS "recordHash", d.first_name || ' ' || d.last_name AS "doctorName"
         FROM consultations c
         LEFT JOIN doctors d ON d.id = c.doctor_id
         WHERE c.patient_id = $1 ORDER BY c.consultation_date DESC`,
        [patient.id]
      ),
      dbService.query<any>(
        `SELECT id, medication, dosage, frequency, status,
                created_at AS "createdAt", patient_name AS "patientName"
         FROM doctor_prescriptions WHERE patient_id = $1 ORDER BY created_at DESC`,
        [patient.id]
      ),
    ]);
    consultations = consultationResult?.rows || [];
    prescriptions = prescriptionResult?.rows || [];
  } else if (fs.existsSync(path.join(process.cwd(), 'data_db.json'))) {
    const raw = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data_db.json'), 'utf8'));
    const patientId = String(patient.id);
    consultations = (raw.DOCTOR_CONSULTATIONS_DB || [])
      .filter((consultation: any) => String(consultation.patientId) === patientId)
      .map((consultation: any) => ({
        id: consultation.id,
        consultationDate: consultation.timestamp || consultation.date,
        diagnosis: consultation.diagnostic,
        treatment: consultation.prescription || '',
        recommendations: consultation.notes || '',
        recordHash: consultation.blockchainHash,
        doctorName: consultation.doctorName,
      }));
    prescriptions = (raw.DOCTOR_PRESCRIPTIONS_DB || [])
      .filter((prescription: any) => String(prescription.patientId) === patientId);
  }

  res.json({
    success: true,
    data: {
      patientId: patient.id,
      generalInfo: {
        bloodType: patient.bloodType,
        allergies: patient.allergies || [],
        chronicDiseases: patient.chronicDiseases || [],
      },
      medications: [],
      consultations,
      prescriptions,
      images: [],
      bloodDonations: [],
      vaccinations: [],
      detailedRecord: identity ? await getMedicalRecord(identity.identityUuid) : null,
    },
  });
});

// POST /api/patients/qr
router.post('/qr', (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const qrCode = `QR_${userId}_${Date.now()}`;
  const expiresIn = 3600; // 1 hour

  res.json({
    success: true,
    data: {
      qrCode,
      expiresIn,
    },
  });
});

// POST /api/patients/access/grant
router.post('/access/grant', async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { doctorId, durationHours } = req.body;

  if (!doctorId || !durationHours || Number(durationHours) <= 0 || Number(durationHours) > 720) {
    return res.status(400).json({ success: false, error: 'Doctor and valid duration are required' });
  }

  if (dbService.getStatus().connected) {
    const result = await dbService.query(
      `INSERT INTO patient_consents (patient_id, doctor_id, purpose, expires_at)
       VALUES (
         (SELECT id FROM patients WHERE user_id = $1),
         (SELECT id FROM doctors WHERE user_id = $2),
         'medical_record_access',
         CURRENT_TIMESTAMP + ($3::int * INTERVAL '1 hour')
       )
       RETURNING id, status, granted_at AS "grantedAt", expires_at AS "expiresAt"`,
      [userId, doctorId, Number(durationHours)]
    );
    if (!result?.rows[0]) {
      return res.status(404).json({ success: false, error: 'Patient or doctor profile not found' });
    }
    return res.json({ success: true, data: { ...result.rows[0], doctorId } });
  }

  res.json({
    success: true,
    data: {
      consentId: `CONSENT_${userId}_${doctorId}`,
      status: 'active',
      expiresAt: new Date(Date.now() + durationHours * 3600000),
    },
  });
});

// POST /api/patients/access/revoke
router.post('/access/revoke', async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { doctorId } = req.body;

  if (dbService.getStatus().connected) {
    await dbService.query(
      `UPDATE patient_consents
       SET status = 'revoked', revoked_at = CURRENT_TIMESTAMP
       WHERE patient_id = (SELECT id FROM patients WHERE user_id = $1)
         AND doctor_id = (SELECT id FROM doctors WHERE user_id = $2)
         AND status = 'active'`,
      [userId, doctorId]
    );
  }

  res.json({
    success: true,
    data: {
      message: 'Access revoked successfully',
    },
  });
});

// GET /api/patients/hospitals/nearby
router.get('/hospitals/nearby', (req: Request, res: Response) => {
  const { latitude, longitude, radius } = req.query;

  res.json({
    success: true,
    data: [
      {
        id: 1,
        name: 'CHU Cotonou',
        distance: 1.2,
        rating: 4.5,
        address: 'Cotonou',
      },
      {
        id: 2,
        name: 'Clinique Privée Sainte-Famille',
        distance: 2.5,
        rating: 4.8,
        address: 'Abomey-Calavi',
      },
    ],
  });
});

// POST /api/patients/hospitals/:id/rate
router.post('/hospitals/:id/rate', (req: Request, res: Response) => {
  const { rating, comment } = req.body;

  res.json({
    success: true,
    data: {
      message: 'Rating submitted successfully',
    },
  });
});

// GET /api/patients/consents
router.get('/consents', async (req: Request, res: Response) => {
  const userId = (req as any).userId;

  if (dbService.getStatus().connected) {
    const result = await dbService.query(
      `SELECT id, doctor_id AS "doctorId", status, purpose, granted_at AS "grantedAt", expires_at AS "expiresAt"
       FROM patient_consents
       WHERE patient_id = (SELECT id FROM patients WHERE user_id = $1)
       ORDER BY created_at DESC`,
      [userId]
    );
    return res.json({ success: true, data: result?.rows || [] });
  }

  res.json({
    success: true,
    data: [
      {
        id: 1,
        doctorId: 1,
        status: 'active',
        expiresAt: new Date(Date.now() + 24 * 3600000),
      },
    ],
  });
});

export default router;
