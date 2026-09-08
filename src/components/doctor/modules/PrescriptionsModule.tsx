import React, { useState, useEffect } from 'react';
import { getDoctorPrescriptions, Prescription } from '../../../services/doctorApi';
import { Pill, RotateCw, AlertTriangle, FileText, User, Calendar, Eye, RefreshCw } from 'lucide-react';

interface PrescriptionsModuleProps {
  doctorData: any;
}

export default function PrescriptionsModule({ doctorData }: PrescriptionsModuleProps) {
  const [activeTab, setActiveTab] = useState('active');
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadPrescriptions();
  }, []);

  useEffect(() => {
    const handleRealtime = (event: Event) => {
      const detail = (event as CustomEvent<{ entity?: string }>).detail;
      if (detail?.entity === 'prescription' || detail?.entity === 'consultation') loadPrescriptions();
    };
    window.addEventListener('sante-realtime', handleRealtime);
    return () => window.removeEventListener('sante-realtime', handleRealtime);
  }, []);

  const loadPrescriptions = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getDoctorPrescriptions();
      setPrescriptions(data);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des prescriptions');
      setPrescriptions([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredPrescriptions = prescriptions.filter((p) => {
    if (activeTab === 'active') return p.status === 'active';
    if (activeTab === 'completed') return p.status === 'completed';
    return true;
  });

  const templateMeds = [
    { category: 'Infection', meds: ['Ciprofloxacine', 'Amoxicilline', 'Azithromycine'] },
    { category: 'Fièvre', meds: ['Paracétamol', 'Ibuprofène'] },
    { category: 'Rhume', meds: ['Antihistaminique', 'Décongestionnant'] },
    { category: 'Hypertension', meds: ['Losartan', 'Amlodipine'] },
  ];

  const formatDate = (dateStr: string) => {
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
          <Pill className="w-9 h-9" />
          <span>Prescriptions</span>
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{prescriptions.filter(p => p.status === 'active').length} actives</span>
          <button 
            onClick={loadPrescriptions} 
            className="text-sm text-[#00D26A] hover:text-[#067A45] font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCw className="w-4 h-4" />
            <span>Actualiser</span>
          </button>
        </div>
      </div>
      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4 text-yellow-700 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Templates */}
      <div className="bg-white rounded-2xl p-6 shadow-md mb-8">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-emerald-600" />
          <span>Templates par pathologie</span>
        </h3>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {templateMeds.map((template) => (
            <button
              key={template.category}
              className="px-4 py-2 bg-[#00D26A] text-white rounded-lg font-semibold whitespace-nowrap hover:bg-[#067A45] transition cursor-pointer"
              title={template.meds.join(', ')}
            >
              {template.category}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-6 py-3 font-bold border-b-2 transition cursor-pointer ${
            activeTab === 'active'
              ? 'border-[#00D26A] text-[#00D26A]'
              : 'border-transparent text-gray-600 hover:text-gray-800'
          }`}
        >
          En cours
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`px-6 py-3 font-bold border-b-2 transition cursor-pointer ${
            activeTab === 'completed'
              ? 'border-[#00D26A] text-[#00D26A]'
              : 'border-transparent text-gray-600 hover:text-gray-800'
          }`}
        >
          Complétées
        </button>
      </div>

      {/* Prescriptions List */}
      <div className="space-y-4">
        {filteredPrescriptions.map((prescription) => (
          <div key={prescription.id} className="bg-white rounded-2xl p-6 border border-gray-200 hover:shadow-lg transition">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <Pill className="w-5 h-5 text-[#00D26A]" />
                  <span>{prescription.medication}</span>
                </h3>
                <p className="text-sm text-gray-600 mt-1 flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-gray-400" />
                    {prescription.patientName}
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    {formatDate(prescription.date)}
                  </span>
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                prescription.status === 'active'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {prescription.status === 'active' ? 'Actif' : 'Complété'}
              </span>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-600">Dosage</p>
                  <p className="font-bold text-gray-800">{prescription.dosage}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Fréquence</p>
                  <p className="font-bold text-gray-800">{prescription.frequency}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Durée</p>
                  <p className="font-bold text-gray-800">7 jours</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button className="flex-1 bg-white border border-[#00D26A] text-[#00D26A] py-2 rounded-lg font-semibold hover:bg-green-50 transition flex items-center justify-center gap-1.5 cursor-pointer">
                <RefreshCw className="w-4 h-4" />
                <span>Renouveler</span>
              </button>
              <button className="flex-1 bg-white border border-gray-300 text-gray-600 py-2 rounded-lg font-semibold hover:bg-gray-100 transition flex items-center justify-center gap-1.5 cursor-pointer">
                <Eye className="w-4 h-4" />
                <span>Voir détails</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
