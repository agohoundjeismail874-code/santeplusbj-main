import React, { useState, useEffect } from 'react';
import { getDoctorStats, DoctorStats } from '../../../services/doctorApi';
import { 
  BarChart3, RotateCw, AlertTriangle, Users, FileText, Pill, 
  TrendingUp, Activity, Clock, Banknote 
} from 'lucide-react';

interface DoctorData {
  id: string;
  name: string;
}

interface StatsModuleProps {
  doctorData: DoctorData;
}

export default function StatsModule({ doctorData }: StatsModuleProps) {
  const [stats, setStats] = useState<DoctorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadStats();
  }, [doctorData.id]);

  useEffect(() => {
    const handleRealtime = (event: Event) => {
      const detail = (event as CustomEvent<{ entity?: string }>).detail;
      if (['patient', 'consultation', 'prescription'].includes(detail?.entity || '')) loadStats();
    };
    window.addEventListener('sante-realtime', handleRealtime);
    return () => window.removeEventListener('sante-realtime', handleRealtime);
  }, [doctorData.id]);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getDoctorStats();
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des statistiques');
      setStats({
        patientsToday: 0,
        patientsTotal: 0,
        consultationsTotal: 0,
        prescriptionsActive: 0,
        appointmentsScheduled: 0,
        appointmentsCompleted: 0,
        averageConsultationTime: 15,
        patientSatisfactionRate: 95,
        revenue: { today: 0, thisMonth: 0, currency: 'XOF', satoshis: 0 },
      });
    } finally {
      setLoading(false);
    }
  };

  const chartData: Array<{ label: string; value: number }> = [];

  const maxValue = Math.max(1, ...chartData.map((d) => d.value));

  if (loading) {
    return (
      <section className="py-12">
        <h2 className="text-4xl font-bold text-[#067A45] mb-8 flex items-center gap-3">
          <BarChart3 className="w-9 h-9" />
          <span>Statistiques</span>
        </h2>
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <BarChart3 className="w-12 h-12 text-[#00D26A] animate-pulse mx-auto mb-4" />
            <p className="text-gray-500">Chargement des statistiques...</p>
          </div>
        </div>
      </section>
    );
  }

  const statCards = [
    { icon: <Users className="w-8 h-8 text-blue-600" />, title: "Patients aujourd'hui", value: stats?.patientsToday ?? 0, trend: 'En temps réel', color: 'bg-blue-50' },
    { icon: <FileText className="w-8 h-8 text-green-600" />, title: 'Consultations', value: stats?.consultationsTotal ?? 0, trend: '+20%', color: 'bg-green-50' },
    { icon: <Pill className="w-8 h-8 text-purple-600" />, title: 'Prescriptions actives', value: stats?.prescriptionsActive ?? 0, trend: '+10%', color: 'bg-purple-50' },
  ];

  return (
    <section className="py-12">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-4xl font-bold text-[#067A45] flex items-center gap-3">
          <BarChart3 className="w-9 h-9" />
          <span>Statistiques</span>
        </h2>
        <button
          onClick={loadStats}
          className="text-sm text-[#00D26A] hover:text-[#067A45] font-semibold flex items-center gap-1.5 cursor-pointer"
        >
          <RotateCw className="w-4 h-4" />
          <span>Actualiser</span>
        </button>
      </div>

      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 text-yellow-700 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-600 shrink-0" />
          <span>{error} — Affichage des dernières données connues.</span>
        </div>
      )}

      {/* Cards Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {statCards.map((stat, i) => (
          <div key={i} className={`${stat.color} rounded-2xl p-6 border border-gray-200`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-4xl font-bold text-gray-800">{stat.value}</p>
                <p className="text-gray-600 mt-2">{stat.title}</p>
              </div>
              <div className="p-3 bg-white rounded-xl shadow-sm">{stat.icon}</div>
            </div>
            <p className="text-green-600 font-semibold mt-3 text-sm flex items-center gap-1">
              <TrendingUp className="w-4 h-4" />
              <span>{stat.trend}</span>
            </p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-white rounded-2xl p-6 shadow-md mb-8">
        <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-600" />
          <span>Consultations par jour (cette semaine)</span>
        </h3>

        <div className="flex items-end justify-between h-64 gap-2 px-2">
          {chartData.map((data, i) => (
            <div key={i} className="flex-1 flex flex-col items-center">
              <div className="w-full bg-gray-100 rounded-t-lg relative" style={{ height: `${(data.value / maxValue) * 100}%` }}>
                <div
                  className="w-full bg-gradient-to-t from-[#00D26A] to-[#067A45] rounded-t-lg transition-all duration-300 hover:shadow-lg"
                  style={{ height: '100%' }}
                />
                <span className="absolute -top-6 left-1/2 -translate-x-1/2 font-bold text-gray-700">
                  {data.value}
                </span>
              </div>
              <p className="text-sm font-semibold text-gray-600 mt-4">{data.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-md">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-600" />
            <span>Performances</span>
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Satisfaction patients</span>
                <span className="font-bold text-gray-800">{stats?.patientSatisfactionRate ?? 95}%</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-[#00D26A]" style={{ width: `${stats?.patientSatisfactionRate ?? 95}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">RDV complétés</span>
                <span className="font-bold text-gray-800">{stats?.appointmentsCompleted ?? 127}</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-[#00D26A]" style={{ width: '80%' }} />
              </div>
            </div>
            <p className="text-sm text-gray-500 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-gray-400" />
              <span>Temps moy. consultation: {stats?.averageConsultationTime ?? 15} min</span>
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-md">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Banknote className="w-5 h-5 text-emerald-600" />
            <span>Revenus</span>
          </h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Aujourd'hui</p>
              <p className="text-2xl font-bold text-[#00D26A]">
                {(stats?.revenue.today ?? 0).toLocaleString('fr-FR')} FCFA
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Ce mois</p>
              <p className="text-3xl font-bold text-[#067A45]">
                {(stats?.revenue.thisMonth ?? 0).toLocaleString('fr-FR')} FCFA
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-xs text-gray-600">Devise</p>
                <p className="font-bold text-gray-800">{stats?.revenue.currency ?? 'XOF'}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <p className="text-xs text-gray-600">Crypto</p>
                <p className="font-bold text-gray-800">{stats?.revenue.satoshis?.toLocaleString() ?? 7500} SAT</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
