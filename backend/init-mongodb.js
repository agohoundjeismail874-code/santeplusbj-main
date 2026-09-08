// ============================================================================
// INITIALISATION MONGODB - SANTÉ+
// ============================================================================

db = db.getSiblingDB('santeplus');

// Créer les collections
db.createCollection('medical_dossiers');
db.createCollection('consultations');
db.createCollection('prescriptions');
db.createCollection('medical_images');

// Créer les indexes
db.medical_dossiers.createIndex({ identityUuid: 1, status: 1 });
db.medical_dossiers.createIndex({ patientId: 1 }); // legacy documents
db.medical_dossiers.createIndex({ 'consultations.date': -1 });
db.medical_dossiers.createIndex({ hashSignature: 1 });
db.medical_dossiers.createIndex({ 'generalInfo.bloodType': 1 });

db.consultations.createIndex({ patientId: 1 });
db.consultations.createIndex({ doctorId: 1 });
db.consultations.createIndex({ consultationDate: -1 });

db.prescriptions.createIndex({ consultationId: 1 });
db.prescriptions.createIndex({ medicationName: 1 });

db.medical_images.createIndex({ patientId: 1 });
db.medical_images.createIndex({ consultationId: 1 });

print('MongoDB initialized successfully');
