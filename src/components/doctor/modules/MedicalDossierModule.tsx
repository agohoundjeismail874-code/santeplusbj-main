import React, { useEffect, useState } from 'react';
import { getDoctorPatients, getPatientDossier, Patient, PatientDossier } from '../../../services/doctorApi';
import { 
  FileText, Pill, Activity, ShieldCheck, Folder, Search, User, Droplet, 
  AlertTriangle, Calendar, Paperclip, Eye, Download, Inbox, Share2 
} from 'lucide-react';

interface DoctorData {
  id: string;
  name: string;
}

interface Consultation {
  id: string;
  date: string;
  time: string;
  doctorName: string;
  hospitalName: string;
  reason: string;
  diagnostic: string;
  prescription: string;
  attachments: string[];
  blockchainHash?: string;
}

interface DossierTabsProps {
  tabs: Array<{ key: string; label: string; icon: React.ReactNode }>;
  activeTab: string;
  onTabChange: (key: string) => void;
}

function DossierTabs({ tabs, activeTab, onTabChange }: DossierTabsProps) {
  return (
    <div className="flex border-b-2 border-gray-200 mb-6 overflow-x-auto gap-4">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          className={`px-4 py-3 font-semibold whitespace-nowrap border-b-2 transition flex items-center gap-2 cursor-pointer ${
            activeTab === tab.key
              ? 'border-[#00D26A] text-[#00D26A]'
              : 'border-transparent text-gray-600 hover:text-gray-800'
          }`}
        >
          {tab.icon}
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
}

export default function MedicalDossierModule({ doctorData }: { doctorData: DoctorData }) {
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [dossier, setDossier] = useState<PatientDossier | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('consultations');

  useEffect(() => {
    getDoctorPatients()
      .then(data => {
        setPatients(data);
        if (data[0]) setSelectedPatientId(data[0].id);
      })
      .catch(err => setError(err.message || 'Impossible de charger les patients'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handleRealtime = (event: Event) => {
      const detail = (event as CustomEvent<{ entity?: string }>).detail;
      if (detail?.entity === 'patient') {
        getDoctorPatients().then(setPatients).catch(() => undefined);
      }
      if (detail?.entity === 'consultation' && selectedPatientId) {
        getPatientDossier(selectedPatientId).then(setDossier).catch(() => undefined);
      }
    };
    window.addEventListener('sante-realtime', handleRealtime);
    return () => window.removeEventListener('sante-realtime', handleRealtime);
  }, [selectedPatientId]);

  useEffect(() => {
    if (!selectedPatientId) return;
    setDossier(null);
    getPatientDossier(selectedPatientId)
      .then(setDossier)
      .catch(err => setError(err.message || 'Impossible de charger le dossier'));
  }, [selectedPatientId]);

  const selectedPatient = patients.find((p) => p.id === selectedPatientId);
  const patientConsultations = dossier?.consultations || [];

  if (loading) {
    return <section className="py-12 text-center text-gray-500">Chargement des dossiers...</section>;
  }

  if (!selectedPatient || !dossier) {
    return (
      <section className="py-12">
        <h2 className="text-4xl font-bold text-[#067A45] mb-8 flex items-center gap-3">
          <FileText className="w-9 h-9" />
          <span>Dossier Médical</span>
        </h2>
        <div className="bg-white rounded-2xl p-10 text-center shadow-md text-gray-500">
          {error || 'Aucun dossier autorisé. Ajoutez d’abord un patient depuis le module « Mes Patients ».'}
        </div>
      </section>
    );
  }

  const tabs = [
    { key: 'consultations', label: 'Consultations', icon: <FileText className="w-4 h-4" /> },
    { key: 'prescriptions', label: 'Prescriptions', icon: <Pill className="w-4 h-4" /> },
    { key: 'analyses', label: 'Analyses', icon: <Activity className="w-4 h-4" /> },
    { key: 'vaccins', label: 'Vaccins', icon: <ShieldCheck className="w-4 h-4" /> },
    { key: 'documents', label: 'Documents', icon: <Folder className="w-4 h-4" /> },
  ];

  return (
    <section className="py-12">
      <h2 className="text-4xl font-bold text-[#067A45] mb-8 flex items-center gap-3">
        <FileText className="w-9 h-9" />
        <span>Dossier Médical</span>
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl p-6 shadow-md sticky top-24">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Patients</h3>
            <div className="relative mb-4">
              <input
                type="text"
                placeholder="Rechercher..."
                className="w-full h-10 px-3 pl-9 border-2 border-gray-200 rounded-lg focus:border-[#00D26A] focus:outline-none"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {patients.map((patient) => (
                <button
                  key={patient.id}
                  onClick={() => setSelectedPatientId(patient.id)}
                  className={`w-full text-left p-3 rounded-lg transition cursor-pointer ${
                    selectedPatientId === patient.id
                      ? 'bg-[#00D26A] text-white'
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <p className="font-semibold">{patient.name}</p>
                  <p className="text-xs opacity-75">{patient.npi}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="bg-white rounded-2xl p-6 shadow-md mb-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                  <User className="w-6 h-6 text-gray-700" />
                  <span>{selectedPatient.name}</span>
                </h2>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    {selectedPatient.age} ans
                  </span>
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
              </div>
              <div className="text-right text-sm text-gray-600">
                <p className="font-semibold">{selectedPatient.consultations} consultations</p>
                <p>Dernière visite: {selectedPatient.lastVisit}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-md">
            <DossierTabs
              tabs={tabs}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />

            {activeTab === 'consultations' && (
              <div className="space-y-4">
                {patientConsultations.map((consultation) => (
                  <div
                    key={consultation.id}
                    className="bg-gray-50 rounded-xl p-4 border-l-4 border-[#00D26A] hover:shadow-md transition"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-bold text-gray-800 flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <span>{consultation.date} · {consultation.time} · {consultation.doctorName || doctorData.name}</span>
                        </p>
                        <p className="text-sm text-gray-600 mt-1">Motif: {consultation.reason}</p>
                      </div>
                      <span className="text-xs bg-[#00D26A] text-white px-2 py-1 rounded-full">
                        Signé
                      </span>
                    </div>

                    <div className="space-y-2 text-sm mb-3">
                      <p className="text-gray-700">
                        <strong>Diagnostic:</strong> {consultation.diagnostic}
                      </p>
                      <p className="text-gray-700">
                        <strong>Prescription:</strong> {consultation.prescription}
                      </p>
                    </div>

                    {consultation.attachments.length > 0 && (
                      <div className="flex gap-2 mb-3">
                        {consultation.attachments.map((att, i) => (
                          <a
                            key={i}
                            href="#"
                            className="text-xs bg-white border border-gray-300 px-3 py-1 rounded-lg hover:bg-gray-100 flex items-center gap-1"
                          >
                            <Paperclip className="w-3.5 h-3.5 text-gray-500" />
                            <span>{att}</span>
                          </a>
                        ))}
                      </div>
                    )}

                    <div className="flex justify-between items-center">
                      <div className="flex gap-2">
                        <span className="text-xs text-gray-500">Dossier consulté et journalisé</span>
                      </div>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Dossier protégé</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'prescriptions' && (
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-xl p-4 border-l-4 border-[#00D26A]">
                  <p className="font-bold text-gray-800 flex items-center gap-2">
                    <Pill className="w-4 h-4 text-[#00D26A]" />
                    <span>Ciprofloxacine 500mg</span>
                  </p>
                  <p className="text-sm text-gray-600 mt-1">Fréquence: 2x/jour</p>
                  <p className="text-sm text-gray-600">Prescrit par Dr. Kodjo · 30/06/2026</p>
                  <div className="flex gap-2 mt-3">
                    <button className="text-sm bg-white border border-[#00D26A] text-[#00D26A] px-3 py-1 rounded-lg hover:bg-green-50 cursor-pointer">
                      Renouveler
                    </button>
                    <button className="text-sm bg-white border border-gray-300 text-gray-600 px-3 py-1 rounded-lg hover:bg-gray-100 cursor-pointer">
                      Arrêter
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab !== 'consultations' && activeTab !== 'prescriptions' && (
              <div className="text-center py-12 text-gray-600">
                <Inbox className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>Aucune donnée disponible pour cet onglet</p>
                <button className="mt-4 text-[#00D26A] hover:underline cursor-pointer">
                  + Ajouter une entrée
                </button>
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-6">
            <button className="flex-1 bg-white border border-[#00D26A] text-[#00D26A] py-3 rounded-xl font-bold hover:bg-green-50 transition flex items-center justify-center gap-2 cursor-pointer">
              <Download className="w-5 h-5" />
              <span>Télécharger tout</span>
            </button>
            <button className="flex-1 bg-white border border-[#00D26A] text-[#00D26A] py-3 rounded-xl font-bold hover:bg-green-50 transition flex items-center justify-center gap-2 cursor-pointer">
              <Share2 className="w-5 h-5" />
              <span>Partager avec un médecin</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
