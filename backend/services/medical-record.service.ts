import { MongoClient, Db } from 'mongodb';
import { dbService } from './db.service';
import { decryptJson, encryptJson, isEncryptedPayload } from './encryption.service';

export type MedicalRecordStatus = 'DRAFT' | 'VALIDATED' | 'ARCHIVED';

export interface MedicalRecordDocument {
  identityUuid: string;
  profile?: Record<string, unknown>;
  history?: unknown[];
  consultations?: unknown[];
  prescriptions?: unknown[];
  examinations?: unknown[];
  images?: unknown[];
  documents?: unknown[];
}

let mongoClient: MongoClient | null = null;
let mongoDb: Db | null = null;

function mongoEnabled(): boolean {
  return Boolean(process.env.MONGODB_URI);
}

async function getMongoDb(): Promise<Db | null> {
  if (!mongoEnabled()) return null;
  if (mongoDb) return mongoDb;
  try {
    mongoClient = new MongoClient(process.env.MONGODB_URI!, { serverSelectionTimeoutMS: 1500 });
    await mongoClient.connect();
    mongoDb = mongoClient.db(process.env.MONGODB_DB || 'santeplus');
    return mongoDb;
  } catch (error) {
    await mongoClient?.close().catch(() => undefined);
    mongoClient = null;
    return null;
  }
}

export async function getMedicalRecord(identityUuid: string, includeDraft = false): Promise<MedicalRecordDocument | null> {
  if (!identityUuid) return null;
  const mongo = await getMongoDb();
  if (mongo) {
    const records = await mongo.collection('medical_dossiers').find({
      identityUuid,
      ...(includeDraft ? {} : { status: { $ne: 'DRAFT' } }),
    }).sort({ updatedAt: -1 }).limit(1).toArray();
    const record = records[0];
    if (!record) return null;
    return isEncryptedPayload(record.payload) ? decryptJson<MedicalRecordDocument>(record.payload) : record.payload;
  }

  if (!dbService.getStatus().connected) return null;
  const result = await dbService.query<{ payload_encrypted: unknown }>(
    `SELECT payload_encrypted FROM medical_records
     WHERE identity_uuid = $1 AND ($2::boolean OR status <> 'DRAFT')
     ORDER BY updated_at DESC LIMIT 1`,
    [identityUuid, includeDraft]
  );
  const encrypted = result?.rows[0]?.payload_encrypted;
  return isEncryptedPayload(encrypted) ? decryptJson<MedicalRecordDocument>(encrypted) : null;
}

export async function saveMedicalRecord(
  identityUuid: string,
  record: MedicalRecordDocument,
  status: MedicalRecordStatus,
  createdBy?: number,
): Promise<void> {
  if (!identityUuid) return;
  const encrypted = encryptJson(record);
  const mongo = await getMongoDb();
  if (mongo) {
    await mongo.collection('medical_dossiers').updateOne(
      { identityUuid, status },
      { $set: { identityUuid, status, payload: encrypted, updatedAt: new Date(), createdBy } },
      { upsert: true },
    );
    return;
  }

  if (dbService.getStatus().connected) {
    await dbService.query(
      `INSERT INTO medical_records (identity_uuid, record_type, payload_encrypted, status, created_by, validated_at)
       VALUES ($1, 'medical_dossier', $2::jsonb, $3, $4, CASE WHEN $3 = 'VALIDATED' THEN CURRENT_TIMESTAMP ELSE NULL END)`,
      [identityUuid, JSON.stringify(encrypted), status, createdBy || null]
    );
  }
}

export async function closeMedicalRecordStore(): Promise<void> {
  await mongoClient?.close().catch(() => undefined);
  mongoClient = null;
  mongoDb = null;
}
