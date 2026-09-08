import React from 'react';
import { motion } from 'motion/react';
import { Activity, BarChart3, Calendar, Settings, ShieldCheck } from 'lucide-react';

interface ModuleCardProps {
  key?: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  badge?: string;
}

function ModuleCard({ icon, title, description, onClick }: ModuleCardProps) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.98 }}
      className="stagger-item bg-white border border-slate-200 rounded-xl p-3 text-left hover:border-emerald-300 hover:shadow-md transition-all duration-200 min-h-[104px]"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
          {icon}
        </div>
      </div>
      <h3 className="text-[13px] font-extrabold text-slate-900 leading-snug">{title}</h3>
      <p className="text-[10px] text-slate-500 mt-1">{description}</p>
    </motion.button>
  );
}

interface DoctorModuleGridProps {
  onModuleClick: (moduleName: string) => void;
  doctorData: any;
}

export default function DoctorModuleGrid({ onModuleClick }: DoctorModuleGridProps) {
  const modules = [
    { key: 'agenda', title: 'Agenda', description: 'Rendez-vous et disponibilités', icon: <Calendar className="w-5 h-5" /> },
    { key: 'stats', title: 'Statistiques', description: 'Activité du cabinet', icon: <BarChart3 className="w-5 h-5" /> },
    { key: 'audit', title: 'Journal', description: 'Historique des accès', icon: <ShieldCheck className="w-5 h-5" /> },
    { key: 'parametres', title: 'Paramètres', description: 'Profil et préférences', icon: <Settings className="w-5 h-5" /> },
    { key: 'ia', title: 'Assistant', description: 'Aide clinique', icon: <Activity className="w-5 h-5" /> },
  ];

  return (
    <section className="max-w-7xl mx-auto py-2">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        {modules.map((module) => (
          <ModuleCard
            key={module.key}
            icon={module.icon}
            title={module.title}
            description={module.description}
            onClick={() => onModuleClick(module.key)}
          />
        ))}
      </div>
    </section>
  );
}
