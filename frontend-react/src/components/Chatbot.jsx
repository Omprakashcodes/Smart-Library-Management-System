import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Bot, Send } from 'lucide-react';

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [lang, setLang] = useState('auto'); // 'auto' | 'en' | 'hi'
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: 'Hi! 👋 Main aapka SLMS Assistant hoon.\nAap English ya Hindi (Hinglish) mein pooch sakte ho — main usi language mein jawab dunga!'
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // ─────────────────────────────────────────────
  // KNOWLEDGE BASE
  // ─────────────────────────────────────────────
  const knowledgeBase = [
    {
      keywords: ['borrow', 'hold', 'issue', 'kitab lena', 'book lena', 'reserve', 'hold kaise', 'borrow kaise', 'kaise le', 'book lo'],
      en: 'To borrow a book: Go to Book Catalog → Search book → Click "Borrow / Hold". Librarian will approve it. Then collect from library desk within 2 days.',
      hi: 'Book borrow karne ke liye: Book Catalog mein jao → Book search karo → "Borrow / Hold" dabao. Librarian approve karega. Phir 2 din ke andar library desk se collect kar lo.'
    },
    {
      keywords: ['pending', 'queue', 'hold status', 'meri hold', 'queue number', 'position', 'kitne number'],
      en: 'Check your hold status and queue position in "Hold Reservations" from the left sidebar. Status can be Pending or Approved (Ready for Pickup).',
      hi: 'Apni hold status aur queue number dekhne ke liye left sidebar se "Hold Reservations" kholo. Status Pending ya Approved (Ready for Pickup) ho sakta hai.'
    },
    {
      keywords: ['approved', 'ready for pickup', 'collect', 'desk se lena', 'pickup', 'counter'],
      en: 'If your hold shows "Approved / Ready for Pickup", visit the library desk within 2 days and collect your book. After handover it appears in My Borrowed Books.',
      hi: 'Agar hold "Approved / Ready for Pickup" dikha rahi hai, toh 2 din ke andar library desk se book collect kar lo. Handover ke baad wo "My Borrowed Books" mein aa jayegi.'
    },
    {
      keywords: ['kitni books', 'how many', 'limit', 'maximum', 'max books', 'kitne', '3 books', '7 books'],
      en: 'Students can issue maximum 3 books at a time. Faculty members can issue up to 7 books.',
      hi: 'Students ek time mein maximum 3 books le sakte hain. Faculty members 7 books tak le sakte hain.'
    },
    {
      keywords: ['fine', 'late', 'overdue', 'penalty', 'dand', 'kitna fine', 'late return', 'paise'],
      en: 'Late return fine is ₹10 per day. Lost book = Replacement cost + ₹500 fixed penalty. Pay online via Razorpay in "My Fines & Payments".',
      hi: 'Late return ka fine ₹10 per day hai. Book kho jaaye toh Replacement cost + ₹500 fixed penalty. Fine "My Fines & Payments" se Razorpay se online pay kar sakte ho.'
    },
    {
      keywords: ['pay fine', 'fine kaise bhare', 'razorpay', 'payment', 'fine bharo', 'online pay'],
      en: 'Go to "My Fines & Payments" → Click "Pay Fine" on unpaid fine → Complete payment via Razorpay (UPI/Card/Netbanking).',
      hi: '"My Fines & Payments" pe jao → Unpaid fine pe "Pay Fine" dabao → Razorpay se UPI/Card/Netbanking se payment complete karo.'
    },
    {
      keywords: ['lost', 'kho', 'book kho gayi', 'lost book', 'kho di', 'gum'],
      en: 'If you lose a book, inform the librarian. They will mark it Lost and charge Replacement cost + ₹500 penalty. Pay it from My Fines.',
      hi: 'Agar book kho jaye toh librarian ko batao. Wo Lost mark karke Replacement cost + ₹500 penalty laga denge. Fine "My Fines" se pay karo.'
    },
    {
      keywords: ['my loans', 'borrowed', 'due date', 'kab return', 'meri books', 'active books', 'loans'],
      en: 'Go to "My Borrowed Books" from sidebar to see all active loans, issue date and due date. Return on time to avoid fine.',
      hi: 'Sidebar se "My Borrowed Books" kholo. Wahan active books, issue date aur due date dikhegi. Time pe return karo warna fine lagega.'
    },
    {
      keywords: ['return', 'wapis', 'kaise return', 'book return', 'wapas karna'],
      en: 'Books can only be returned at the library desk. Give the book to librarian. They will process return and calculate any fine.',
      hi: 'Books sirf library desk par return hoti hain. Librarian ko book do. Wo return process karke fine (agar ho) calculate kar denge.'
    },
    {
      keywords: ['search', 'catalog', 'find book', 'book dhundo', 'available', 'khojo'],
      en: 'Use the top search bar or go to Book Catalog. Filter by category. Green = Available, Red = Out of Stock.',
      hi: 'Top search bar use karo ya Book Catalog pe jao. Category se filter kar sakte ho. Green = Available, Red = Out of Stock.'
    },
    {
      keywords: ['out of stock', 'available nahi', 'stock', 'khatam'],
      en: 'If a book is Out of Stock, you can still click "Reserve Queue". You get a queue number and will be notified when available.',
      hi: 'Agar book Out of Stock hai toh bhi "Reserve Queue" daba sakte ho. Queue number milega aur available hone par notify hoga.'
    },
    {
      keywords: ['password', 'forgot', 'login nahi ho raha', 'reset password', 'bhool gaya'],
      en: 'Click "Forgot Password?" on login page → Enter your email → Check inbox (and Spam) for reset link → Set new password.',
      hi: 'Login page pe "Forgot Password?" dabao → Email daalo → Inbox (aur Spam) check karo → Reset link se naya password set karo.'
    },
    {
      keywords: ['register', 'sign up', 'account banao', 'naya account', 'signup'],
      en: 'Click "Sign Up Free" on login page. Fill name, email, password and select role (Student/Faculty). Then login immediately.',
      hi: 'Login page pe "Sign Up Free" dabao. Name, email, password bharo aur role select karo (Student/Faculty). Register ke baad turant login kar sakte ho.'
    },
    {
      keywords: ['dashboard', 'profile', 'mera account', 'home'],
      en: 'Dashboard shows Active Borrowed Books, Unpaid Fines, Active Holds, Total Books Borrowed and pickup alerts.',
      hi: 'Dashboard pe Active Borrowed Books, Unpaid Fines, Active Holds, Total Books Borrowed aur pickup alerts dikhte hain.'
    },
    {
      keywords: ['hello', 'hi', 'hey', 'namaste', 'hii', 'good morning', 'good evening', 'namaskar'],
      en: 'Hello! 😊 How can I help you with the library today?',
      hi: 'Namaste! 😊 Aaj library se related kya madad chahiye?'
    },
    {
      keywords: ['thanks', 'thank you', 'shukriya', 'dhanyavad', 'ok', 'okay', 'theek', 'achha'],
      en: "You're welcome! Feel free to ask anything else. 📚",
      hi: 'Aapka swagat hai! Aur kuch poochna ho toh bejhijhak poochho. 📚'
    },
    {
      keywords: ['who are you', 'tum kaun', 'what can you do', 'help', 'madad', 'kya kar sakte'],
      en: 'I am SLMS AI Assistant. I can guide you about borrowing, fines, holds, limits, lost books, payments and more. Just type your question!',
      hi: 'Main SLMS AI Assistant hoon. Main book borrow, fine, hold, limit, lost book, payment wagaira ke baare mein guide kar sakta hoon. Bas apna sawaal type karo!'
    }
  ];

  const quickChips = {
    en: ['How to borrow a book?', 'What is the fine?', 'How many books can I take?', 'Where are my loans?', 'Forgot password?'],
    hi: ['Book kaise borrow kare?', 'Fine kitna hai?', 'Kitni books le sakte hain?', 'Meri loans kahan dekhe?', 'Password bhool gaya?']
  };

  // ─────────────────────────────────────────────
  // AUTO LANGUAGE DETECT
  // ─────────────────────────────────────────────
  const detectLanguage = (text) => {
    const t = (text || '').toLowerCase();

    // Hindi / Hinglish indicators
    const hindiSignals = [
      'kaise', 'kya', 'kitna', 'kitni', 'hai', 'hain', 'karo', 'karna', 'mujhe', 'mera', 'meri',
      'book lena', 'fine', 'bhool', 'wapis', 'namaste', 'dhanyavad', 'shukriya', 'theek',
      'kab', 'kahan', 'kaun', 'le sakte', 'ho raha', 'nahi', 'mat', 'chahiye', 'batao', 'samjhao'
    ];

    // Devanagari characters
    if (/[\u0900-\u097F]/.test(text)) return 'hi';

    let hindiScore = 0;
    for (const s of hindiSignals) {
      if (t.includes(s)) hindiScore++;
    }

    // If 1+ hindi signal → treat as Hindi/Hinglish
    if (hindiScore >= 1) return 'hi';
    return 'en';
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen, isTyping]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const getBotReply = (userText) => {
    const text = (userText || '').toLowerCase().trim();
    const detected = detectLanguage(userText);
    const replyLang = lang === 'auto' ? detected : lang;

    for (const item of knowledgeBase) {
      for (const kw of item.keywords) {
        if (text.includes(kw.toLowerCase())) {
          return replyLang === 'hi' ? item.hi : item.en;
        }
      }
    }

    // Fallback
    if (replyLang === 'hi') {
      return 'Maaf kijiye, main yeh samajh nahi paya 😅\nAap yeh try kar sakte ho:\n• Book kaise borrow kare?\n• Fine kitna hai?\n• Kitni books le sakte hain?\n• Meri loans kahan hain?\n\nYa librarian se baat karein.';
    }
    return "Sorry, I didn't understand that 😅\nYou can try:\n• How to borrow a book?\n• What is the fine?\n• How many books can I take?\n• Where are my loans?\n\nOr contact the librarian desk.";
  };

  const sendMessage = (text) => {
    const trimmed = (text || input).trim();
    if (!trimmed) return;

    setMessages((prev) => [...prev, { sender: 'user', text: trimmed }]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      const reply = getBotReply(trimmed);
      setMessages((prev) => [...prev, { sender: 'bot', text: reply }]);
      setIsTyping(false);
    }, 500 + Math.random() * 500);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const cycleLang = () => {
    setLang((prev) => (prev === 'auto' ? 'en' : prev === 'en' ? 'hi' : 'auto'));
  };

  const langLabel = lang === 'auto' ? 'AUTO' : lang === 'hi' ? 'हिं' : 'EN';

  // Chips language: if auto, show both mixed or based on last detection — default en chips + hi available via toggle
  const chips = lang === 'hi' ? quickChips.hi : quickChips.en;

  return (
    <div className="fixed bottom-6 right-6 z-[99999] pointer-events-auto">
      {isOpen && (
        <div className="mb-4 w-[340px] sm:w-[380px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[520px] animate-in slide-in-from-bottom-5 duration-300">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-4 flex justify-between items-center text-white shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm leading-tight">SLMS AI Assistant</h3>
                <p className="text-[10px] text-indigo-100 flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Online • Replies in your language
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={cycleLang}
                title="Language: Auto / English / Hindi"
                className="hover:bg-white/20 py-1 px-2 rounded-lg transition-colors text-[10px] font-bold tracking-wide"
              >
                {langLabel}
              </button>
              <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1.5 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto bg-slate-50 dark:bg-slate-950/60 space-y-3">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.sender === 'bot' && (
                  <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                )}
                <div
                  className={`px-3.5 py-2.5 rounded-2xl text-[12.5px] leading-relaxed max-w-[82%] whitespace-pre-line ${
                    msg.sender === 'user'
                      ? 'bg-indigo-600 text-white rounded-tr-md'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-tl-md shadow-sm'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-2 justify-start">
                <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center shrink-0">
                  <Bot className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-2xl rounded-tl-md">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Chips */}
          <div className="px-3 pt-2 pb-1 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
            <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide">
              {chips.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => sendMessage(chip)}
                  className="shrink-0 px-2.5 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30 rounded-full text-[11px] font-medium hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={lang === 'hi' ? 'Apna sawaal yahan likho...' : 'Type your question (Hindi/English)...'}
              className="flex-1 bg-slate-100 dark:bg-slate-800 border-0 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || isTyping}
              className="w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-full shadow-2xl shadow-indigo-600/50 flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-transform cursor-pointer"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
      </button>
    </div>
  );
}