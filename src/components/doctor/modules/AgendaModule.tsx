import React, { useState, useEffect } from 'react';
import { getDoctorAppointments, updateAppointmentStatus, addAppointmentSlot, Appointment } from '../../../services/doctorApi';
import { Calendar, RotateCw, AlertTriangle, Inbox, Clock, User, Droplet, Plus, Check, X } from 'lucide-react';

interface DoctorData {
  id: string;
  name: string;
}

interface AgendaModuleProps {
  doctorData: DoctorData;
}

export default function AgendaModule({ doctorData }: AgendaModuleProps) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [showAddSlot, setShowAddSlot] = useState(false);
  const [newSlotTime, setNewSlotTime] = useState('');

  useEffect(() => {
    loadAppointments();
  }, [selectedDate]);

  useEffect(() => {
    const handleRealtime = (event: Event) => {
      const detail = (event as CustomEvent<{ entity?: string }>).detail;
      if (detail?.entity === 'appointment') loadAppointments();
    };

    window.addEventListener('sante-realtime', handleRealtime);
    return () => window.removeEventListener('sante-realtime', handleRealtime);
  }, [selectedDate]);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getDoctorAppointments(selectedDate);
      setAppointments(data.appointments || (Array.isArray(data) ? data : []));
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des rendez-vous');
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (appointmentId: string, status: 'waiting' | 'ongoing' | 'completed' | 'cancelled') => {
    try {
      setUpdatingId(appointmentId);
      await updateAppointmentStatus(appointmentId, status);
      setAppointments((prev) =>
        prev.map((a) => (a.id === appointmentId ? { ...a, status } : a))
      );
    } catch (err: any) {
      alert(`Erreur: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleAddSlot = async () => {
    if (!newSlotTime) return;
    try {
      await addAppointmentSlot({ date: selectedDate, time: newSlotTime });
      setShowAddSlot(false);
      setNewSlotTime('');
      loadAppointments();
    } catch (err: any) {
      alert(`Erreur: ${err.message}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return 'bg-yellow-50 border-yellow-200';
      case 'ongoing': return 'bg-blue-50 border-blue-200';
      case 'completed': return 'bg-green-50 border-green-200';
      case 'cancelled': return 'bg-red-50 border-red-200';
      default: return 'bg-gray-50';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'waiting': return 'En attente';
      case 'ongoing': return 'En cours';
      case 'completed': return 'Terminée';
      case 'cancelled': return 'Annulée';
      default: return status;
    }
  };

  const waitingCount = appointments.filter((a) => a.status === 'waiting').length;
  const completedCount = appointments.filter((a) => a.status === 'completed').length;

  return (
    <section className="py-12">
      <h2 className="text-4xl font-bold text-[#067A45] mb-8 flex items-center gap-3">
        <Calendar className="w-9 h-9" />
        <span>Agenda</span>
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar: Calendrier */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl p-6 shadow-md sticky top-24">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Sélectionner une date</h3>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full h-10 px-3 border-2 border-[#00D26A] rounded-lg focus:outline-none"
            />

            {/* Résumé du jour */}
            <div className="mt-6 space-y-3">
              <div className="bg-yellow-50 rounded-xl p-3">
                <p className="text-sm text-yellow-700 font-semibold">En attente</p>
                <p className="text-2xl font-bold text-yellow-800">{waitingCount}</p>
              </div>
              <div className="bg-green-50 rounded-xl p-3">
                <p className="text-sm text-green-700 font-semibold">Terminées</p>
                <p className="text-2xl font-bold text-green-800">{completedCount}</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-3">
                <p className="text-sm text-blue-700 font-semibold">Total</p>
                <p className="text-2xl font-bold text-blue-800">{appointments.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main: Rendez-vous du jour */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-2xl p-6 shadow-md mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Calendar className="w-6 h-6 text-[#00D26A]" />
                <span>
                  {new Date(selectedDate + 'T12:00:00').toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </h3>
              <button
                onClick={loadAppointments}
                className="text-sm text-[#00D26A] hover:text-[#067A45] font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCw className="w-4 h-4" />
                <span>Actualiser</span>
              </button>
            </div>

            {error && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4 text-yellow-700 text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {loading ? (
              <div className="flex justify-center items-center h-32">
                <div className="text-center">
                  <Calendar className="w-10 h-10 text-[#00D26A] animate-pulse mx-auto mb-2" />
                  <p className="text-gray-500">Chargement...</p>
                </div>
              </div>
            ) : appointments.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Inbox className="w-14 h-14 mx-auto mb-3 text-gray-300" />
                <p className="text-lg">Aucun rendez-vous pour cette date</p>
              </div>
            ) : (
              <div className="space-y-4">
                {appointments.map((apt) => (
                  <div key={apt.id} className={`rounded-xl p-4 border-l-4 border-[#00D26A] ${getStatusColor(apt.status)}`}>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3 flex-1">
                        <span className="text-2xl font-bold text-gray-800 flex items-center gap-1.5">
                          <Clock className="w-5 h-5 text-gray-500" />
                          {apt.time}
                        </span>
                        <span className="text-lg flex items-center gap-1.5 text-gray-800">
                          <User className="w-4 h-4 text-gray-500" />
                          {apt.patientName}
                        </span>
                      </div>
                      <span className="text-sm font-semibold px-3 py-1 bg-white rounded-full border border-gray-300">
                        {getStatusLabel(apt.status)}
                      </span>
                    </div>

                    <div className="flex gap-3 mb-3 text-sm text-gray-600">
                      {apt.blood && (
                        <span className="flex items-center gap-1 font-semibold text-red-600">
                          <Droplet className="w-4 h-4 fill-red-500 text-red-500" />
                          {apt.blood}
                        </span>
                      )}
                      {apt.allergies && (
                        <span className="text-red-500 font-semibold flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          {apt.allergies}
                        </span>
                      )}
                    </div>

                    {/* Actions selon le statut */}
                    {apt.status !== 'completed' && apt.status !== 'cancelled' && (
                      <div className="flex gap-2">
                        {apt.status === 'waiting' && (
                          <button
                            onClick={() => handleStatusChange(apt.id, 'ongoing')}
                            disabled={updatingId === apt.id}
                            className="flex-1 bg-gradient-to-r from-[#00D26A] to-[#067A45] text-white py-2 rounded-lg font-semibold hover:shadow-lg transition disabled:opacity-50 cursor-pointer"
                          >
                            {updatingId === apt.id ? '...' : 'Démarrer'}
                          </button>
                        )}
                        {apt.status === 'ongoing' && (
                          <button
                            onClick={() => handleStatusChange(apt.id, 'completed')}
                            disabled={updatingId === apt.id}
                            className="flex-1 bg-green-500 text-white py-2 rounded-lg font-semibold hover:shadow-lg transition disabled:opacity-50 cursor-pointer"
                          >
                            {updatingId === apt.id ? '...' : 'Terminer'}
                          </button>
                        )}
                        <button
                          onClick={() => handleStatusChange(apt.id, 'cancelled')}
                          disabled={updatingId === apt.id}
                          className="flex-1 bg-white border border-red-300 text-red-500 py-2 rounded-lg font-semibold hover:bg-red-50 transition disabled:opacity-50 cursor-pointer"
                        >
                          Annuler
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Ajouter un créneau */}
            {!showAddSlot ? (
              <button
                onClick={() => setShowAddSlot(true)}
                className="w-full mt-6 bg-gradient-to-r from-[#00D26A] to-[#067A45] text-white py-3 rounded-xl font-bold hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-5 h-5" />
                <span>Ajouter un créneau</span>
              </button>
            ) : (
              <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <h4 className="font-semibold text-gray-700 mb-3">Nouveau créneau</h4>
                <div className="flex gap-3">
                  <input
                    type="time"
                    value={newSlotTime}
                    onChange={(e) => setNewSlotTime(e.target.value)}
                    className="flex-1 h-10 px-3 border-2 border-gray-200 rounded-lg focus:border-[#00D26A] focus:outline-none"
                  />
                  <button
                    onClick={handleAddSlot}
                    className="bg-[#00D26A] text-white px-4 rounded-lg font-semibold hover:bg-[#067A45] transition flex items-center gap-1 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Ajouter</span>
                  </button>
                  <button
                    onClick={() => setShowAddSlot(false)}
                    className="bg-gray-200 text-gray-600 px-4 rounded-lg font-semibold hover:bg-gray-300 transition flex items-center justify-center cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
