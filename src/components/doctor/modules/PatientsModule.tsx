import React, { useState, useEffect } from 'react';
import { addDoctorPatient, getDoctorPatients, Patient } from '../../../services/doctorApi';
import QRScannerModal, { DecodedPatientData } from '../../common/QRScannerModal';
import { 
  Users, AlertCircle, Search, RotateCw, AlertTriangle, User, 
  FileText, Calendar, Droplet, Stethoscope, Plus, X, QrCode, Mail
} from 'lucide-react';

interface PatientsModuleProps {
  doctorData: any;
  onOpenDossier?: () => void;
  onOpenConsultation?: () => void;
}

export default function PatientsModule({ doctorData, onOpenDossier, onOpenConsultation }: PatientsModuleProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [addError, setAddError] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    loadPatients();
  }, []);

  useEffect(() => {
    const handleRealtime = (event: Event) => {
      const detail = (event as CustomEvent<{ entity?: string }>).detail;
      if (detail?.entity === 'patient' || detail?.entity === 'consultation') loadPatients();
    };
    window.addEventListener('sante-realtime', handleRealtime);
    return () => window.removeEventListener('sante-realtime', handleRealtime);
  }, []);

  const loadPatients = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getDoctorPatients();
      setPatients(data);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des patients');
      setPatients([]);
    } finally {
      setLoading(false);
    }
  };

  const addPatient = async (value: string) => {
    const cleanIdentifier = value.trim();
    if (!cleanIdentifier) return;
    try {
      setAdding(true);
      setAddError('');
      const patient = await addDoctorPatient(cleanIdentifier);
      setPatients(current => [patient, ...current.filter(item => item.id !== patient.id)]);
      setIdentifier('');
      setShowAddModal(false);
    } catch (err: any) {
      setAddError(err.message || 'Patient introuvable ou accès refusé.');
    } finally {
      setAdding(false);
    }
  };

  const handleScan = (data: DecodedPatientData) => {
    if (data.npi || data.id) addPatient(data.npi || data.id || '');
  };

  const filteredPatients = patients.filter((patient) => {
    const matchSearch =
      patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (patient.npi && patient.npi.includes(searchTerm));
    const matchStatus = filterStatus === 'all' || patient.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-700';
      case 'urgent': return 'bg-red-100 text-red-700';
      default: return 'bg-green-100 text-green-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'new': return 'Nouveau';
      case 'urgent': return 'Urgent';
      default: return 'Régulier';
    }
  };

  const formatLastVisit = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR');
    } catch {
      return dateStr;
    }
  };

  return (
    <section className="py-12">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-4xl font-bold text-[#067A45] flex items-center gap-3">
          <Users className="w-9 h-9" />
          <span>Mes Patients</span>
        </h2>
        <div className="flex gap-3 text-sm">
          <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-semibold">
            {patients.length} patients
          </span>
          <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full font-semibold">
            {patients.filter((p) => p.status === 'urgent').length} urgents
          </span>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-md mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Recherche</label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nom du patient..."
                className="w-full h-12 px-4 pl-10 border-2 border-gray-200 rounded-lg focus:border-[#00D26A] focus:outline-none"
              />
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Filtrer par statut</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full h-12 px-4 border-2 border-gray-200 rounded-lg focus:border-[#00D26A] focus:outline-none"
            >
              <option value="all">Tous</option>
              <option value="regular">Réguliers</option>
              <option value="new">Nouveaux</option>
              <option value="urgent">Urgents</option>
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button
              onClick={loadPatients}
              className="flex-1 bg-gray-100 text-gray-800 h-12 rounded-lg font-semibold hover:bg-gray-200 transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCw className="w-4 h-4" />
              <span>Actualiser</span>
            </button>
            <button onClick={() => { setAddError(''); setShowAddModal(true); }} className="flex-1 bg-[#00D26A] text-white h-12 rounded-lg font-bold hover:bg-[#067A45] transition flex items-center justify-center gap-1 cursor-pointer">
              <Plus className="w-4 h-4" />
              <span>Ajouter</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4 text-yellow-700 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-600 shrink-0" />
            <span>{error} — Données en cache affichées.</span>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold text-gray-900">Ajouter un patient</h3>
              <button onClick={() => setShowAddModal(false)} className="p-2 text-gray-500 hover:text-gray-900"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-gray-600 mb-4">Identifiez le patient avec son email ou son NPI. L’accès est enregistré et audité.</p>
            <div className="flex gap-2">
              <input value={identifier} onChange={event => setIdentifier(event.target.value)} placeholder="Email ou NPI" className="flex-1 h-12 px-4 border-2 border-gray-200 rounded-lg focus:border-[#00D26A] focus:outline-none" />
              <button onClick={() => addPatient(identifier)} disabled={adding} className="px-4 bg-[#067A45] text-white rounded-lg font-semibold disabled:opacity-50"><Mail className="w-5 h-5" /></button>
            </div>
            <button onClick={() => setShowScanner(true)} className="w-full mt-3 h-12 border-2 border-[#00D26A] text-[#067A45] rounded-lg font-semibold flex items-center justify-center gap-2"><QrCode className="w-5 h-5" />Scanner le QR patient</button>
            {addError && <p className="mt-3 text-sm text-red-600">{addError}</p>}
          </div>
        </div>
      )}
      <QRScannerModal isOpen={showScanner} onClose={() => setShowScanner(false)} onScan={handleScan} />

      {loading ? (
        <div className="flex justify-center items-center h-32">
          <div className="text-center">
            <Users className="w-10 h-10 text-[#00D26A] animate-pulse mx-auto mb-2" />
            <p className="text-gray-500">Chargement des patients...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPatients.length === 0 ? (
            <div className="text-center py-12 text-gray-400 bg-white rounded-2xl shadow-md">
              <Search className="w-14 h-14 mx-auto mb-3 text-gray-300" />
              <p className="text-lg">Aucun patient trouvé</p>
            </div>
          ) : (
            filteredPatients.map((patient) => (
              <div key={patient.id} className="bg-white rounded-2xl p-6 border border-gray-200 hover:shadow-lg transition">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                      {patient.status === 'urgent' ? (
                        <AlertCircle className="w-5 h-5 text-red-500" />
                      ) : (
                        <User className="w-5 h-5 text-gray-700" />
                      )}
                      <span>{patient.name}</span>
                    </h3>
                    <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                      <span className="flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-gray-400" />
                        {patient.consultations} consultations
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        Dernière visite: {formatLastVisit(patient.lastVisit)}
                      </span>
                    </div>
                    {patient.npi && (
                      <p className="text-xs text-gray-400 mt-1">NPI: {patient.npi}</p>
                    )}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(patient.status)}`}>
                    {getStatusLabel(patient.status)}
                  </span>
                </div>

                <div className="flex items-center gap-4 mb-4 text-sm text-gray-600">
                  <span>{patient.age} ans</span>
                  <span className="flex items-center gap-1 font-semibold text-red-600">
                    <Droplet className="w-4 h-4 fill-red-500 text-red-500" />
                    {patient.blood}
                  </span>
                  {patient.allergies && patient.allergies !== 'Aucune' && (
                    <span className="text-red-500 font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {patient.allergies}
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <button onClick={onOpenDossier} className="flex-1 bg-white border border-[#00D26A] text-[#00D26A] py-2 rounded-lg font-semibold hover:bg-green-50 transition flex items-center justify-center gap-1.5 cursor-pointer">
                    <FileText className="w-4 h-4" />
                    <span>Voir dossier</span>
                  </button>
                  <button onClick={onOpenConsultation} className="flex-1 bg-gradient-to-r from-[#00D26A] to-[#067A45] text-white py-2 rounded-lg font-semibold hover:shadow-lg transition flex items-center justify-center gap-1.5 cursor-pointer">
                    <Stethoscope className="w-4 h-4" />
                    <span>Consulter</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </section>
  );
}
