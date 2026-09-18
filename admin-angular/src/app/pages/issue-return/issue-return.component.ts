import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminApiService } from '../../services/admin-api.service';

@Component({
  selector: 'app-issue-return',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6 pb-12 relative">
      <div>
        <h1 class="text-2xl font-bold text-white">Live Circulation & Desk Operations</h1>
        <p class="text-xs text-slate-400 mt-1">Process checkouts, returns, and lost book penalties using Member ID, Email, ISBN, or Transaction ID.</p>
      </div>

      <!-- Toast Popups -->
      <div *ngIf="issueMsg || returnMsg || lostMsg" class="fixed top-6 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 border border-emerald-500/50 text-white px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 max-w-md w-11/12">
        <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0"></span>
        <span class="text-xs font-semibold text-slate-100 flex-1 text-center sm:text-left">{{ issueMsg || returnMsg || lostMsg }}</span>
        <button (click)="issueMsg = ''; returnMsg = ''; lostMsg = ''" class="text-slate-400 hover:text-white text-xs ml-2">✕</button>
      </div>

      <div *ngIf="issueErr || returnErr || lostErr" class="fixed top-6 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 border border-rose-500/50 text-white px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 max-w-md w-11/12">
        <span class="w-2.5 h-2.5 rounded-full bg-rose-400 shrink-0"></span>
        <span class="text-xs font-semibold text-rose-400 flex-1 text-center sm:text-left">{{ issueErr || returnErr || lostErr }}</span>
        <button (click)="issueErr = ''; returnErr = ''; lostErr = ''" class="text-slate-400 hover:text-white text-xs ml-2">✕</button>
      </div>

      <!-- Quick Desk Action Box -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Issue Book Panel -->
        <div class="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4">
          <h3 class="font-bold text-sm text-cyan-400 flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
            Quick Book Checkout
          </h3>
          <div class="space-y-3 text-xs">
            <div>
              <label class="text-slate-400 block mb-1">Member ID or Student Email *</label>
              <input [(ngModel)]="issueUserId" placeholder="e.g. STU-311368 or student&#64;slms.com" class="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono" />
            </div>
            <div>
              <label class="text-slate-400 block mb-1">Book ISBN or Title *</label>
              <input [(ngModel)]="issueBookId" placeholder="e.g. 978-0132350884 or Clean Code" class="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono" />
            </div>
            <button (click)="processIssue()" class="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-semibold shadow-lg shadow-cyan-600/30">
              Confirm Book Issue (14 Days)
            </button>
          </div>
        </div>

        <!-- Return Book Panel -->
        <div class="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4">
          <h3 class="font-bold text-sm text-indigo-400 flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>
            Quick Book Return
          </h3>
          <div class="space-y-3 text-xs">
            <div>
              <label class="text-slate-400 block mb-1">Loan Transaction ID *</label>
              <input [(ngModel)]="returnTransId" placeholder="e.g. 24-character Transaction ID" class="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono" />
            </div>
            <button (click)="processReturn()" class="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold shadow-lg shadow-indigo-600/30">
              Process Return & Calculate Fine
            </button>
          </div>
        </div>
      </div>

      <!-- Active Transactions Table -->
      <div class="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div class="px-6 py-4 border-b border-slate-800 font-bold text-sm text-white flex justify-between items-center">
          <span>Active Loan Register</span>
          <button (click)="loadTransactions()" class="text-xs text-cyan-400 font-semibold flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            Refresh List
          </button>
        </div>

        <div class="overflow-x-auto custom-scrollbar">
          <table class="w-full text-left text-xs text-slate-300">
            <thead class="bg-slate-800/80 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th class="p-4">Tx ID</th>
                <th class="p-4">Member Name</th>
                <th class="p-4">Book Title</th>
                <th class="p-4">Issue Date</th>
                <th class="p-4">Due Date</th>
                <th class="p-4">Status</th>
                <th class="p-4 text-right">Quick Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800">
              <tr *ngIf="loading">
                <td colspan="7" class="p-8 text-center text-slate-400">Loading loan records...</td>
              </tr>
              <tr *ngIf="!loading && transactions.length === 0">
                <td colspan="7" class="p-8 text-center text-slate-400">No transactions recorded yet. Use the checkout form above to issue a book!</td>
              </tr>
              <tr *ngFor="let t of transactions" class="hover:bg-slate-800/30 transition-colors">
                <td class="p-4 font-mono text-cyan-400 font-bold">{{ t._id }}</td>
                <td class="p-4 font-semibold text-white">{{ t.user?.fullName }} ({{ t.user?.memberId }})</td>
                <td class="p-4">{{ t.book?.title }}</td>
                <td class="p-4 text-slate-400">{{ t.issueDate | date:'shortDate' }}</td>
                <td class="p-4 font-semibold text-slate-200">{{ t.dueDate | date:'shortDate' }}</td>
                <td class="p-4">
                  <span
                    class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase"
                    [ngClass]="{
                      'bg-emerald-500/20 text-emerald-400': t.status === 'issued',
                      'bg-rose-500/20 text-rose-400': t.status === 'overdue',
                      'bg-slate-500/20 text-slate-400': t.status === 'returned',
                      'bg-purple-500/20 text-purple-400': t.status === 'lost'
                    }"
                  >
                    {{ t.status }}
                  </span>
                </td>
                <td class="p-4 text-right space-x-3">
                  <button *ngIf="t.status === 'issued' || t.status === 'overdue'" (click)="quickReturn(t._id)" class="text-indigo-400 font-semibold hover:text-indigo-300">
                    Return Book
                  </button>
                  <!-- 🆕 MARK LOST button -->
                  <button *ngIf="t.status === 'issued' || t.status === 'overdue'" (click)="openLostModal(t)" class="text-purple-400 font-semibold hover:text-purple-300">
                    Mark Lost
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 🆕 MARK LOST CONFIRMATION MODAL -->
      <div *ngIf="lostModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
        <div class="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 relative shadow-2xl">
          <button (click)="closeLostModal()" class="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800">✕</button>

          <div class="w-11 h-11 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          </div>

          <div>
            <h3 class="text-lg font-bold text-white">Mark Book as Lost?</h3>
            <p class="text-xs text-slate-400 mt-1">Ye action permanent hai — book inventory se remove ho jayegi aur member par penalty lagegi.</p>
          </div>

          <div class="p-4 rounded-2xl bg-slate-800 border border-slate-700 space-y-2 text-xs">
            <div class="flex justify-between"><span class="text-slate-400">Book</span><span class="text-white font-semibold">{{ lostTransaction?.book?.title }}</span></div>
            <div class="flex justify-between"><span class="text-slate-400">Member</span><span class="text-white font-semibold">{{ lostTransaction?.user?.fullName }}</span></div>
          </div>

          <div>
            <label class="text-slate-400 block mb-1 text-xs">Penalty Amount (₹) *</label>
            <input type="number" [(ngModel)]="lostPenalty" min="1" class="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono text-sm" />
            <p class="text-[10px] text-slate-500 mt-1">Default: ₹500 — book ki replacement cost ke hisaab se adjust karo</p>
          </div>

          <div class="flex gap-3 pt-2">
            <button (click)="closeLostModal()" [disabled]="lostLoading" class="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold">
              Cancel
            </button>
            <button (click)="confirmMarkLost()" [disabled]="lostLoading" class="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 text-white text-xs font-semibold shadow-lg shadow-purple-600/30">
              {{ lostLoading ? 'Processing...' : 'Confirm Lost + Penalty' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class IssueReturnComponent implements OnInit {
  issueUserId = '';
  issueBookId = '';
  returnTransId = '';

  issueMsg = '';
  issueErr = '';
  returnMsg = '';
  returnErr = '';

  // 🆕 Lost book state
  lostModalOpen = false;
  lostTransaction: any = null;
  lostPenalty = 500;
  lostLoading = false;
  lostMsg = '';
  lostErr = '';

  transactions: any[] = [];
  loading = true;

  constructor(private api: AdminApiService) {}

  ngOnInit() {
    this.loadTransactions();
  }

  loadTransactions() {
    this.loading = true;
    this.api.getTransactions().subscribe({
      next: (res: any) => {
        if (res.success) {
          this.transactions = res.data;
        }
        this.loading = false;
      },
      error: (err) => {
        this.transactions = [];
        this.loading = false;
        if (err.status === 401) {
          localStorage.removeItem('slms_token');
          window.location.href = '/login';
        }
      }
    });
  }

  processIssue() {
    this.issueMsg = '';
    this.issueErr = '';

    if (!this.issueUserId || !this.issueBookId) {
      this.issueErr = 'Please enter both Member ID / Email and ISBN / Book Title.';
      setTimeout(() => (this.issueErr = ''), 5000);
      return;
    }

    this.api.issueBook({ userId: this.issueUserId, bookId: this.issueBookId }).subscribe({
      next: (res: any) => {
        this.issueMsg = res.message || `Book successfully checked out! Loan ID: ${res.data._id}`;
        this.issueUserId = '';
        this.issueBookId = '';
        this.loadTransactions();
        setTimeout(() => (this.issueMsg = ''), 5000);
      },
      error: (err) => {
        this.issueErr = err.error?.message || 'Failed to issue book.';
        setTimeout(() => (this.issueErr = ''), 5000);
        if (err.status === 401) {
          localStorage.removeItem('slms_token');
          window.location.href = '/login';
        }
      }
    });
  }

  processReturn() {
    this.returnMsg = '';
    this.returnErr = '';

    if (!this.returnTransId) {
      this.returnErr = 'Please enter Transaction ID.';
      setTimeout(() => (this.returnErr = ''), 5000);
      return;
    }

    this.quickReturn(this.returnTransId);
  }

  quickReturn(transId: string) {
    this.returnMsg = '';
    this.returnErr = '';

    this.api.returnBook(transId).subscribe({
      next: (res: any) => {
        this.returnMsg = `Book returned successfully! ${res.data.fine ? 'Fine incurred: ₹' + res.data.fine.amount.toFixed(2) : 'No fine.'}`;
        this.returnTransId = '';
        this.loadTransactions();
        setTimeout(() => (this.returnMsg = ''), 5000);
      },
      error: (err) => {
        this.returnErr = err.error?.message || 'Failed to process return.';
        setTimeout(() => (this.returnErr = ''), 5000);
        if (err.status === 401) {
          localStorage.removeItem('slms_token');
          window.location.href = '/login';
        }
      }
    });
  }

  // 🆕 ============ LOST BOOK METHODS ============

  openLostModal(transaction: any) {
    this.lostTransaction = transaction;
    this.lostPenalty = 500; // default penalty reset
    this.lostModalOpen = true;
    this.lostErr = '';
  }

  closeLostModal() {
    if (this.lostLoading) return;
    this.lostModalOpen = false;
    this.lostTransaction = null;
  }

  confirmMarkLost() {
    if (!this.lostTransaction?._id || this.lostLoading) return;

    if (!this.lostPenalty || this.lostPenalty <= 0) {
      this.lostErr = 'Please enter a valid penalty amount.';
      setTimeout(() => (this.lostErr = ''), 5000);
      return;
    }

    this.lostLoading = true;
    this.lostMsg = '';
    this.lostErr = '';

    this.api.markBookLost(this.lostTransaction._id, this.lostPenalty).subscribe({
      next: (res: any) => {
        this.lostMsg = res.message || `Book marked as lost. Penalty of ₹${this.lostPenalty.toFixed(2)} applied.`;
        this.lostLoading = false;
        this.lostModalOpen = false;
        this.lostTransaction = null;
        this.loadTransactions();
        setTimeout(() => (this.lostMsg = ''), 6000);
      },
      error: (err) => {
        this.lostErr = err.error?.message || 'Failed to mark book as lost.';
        this.lostLoading = false;
        this.lostModalOpen = false;
        setTimeout(() => (this.lostErr = ''), 5000);
        if (err.status === 401) {
          localStorage.removeItem('slms_token');
          window.location.href = '/login';
        }
      }
    });
  }
}