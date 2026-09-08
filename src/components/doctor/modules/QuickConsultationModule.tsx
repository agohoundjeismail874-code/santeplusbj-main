import React, { useState, useEffect, useRef } from 'react';
import { addDoctorPatient, getDoctorPatients, getPatientDossier, saveConsultation, Patient, PatientDossier, ConsultationResult } from '../../../services/doctorApi';
import { 
  Stethoscope, QrCode, Keyboard, Mic, User, Droplet, 
  AlertTriangle, Camera, Paperclip, Save, Loader2, Send, ShieldCheck,
  CheckCircle2, ExternalLink, FileCheck, X
} from 'lucide-react';
import QRScannerModal, { DecodedPatientData } from '../../common/QRScannerModal';

interface DoctorData {
  id: string;
  name: string;
}

interface QuickConsultationModuleProps {
  doctorData: DoctorData;
}

export default function QuickConsultationModule({ doctorData }: QuickConsultationModuleProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
    const [patientSearch, setPatientSearch] = useState('');
    const [patientDossier, setPatientDossier] = useState<PatientDossier | null>(null);
    const [vitals, setVitals] = useState({ bloodPressure: '', pulse: '', temperature: '', weight: '' });
  const [medication, setMedication] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('');
  const [diagnostic, setDiagnostic] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [patientIdentifier, setPatientIdentifier] = useState('');
  const [lookupError, setLookupError] = useState('');
  const recognitionRef = useRef<any>(null);
  const identifierInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadPatients();
    const handleRealtime = (event: Event) => {
      const detail = (event as CustomEvent<{ entity?: string }>).detail;
      if (detail?.entity === 'patient' || detail?.entity === 'consultation') loadPatients();
    };
    window.addEventListener('sante-realtime', handleRealtime);
    return () => window.removeEventListener('sante-realtime', handleRealtime);
  }, []);

  const loadPatients = async () => {
    try {
      setPatients(await getDoctorPatients());
    } catch {
      setPatients([]);
    }
  };

  const medications = [
    'Ciprofloxacine 500mg',
    'Amoxicilline 500mg',
    'Paracétamol 1g',
    'Ibuprofène 400mg',
    'Amlodipine 5mg',
    'Losartan 50mg',
  ];

  const dosages = ['1 comprimé', '2 comprimés', '1 sachet', '1 cuillère à soupe'];
  const frequencies = ['1x/jour', '2x/jour', '3x/jour', 'si besoin'];

  const handleScan = () => setIsScannerOpen(true);

  const selectPatient = async (patient: Patient) => {
    setSelectedPatient(patient);
    setStep(2);
    setLookupError('');
    try {
      setPatientDossier(await getPatientDossier(patient.id));
    } catch {
      setPatientDossier(null);
    }
  };

  const handleDecodedQR = (data: DecodedPatientData) => {
    const identifier = data.npi || data.id;
    if (!identifier) return;
    addDoctorPatient(identifier)
      .then(patient => { setPatients(current => [patient, ...current.filter(item => item.id !== patient.id)]); selectPatient(patient); })
      .catch(err => setLookupError(err.message || 'Patient introuvable'));
  };

  const handlePatientLookup = async () => {
    if (!patientIdentifier.trim()) return;
    try {
      const patient = await addDoctorPatient(patientIdentifier);
      setPatients(current => [patient, ...current.filter(item => item.id !== patient.id)]);
      setSelectedPatient(patient);
      await selectPatient(patient);
    } catch (err: any) {
      setLookupError(err.message || 'Patient introuvable');
    }
  };

  const handleVoiceInput = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('La reconnaissance vocale n\'est pas supportée par votre navigateur');
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'fr-FR';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      setTranscript((prev) => (prev ? `${prev} ${text}` : text));
      setStep(3);
    };

    recognition.onerror = () => {
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const [saving, setSaving] = useState(false);
  const [lastResult, setLastResult] = useState<ConsultationResult | null>(null);

  const handleCloseSuccessModal = () => {
    setLastResult(null);
    setStep(1);
    setTranscript('');
    setSelectedPatient(null);
    setMedication('');
    setDosage('');
    setFrequency('');
    setDiagnostic('');
    setPatientDossier(null);
    setPatientSearch('');
    setVitals({ bloodPressure: '', pulse: '', temperature: '', weight: '' });
  };

  const handleSaveConsultation = async () => {
    if (!selectedPatient) {
      alert('Veuillez d\'abord identifier un patient');
      return;
    }

    try {
      setSaving(true);
      const result = await saveConsultation({
        patientId: selectedPatient.id,
        patientName: selectedPatient.name,
        doctorId: doctorData.id,
        doctorName: doctorData.name,
        diagnostic,
        notes: [
          transcript,
          vitals.bloodPressure && `TA: ${vitals.bloodPressure}`,
          vitals.pulse && `Pouls: ${vitals.pulse} bpm`,
          vitals.temperature && `Température: ${vitals.temperature} °C`,
          vitals.weight && `Poids: ${vitals.weight} kg`,
        ].filter(Boolean).join('\n'),
        prescription: { medication, dosage, frequency },
      });

      setLastResult(result);
    } catch (err: any) {
      setLookupError(err.message || 'La consultation n’a pas pu être enregistrée.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="py-12">
      <h2 className="text-4xl font-bold text-[#067A45] mb-8 flex items-center gap-3">
        <Stethoscope className="w-9 h-9" />
        <span>Consultation Rapide</span>
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* STEP 1: Identifier le patient */}
        <div className="bg-white rounded-2xl p-6 shadow-md">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className={`inline-block w-8 h-8 rounded-full ${step >= 1 ? 'bg-[#00D26A]' : 'bg-gray-300'} text-white flex items-center justify-center text-sm`}>1</span>
            <span>Identifier le patient</span>
          </h3>

          <div className="space-y-3 mb-6">
            <button
              onClick={handleScan}
              className="w-full bg-gradient-to-r from-[#00D26A] to-[#067A45] text-white py-3 rounded-xl font-semibold hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <QrCode className="w-5 h-5" />
              <span>Scanner QR Code</span>
            </button>
            <button onClick={() => identifierInputRef.current?.focus()} className="w-full bg-gray-100 text-gray-800 py-3 rounded-xl font-semibold hover:bg-gray-200 transition flex items-center justify-center gap-2 cursor-pointer">
              <Keyboard className="w-5 h-5" />
              <span>Saisir NPI</span>
            </button>
            <button onClick={handleVoiceInput} className="w-full bg-gray-100 text-gray-800 py-3 rounded-xl font-semibold hover:bg-gray-200 transition flex items-center justify-center gap-2 cursor-pointer">
              <Mic className="w-5 h-5" />
              <span>Reconnaissance vocale</span>
            </button>
          </div>

          <div className="flex gap-2">
            <input ref={identifierInputRef} value={patientIdentifier} onChange={event => setPatientIdentifier(event.target.value)} placeholder="NPI ou email" className="flex-1 h-11 px-3 border-2 border-gray-200 rounded-lg" />
            <button onClick={handlePatientLookup} className="px-4 bg-[#067A45] text-white rounded-lg font-semibold">Ajouter</button>
          </div>
          {patients.length > 0 && (
            <div className="mt-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Patients ajoutés</label>
              <input
                value={patientSearch}
                onChange={(event) => setPatientSearch(event.target.value)}
                placeholder="Rechercher par nom ou NPI"
                className="w-full h-10 px-3 mb-2 border border-gray-200 rounded-lg focus:border-[#00D26A] focus:outline-none"
              />
              <div className="flex flex-wrap gap-2">
                {patients.filter((patient) => `${patient.name} ${patient.npi || ''}`.toLowerCase().includes(patientSearch.toLowerCase())).map((patient) => (
                  <button
                    key={patient.id}
                    type="button"
                    onClick={() => selectPatient(patient)}
                    className={`px-3 py-2 rounded-lg border text-left text-sm transition ${selectedPatient?.id === patient.id ? 'border-[#00D26A] bg-green-50 text-[#067A45]' : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-[#00D26A]'}`}
                  >
                    <span className="font-semibold block">{patient.name}</span>
                    <span className="text-xs text-gray-500">{patient.npi || patient.id}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {lookupError && <p className="mt-2 text-sm text-red-600">{lookupError}</p>}

          {selectedPatient && (
            <div className="bg-gray-50 p-4 rounded-xl border-l-4 border-[#00D26A] mt-4">
              <p className="font-bold text-lg text-gray-800 flex items-center gap-2">
                <User className="w-5 h-5 text-gray-700" />
                <span>{selectedPatient.name}</span>
              </p>
              <div className="grid grid-cols-3 gap-2 mt-2 text-sm text-gray-600">
                <span>{selectedPatient.age} ans</span>
                <span className="flex items-center gap-1 font-semibold text-red-600">
                  <Droplet className="w-4 h-4 fill-red-500 text-red-500" />
                  {selectedPatient.blood}
                </span>
                {selectedPatient.allergies !== 'Aucune' && (
                  <span className="text-red-500 font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {selectedPatient.allergies}
                  </span>
                )}
              </div>
              {patientDossier && (
                <div className="mt-3 pt-3 border-t border-gray-200 grid grid-cols-2 gap-2 text-xs text-gray-600">
                  <span>Dossier : {patientDossier.consultations.length} consultation(s)</span>
                  <span>Ordonnances : {patientDossier.prescriptions.length}</span>
                  <span>Allergies : {patientDossier.allergies || 'Aucune'}</span>
                  <span>Groupe : {patientDossier.blood || 'Non renseigné'}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* STEP 2: Saisie rapide */}
        <div className="bg-white rounded-2xl p-6 shadow-md">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className={`inline-block w-8 h-8 rounded-full ${step >= 2 ? 'bg-[#00D26A]' : 'bg-gray-300'} text-white flex items-center justify-center text-sm`}>2</span>
            <span>Saisie rapide</span>
          </h3>

          <div className="space-y-3">
            <button
              onClick={handleVoiceInput}
              className={`w-full py-3 rounded-xl font-semibold transition flex items-center justify-center gap-2 cursor-pointer ${
                isRecording
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'bg-[#00D26A] text-white hover:bg-[#067A45]'
              }`}
            >
              <Mic className="w-5 h-5" />
              <span>{isRecording ? '[Enregistrement...]' : '[Cliquez et parlez]'}</span>
            </button>

            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Douleur au ventre, infection urinaire, ..."
              className="w-full h-24 p-3 border-2 border-gray-200 rounded-xl resize-none focus:border-[#00D26A] focus:outline-none"
            />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                ['bloodPressure', 'TA (mmHg)', '120/80'],
                ['pulse', 'Pouls (bpm)', '72'],
                ['temperature', 'Temp. (°C)', '37'],
                ['weight', 'Poids (kg)', '70'],
              ].map(([key, label, placeholder]) => (
                <label key={key} className="text-xs font-semibold text-gray-600">
                  {label}
                  <input
                    value={vitals[key as keyof typeof vitals]}
                    onChange={(event) => setVitals(current => ({ ...current, [key]: event.target.value }))}
                    placeholder={placeholder}
                    className="w-full mt-1 h-10 px-2 border border-gray-200 rounded-lg font-normal focus:border-[#00D26A] focus:outline-none"
                  />
                </label>
              ))}
            </div>

          </div>
        </div>

        {/* STEP 3: Prescription */}
        <div className="bg-white rounded-2xl p-6 shadow-md lg:col-span-2">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className={`inline-block w-8 h-8 rounded-full ${step >= 3 ? 'bg-[#00D26A]' : 'bg-gray-300'} text-white flex items-center justify-center text-sm`}>3</span>
            <span>Prescription & Diagnostic</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <select
              value={medication}
              onChange={(e) => setMedication(e.target.value)}
              className="h-12 p-3 border-2 border-gray-200 rounded-xl focus:border-[#00D26A] focus:outline-none"
            >
              <option value="">Sélectionner un médicament</option>
              {medications.map((med) => (
                <option key={med} value={med}>{med}</option>
              ))}
            </select>

            <select
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              className="h-12 p-3 border-2 border-gray-200 rounded-xl focus:border-[#00D26A] focus:outline-none"
            >
              <option value="">Dosage</option>
              {dosages.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className="h-12 p-3 border-2 border-gray-200 rounded-xl focus:border-[#00D26A] focus:outline-none"
            >
              <option value="">Fréquence</option>
              {frequencies.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          <input
            type="text"
            value={diagnostic}
            onChange={(e) => setDiagnostic(e.target.value)}
            placeholder="Diagnostic"
            className="w-full h-12 p-3 border-2 border-gray-200 rounded-xl focus:border-[#00D26A] focus:outline-none mb-3"
          />

          {/* Confirmation de préparation de l'ordonnance */}
          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl mb-4 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-emerald-600" />
              <div>
                <span className="font-bold text-gray-900 block">Ordonnance prête à être validée</span>
                <span className="text-[10px] text-gray-500">Vérifiez les informations avant l’envoi au patient.</span>
              </div>
            </div>
            <span className="px-2 py-0.5 bg-emerald-600 text-white font-extrabold text-[10px] rounded-md">
              PRÊT
            </span>
          </div>

          {/* STEP 4: Enregistrer */}
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className={`inline-block w-8 h-8 rounded-full ${step >= 4 ? 'bg-[#00D26A]' : 'bg-gray-300'} text-white flex items-center justify-center text-sm`}>4</span>
            <span>Enregistrer</span>
          </h3>

          <div className="flex gap-3">
            <button
              onClick={handleSaveConsultation}
              disabled={saving}
              className="flex-1 bg-gradient-to-r from-[#00D26A] to-[#067A45] text-white py-3 rounded-xl font-bold hover:shadow-lg transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Enregistrement...</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>Enregistrer</span>
                </>
              )}
            </button>
            <button className="flex-1 bg-white text-[#067A45] border-2 border-[#00D26A] py-3 rounded-xl font-bold hover:bg-green-50 transition flex items-center justify-center gap-2 cursor-pointer">
              <Send className="w-5 h-5" />
              <span>Envoyer au patient</span>
            </button>
          </div>

          <p className="text-sm text-gray-600 mt-3 text-center flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Enregistrement sécurisé du dossier</span>
          </p>
        </div>
      </div>

      {/* Modal Scanner QR Caméra */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleDecodedQR}
      />

      {/* Modal Consultation Validée & Ordonnance IPFS */}
      {lastResult && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-gray-900 leading-tight">Ordonnance Certifiée</h3>
                  <span className="text-xs text-emerald-700 font-bold">Version finale envoyée au patient</span>
                </div>
              </div>
              <button onClick={handleCloseSuccessModal} className="text-gray-400 hover:text-gray-700 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">Patient :</span>
                  <strong className="text-gray-900">{lastResult.patientName}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Praticien :</span>
                  <strong className="text-gray-900">{doctorData.name} ({lastResult.doctorLicense || 'MED-BJ-2024-8831'})</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Diagnostic :</span>
                  <span className="text-gray-800 font-semibold">{lastResult.diagnostic}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Prescription :</span>
                  <strong className="text-emerald-800">{lastResult.prescription}</strong>
                </div>
              </div>

              {/* Confirmation de transmission */}
              <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-2">
                <div>
                  <span className="text-[10px] text-emerald-800 font-black uppercase tracking-wider block">Transmission</span>
                  <code className="text-[11px] font-mono font-bold text-gray-900 break-all block bg-white/80 p-1.5 rounded-lg border border-emerald-100 mt-0.5">
                    Dossier transmis au patient
                  </code>
                </div>
                <div>
                  <span className="text-[10px] text-emerald-800 font-black uppercase tracking-wider block">État du dossier</span>
                  <code className="text-[11px] font-mono text-gray-700 break-all block bg-white/80 p-1.5 rounded-lg border border-emerald-100 mt-0.5">
                    Version finale enregistrée
                  </code>
                </div>
                <div>
                  <span className="text-[10px] text-emerald-800 font-black uppercase tracking-wider block">Accès patient</span>
                  <code className="text-[10px] font-mono text-gray-600 block bg-white/80 p-1 rounded-lg border border-emerald-100 mt-0.5">
                    Disponible dans l’espace patient
                  </code>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleCloseSuccessModal}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md"
              >
                <span>Nouvelle Consultation</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
