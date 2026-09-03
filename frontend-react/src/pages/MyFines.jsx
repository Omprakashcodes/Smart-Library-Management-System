import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { loadRazorpay } from '../services/razorpay';
// import { loadRazorpay } from '../utils/razorpay';
import {
  CheckCircle2,
  CreditCard,
  ShieldCheck,

  X,
  Loader2,
  AlertCircle,
  LockKeyhole
} from 'lucide-react';

export default function MyFines() {
  const [fines, setFines] = useState([]);
  const [totalUnpaid, setTotalUnpaid] = useState(0);
  const [selectedFine, setSelectedFine] = useState(null);

  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [receipt, setReceipt] = useState(null);

  useEffect(() => {
    fetchFines();
  }, []);

  const fetchFines = async () => {
    setLoading(true);

    try {
      const res = await api.get('/fines/my-fines');

      if (res.data?.success) {
        const data = res.data.data || {};
        setFines(Array.isArray(data.fines) ? data.fines : []);
        setTotalUnpaid(Number(data.totalUnpaid || 0));
      }
    } catch (err) {
      console.error('Failed to load fines:', err);
      setFines([]);
      setTotalUnpaid(0);
    } finally {
      setLoading(false);
    }
  };

  const closePaymentModal = () => {
    if (paymentLoading) return;

    setSelectedFine(null);
    setPaymentSuccess(false);
    setPaymentError('');
    setReceipt(null);
  };

  const handlePay = async () => {
    if (!selectedFine?._id || paymentLoading) return;

    setPaymentLoading(true);
    setPaymentError('');
    setPaymentSuccess(false);
    setReceipt(null);

    try {
      // Load official Razorpay Checkout SDK
      const sdkLoaded = await loadRazorpay();

      if (!sdkLoaded) {
        throw new Error(
          'Razorpay payment gateway could not be loaded. Please check your internet connection.'
        );
      }

      // IMPORTANT:
      // Fine amount frontend se nahi bhej rahe.
      // Backend fine ID se actual amount database se uthata hai.
      const orderRes = await api.post('/payments/create-order', {
        fineId: selectedFine._id
      });

      const order = orderRes.data;

      if (
        !order?.success ||
        !order?.orderId ||
        !order?.keyId ||
        !order?.amount
      ) {
        throw new Error(
          order?.message || 'Unable to create Razorpay payment order.'
        );
      }

      const savedUser = localStorage.getItem('slms_user');

      let user = {};

      try {
        user = savedUser ? JSON.parse(savedUser) : {};
      } catch {
        user = {};
      }

      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency || 'INR',
        name: 'Smart Library Management System',
        description: `Library Fine #${selectedFine._id.slice(-6).toUpperCase()}`,
        order_id: order.orderId,

        prefill: {
          name: user?.name || user?.fullName || '',
          email: user?.email || '',
          contact: user?.phone || ''
        },

        notes: {
          fine_reference: selectedFine._id,
          receipt: order.receiptId || ''
        },

        theme: {
          color: '#4f46e5'
        },

        modal: {
          confirm_close: true,

          ondismiss: () => {
            setPaymentLoading(false);
          }
        },

        handler: async (response) => {
          try {
            // Razorpay payment result backend ko verify karna MANDATORY hai.
            const verifyRes = await api.post('/payments/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });

            const result = verifyRes.data;

            if (!result?.success) {
              throw new Error(
                result?.message || 'Payment verification failed.'
              );
            }

            setReceipt({
              receiptId: result.receiptId,
              paymentId: result.paymentId,
              amount: result.amount
            });

            setPaymentSuccess(true);
            setPaymentError('');

            // Backend is now source of truth.
            // Fine list ko server/database se fresh load karo.
            await fetchFines();
          } catch (err) {
            console.error('Payment verification failed:', err);

            setPaymentError(
              err?.response?.data?.message ||
                err?.message ||
                'Payment verification failed. Please contact the library administrator.'
            );
          } finally {
            setPaymentLoading(false);
          }
        }
      };

      const razorpay = new window.Razorpay(options);

      razorpay.on('payment.failed', (response) => {
        console.error('Razorpay payment failed:', response.error);

        const description =
          response?.error?.description ||
          'The payment could not be completed. Please try again.';

        setPaymentError(description);
        setPaymentLoading(false);
      });

      razorpay.open();

      // Payment modal is open; spinner ki zarurat nahi while user enters details.
      setPaymentLoading(false);
    } catch (err) {
      console.error('Payment initialization failed:', err);

      setPaymentError(
        err?.response?.data?.message ||
          err?.message ||
          'Unable to start payment. Please try again.'
      );

      setPaymentLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Fine Balance & Payment Portal
          </h1>

          <p className="text-xs text-slate-400 mt-1">
            View outstanding library fines and securely pay them online.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-4">
          <div>
            <div className="text-[10px] font-semibold text-slate-400 uppercase">
              Outstanding Fine
            </div>

            <div className="text-2xl font-bold text-rose-500">
              ₹{totalUnpaid.toFixed(2)}
            </div>
          </div>

          <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold text-lg">
            ₹
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 font-bold text-sm text-slate-900 dark:text-white">
          Fine Transaction Records
        </div>

        {loading ? (
          <div className="p-8 flex items-center justify-center gap-2 text-xs text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading fine records...
          </div>
        ) : fines.length === 0 ? (
          <div className="p-10 text-center">
            <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-3" />

            <div className="font-semibold text-slate-900 dark:text-white">
              No fine records found
            </div>

            <p className="text-xs text-slate-400 mt-1">
              You currently have a clean library account.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {fines.map((fine) => (
              <div
                key={fine._id}
                className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-400">
                      Fine #{fine._id?.slice(-6).toUpperCase()}
                    </span>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        fine.status === 'unpaid'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : fine.status === 'paid'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                      }`}
                    >
                      {fine.status}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-1">
                    {fine.transaction?.book?.title || 'Library Fine'}
                  </h3>

                  <p className="text-xs text-slate-400 mt-0.5">
                    Overdue by {fine.overdueDays} days • Assessed Date:{' '}
                    {new Date(fine.createdAt).toLocaleDateString()}
                  </p>

                  {fine.status === 'paid' && fine.transactionReference && (
                    <p className="text-[10px] text-emerald-500 mt-1 font-mono">
                      Transaction: {fine.transactionReference}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                  <span className="text-lg font-bold text-slate-900 dark:text-white">
                    ₹{Number(fine.amount || 0).toFixed(2)}
                  </span>

                  {fine.status === 'unpaid' ? (
                    <button
                      onClick={() => {
                        setSelectedFine(fine);
                        setPaymentError('');
                        setPaymentSuccess(false);
                        setReceipt(null);
                      }}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 transition-colors"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      Pay Fine
                    </button>
                  ) : fine.status === 'paid' ? (
                    <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      Settled
                    </span>
                  ) : (
                    <span className="text-xs text-amber-500 font-semibold">
                      Waived
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Secure Payment Modal */}
      {selectedFine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 relative shadow-2xl">
            {!paymentLoading && (
              <button
                onClick={closePaymentModal}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Close payment window"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {paymentSuccess ? (
              <div className="py-6 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck className="w-9 h-9 text-emerald-500" />
                </div>

                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Payment Successful
                </h3>

                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  Your payment was securely verified and the library fine has
                  been settled.
                </p>

                <div className="mt-6 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-left overflow-hidden">
                  <div className="flex justify-between px-4 py-3 text-xs border-b border-slate-200 dark:border-slate-700">
                    <span className="text-slate-500">Amount Paid</span>
                    <strong className="text-emerald-500">
                      ₹{Number(receipt?.amount || selectedFine.amount).toFixed(2)}
                    </strong>
                  </div>

                  <div className="px-4 py-3 text-xs border-b border-slate-200 dark:border-slate-700">
                    <div className="text-slate-500 mb-1">Receipt ID</div>
                    <div className="font-mono text-slate-900 dark:text-slate-200 break-all">
                      {receipt?.receiptId || '—'}
                    </div>
                  </div>

                  <div className="px-4 py-3 text-xs">
                    <div className="text-slate-500 mb-1">Razorpay Payment ID</div>
                    <div className="font-mono text-slate-900 dark:text-slate-200 break-all">
                      {receipt?.paymentId || '—'}
                    </div>
                  </div>
                </div>

                <button
                  onClick={closePaymentModal}
                  className="w-full mt-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <div>
                  <div className="w-11 h-11 rounded-xl bg-indigo-500/15 text-indigo-500 flex items-center justify-center mb-4">
                    <CreditCard className="w-5 h-5" />
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Pay Library Fine
                  </h3>

                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Fine #{selectedFine._id?.slice(-6).toUpperCase()} •{' '}
                    {selectedFine.overdueDays} overdue days
                  </p>
                </div>

                <div className="mt-5 p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>Fine charge</span>
                    <span>₹{Number(selectedFine.amount).toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between text-sm text-slate-900 dark:text-slate-100 font-bold border-t border-slate-200 dark:border-slate-700 pt-3">
                    <span>Total payable</span>
                    <span className="text-indigo-600 dark:text-indigo-400 text-lg">
                      ₹{Number(selectedFine.amount).toFixed(2)}
                    </span>
                  </div>
                </div>

                {paymentError && (
                  <div className="mt-4 p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />

                    <p className="text-xs text-rose-500">
                      {paymentError}
                    </p>
                  </div>
                )}

                <button
                  onClick={handlePay}
                  disabled={paymentLoading}
                  className="w-full mt-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
                >
                  {paymentLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Preparing Secure Payment...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" />
                      Pay ₹{Number(selectedFine.amount).toFixed(2)}
                    </>
                  )}
                </button>

                <div className="flex justify-center items-center gap-1.5 mt-3 text-[10px] text-slate-400">
                  <LockKeyhole className="w-3 h-3" />
                  Secure checkout powered by Razorpay
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}