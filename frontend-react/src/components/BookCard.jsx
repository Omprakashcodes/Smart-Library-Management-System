import React from 'react';
import { BookOpen, Bookmark, CheckCircle, AlertTriangle, Layers, Clock, Loader2, BadgeCheck, CalendarClock, Users } from 'lucide-react';

export default function BookCard({
  book,
  onReserve,
  onSelect,
  reservationStatus = null,
  queuePosition = null,
  isProcessing = false,
  queueInfo = null // 🆕 { nearestReturnDate, queueCount, queue }
}) {
  const isAvailable = book.availableCopies > 0;

  const renderActionButton = () => {
    if (isProcessing) {
      return (
        <span className="px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-wait select-none">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Processing...
        </span>
      );
    }

    if (reservationStatus === 'pending') {
      return (
        <span className="px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 bg-amber-500/15 text-amber-500 border border-amber-500/30 cursor-not-allowed select-none">
          <Clock className="w-3.5 h-3.5" />
          Pending{queuePosition ? ` · Queue #${queuePosition}` : ' Approval'}
        </span>
      );
    }

        if (reservationStatus === 'approved') {
      return (
        <span className="px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 cursor-not-allowed select-none">
          <BadgeCheck className="w-3.5 h-3.5" />
          Approved · Collect from Desk
        </span>
      );
    }

    if (reservationStatus === 'fulfilled') {
      return (
        <span className="px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 cursor-not-allowed select-none">
          <BadgeCheck className="w-3.5 h-3.5" />
          Approved ✓
        </span>
      );
    }

    return (
      <button
        onClick={() => onReserve && onReserve(book)}
        className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
          isAvailable
            ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
            : 'bg-slate-700 hover:bg-slate-600 text-white'
        }`}
      >
        <Bookmark className="w-3.5 h-3.5" />
        {isAvailable ? 'Borrow / Hold' : 'Join Queue'}
      </button>
    );
  };

  return (
    <div className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden hover:border-indigo-500/50 transition-colors duration-150 flex flex-col transform-gpu">
      {/* Cover Image Container */}
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-slate-800">
        <img
          src={book.coverImageUrl}
          alt={book.title}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 transform-gpu"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-60 pointer-events-none" />

        {/* Badges Container */}
        <div className="absolute top-3 inset-x-3 flex items-center justify-between gap-2 pointer-events-none z-10">
          <span className="text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-full bg-slate-950/90 text-slate-200 border border-white/10 uppercase truncate max-w-[55%] backdrop-blur-md">
            {book.category?.name || 'General'}
          </span>

          <span
            className={`text-[11px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0 backdrop-blur-md ${
              isAvailable
                ? 'bg-slate-950/90 text-emerald-400 border border-emerald-500/30'
                : 'bg-slate-950/90 text-rose-400 border border-rose-500/30'
            }`}
          >
            {isAvailable ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
            {isAvailable ? `${book.availableCopies} Available` : 'Out of Stock'}
          </span>
        </div>

        {/* Reservation Status Ribbon */}
        {reservationStatus && (
          <div className="absolute bottom-3 left-3 z-10 pointer-events-none">
            <span
              className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 backdrop-blur-md border ${
                reservationStatus === 'pending'
                  ? 'bg-amber-500/90 text-white border-amber-300/50'
                  : 'bg-emerald-500/90 text-white border-emerald-300/50'
              }`}
            >
              {reservationStatus === 'pending' ? (
                <><Clock className="w-3 h-3" /> REQUEST PENDING</>
              ) : (
                <><BadgeCheck className="w-3 h-3" /> APPROVED</>
              )}
            </span>
          </div>
        )}
      </div>

      {/* Details Body */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <h3
            onClick={() => onSelect && onSelect(book)}
            className="font-bold text-base text-slate-900 dark:text-white line-clamp-1 hover:text-indigo-500 cursor-pointer transition-colors"
          >
            {book.title}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
            by {Array.isArray(book.authors) ? book.authors.join(', ') : book.authors}
          </p>

          <div className="mt-3 space-y-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5 font-mono whitespace-nowrap truncate">
              <Layers className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="truncate">ISBN: {book.isbn}</span>
            </div>
            <div className="flex items-center gap-1.5 whitespace-nowrap truncate text-slate-600 dark:text-slate-400">
              <span className="font-semibold text-slate-400 dark:text-slate-500">Shelf:</span>
              <span className="truncate font-medium">{book.shelfLocation}</span>
            </div>
          </div>

          {/* 🆕 AVAILABILITY FORECAST — sirf out-of-stock books par (Sir ka feature!) */}
          {!isAvailable && (
            <div className="mt-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-1.5">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                <CalendarClock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                {queueInfo?.nearestReturnDate ? (
                  <span>
                    Expected back:{' '}
                    <span className="font-bold text-amber-400">
                      {new Date(queueInfo.nearestReturnDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </span>
                  </span>
                ) : (
                  <span>Checking return date...</span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                <Users className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                {queueInfo ? (
                  <span>
                    <span className="font-bold text-indigo-400">{queueInfo.queueCount}</span> student{queueInfo.queueCount !== 1 ? 's' : ''} in hold queue
                  </span>
                ) : (
                  <span>Checking queue...</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
          <button
            onClick={() => onSelect && onSelect(book)}
            className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
          >
            View Details
          </button>

          {renderActionButton()}
        </div>
      </div>
    </div>
  );
}