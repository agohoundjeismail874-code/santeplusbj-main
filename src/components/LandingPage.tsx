import React, { useState, useRef, useEffect } from 'react';
import { 
  User, Stethoscope, Building2, ShieldCheck, Zap, Shield, TrendingUp,
  Volume2, VolumeX, MessageSquare, Send, ChevronDown, ChevronUp,
  Sparkles, CheckCircle2, ArrowRight, HelpCircle, PhoneCall, Users, Activity, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LandingPageProps {
  onSelectRole: (role: 'patient' | 'doctor' | 'hospital') => void;
  onEnterApp: (initialView: 'map' | 'wallet' | 'appointments') => void;
  isLoggedIn: boolean;
  onOpenAuth: () => void;
  onOpenEmergency?: () => void;
}

export default function LandingPage({
  onSelectRole,
  onEnterApp,
  isLoggedIn,
  onOpenAuth,
  onOpenEmergency
}: LandingPageProps) {
  // Voice Speech Synthesis state
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const speakIntro = () => {
    if (!('speechSynthesis' in window)) {
      alert("La synthèse vocale n'est pas supportée sur ce navigateur.");
      return;
    }

    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
      return;
    }

    window.speechSynthesis.cancel();
    const text = "Bienvenue sur Santé Plus Bénin. De l'urgence au soin en trois minutes. Si vous êtes un patient, touchez la carte verte Patient. Si vous êtes un médecin, touchez la carte bleue Médecin. Pour l'administration d'un hôpital, touchez la carte orange Hôpital. En cas d'urgence grave, touchez le bouton rouge en bas de votre écran.";
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    utterance.rate = 0.95;
    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);

    setIsPlayingAudio(true);
    window.speechSynthesis.speak(utterance);
  };

  // FAQ state
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const faqs = [
    {
      question: "Comment utiliser Santé+ sans savoir lire ni écrire ?",
      answer: "Santé+ est spécialement conçu avec des repères visuels intuitifs : de grands boutons de couleur, la connexion par empreinte digitale ou scan de visage (biométrie), et un QR Code sécurisé. Vous pouvez également cliquer sur les icônes de haut-parleur pour écouter les explications et ordonnances à voix haute."
    },
    {
      question: "Comment fonctionne le règlement rapide par Bitcoin Lightning ?",
      answer: "Lors d'une consultation ou d'un acte médical, le paiement est instantané en moins de 2 secondes via le réseau Lightning de Bitcoin ou votre portefeuille en Francs CFA, garantissant une prise en charge immédiate sans attente au guichet."
    },
    {
      question: "Mes données médicales sont-elles protégées ?",
      answer: "Oui. Toutes vos données sont chiffrées et décentralisées. Aucun médecin ou tiers ne peut accéder à votre dossier sans votre consentement explicite, validé via votre QR code ou votre signature cryptographique."
    },
    {
      question: "Que faire en cas d'urgence immédiate ?",
      answer: "Cliquez sur le bouton rouge 'Urgence' situé en permanence en bas à droite de votre écran pour contacter directement le SAMU (15), les sapeurs-pompiers (118) ou obtenir l'itinéraire vers l'hôpital le plus proche."
    }
  ];

  // Chatbot State
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant', text: string }>>([
    { role: 'assistant', text: "Bonjour ! Je suis l'assistant Santé+ Bénin. Posez-moi vos questions ou écoutez mes réponses audio." }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isTyping]);

  const handleSendChat = async (textToSend: string) => {
    if (!textToSend.trim()) return;
    setChatMessages(prev => [...prev, { role: 'user', text: textToSend }]);
    setChatInput('');
    setIsTyping(true);

    // Add placeholder for streaming assistant message
    setChatMessages(prev => [...prev, { role: 'assistant', text: '' }]);

    try {
      const history = chatMessages.slice(1).map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        text: m.text
      }));

      const params = new URLSearchParams({
        message: textToSend,
        history: JSON.stringify(history)
      });

      const eventSource = new EventSource(`/api/chat/stream?${params.toString()}`);
      let accumulated = '';

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.chunk) {
            accumulated += data.chunk;
            setChatMessages(prev => {
              const msgs = [...prev];
              msgs[msgs.length - 1] = { role: 'assistant', text: accumulated };
              return msgs;
            });
          }
          if (data.done) {
            eventSource.close();
            setIsTyping(false);
          }
          if (data.error) {
            eventSource.close();
            setIsTyping(false);
          }
        } catch { /* ignore parse errors */ }
      };

      eventSource.onerror = () => {
        eventSource.close();
        if (!accumulated) {
          setChatMessages(prev => {
            const msgs = [...prev];
            msgs[msgs.length - 1] = { role: 'assistant', text: "Je suis là pour vous aider. Vous pouvez accéder à votre dossier médical, régler vos soins ou consulter la liste des hôpitaux partenaires." };
            return msgs;
          });
        }
        setIsTyping(false);
      };
    } catch (err) {
      setChatMessages(prev => {
        const msgs = [...prev];
        msgs[msgs.length - 1] = { 
          role: 'assistant', 
          text: "Je suis là pour vous aider. Vous pouvez accéder à votre dossier médical, régler vos soins ou consulter la liste des hôpitaux partenaires." 
        };
        return msgs;
      });
      setIsTyping(false);
    }
  };


  return (
    <div className="w-full flex flex-col items-center">
      
      {/* Central Hero Container (Compact & High Precision) */}
      <section className="w-full max-w-4xl mx-auto px-4 pt-2 md:pt-6 pb-8 flex flex-col items-center text-center">
        
        {/* Badge Officiel National */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-50/90 text-emerald-900 border border-emerald-200/90 text-[11px] font-bold tracking-tight mb-4 shadow-xs">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Portail National d'Interconnexion Médicale • République du Bénin</span>
        </div>

        {/* Medical Icon & Audio helper */}
        <div className="relative mb-4">
          <div 
            className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-600/20 pulse-glow cursor-pointer transition-transform hover:scale-105"
            onClick={speakIntro}
            title="Cliquez pour écouter l'explication audio"
          >
            <Activity className="w-8 h-8 md:w-10 md:h-10" />
          </div>
          {/* Audio helper tag */}
          <button
            onClick={speakIntro}
            className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-white text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-sans shadow-xs flex items-center gap-1 hover:bg-emerald-50 transition-all cursor-pointer whitespace-nowrap"
          >
            {isPlayingAudio ? (
              <>
                <VolumeX className="w-3 h-3 text-red-500 animate-pulse" />
                <span>Arrêter l'audio</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3 h-3 text-emerald-600" />
                <span>Écouter (Audio)</span>
              </>
            )}
          </button>
        </div>

        {/* Main Headline */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold font-sans text-slate-900 tracking-tight leading-tight max-w-3xl mt-2">
          De l'urgence au soin en <span className="text-emerald-600 underline decoration-emerald-300 decoration-2 underline-offset-4">3 minutes</span>
        </h1>

        {/* Subtitle */}
        <p className="mt-3 text-sm sm:text-base md:text-lg text-slate-600 font-sans max-w-2xl leading-relaxed">
          Le réseau national e-santé souverain et décentralisé. Accédez à vos soins, dossier médical chiffré et règlements instantanés.
        </p>

        {/* 3 Action Cards (Patient / Médecin / Hôpital) */}
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-5 mt-8">
          
          {/* 1. PATIENT CARD */}
          <div 
            onClick={() => onSelectRole('patient')}
            className="sante-card p-6 flex flex-col items-center text-center group cursor-pointer bg-white hover:border-emerald-500 hover:shadow-md transition-all relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-emerald-500"></div>
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mb-3 group-hover:scale-110 transition-transform shadow-xs">
              <User className="w-7 h-7" />
            </div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full mb-1.5">
              Espace Citoyen
            </span>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 font-sans">Patient</h3>
            <p className="text-xs sm:text-sm text-slate-600 font-sans mt-1">
              Dossier médical, QR Pass & Soins
            </p>
            <div className="mt-4 text-sm font-bold text-emerald-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              <span>Accéder à mon espace</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>

          {/* 2. DOCTOR CARD */}
          <div 
            onClick={() => onSelectRole('doctor')}
            className="sante-card p-6 flex flex-col items-center text-center group cursor-pointer bg-white hover:border-blue-500 hover:shadow-md transition-all relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-blue-500"></div>
            <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-3 group-hover:scale-110 transition-transform shadow-xs">
              <Stethoscope className="w-7 h-7" />
            </div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full mb-1.5">
              Espace Praticien
            </span>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 font-sans">Médecin</h3>
            <p className="text-xs sm:text-sm text-slate-600 font-sans mt-1">
              Consultations, ordonnances & IA
            </p>
            <div className="mt-4 text-sm font-bold text-blue-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              <span>Consulter un dossier</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>

          {/* 3. HOSPITAL CARD */}
          <div 
            onClick={() => onSelectRole('hospital')}
            className="sante-card p-6 flex flex-col items-center text-center group cursor-pointer bg-white hover:border-slate-800 hover:shadow-md transition-all relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-700"></div>
            <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 mb-3 group-hover:scale-110 transition-transform shadow-xs">
              <Building2 className="w-7 h-7" />
            </div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full mb-1.5">
              Direction Hospitalière
            </span>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 font-sans">Hôpital</h3>
            <p className="text-xs sm:text-sm text-slate-600 font-sans mt-1">
              Lits, personnel & régulation MSP
            </p>
            <div className="mt-4 text-sm font-bold text-slate-700 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              <span>Gérer l'établissement</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>

        </div>

        {/* 3 Compact Metric Cards (Couverture, Efficacité, Vitesse) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">

          {/* Metric 1: Couverture */}
          <div className="sante-card p-4 text-left bg-white relative overflow-hidden flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-black text-slate-900 font-sans tracking-tight">
                98%
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">COUVERTURE</span>
              <p className="text-[11px] text-slate-500 font-sans leading-tight mt-0.5">
                Des données patients sécurisées
              </p>
            </div>
          </div>

          {/* Metric 2: Efficacité */}
          <div className="sante-card p-4 text-left bg-white relative overflow-hidden flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 border border-blue-100">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-black text-slate-900 font-sans tracking-tight">
                40%
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">EFFICACITÉ</span>
              <p className="text-[11px] text-slate-500 font-sans leading-tight mt-0.5">
                D'économie sur la gestion des soins
              </p>
            </div>
          </div>

          {/* Metric 3: Vitesse */}
          <div className="sante-card p-4 text-left bg-white relative overflow-hidden flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-100">
              <Zap className="w-5 h-5 fill-amber-500 text-amber-500" />
            </div>
            <div>
              <div className="text-xl font-black text-slate-900 font-sans tracking-tight">
                &lt; 2s
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">VITESSE RÈGLEMENT</span>
              <p className="text-[11px] text-slate-500 font-sans leading-tight mt-0.5">
                Règlement direct par Bitcoin Lightning
              </p>
            </div>
          </div>

        </div>

      </section>

      {/* FAQ & Voice Assistance Section */}
      <section className="w-full max-w-4xl mx-auto px-4 pb-16">
        <div className="bg-white rounded-3xl border border-gray-100 p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1 text-left">
              <h3 className="text-lg font-black text-gray-900 font-sans flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-emerald-600" />
                Foire Aux Questions & Guide Simplifié
              </h3>
              <p className="text-xs text-gray-500">Comprendre le fonctionnement en toute simplicité</p>
            </div>
            <button
              onClick={speakIntro}
              className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl hover:bg-emerald-100 transition-all text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Volume2 className="w-4 h-4" />
              <span className="hidden sm:inline">Guide Audio</span>
            </button>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <div 
                key={idx}
                className="border border-gray-100 rounded-2xl overflow-hidden bg-slate-50/50 hover:bg-slate-50 transition-colors"
              >
                <button
                  onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                  className="w-full py-3.5 px-5 flex items-center justify-between text-left font-sans font-bold text-gray-800 text-xs sm:text-sm gap-3 cursor-pointer"
                >
                  <span>{faq.question}</span>
                  {activeFaq === idx ? (
                    <ChevronUp className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                  )}
                </button>
                
                <AnimatePresence initial={false}>
                  {activeFaq === idx && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="px-5 pb-4 pt-1 text-xs text-gray-600 leading-relaxed border-t border-gray-100">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Floating Chat Assistant Button & Modal (Positioned cleanly alongside Emergency SAMU) */}
      <div className="fixed bottom-5 right-48 sm:right-52 z-40 flex flex-col items-end">
        <AnimatePresence>
          {chatOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="w-[320px] sm:w-[360px] h-[450px] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden mb-3 absolute bottom-12 right-0"
            >
              <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center text-white font-bold text-xs">
                    S+
                  </div>
                  <div>
                    <h4 className="text-xs font-bold">Assistant Vocal Santé+</h4>
                    <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      En ligne • Réponses audio
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => setChatOpen(false)}
                  className="text-slate-400 hover:text-white p-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 bg-slate-50/70 text-xs">
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 leading-relaxed ${
                      msg.role === 'user' 
                        ? 'bg-emerald-600 text-white' 
                        : 'bg-white text-slate-800 border border-slate-200/80 shadow-xs'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-white text-slate-400 border border-slate-200 rounded-2xl px-3.5 py-2 text-xs flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:150ms]"></span>
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:300ms]"></span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendChat(chatInput);
                }}
                className="p-2.5 bg-white border-t border-slate-100 flex items-center gap-2"
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Posez votre question..."
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-emerald-500 focus:bg-white"
                />
                <button
                  type="submit"
                  className="w-7 h-7 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center cursor-pointer shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setChatOpen(!chatOpen)}
          className="h-9 px-3.5 bg-slate-900 hover:bg-black text-white rounded-full shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-2 text-xs font-bold border border-slate-700"
          title="Assistant Santé+"
        >
          <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">Assistant IA</span>
        </button>
      </div>

    </div>
  );
}
