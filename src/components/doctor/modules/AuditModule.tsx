import React, { useState } from 'react';
import { 
  ShieldCheck, Download, Stethoscope, Pill, Calendar, User, Building2, Link, Copy, Inbox 
} from 'lucide-react';

interface DoctorData {
  id: string;
  name: string;
}

interface AuditLog {
  id: string;
  date: string;
  time: string;
  action: string;
  patientName: string;
  doctorName: string;
  txHash: string;
  status: 'confirmed' | 'pending';
  details?: string;
}

interface AuditModuleProps {
  doctorData: DoctorData;
}

export default function AuditModule({ doctorData }: AuditModuleProps) {
  const [filterDate, setFilterDate] = useState('');
  const [filterPatient, setFilterPatient] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const logs: AuditLog[] = [];

  const actionTypes = [
    'Consultation enregistrée',
    'Prescription délivrée',
    'Accès dossier accordé',
    'Consentement patient signé',
    'Analyse médicale ajoutée',
  ];

  const filteredLogs = logs.filter((log) => {
    if (filterDate && log.date !== filterDate) return false;
    if (filterPatient && !log.patientName.toLowerCase().includes(filterPatient.toLowerCase())) return false;
    if (filterAction && log.action !== filterAction) return false;
    return true;
  });

  const handleExport = () => {
    const csvContent = 'data:text/csv;charset=utf-8,' +
      'ID,Date,Heure,Action,Patient,Médecin,Statut\n' +
      filteredLogs.map((l) => `${l.id},${l.date},${l.time},"${l.action}","${l.patientName}","${l.doctorName}",${l.txHash},${l.status}`).join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <section className="py-12">
      <h2 className="text-4xl font-bold text-[#067A45] mb-8 flex items-center gap-3">
        <ShieldCheck className="w-9 h-9" />
        <span>Journal des activités</span>
      </h2>

      <div className="bg-white rounded-2xl p-6 shadow-md mb-8">
        <div className="flex items-start gap-4 mb-6">
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-600 mb-2 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Protection des données</span>
            </p>
            <p className="text-gray-700">
              Les activités médicales sont enregistrées automatiquement et protégées pour assurer un suivi fiable.
            </p>
          </div>
          <div className="bg-[#00D26A] text-white px-4 py-2 rounded-lg whitespace-nowrap h-fit">
            <p className="text-xs font-semibold">100%</p>
            <p className="text-xs">Immuable</p>
          </div>
        </div>

        {/* Filtres */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Date</label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full h-10 px-3 border-2 border-gray-200 rounded-lg focus:border-[#00D26A] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Patient</label>
            <input
              type="text"
              value={filterPatient}
              onChange={(e) => setFilterPatient(e.target.value)}
              placeholder="Nom du patient"
              className="w-full h-10 px-3 border-2 border-gray-200 rounded-lg focus:border-[#00D26A] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Action</label>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="w-full h-10 px-3 border-2 border-gray-200 rounded-lg focus:border-[#00D26A] focus:outline-none"
            >
              <option value="">Toutes les actions</option>
              {actionTypes.map((action) => (
                <option key={action} value={action}>{action}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleExport}
              className="w-full bg-[#00D26A] text-white py-2 rounded-lg font-semibold hover:bg-[#067A45] transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Exporter</span>
            </button>
          </div>
        </div>
      </div>

      {/* Résultats */}
      <div className="space-y-4">
        <p className="text-gray-600 font-semibold">
          {filteredLogs.length} enregistrement{filteredLogs.length !== 1 ? 's' : ''} trouvé{filteredLogs.length !== 1 ? 's' : ''}
        </p>

        {filteredLogs.map((log) => (
          <div
            key={log.id}
            onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}
            className="bg-white rounded-xl p-5 border-l-4 border-[#00D26A] hover:shadow-lg transition cursor-pointer"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-lg">
                    {log.action.includes('Consultation') ? (
                      <Stethoscope className="w-5 h-5 text-[#00D26A]" />
                    ) : log.action.includes('Prescription') ? (
                      <Pill className="w-5 h-5 text-purple-500" />
                    ) : (
                      <ShieldCheck className="w-5 h-5 text-blue-500" />
                    )}
                  </span>
                  <p className="font-bold text-gray-800">{log.action}</p>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                    log.status === 'confirmed'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {log.status === 'confirmed' ? 'Confirmé' : 'En attente'}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-gray-600 mb-3">
                  <div className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-gray-400" /> {log.date} · {log.time}</div>
                  <div className="flex items-center gap-1.5"><User className="w-4 h-4 text-gray-400" /> {log.patientName}</div>
                  <div className="flex items-center gap-1.5"><Building2 className="w-4 h-4 text-gray-400" /> {log.doctorName}</div>
                  <div className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-gray-400" /> Activité sécurisée</div>
                </div>

                {selectedLog?.id === log.id && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-700 mb-3">
                      <strong>Détails:</strong> {log.details}
                    </p>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-700">Référence :</span>
                        <code className="bg-gray-200 px-2 py-1 rounded font-mono text-xs break-all">
                          Activité médicale enregistrée
                        </code>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-700">État :</span>
                        <span className="text-green-700">Protégé</span>
                      </div>

                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-3">
                        <p className="text-xs text-green-700">
                          <strong>Protection :</strong> Cette activité est enregistrée et protégée dans le dossier médical.
                        </p>
                      </div>
                    </div>

                    <button className="mt-4 w-full bg-white border border-gray-300 text-gray-600 py-2 rounded-lg text-sm font-semibold hover:bg-gray-100 cursor-pointer">
                      Fermer
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {filteredLogs.length === 0 && (
          <div className="bg-gray-50 rounded-xl p-8 text-center text-gray-600">
            <Inbox className="w-14 h-14 mx-auto mb-3 text-gray-300" />
            <p className="text-lg">Aucun enregistrement ne correspond aux filtres</p>
            <button
              onClick={() => {
                setFilterDate('');
                setFilterPatient('');
                setFilterAction('');
              }}
              className="mt-4 text-[#00D26A] hover:underline font-semibold cursor-pointer"
            >
              Réinitialiser les filtres
            </button>
          </div>
        )}
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
        <div className="bg-white rounded-2xl p-6 shadow-md text-center">
          <p className="text-4xl font-bold text-[#00D26A]">{logs.length}</p>
          <p className="text-gray-600 font-semibold mt-2">Enregistrements total</p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-md text-center">
          <p className="text-4xl font-bold text-green-500">
            {logs.filter(l => l.status === 'confirmed').length}
          </p>
          <p className="text-gray-600 font-semibold mt-2">Activités confirmées</p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-md text-center">
          <p className="text-4xl font-bold text-yellow-500">
            {logs.filter(l => l.status === 'pending').length}
          </p>
          <p className="text-gray-600 font-semibold mt-2">En attente de confirmation</p>
        </div>
      </div>
    </section>
  );
}
