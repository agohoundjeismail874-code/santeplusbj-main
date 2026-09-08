import React, { useState } from 'react';
import { 
  Settings, User, Building2, Edit3, Bell, Shield, 
  KeyRound, Smartphone, Lock, Sliders, AlertTriangle, Trash2, Download 
} from 'lucide-react';

interface SettingsModuleProps {
  doctorData: any;
}

export default function SettingsModule({ doctorData }: SettingsModuleProps) {
  const [settings, setSettings] = useState({
    notifications: true,
    prescriptionNotifications: true,
    urgentNotifications: true,
    darkMode: false,
    offlineMode: true,
    language: 'fr',
    tarif: '5000',
  });

  const handleToggle = (key: string) => {
    setSettings((prev) => (({
      ...prev,
      [key]: !prev[key],
    })));
  };

  const handleChange = (key: string, value: any) => {
    setSettings((prev) => (({
      ...prev,
      [key]: value,
    })));
  };

  return (
    <section className="py-12">
      <h2 className="text-4xl font-bold text-[#067A45] mb-8 flex items-center gap-3">
        <Settings className="w-9 h-9" />
        <span>Paramètres</span>
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profil */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl p-6 shadow-md text-center">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-10 h-10 text-emerald-700" />
            </div>
            <h3 className="text-xl font-bold text-gray-800">Dr. {doctorData.name}</h3>
            <p className="text-sm text-gray-600 mt-2">{doctorData.specialty}</p>
            <p className="text-sm text-gray-600">NPI: {doctorData.npi}</p>
            <p className="text-sm text-gray-600 mb-4 flex items-center justify-center gap-1.5 mt-1">
              <Building2 className="w-4 h-4 text-gray-500" />
              <span>{doctorData.hospitalName}</span>
            </p>
            <button className="w-full bg-[#00D26A] text-white py-2 rounded-lg font-semibold hover:bg-[#067A45] transition flex items-center justify-center gap-1.5 cursor-pointer">
              <Edit3 className="w-4 h-4" />
              <span>Modifier profil</span>
            </button>
          </div>
        </div>

        {/* Paramètres */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section Notifications */}
          <div className="bg-white rounded-2xl p-6 shadow-md">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Bell className="w-5 h-5 text-emerald-600" />
              <span>Notifications</span>
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-gray-700">Notifications de rendez-vous</label>
                <button
                  onClick={() => handleToggle('notifications')}
                  className={`w-12 h-6 rounded-full transition cursor-pointer ${
                    settings.notifications ? 'bg-[#00D26A]' : 'bg-gray-300'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition ${
                    settings.notifications ? 'ml-6' : 'ml-0.5'
                  }`}></div>
                </button>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-gray-700">Notifications de prescriptions</label>
                <button
                  onClick={() => handleToggle('prescriptionNotifications')}
                  className={`w-12 h-6 rounded-full transition cursor-pointer ${
                    settings.prescriptionNotifications ? 'bg-[#00D26A]' : 'bg-gray-300'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition ${
                    settings.prescriptionNotifications ? 'ml-6' : 'ml-0.5'
                  }`}></div>
                </button>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-gray-700">Alertes urgentes</label>
                <button
                  onClick={() => handleToggle('urgentNotifications')}
                  className={`w-12 h-6 rounded-full transition cursor-pointer ${
                    settings.urgentNotifications ? 'bg-[#00D26A]' : 'bg-gray-300'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition ${
                    settings.urgentNotifications ? 'ml-6' : 'ml-0.5'
                  }`}></div>
                </button>
              </div>
            </div>
          </div>

          {/* Section Sécurité */}
          <div className="bg-white rounded-2xl p-6 shadow-md">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-600" />
              <span>Sécurité</span>
            </h3>
            <div className="space-y-3">
              <button className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition flex items-center gap-2 cursor-pointer">
                <KeyRound className="w-4 h-4 text-gray-500" />
                <span>Changer le mot de passe</span>
              </button>
              <button className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition flex items-center gap-2 cursor-pointer">
                <Smartphone className="w-4 h-4 text-gray-500" />
                <span>Activer la biométrie</span>
              </button>
              <button className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition flex items-center gap-2 cursor-pointer">
                <Lock className="w-4 h-4 text-gray-500" />
                <span>Changer le code PIN</span>
              </button>
            </div>
          </div>

          {/* Section Préférences */}
          <div className="bg-white rounded-2xl p-6 shadow-md">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-emerald-600" />
              <span>Préférences</span>
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Langue</label>
                <select
                  value={settings.language}
                  onChange={(e) => handleChange('language', e.target.value)}
                  className="w-full h-10 px-3 border-2 border-gray-200 rounded-lg focus:border-[#00D26A] focus:outline-none"
                >
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Tarif de consultation</label>
                <input
                  type="text"
                  value={settings.tarif}
                  onChange={(e) => handleChange('tarif', e.target.value)}
                  className="w-full h-10 px-3 border-2 border-gray-200 rounded-lg focus:border-[#00D26A] focus:outline-none"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-gray-700">Mode sombre</label>
                <button
                  onClick={() => handleToggle('darkMode')}
                  className={`w-12 h-6 rounded-full transition cursor-pointer ${
                    settings.darkMode ? 'bg-[#00D26A]' : 'bg-gray-300'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition ${
                    settings.darkMode ? 'ml-6' : 'ml-0.5'
                  }`}></div>
                </button>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-gray-700">Mode hors ligne</label>
                <button
                  onClick={() => handleToggle('offlineMode')}
                  className={`w-12 h-6 rounded-full transition cursor-pointer ${
                    settings.offlineMode ? 'bg-[#00D26A]' : 'bg-gray-300'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition ${
                    settings.offlineMode ? 'ml-6' : 'ml-0.5'
                  }`}></div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 mt-8">
        <h3 className="text-lg font-bold text-red-700 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <span>Zone de danger</span>
        </h3>
        <p className="text-red-600 mb-4">Ces actions sont irréversibles. Procédez avec prudence.</p>
        <div className="flex gap-3">
          <button className="flex-1 bg-white border border-red-300 text-red-500 py-2 rounded-lg font-semibold hover:bg-red-50 transition flex items-center justify-center gap-1.5 cursor-pointer">
            <Trash2 className="w-4 h-4" />
            <span>Supprimer le compte</span>
          </button>
          <button className="flex-1 bg-red-500 text-white py-2 rounded-lg font-semibold hover:bg-red-600 transition flex items-center justify-center gap-1.5 cursor-pointer">
            <Download className="w-4 h-4" />
            <span>Télécharger mes données</span>
          </button>
        </div>
      </div>
    </section>
  );
}
