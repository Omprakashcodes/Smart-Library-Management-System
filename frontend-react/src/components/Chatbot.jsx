import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Bot } from 'lucide-react';

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { sender: 'bot', text: 'Hi there! 👋 I am your SLMS Assistant. How can I help you today?' }
  ]);
  const messagesEndRef = useRef(null);

  const faqs = [
    {
      q: "How to borrow a book?",
      a: "Go to the 'Book Catalog', search for your book, and click 'Borrow / Hold'. Once approved by librarian, collect it from the library desk!"
    },
    {
      q: "What is the late fine rate?",
      a: "The fine for late return is ₹10 per day. For lost books, replacement cost + ₹500 penalty is charged."
    },
    {
      q: "How many books can I issue?",
      a: "Students can issue up to 3 books at a time. Faculty members can issue up to 7 books."
    },
    {
      q: "Where to see my active loans?",
      a: "You can check all your active loans, due dates, and hold status in the 'My Borrowed Books' section."
    }
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  const handleFAQClick = (faq) => {
    setMessages((prev) => [...prev, { sender: 'user', text: faq.q }]);
    setTimeout(() => {
      setMessages((prev) => [...prev, { sender: 'bot', text: faq.a }]);
    }, 500);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[99999] pointer-events-auto">
      {isOpen && (
        <div className="mb-4 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[450px] animate-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-4 flex justify-between items-center text-white">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-sm">SLMS AI Assistant</h3>
                <p className="text-[10px] text-indigo-100 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Online
                </p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1.5 rounded-lg transition-colors">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto bg-slate-50 dark:bg-slate-950/50 space-y-3 custom-scrollbar">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.sender === 'bot' && (
                  <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center shrink-0 mt-1">
                    <Bot className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                )}
                <div
                  className={`p-3 rounded-2xl text-xs max-w-[80%] ${
                    msg.sender === 'user'
                      ? 'bg-indigo-600 text-white rounded-tr-sm'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-tl-sm'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick FAQ Buttons */}
          <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
            <p className="text-[10px] font-semibold text-slate-400 mb-2 px-1">Suggested Questions:</p>
            <div className="flex flex-wrap gap-1.5">
              {faqs.map((faq, idx) => (
                <button
                  key={idx}
                  onClick={() => handleFAQClick(faq)}
                  className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/30 rounded-xl text-[11px] font-medium transition-colors text-left"
                >
                  {faq.q}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-full shadow-2xl shadow-indigo-600/50 flex items-center justify-center text-white hover:scale-110 transition-transform cursor-pointer"
      >
        {isOpen ? <X className="w-6 h-6 text-white" /> : <MessageSquare className="w-6 h-6 text-white" />}
      </button>
    </div>
  );
}