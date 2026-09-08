import React, { useState, useEffect } from 'react';
import DoctorHeader from './doctor/DoctorHeader';
import ClinicalWorkspace from './doctor/ClinicalWorkspace';
import { getDoctorProfile } from '../services/doctorApi';
import { readDoctorWorkspace, subscribeDoctorWorkspace, writeDoctorWorkspace } from '../services/doctorWorkspace';
import { HospitalUser } from '../types';
import { Activity } from 'lucide-react';

interface DoctorData {
  id: string;
  name: string;
  email: string;
  phone: string;
  specialty: string;
  npi: string;
  hospitalId: string;
  hospitalName: string;
  avatar?: string;
}

interface DoctorDashboardProps {
  user?: HospitalUser;
  onLogout?: () => void;
}

export default function DoctorDashboard({ user, onLogout }: DoctorDashboardProps = {}) {
  const initialWorkspace = readDoctorWorkspace();
  const [doctorData, setDoctorDataState] = useState<DoctorData | null>(initialWorkspace.doctorData as DoctorData | null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = subscribeDoctorWorkspace((workspace) => {
      setDoctorDataState(workspace.doctorData as DoctorData | null);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    loadDoctorData();
  }, [user]);

  const loadDoctorData = async () => {
    try {
      setLoading(true);
      
      let parsedUser: any = user;
      if (!parsedUser) {
        const savedHospitalUser = localStorage.getItem('sante_hospital_user');
        if (savedHospitalUser) {
          try {
            parsedUser = JSON.parse(savedHospitalUser);
          } catch (e) {}
        }
      }

      if (!parsedUser) {
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
          try {
            parsedUser = JSON.parse(savedUser);
          } catch (e) {}
        }
      }

      const profile = await getDoctorProfile();

      const nextDoctorData = {
        id: String(profile.id),
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        specialty: profile.specialty,
        npi: profile.npi,
        hospitalId: profile.hospitalId,
        hospitalName: profile.hospitalName,
        avatar: profile.avatar,
      };

      setDoctorDataState(nextDoctorData);
      writeDoctorWorkspace({ activeModule: null, doctorData: nextDoctorData });
    } catch (err) {
      setError('Erreur lors du chargement des données');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#00D26A] to-[#067A45]">
        <div className="text-white text-center">
          <Activity className="w-16 h-16 animate-pulse mx-auto mb-4" />
          <p className="text-xl">Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  if (error || !doctorData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white p-8 rounded-2xl shadow-lg text-center">
          <p className="text-red-500 text-lg mb-4">{error || 'Erreur lors du chargement'}</p>
          <button
            onClick={loadDoctorData}
            className="bg-[#00D26A] text-white px-6 py-2 rounded-lg hover:bg-[#067A45]"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4">
      <DoctorHeader doctorData={doctorData} onLogout={onLogout} />
      <ClinicalWorkspace doctorData={doctorData} />
    </div>
  );
}
