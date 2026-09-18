import React, { useState, useEffect } from 'react';
import BookCard from '../components/BookCard';
import api from '../services/api';
import { Search, CheckCircle2, X, BookOpen, Filter, ChevronDown, Users, CalendarClock } from 'lucide-react';

export default function Catalog({ searchTerm }) {
  const [search, setSearch] = useState('');
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState(['All']);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedBook, setSelectedBook] = useState(null);
  const [reservationMessage, setReservationMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const [myReservations, setMyReservations] = useState({});
  const [processingId, setProcessingId] = useState(null);

  // 🆕 Har unavailable book ka queue info: { bookId: { nearestReturnDate, queueCount, queue } }
  const [queueInfo, setQueueInfo] = useState({});

  useEffect(() => {
    fetchCategories();
    fetchMyReservations();
  }, []);

  useEffect(() => {
    fetchBooks();
  }, [selectedCategory, search, searchTerm]);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/books/categories');
      if (res.data.success) {
        setCategories(['All', ...res.data.data.map((c) => c.name)]);
      }
    } catch (err) {}
  };

  const fetchMyReservations = async () => {
    try {
      const res = await api.get('/reservations/my-reservations');
      if (res.data.success) {
        const map = {};
        (res.data.data || []).forEach((r) => {
          const bookId = r.book?._id || r.book;
          if (bookId && (r.status === 'pending' || r.status === 'fulfilled')) {
            map[bookId] = { status: r.status, queuePosition: r.queuePosition };
          }
        });
        setMyReservations(map);
      }
    } catch (err) {}
  };

  // 🆕 Ek book ka queue status fetch karo
  const fetchQueueForBook = async (bookId) => {
    try {
      const res = await api.get(`/reservations/book/${bookId}/queue`);
      if (res.data.success) {
        setQueueInfo((prev) => ({ ...prev, [bookId]: res.data.data }));
      }
    } catch (err) {}
  };

  const fetchBooks = async () => {
    setLoading(true);
    try {
      const query = searchTerm || search;
      const res = await api.get('/books', {
        params: {
          search: query,
          limit: 50
        }
      });
      if (res.data.success) {
        let items = res.data.data;
        if (selectedCategory !== 'All') {
          items = items.filter((b) => b.category?.name === selectedCategory);
        }
        setBooks(items);

        // 🆕 Sirf UNAVAILABLE books ka queue fetch karo (N+1 se bachne ke liye)
        items
          .filter((b) => (b.availableCopies ?? 0) <= 0)
          .forEach((b) => fetchQueueForBook(b._id));
      }
    } catch (err) {
      setBooks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleReserve = async (book) => {
    if (processingId) return;
    setProcessingId(book._id);
    setReservationMessage('');

    try {
      const res = await api.post('/reservations', { bookId: book._id });
      if (res.data.success) {
        setMyReservations((prev) => ({
          ...prev,
          [book._id]: { status: 'pending', queuePosition: res.data.data.queuePosition }
        }));
        setReservationMessage(
          `Hold placed for "${book.title}". Queue #${res.data.data.queuePosition} — waiting for admin approval.`
        );
        // 🆕 Queue mein khud ko turant dikhao
        fetchQueueForBook(book._id);
      }
    } catch (err) {
      const msg = err.response?.data?.message || '';
      if (msg.toLowerCase().includes('already')) {
        setMyReservations((prev) => ({ ...prev, [book._id]: { status: 'pending' } }));
      }
      setReservationMessage(msg || `Could not reserve "${book.title}". Please try again.`);
    } finally {
      setProcessingId(null);
    }
    setTimeout(() => setReservationMessage(''), 6000);
  };

  // 🆕 Modal ke liye selected book ka queue nikalo
  const selectedQueue = selectedBook ? queueInfo[selectedBook._id] : null;

  return (
    <div className="space-y-6 pb-12 relative">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Live Book Catalog & Inventory</h1>
        <p className="text-xs text-slate-400 mt-1">Browse, filter, and reserve books from your digital library inventory.</p>
      </div>

      {reservationMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 border border-indigo-500/50 text-white px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-5 max-w-md w-11/12">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold flex-1 text-center sm:text-left">{reservationMessage}</span>
          <button onClick={() => setReservationMessage('')} className="text-slate-400 hover:text-white ml-2"><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center bg-white dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by title, author, ISBN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
          />
        </div>

        <div className="relative min-w-[200px]">
          <Filter className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full pl-10 pr-9 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white appearance-none cursor-pointer"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'All' ? 'All Book Categories' : cat}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-xs text-slate-400">Loading catalog inventory...</div>
      ) : books.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
          <BookOpen className="w-12 h-12 text-slate-400 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No books found in database</h3>
          <p className="text-xs text-slate-400">Use the Admin Console to add new books to your digital library.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {books.map((book) => (
            <BookCard
              key={book._id}
              book={book}
              onReserve={handleReserve}
              onSelect={(b) => setSelectedBook(b)}
              reservationStatus={myReservations[book._id]?.status}
              queuePosition={myReservations[book._id]?.queuePosition}
              isProcessing={processingId === book._id}
              queueInfo={queueInfo[book._id] || null}
            />
          ))}
        </div>
      )}

      {/* Book Details Modal */}
      {selectedBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setSelectedBook(null)} className="absolute top-4 right-4 p-2 text-slate-400 rounded-full bg-slate-100 dark:bg-slate-800">
              <X className="w-4 h-4" />
            </button>

            <div className="flex gap-4">
              <img src={selectedBook.coverImageUrl} alt={selectedBook.title} className="w-28 h-36 object-cover rounded-xl shadow-md" />
              <div>
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">{selectedBook.category?.name || 'General'}</span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">{selectedBook.title}</h3>
                <p className="text-xs text-slate-400 mt-1">Authors: {Array.isArray(selectedBook.authors) ? selectedBook.authors.join(', ') : selectedBook.authors}</p>
                <p className="text-xs text-slate-400 mt-0.5">Publisher: {selectedBook.publisher}</p>
                <div className="mt-3 text-xs font-mono text-slate-300">ISBN: {selectedBook.isbn}</div>
                <div className="text-xs text-emerald-400 font-semibold mt-1">Shelf: {selectedBook.shelfLocation}</div>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800 pt-3">
              {selectedBook.description || 'No description provided.'}
            </p>

            {/* 🆕 AVAILABILITY FORECAST — Sir ka feature! */}
            {(selectedBook.availableCopies ?? 0) <= 0 && (
              <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-4 space-y-3">
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CalendarClock className="w-4 h-4" /> Availability Forecast
                </h4>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-900/50 rounded-xl p-2.5">
                    <div className="text-[10px] text-slate-500">Expected Back</div>
                    <div className="font-bold text-amber-300">
                      {selectedQueue?.nearestReturnDate
                        ? new Date(selectedQueue.nearestReturnDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                        : '—'}
                    </div>
                  </div>
                  <div className="bg-slate-900/50 rounded-xl p-2.5">
                    <div className="text-[10px] text-slate-500">In Hold Queue</div>
                    <div className="font-bold text-indigo-300 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {selectedQueue ? `${selectedQueue.queueCount} student${selectedQueue.queueCount !== 1 ? 's' : ''}` : '...'}
                    </div>
                  </div>
                </div>

                {/* Queue List — kis-kis ne hold kiya hai */}
                {selectedQueue?.queue?.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-[10px] text-slate-500 font-semibold uppercase">Current Queue</div>
                    {selectedQueue.queue.map((q) => (
                      <div
                        key={q.position}
                        className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs ${
                          q.isYou
                            ? 'bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 font-bold'
                            : 'bg-slate-900/50 text-slate-300'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className="font-mono text-amber-400 font-bold">#{q.position}</span>
                          {q.memberName}
                        </span>
                        {q.isYou && (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-indigo-500 text-white uppercase">
                            You
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-3">
              <button onClick={() => setSelectedBook(null)} className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white">
                Close
              </button>

              {myReservations[selectedBook._id]?.status === 'pending' ? (
                <span className="px-5 py-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 text-xs font-semibold">
                  🕐 Pending Approval
                </span>
              ) : myReservations[selectedBook._id]?.status === 'fulfilled' ? (
                <span className="px-5 py-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-semibold">
                  ✅ Approved
                </span>
              ) : (
                <button
                  onClick={() => {
                    handleReserve(selectedBook);
                    setSelectedBook(null);
                  }}
                  disabled={processingId === selectedBook._id}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processingId === selectedBook._id ? 'Processing...' : 'Confirm Hold / Borrow Request'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}