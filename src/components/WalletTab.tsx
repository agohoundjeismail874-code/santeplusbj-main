import React, { useState, useEffect } from 'react';
import { Invoice, AccessRequest, Patient, MedicalDocument, Appointment } from '../types';
import { 
  QrCode, Folder, FileText, Building2, 
  Calendar, Heart, User, Wallet, ArrowRight,
  PlusCircle, Download, CheckCircle2, ShieldCheck, 
  Sparkles, X, Volume2, VolumeX, AlertCircle, Eye, Printer, Zap, RefreshCw,
  Users, Plus, Award, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import { jsPDF } from 'jspdf';

interface WalletTabProps {
  balance: number;
  setBalance: React.Dispatch<React.SetStateAction<number>>;
  satoshiBalance?: number;
  setSatoshiBalance?: React.Dispatch<React.SetStateAction<number>>;
  invoices: Invoice[];
  onSelectInvoice: (invoice: Invoice) => void;
  accessRequests: AccessRequest[];
  onApproveAccess: (requestId: string) => void;
  onRejectAccess: (requestId: string) => void;
  patientUser?: Patient | null;
  customDocuments?: MedicalDocument[];
  appointments?: Appointment[];
  onNavigateToMap?: () => void;
  onNavigateToAppointments?: () => void;
  onOpenProfile?: () => void;
  clinicalRecord?: { consultations: any[]; prescriptions: any[] };
}

export default function WalletTab({
  balance,
  setBalance,
  satoshiBalance = 0,
  setSatoshiBalance,
  invoices,
  onSelectInvoice,
  accessRequests,
  onApproveAccess,
  onRejectAccess,
  patientUser,
  customDocuments = [],
  appointments = [],
  onNavigateToMap,
  onNavigateToAppointments,
  onOpenProfile,
  clinicalRecord = { consultations: [], prescriptions: [] }
}: WalletTabProps) {
  
  // Active sub-modal states for the 9 cards
  const [activeModal, setActiveModal] = useState<
    'qr' | 'medical-record' | 'prescriptions' | 'payments' | 
    'tontine' | 'appointments' | 'blood' | 'topup' | null
  >(null);

  // Audio Speech state
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Top-up wallet form
  const [topUpAmount, setTopUpAmount] = useState('5000');
  const [topUpMethod, setTopUpMethod] = useState<'mtn' | 'moov' | 'lightning'>('mtn');
  const [isProcessingTopUp, setIsProcessingTopUp] = useState(false);
  const [topUpSuccess, setTopUpSuccess] = useState(false);

  // Selected document for view/print
  const [selectedDoc, setSelectedDoc] = useState<MedicalDocument | null>(null);

  // --- TONTINE CITOYENNE & SOLIDARITÉ SANTÉ ---
  const [tontinesList, setTontinesList] = useState<any[]>([]);
  const [tontineLoading, setTontineLoading] = useState(false);
  const [tontineSuccessMsg, setTontineSuccessMsg] = useState<string | null>(null);
  const [showCreateTontine, setShowCreateTontine] = useState(false);
  const [newTontineName, setNewTontineName] = useState('');
  const [newTontineContrib, setNewTontineContrib] = useState('10000');

  // --- DON DE SANG CITOYEN ---
  const [bloodStatus, setBloodStatus] = useState<any>({
    eligibleToDonate: true,
    lastDonationDate: null,
    nextEligibleDate: null,
    totalDonations: 0,
    totalVolume: 0
  });
  const [bloodHistory, setBloodHistory] = useState<any[]>([]);
  const [bloodLoading, setBloodLoading] = useState(false);
  const [bloodDonating, setBloodDonating] = useState(false);
  const [bloodSuccessMsg, setBloodSuccessMsg] = useState<string | null>(null);

  const userName = patientUser?.name ? patientUser.name.split(' ')[0] : 'Patient';
  const fullName = patientUser?.name || 'Patient';
  const npi = patientUser?.npi || 'NPI non attribué';
  const bloodGroup = patientUser?.bloodGroup || 'Non renseigné';

  // Synchronisation avec les APIs backend Tontines & Don de Sang
  useEffect(() => {
    if (activeModal === 'tontine') {
      const fetchTontines = async () => {
        try {
          const res = await fetch('/api/tontines', {
            credentials: 'include'
          });
          if (res.ok) {
            const data = await res.json();
            if (data.success && Array.isArray(data.data) && data.data.length > 0) {
              setTontinesList(data.data);
            }
          }
        } catch {
          // Fallback silencieux sur le dataset local
        }
      };
      fetchTontines();
    } else if (activeModal === 'blood') {
      const fetchBlood = async () => {
        try {
          const [statusRes, histRes] = await Promise.all([
            fetch('/api/blood/donor-status', { credentials: 'include' }),
            fetch('/api/blood/history', { credentials: 'include' })
          ]);
          if (statusRes.ok) {
            const sData = await statusRes.json();
            if (sData.success && sData.data) setBloodStatus(sData.data);
          }
          if (histRes.ok) {
            const hData = await histRes.json();
            if (hData.success && Array.isArray(hData.data)) setBloodHistory(hData.data);
          }
        } catch {
          // Fallback silencieux sur le dataset local
        }
      };
      fetchBlood();
    }
  }, [activeModal]);

  const handleContributeTontine = async (tontineId: string, amount: number) => {
    if (balance < amount) {
      alert(`Solde insuffisant (${balance.toLocaleString()} FCFA). Veuillez recharger votre portefeuille Santé.`);
      return;
    }
    setTontineLoading(true);
    try {
      await fetch(`/api/tontines/${tontineId}/contribute`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount })
      });
      setBalance(prev => Math.max(0, prev - amount));
      setTontinesList(prev => prev.map(t => t.id === tontineId ? { ...t, totalSavings: (t.totalSavings || 0) + amount } : t));
      setTontineSuccessMsg(`Contribution de ${amount.toLocaleString()} FCFA enregistrée avec succès !`);
      setTimeout(() => setTontineSuccessMsg(null), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setTontineLoading(false);
    }
  };

  const handleCreateNewTontine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTontineName.trim()) return;
    setTontineLoading(true);
    try {
      const res = await fetch('/api/tontines', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newTontineName,
          description: 'Cagnotte de santé familiale créée par ' + fullName,
          monthlyContribution: Number(newTontineContrib) || 10000
        })
      });
      const data = await res.json();
      if (data.success && data.data) {
        setTontinesList(prev => [data.data, ...prev]);
        setShowCreateTontine(false);
        setNewTontineName('');
        setTontineSuccessMsg(`Tontine "${data.data.name}" créée avec succès !`);
        setTimeout(() => setTontineSuccessMsg(null), 4000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTontineLoading(false);
    }
  };

  const handleDonateBlood = async () => {
    setBloodDonating(true);
    try {
      const res = await fetch('/api/blood/donate', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          donorName: fullName,
          bloodType: bloodGroup,
          quantity: 450,
          donorPhone: patientUser?.phone || '+229 97 88 55 44'
        })
      });
      const data = await res.json();
      if (data.success && data.data) {
        setBloodStatus((prev: any) => ({
          ...prev,
          totalDonations: (prev.totalDonations || 0) + 1,
          totalVolume: (prev.totalVolume || 0) + 450,
          lastDonationDate: new Date().toISOString().split('T')[0]
        }));
        setBloodHistory(prev => [
          {
            id: data.data.id,
            date: new Date().toISOString().split('T')[0],
            bloodType: bloodGroup,
            quantity: 450,
            status: 'validated',
            blockchainHash: data.data.blockchainHash
          },
          ...prev
        ]);
        setBloodSuccessMsg('Engagement de don enregistré avec succès.');
        setTimeout(() => setBloodSuccessMsg(null), 5000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBloodDonating(false);
    }
  };

  // Audio Read Aloud for low-literacy users
  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    if (isPlayingAudio) {
      setIsPlayingAudio(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    utterance.rate = 0.95;
    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);
    setIsPlayingAudio(true);
    window.speechSynthesis.speak(utterance);
  };

  // Trigger audio summary of the 9 cards
  const handleReadDashboard = () => {
    const summary = `Bonjour ${userName}. Votre solde est de ${balance.toLocaleString('fr-FR')} Francs CFA. Vous avez 9 services disponibles : Mon QR Code pour vous identifier à l'hôpital, votre Dossier Médical, vos Ordonnances avec une nouvelle prescription, vos Paiements de soins, votre Tontine Santé, vos Rendez-vous prévus, la liste des Hôpitaux, le Don de Sang avec votre groupe ${bloodGroup}, et votre Profil personnel. Touchez n'importe quelle carte pour l'ouvrir.`;
    speakText(summary);
  };

  // Top Up Wallet Handler
  const handleTopUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseInt(topUpAmount, 10);
    if (isNaN(amountNum) || amountNum <= 0) return;

    setIsProcessingTopUp(true);
    setTimeout(() => {
      setIsProcessingTopUp(false);
      const newBal = balance + amountNum;
      setBalance(newBal);
      if (setSatoshiBalance) {
        setSatoshiBalance(prev => prev + Math.floor(amountNum * 1.6));
      }
      setTopUpSuccess(true);
      speakText(`Recharge effectuée avec succès. Votre nouveau solde est de ${newBal.toLocaleString('fr-FR')} Francs CFA.`);
      setTimeout(() => {
        setTopUpSuccess(false);
        setActiveModal(null);
      }, 1500);
    }, 1200);
  };

  // Download Medical Document PDF
  const handleDownloadPDF = (docObj: MedicalDocument) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    doc.setTextColor(5, 150, 105);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('SANTÉ+ BÉNIN', 20, 25);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('RÉSEAU MÉDICAL NATIONAL ET SÉCURISÉ', 20, 31);
    doc.line(20, 35, 190, 35);
    
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(docObj.title.toUpperCase(), 20, 48);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Patient : ${fullName} (NPI : ${npi})`, 20, 58);
    doc.text(`Établissement : ${docObj.hospitalName || 'Non renseigné'}`, 20, 65);
    doc.text(`Médecin : ${docObj.doctorName || 'Non renseigné'}`, 20, 72);
    doc.text(`Date : ${docObj.date || new Date().toLocaleDateString('fr-FR')}`, 20, 79);

    let y = 92;
    doc.setFont('helvetica', 'bold');
    doc.text('ÉLÉMENTS / ACTES PRESCRITS :', 20, y);
    y += 8;
    doc.setFont('helvetica', 'normal');
    (docObj.items || []).forEach((item, i) => {
      doc.text(`• ${item.name} - ${(item.priceXOF || 0).toLocaleString('fr-FR')} FCFA`, 25, y);
      y += 7;
    });

    doc.setTextColor(5, 150, 105);
    doc.setFont('helvetica', 'bold');
    doc.text(`DOCUMENT OFFICIEL SANTE+`, 20, y + 15);

    doc.save(`SantePlus_${docObj.title.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <div className="page-enter w-full max-w-7xl mx-auto space-y-3">
      
      {/* ---------------------------------------------------- */}
      {/* TOP PATIENT HEALTH IDENTIFIER & WALLET BAR           */}
      {/* ---------------------------------------------------- */}
      <div className="bg-white/90 backdrop-blur-xs p-3 sm:p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        
        {/* Patient Identity */}
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-black text-sm shadow-sm shrink-0">
            {patientUser?.name ? patientUser.name.substring(0, 2).toUpperCase() : 'JD'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-slate-900 font-sans tracking-tight">
                Bonjour, {userName}
              </h1>
              <button
                onClick={handleReadDashboard}
                className="p-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-full transition-all cursor-pointer"
                title="Écouter le résumé de vos services"
              >
                {isPlayingAudio ? <VolumeX className="w-4 h-4 text-red-500 animate-pulse" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>
            
            {/* Metadata Pills */}
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="text-[11px] font-bold text-slate-700 bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-md font-mono">
                NPI {npi}
              </span>
              <span className="text-[11px] font-black text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md">
                Groupe {bloodGroup}
              </span>
              <span className="hidden sm:inline-flex text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                Passeport e-Santé Certifié
              </span>
            </div>
          </div>
        </div>

        {/* Solde Portefeuille & Recharge Rapide */}
        <div 
          onClick={() => setActiveModal('topup')}
          className="w-full md:w-auto bg-gradient-to-r from-amber-50 to-amber-100/50 hover:from-amber-100/70 hover:to-amber-100 border border-amber-200/80 p-3 sm:p-3.5 rounded-xl flex items-center justify-between md:justify-start gap-4 cursor-pointer transition-all hover:shadow-xs group shrink-0"
          title="Cliquez pour recharger votre solde"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-900/80 block leading-none">
                SOLDE DISPONIBLE
              </span>
              <div className="text-xl sm:text-2xl font-black text-slate-900 font-sans tracking-tight mt-0.5">
                {balance.toLocaleString('fr-FR')} <span className="text-xs font-bold text-slate-600">FCFA</span>
              </div>
              <div className="text-[11px] font-bold text-amber-800 flex items-center gap-1">
                <Zap className="w-3 h-3 fill-amber-600 text-amber-600" />
                <span>{satoshiBalance.toLocaleString('fr-FR')} Sats</span>
              </div>
            </div>
          </div>

          <div className="text-xs font-extrabold text-amber-800 bg-white/90 px-2.5 py-1.5 rounded-lg border border-amber-200 shadow-xs group-hover:bg-white transition-colors">
            Recharger +
          </div>
        </div>

      </div>

      {/* ---------------------------------------------------- */}
      {/* 9 ACTION CARDS GRID (CALIBRÉE & COMPACTE)            */}
      {/* ---------------------------------------------------- */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
        
        {/* CARD 1: MON QR CODE */}
        <div 
          onClick={() => setActiveModal('qr')}
          className="stagger-item sante-card p-3 bg-white flex flex-col justify-between min-h-[104px] sm:h-[112px] cursor-pointer group hover:border-emerald-500 hover:shadow-md"
        >
          <div className="flex items-start justify-between">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform">
              <QrCode className="w-4 h-4" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
          </div>
          <div>
            <h3 className="text-[13px] font-black text-slate-900 font-sans">Mon QR Code</h3>
            <p className="text-[11px] text-slate-500 font-sans">Passeport numérique d'admission</p>
          </div>
        </div>

        {/* CARD 2: DOSSIER MÉDICAL */}
        <div 
          onClick={() => setActiveModal('medical-record')}
          className="stagger-item sante-card p-3 bg-white flex flex-col justify-between min-h-[104px] sm:h-[112px] cursor-pointer group hover:border-blue-500 hover:shadow-md"
        >
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
              <Folder className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
          </div>
          <div>
            <h3 className="text-[15px] font-black text-slate-900 font-sans">Dossier Médical</h3>
            <p className="text-[11px] text-slate-500 font-sans">Historique clinique et examens</p>
          </div>
        </div>

        {/* CARD 3: ORDONNANCES */}
        <div 
          onClick={() => setActiveModal('prescriptions')}
          className="stagger-item sante-card p-3 bg-white flex flex-col justify-between min-h-[104px] sm:h-[112px] cursor-pointer group hover:border-red-400 hover:shadow-md"
        >
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
              <FileText className="w-5 h-5" />
            </div>
            <span className="px-2 py-0.5 bg-red-600 text-white font-extrabold text-[10px] rounded-full uppercase tracking-wider shadow-xs animate-pulse">
              1 NOUVELLE
            </span>
          </div>
          <div>
            <h3 className="text-[15px] font-black text-slate-900 font-sans">Ordonnances</h3>
            <p className="text-[11px] text-slate-500 font-sans">Prescriptions actives et délivrance</p>
          </div>
        </div>

        {/* CARD 4: PAIEMENTS */}
        <div 
          onClick={() => setActiveModal('payments')}
          className="stagger-item sante-card p-3 bg-white flex flex-col justify-between min-h-[104px] sm:h-[112px] cursor-pointer group hover:border-slate-400 hover:shadow-md"
        >
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
              <Building2 className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-800 group-hover:translate-x-1 transition-all" />
          </div>
          <div>
            <h3 className="text-[15px] font-black text-slate-900 font-sans">Paiements</h3>
            <p className="text-[11px] text-slate-500 font-sans">Reçus certifiés et transactions</p>
          </div>
        </div>

        {/* CARD 5: TONTINE SANTÉ */}
        <div 
          onClick={() => setActiveModal('tontine')}
          className="stagger-item sante-card p-3 bg-white flex flex-col justify-between min-h-[104px] sm:h-[112px] cursor-pointer group hover:border-amber-400 hover:shadow-md"
        >
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center font-black text-lg shadow-xs group-hover:scale-105 transition-transform">
              ₿
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-1 transition-all" />
          </div>
          <div>
            <h3 className="text-[15px] font-black text-slate-900 font-sans">Tontine Santé</h3>
            <p className="text-[11px] text-slate-500 font-sans">Épargne santé solidaire</p>
          </div>
        </div>

        {/* CARD 6: RENDEZ-VOUS */}
        <div 
          onClick={() => setActiveModal('appointments')}
          className="stagger-item sante-card p-3 bg-white flex flex-col justify-between min-h-[104px] sm:h-[112px] cursor-pointer group hover:border-emerald-500 hover:shadow-md"
        >
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
              <Calendar className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Demain, 14:00
            </span>
          </div>
          <div>
            <h3 className="text-[15px] font-black text-slate-900 font-sans">Rendez-vous</h3>
            <p className="text-[11px] text-slate-500 font-sans">Médecin non renseigné</p>
          </div>
        </div>

        {/* CARD 7: HÔPITAUX */}
        <div 
          onClick={() => {
            if (onNavigateToMap) onNavigateToMap();
            else setActiveModal('medical-record');
          }}
          className="stagger-item sante-card p-3 bg-white flex flex-col justify-between min-h-[104px] sm:h-[112px] cursor-pointer group hover:border-blue-500 hover:shadow-md"
        >
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
              <Building2 className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
          </div>
          <div>
            <h3 className="text-[15px] font-black text-slate-900 font-sans">Hôpitaux</h3>
            <p className="text-[11px] text-slate-500 font-sans">Centres et pharmacies de garde</p>
          </div>
        </div>

        {/* CARD 8: DON DE SANG */}
        <div 
          onClick={() => setActiveModal('blood')}
          className="stagger-item sante-card p-3 bg-white flex flex-col justify-between min-h-[104px] sm:h-[112px] cursor-pointer group hover:border-red-500 hover:shadow-md"
        >
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
              <Heart className="w-5 h-5 fill-red-500 text-red-500" />
            </div>
            <span className="px-2 py-0.5 bg-slate-100 text-slate-800 font-black text-xs rounded-full border border-slate-200">
              {bloodGroup}
            </span>
          </div>
          <div>
            <h3 className="text-[15px] font-black text-slate-900 font-sans">Don de Sang</h3>
            <p className="text-[11px] text-slate-500 font-sans">Campagnes et donneur bénévole</p>
          </div>
        </div>

        {/* CARD 9: MON PROFIL */}
        <div 
          onClick={() => {
            if (onOpenProfile) onOpenProfile();
            else setActiveModal('qr');
          }}
          className="stagger-item sante-card p-3 bg-white flex flex-col justify-between min-h-[104px] sm:h-[112px] cursor-pointer group hover:border-slate-500 hover:shadow-md"
        >
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
              <User className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 group-hover:translate-x-1 transition-all" />
          </div>
          <div>
            <h3 className="text-[15px] font-black text-slate-900 font-sans">Mon Profil</h3>
            <p className="text-[11px] text-slate-500 font-sans">Identité biométrique et contacts</p>
          </div>
        </div>

      </div>

      {/* ---------------------------------------------------- */}
      {/* MODAL 1: MON QR CODE VISUAL PASS                     */}
      {/* ---------------------------------------------------- */}
      <AnimatePresence>
        {activeModal === 'qr' && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl text-center space-y-5"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-gray-900">Pass Médical Sécurisé</h3>
                <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-700 p-1 cursor-pointer"><X className="w-5 h-5" /></button>
              </div>

              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex flex-col items-center">
                <QRCodeSVG 
                  value={`SANTE-PLUS-BENIN:NPI=${npi};PATIENT=${fullName};BLOOD=${bloodGroup};DATE=${Date.now()}`}
                  size={190}
                  level="H"
                  includeMargin
                />
                <span className="mt-3 font-mono font-bold text-xs tracking-wider text-emerald-900">{npi}</span>
                <span className="text-[11px] text-emerald-700 font-bold">{fullName} • Groupe {bloodGroup}</span>
              </div>

              <p className="text-xs text-gray-500 leading-relaxed">
                Présentez ce QR Code au médecin ou à l'accueil de l'hôpital pour une admission instantanée sans saisie manuelle.
              </p>

              <button
                onClick={() => {
                  speakText(`Voici votre passeport médical numérique pour ${fullName}, identifiant ${npi}. Il peut être scanné directement par votre hôpital.`);
                }}
                className="w-full py-3 bg-[#059669] hover:bg-[#047857] text-white font-bold rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <Volume2 className="w-4 h-4" />
                <span>Écouter les détails audio</span>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ---------------------------------------------------- */}
      {/* MODAL 2: ORDONNANCES & PRESCRIPTIONS                 */}
      {/* ---------------------------------------------------- */}
      <AnimatePresence>
        {activeModal === 'prescriptions' && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div>
                  <h3 className="text-lg font-black text-gray-900">Mes Ordonnances Médicales</h3>
                  <p className="text-xs text-gray-500">Prescriptions certifiées et tamponnées</p>
                </div>
                <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-700 p-1 cursor-pointer"><X className="w-5 h-5" /></button>
              </div>

              {customDocuments.filter(d => d.type === 'prescription').length === 0 ? (
                <div className="p-5 bg-slate-50 border border-dashed border-slate-300 rounded-2xl text-center">
                  <p className="text-sm font-bold text-slate-700">Aucune ordonnance pour le moment.</p>
                  <p className="text-xs text-slate-500 mt-1">Les prescriptions du médecin apparaîtront ici après la première consultation.</p>
                </div>
              ) : null}

              {/* Custom documents if any */}
              {customDocuments.filter(d => d.type === 'prescription').map(doc => (
                <div key={doc.id} className="p-4 bg-white border border-gray-200 rounded-2xl space-y-2">
                  <h4 className="font-bold text-sm text-gray-900">{doc.title}</h4>
                  <p className="text-xs text-gray-500">{doc.doctorName} • {doc.hospitalName}</p>
                  <button
                    onClick={() => handleDownloadPDF(doc)}
                    className="py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" /> Télécharger
                  </button>
                </div>
              ))}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ---------------------------------------------------- */}
      {/* MODAL 3: PAIEMENTS & FACTURES ACQUITTÉES             */}
      {/* ---------------------------------------------------- */}
      <AnimatePresence>
        {activeModal === 'payments' && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div>
                  <h3 className="text-lg font-black text-gray-900">Historique des Paiements</h3>
                  <p className="text-xs text-gray-500">Reçus certifiés conformes par l'État béninois</p>
                </div>
                <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-700 p-1 cursor-pointer"><X className="w-5 h-5" /></button>
              </div>

              <div className="space-y-3">
                {invoices.length > 0 ? (
                  invoices.map(inv => (
                    <div key={inv.id} className="p-4 bg-slate-50 border border-gray-200 rounded-2xl flex items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-md">
                            PAYÉ
                          </span>
                          <span className="text-xs text-gray-400">{inv.date}</span>
                        </div>
                        <h4 className="font-bold text-sm text-gray-900 mt-1">{inv.hospitalName}</h4>
                        <p className="text-xs text-gray-500">Méthode : {inv.paymentMethod} • Réf: {inv.id.substring(0, 10)}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-sm text-gray-900 block">{inv.totalXOF.toLocaleString('fr-FR')} FCFA</span>
                        <button
                          onClick={() => onSelectInvoice(inv)}
                          className="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer"
                        >
                          Voir Reçu
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 bg-slate-50 rounded-2xl text-center text-xs text-gray-500">
                    Aucun paiement récent enregistré.
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ---------------------------------------------------- */}
      {/* MODAL 4: TONTINE SANTÉ ÉPARGNE                       */}
      {/* ---------------------------------------------------- */}
      <AnimatePresence>
        {activeModal === 'tontine' && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-base">₿</div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-gray-900 leading-none">Tontines Santé & Solidarité</h3>
                    <span className="text-[11px] text-gray-500 font-medium">Épargne communautaire certifiée Bénin</span>
                  </div>
                </div>
                <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-700 p-1 cursor-pointer"><X className="w-5 h-5" /></button>
              </div>

              {tontineSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{tontineSuccessMsg}</span>
                </div>
              )}

              {/* Toggle Vue Tontines / Création */}
              <div className="flex bg-slate-100 p-1 rounded-xl gap-1 text-xs font-bold">
                <button
                  onClick={() => setShowCreateTontine(false)}
                  className={`flex-1 py-2 rounded-lg cursor-pointer transition-all ${!showCreateTontine ? 'bg-white shadow-xs text-gray-900' : 'text-gray-500 hover:text-gray-800'}`}
                >
                  Mes Tontines Actives ({tontinesList.length})
                </button>
                <button
                  onClick={() => setShowCreateTontine(true)}
                  className={`flex-1 py-2 rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1.5 ${showCreateTontine ? 'bg-white shadow-xs text-amber-700' : 'text-gray-500 hover:text-gray-800'}`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Créer une Tontine</span>
                </button>
              </div>

              {!showCreateTontine ? (
                <div className="space-y-3">
                  {tontinesList.map((tontine) => (
                    <div key={tontine.id} className="p-4 bg-gradient-to-br from-amber-50/70 to-orange-50/70 border border-amber-200/80 rounded-2xl space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-gray-900 text-sm">{tontine.name}</h4>
                          <p className="text-[11px] text-gray-600 line-clamp-1">{tontine.description}</p>
                        </div>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-extrabold uppercase">
                          Actif
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 bg-white/80 p-2.5 rounded-xl border border-amber-100 text-xs">
                        <div>
                          <span className="text-[10px] text-gray-500 block uppercase font-bold">Cagnotte Totale</span>
                          <strong className="text-gray-900 text-sm">{Number(tontine.totalSavings || 0).toLocaleString()} FCFA</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-500 block uppercase font-bold">Cotisation / Mois</span>
                          <strong className="text-amber-800 text-sm">{Number(tontine.monthlyContribution || 10000).toLocaleString()} FCFA</strong>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-gray-500">
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-amber-600" />
                          <span>{tontine.members || 1} membres actifs</span>
                        </span>
                        <span className="text-emerald-700 font-bold">Déblocage urgence immédiat</span>
                      </div>

                      <button
                        onClick={() => handleContributeTontine(tontine.id, Number(tontine.monthlyContribution) || 10000)}
                        disabled={tontineLoading}
                        className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs disabled:opacity-50"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>Cotiser {(Number(tontine.monthlyContribution) || 10000).toLocaleString()} FCFA</span>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <form onSubmit={handleCreateNewTontine} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Nom de la Tontine Familiale / Communautaire</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Tontine Familiale Dossou"
                      value={newTontineName}
                      onChange={(e) => setNewTontineName(e.target.value)}
                      className="w-full h-10 px-3 border border-gray-200 rounded-xl text-xs focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Cotisation Mensuelle Souhaitée (FCFA)</label>
                    <select
                      value={newTontineContrib}
                      onChange={(e) => setNewTontineContrib(e.target.value)}
                      className="w-full h-10 px-3 border border-gray-200 rounded-xl text-xs focus:border-amber-500 focus:outline-none"
                    >
                      <option value="5000">5 000 FCFA / mois</option>
                      <option value="10000">10 000 FCFA / mois</option>
                      <option value="25000">25 000 FCFA / mois</option>
                      <option value="50000">50 000 FCFA / mois</option>
                    </select>
                  </div>

                  <p className="text-[11px] text-gray-500 bg-amber-50/70 p-2.5 rounded-xl border border-amber-200/50">
                    Les fonds sont conservés de manière transparente et peuvent être débloqués immédiatement vers n'importe quelle clinique conventionnée en cas de sinistre ou d'urgence.
                  </p>

                  <button
                    type="submit"
                    disabled={tontineLoading || !newTontineName.trim()}
                    className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Créer et Activer la Tontine</span>
                  </button>
                </form>
              )}

              <button
                onClick={() => {
                  speakText(`Vous avez accès à ${tontinesList.length} tontines santé. Les fonds épargnés permettent de couvrir instantanément les ordonnances et soins de votre famille en cas d'urgence.`);
                }}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-gray-700 font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Volume2 className="w-3.5 h-3.5 text-amber-700" />
                <span>Écouter l'assistance vocale Tontine</span>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ---------------------------------------------------- */}
      {/* MODAL 5: DON DE SANG CITOYEN                         */}
      {/* ---------------------------------------------------- */}
      <AnimatePresence>
        {activeModal === 'blood' && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                    <Heart className="w-5 h-5 fill-red-500 text-red-500" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-gray-900 leading-none">Don de Sang Citoyen</h3>
                    <span className="text-[11px] text-gray-500 font-medium">Agence Nationale pour la Transfusion Sanguine</span>
                  </div>
                </div>
                <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-700 p-1 cursor-pointer"><X className="w-5 h-5" /></button>
              </div>

              {bloodSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{bloodSuccessMsg}</span>
                </div>
              )}

              {/* Carte Profil Sanguin */}
              <div className="p-4 bg-gradient-to-br from-red-50 to-rose-50 border border-red-200 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-red-700 font-extrabold uppercase tracking-wider block">Groupe Sanguin Enregistré</span>
                  <span className="text-2xl font-black text-red-900">{bloodGroup}</span>
                  <span className="text-[11px] text-emerald-700 font-bold block mt-0.5">✓ {bloodStatus?.eligibleToDonate ? 'Éligible au don aujourd\'hui' : 'Délai d\'attente en cours'}</span>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-red-600 text-white font-black flex items-center justify-center text-xl shadow-md">
                  {bloodGroup}
                </div>
              </div>

              {/* Statistiques citoyen */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] text-gray-500 uppercase font-bold block">Dons Effectués</span>
                  <strong className="text-base font-black text-gray-900">{bloodStatus?.totalDonations || 0} dons</strong>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] text-gray-500 uppercase font-bold block">Volume Total Sauvé</span>
                  <strong className="text-base font-black text-red-700">{bloodStatus?.totalVolume || 0} mL</strong>
                </div>
              </div>

              {/* Urgence actuelle au Bénin */}
              <div className="p-3 bg-red-50/70 border border-red-200/80 rounded-xl text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-red-900">
                  <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                  <span>Alerte Réserve Banque de Sang — CNHU Cotonou</span>
                </div>
                <p className="text-[11px] text-gray-600">
                  Besoin critique pour les poches de groupe <strong>{bloodGroup}</strong>. Les donneurs sont accueillis au service transfusion 24h/24.
                </p>
              </div>

              {/* Historique des dons */}
              {bloodHistory.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-gray-500">Historique des Dons Certifiés</h4>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {bloodHistory.map((item, idx) => (
                      <div key={item.id || idx} className="p-2.5 bg-slate-50 border border-gray-100 rounded-xl flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <Award className="w-4 h-4 text-red-600" />
                          <div>
                            <strong className="text-gray-900 block font-bold">Don de 450 mL ({item.bloodType})</strong>
                            <span className="text-[10px] text-gray-500">{item.date}</span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold">
                          Certifié
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={handleDonateBlood}
                disabled={bloodDonating}
                className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50 transition-all"
              >
                <Heart className="w-4 h-4 fill-white" />
                <span>{bloodDonating ? 'Validation en cours...' : 'Prendre engagement / Déclarer un don'}</span>
              </button>

              <button
                onClick={() => {
                  speakText(`Votre groupe sanguin est ${bloodGroup}. Vous avez réalisé ${bloodStatus?.totalDonations || 0} dons au Bénin. Le CNHU de Cotonou a un besoin urgent de votre groupe aujourd'hui.`);
                }}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-gray-700 font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Volume2 className="w-3.5 h-3.5 text-red-600" />
                <span>Écouter les alertes et informations de don</span>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ---------------------------------------------------- */}
      {/* MODAL 6: RECHARGE SOLDE WALLET                       */}
      {/* ---------------------------------------------------- */}
      <AnimatePresence>
        {activeModal === 'topup' && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-lg font-black text-gray-900">Recharger mon Compte Santé</h3>
                <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-700 p-1 cursor-pointer"><X className="w-5 h-5" /></button>
              </div>

              {topUpSuccess ? (
                <div className="p-6 bg-emerald-50 rounded-2xl text-center space-y-2">
                  <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                  <h4 className="font-bold text-sm text-emerald-900">Recharge validée avec succès !</h4>
                  <p className="text-xs text-emerald-700">Votre solde a été mis à jour instantanément.</p>
                </div>
              ) : (
                <form onSubmit={handleTopUpSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Montant à créditer (FCFA)
                    </label>
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      {['2000', '5000', '15000'].map(amt => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setTopUpAmount(amt)}
                          className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            topUpAmount === amt ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 border-gray-200'
                          }`}
                        >
                          {parseInt(amt).toLocaleString('fr-FR')} F
                        </button>
                      ))}
                    </div>
                    <input
                      type="number"
                      value={topUpAmount}
                      onChange={(e) => setTopUpAmount(e.target.value)}
                      required
                      min="500"
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-2xl text-sm font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Moyen de Paiement Mobile
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setTopUpMethod('mtn')}
                        className={`p-2.5 rounded-2xl border text-xs font-bold transition-all ${
                          topUpMethod === 'mtn' ? 'bg-yellow-100 border-yellow-400 text-yellow-900' : 'bg-slate-50 border-gray-200'
                        }`}
                      >
                        MTN MoMo
                      </button>
                      <button
                        type="button"
                        onClick={() => setTopUpMethod('moov')}
                        className={`p-2.5 rounded-2xl border text-xs font-bold transition-all ${
                          topUpMethod === 'moov' ? 'bg-blue-100 border-blue-400 text-blue-900' : 'bg-slate-50 border-gray-200'
                        }`}
                      >
                        Moov Money
                      </button>
                      <button
                        type="button"
                        onClick={() => setTopUpMethod('lightning')}
                        className={`p-2.5 rounded-2xl border text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                          topUpMethod === 'lightning' ? 'bg-amber-100 border-amber-400 text-amber-900' : 'bg-slate-50 border-gray-200'
                        }`}
                      >
                        <Zap className="w-3.5 h-3.5" /> Lightning
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isProcessingTopUp}
                    className="w-full py-3.5 bg-[#059669] hover:bg-[#047857] text-white font-bold rounded-2xl text-sm transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isProcessingTopUp ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    <span>{isProcessingTopUp ? 'Validation du paiement...' : 'Confirmer la recharge'}</span>
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ---------------------------------------------------- */}
      {/* MODAL 7: DOSSIER MÉDICAL COMPLET                     */}
      {/* ---------------------------------------------------- */}
      <AnimatePresence>
        {activeModal === 'medical-record' && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div>
                  <h3 className="text-lg font-black text-gray-900">Dossier Médical Numérique</h3>
                  <p className="text-xs text-gray-500">Analyses, antécédents et consultations</p>
                </div>
                <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-700 p-1 cursor-pointer"><X className="w-5 h-5" /></button>
              </div>

              {/* Patient Identity Badge */}
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-between">
                <div>
                  <span className="font-black text-sm text-emerald-950 block">{fullName}</span>
                  <span className="text-xs text-emerald-800 font-mono">NPI : {npi}</span>
                </div>
                <span className="px-3 py-1 bg-white text-emerald-800 font-black text-xs rounded-full border border-emerald-200">
                  Groupe {bloodGroup}
                </span>
              </div>

              {/* Consultations et prescriptions synchronisées depuis le dossier central */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase text-gray-500">Derniers Actes & Examens</h4>
                {clinicalRecord.consultations.length === 0 && clinicalRecord.prescriptions.length === 0 ? (
                  <div className="p-5 bg-slate-50 border border-dashed border-slate-300 rounded-2xl text-center text-sm text-slate-500">
                    Aucune consultation ni ordonnance enregistrée.
                  </div>
                ) : (
                  <>
                    {clinicalRecord.consultations.map((consultation) => (
                      <div key={consultation.id} className="p-4 bg-slate-50 border border-gray-200 rounded-2xl space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">Consultation</span>
                          <span className="text-xs text-gray-400">{new Date(consultation.consultationDate).toLocaleDateString('fr-FR')}</span>
                        </div>
                        <strong className="text-sm text-gray-900 block">{consultation.diagnosis}</strong>
                        <p className="text-xs text-gray-600">Médecin : {consultation.doctorName || 'Praticien'}</p>
                      </div>
                    ))}
                    {clinicalRecord.prescriptions.map((prescription) => (
                      <div key={prescription.id} className="p-4 bg-slate-50 border border-gray-200 rounded-2xl space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-md">Ordonnance</span>
                          <span className="text-xs text-gray-400">{new Date(prescription.createdAt).toLocaleDateString('fr-FR')}</span>
                        </div>
                        <strong className="text-sm text-gray-900 block">{prescription.medication}</strong>
                        <p className="text-xs text-gray-600">{prescription.dosage || 'Posologie non renseignée'} · {prescription.frequency || 'Fréquence non renseignée'}</p>
                      </div>
                    ))}
                  </>
                )}
              </div>

              <button
                onClick={() => {
                  speakText(`Dossier médical de ${fullName}, identifiant ${npi}. ${clinicalRecord.consultations.length} consultation(s) et ${clinicalRecord.prescriptions.length} ordonnance(s) enregistrée(s).`);
                }}
                className="w-full py-3 bg-[#059669] hover:bg-[#047857] text-white font-bold rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <Volume2 className="w-4 h-4" />
                <span>Écouter le résumé du dossier</span>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ---------------------------------------------------- */}
      {/* MODAL 8: RENDEZ-VOUS RAPIDE                          */}
      {/* ---------------------------------------------------- */}
      <AnimatePresence>
        {activeModal === 'appointments' && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-lg font-black text-gray-900">Rendez-vous Programmé</h3>
                <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-700 p-1 cursor-pointer"><X className="w-5 h-5" /></button>
              </div>

              <div className="p-5 bg-purple-50 border border-purple-100 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 bg-[#00D26A] text-white font-black text-[10px] rounded-full uppercase">
                    Confirmé
                  </span>
                  <span className="text-xs text-purple-900 font-bold">Demain à 14:00</span>
                </div>
                <div>
                  <h4 className="font-bold text-base text-gray-900">Consultation Cardiologie</h4>
                  <p className="text-xs text-gray-600">Médecin non renseigné • établissement non renseigné</p>
                </div>
                <p className="text-xs text-gray-500 bg-white p-2.5 rounded-xl border border-purple-100">
                  Lieu : Bâtiment A, 1er étage, Salle 104. Munissez-vous de votre QR Code pass.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    speakText("Aucun rendez-vous n’est actuellement programmé pour votre compte.");
                  }}
                  className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>Écouter le rappel</span>
                </button>
                {onNavigateToAppointments && (
                  <button
                    onClick={() => {
                      setActiveModal(null);
                      onNavigateToAppointments();
                    }}
                    className="py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-2xl text-xs cursor-pointer"
                  >
                    Gérer
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
