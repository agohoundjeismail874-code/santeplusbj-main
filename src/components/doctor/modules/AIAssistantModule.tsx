import React, { useState } from 'react';
import { Bot, Send, Lightbulb } from 'lucide-react';

interface Message {
  id: string;
  type: 'user' | 'ai';
  text: string;
  timestamp: string;
}

interface AIAssistantModuleProps {
  doctorData: any;
}

export default function AIAssistantModule({ doctorData }: AIAssistantModuleProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      text: 'Bonjour Dr. ' + doctorData.name + '! Je suis votre assistant IA médical. Comment puis-je vous aider?',
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      text: input,
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages([...messages, userMessage]);
    setInput('');
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        text: 'C\'est une excellente question. Basé sur les données médicales, je recommande de consulter les antécédents du patient et d\'effectuer un diagnostic différentiel complet.',
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages((prev) => [...prev, aiResponse]);
      setIsLoading(false);
    }, 1000);
  };

  const suggestions = [
    'Quelles sont les allergies de ce patient?',
    'Résume le dossier médical',
    'Y a-t-il des interactions médicamenteuses?',
    'Recommande une prescription pour cette pathologie',
  ];

  return (
    <section className="py-12">
      <h2 className="text-4xl font-bold text-[#067A45] mb-8 flex items-center gap-3">
        <Bot className="w-9 h-9" />
        <span>Assistant IA Médical</span>
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Suggestions */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl p-6 shadow-md sticky top-24">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-amber-500" />
              <span>Suggestions</span>
            </h3>
            <div className="space-y-2">
              {suggestions.map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => setInput(suggestion)}
                  className="w-full text-left text-sm p-3 bg-gray-50 hover:bg-[#00D26A] hover:text-white rounded-lg transition cursor-pointer"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Chat */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-2xl p-6 shadow-md flex flex-col h-96">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto mb-4 space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs px-4 py-3 rounded-2xl ${
                      msg.type === 'user'
                        ? 'bg-[#00D26A] text-white'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    <p className="text-sm">{msg.text}</p>
                    <p className="text-xs opacity-70 mt-1">{msg.timestamp}</p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 text-gray-800 px-4 py-3 rounded-2xl">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Tapez votre question..."
                className="flex-1 h-12 px-4 border-2 border-gray-200 rounded-xl focus:border-[#00D26A] focus:outline-none"
              />
              <button
                onClick={handleSend}
                disabled={isLoading}
                className="bg-[#00D26A] text-white px-6 h-12 rounded-xl font-bold hover:bg-[#067A45] transition disabled:opacity-50 flex items-center justify-center cursor-pointer"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
