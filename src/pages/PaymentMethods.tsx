import { useState, useEffect } from 'react';
import { auth, db, collection, query, where, onSnapshot, addDoc, deleteDoc, updateDoc, doc, getDocs, Timestamp, handleFirestoreError, OperationType } from '../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { PaymentMethod } from '../types';
import { CreditCard, Wallet, Smartphone, Plus, Trash2, ArrowLeft, Loader2, Star, CheckCircle2, X, ShieldCheck, Building2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';

const CARD_BRANDS = [
  { id: 'visa', name: 'Visa', color: 'from-blue-600 to-blue-800' },
  { id: 'mastercard', name: 'Mastercard', color: 'from-orange-500 to-red-600' },
  { id: 'rupay', name: 'RuPay', color: 'from-emerald-500 to-teal-700' },
  { id: 'amex', name: 'Amex', color: 'from-zinc-600 to-zinc-900' },
];

const WALLET_PROVIDERS = [
  { id: 'paytm', name: 'Paytm', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'phonepe', name: 'PhonePe', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { id: 'gpay', name: 'Google Pay', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'amazonpay', name: 'Amazon Pay', color: 'bg-amber-50 text-amber-700 border-amber-200' },
];

type AddFormType = 'credit_card' | 'debit_card' | 'upi' | 'wallet' | null;

export default function PaymentMethods() {
  const [user, loadingAuth] = useAuthState(auth);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState<AddFormType>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const navigate = useNavigate();

  // Card form
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [expiryMonth, setExpiryMonth] = useState('');
  const [expiryYear, setExpiryYear] = useState('');
  const [cardBrand, setCardBrand] = useState<'visa' | 'mastercard' | 'rupay' | 'amex'>('visa');
  // UPI form
  const [upiId, setUpiId] = useState('');
  // Wallet form
  const [walletProvider, setWalletProvider] = useState<'paytm' | 'phonepe' | 'gpay' | 'amazonpay'>('gpay');
  const [walletPhone, setWalletPhone] = useState('');

  useEffect(() => {
    if (loadingAuth) return;
    if (!user) { navigate('/login'); return; }

    const q = query(collection(db, 'paymentMethods'), where('userId', '==', user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() })) as PaymentMethod[];
      data.sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0));
      setMethods(data);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'paymentMethods');
      setLoading(false);
    });

    return () => unsub();
  }, [user, loadingAuth, navigate]);

  const resetForm = () => {
    setCardNumber(''); setCardHolder(''); setExpiryMonth(''); setExpiryYear('');
    setCardBrand('visa'); setUpiId(''); setWalletProvider('gpay'); setWalletPhone('');
    setShowAddForm(null);
  };

  const handleAdd = async () => {
    if (!user) return;
    setSaving(true);
    try {
      let data: any = {
        userId: user.uid,
        type: showAddForm,
        isDefault: methods.length === 0,
        createdAt: Timestamp.now(),
      };

      if (showAddForm === 'credit_card' || showAddForm === 'debit_card') {
        if (cardNumber.length < 4 || !cardHolder.trim() || !expiryMonth || !expiryYear) {
          toast.error('Please fill all card fields'); setSaving(false); return;
        }
        data.cardNumber = cardNumber.slice(-4);
        data.cardHolder = cardHolder.trim();
        data.expiryMonth = expiryMonth;
        data.expiryYear = expiryYear;
        data.cardBrand = cardBrand;
        data.label = `${CARD_BRANDS.find(b => b.id === cardBrand)?.name} •••• ${cardNumber.slice(-4)}`;
      } else if (showAddForm === 'upi') {
        if (!upiId.includes('@')) {
          toast.error('Enter a valid UPI ID (e.g. name@upi)'); setSaving(false); return;
        }
        data.upiId = upiId.trim();
        data.label = upiId.trim();
      } else if (showAddForm === 'wallet') {
        if (walletPhone.length < 10) {
          toast.error('Enter a valid phone number'); setSaving(false); return;
        }
        data.walletProvider = walletProvider;
        data.walletPhone = walletPhone;
        data.label = `${WALLET_PROVIDERS.find(w => w.id === walletProvider)?.name} (${walletPhone.slice(-4)})`;
      }

      await addDoc(collection(db, 'paymentMethods'), data);
      toast.success('Payment method added!');
      resetForm();
    } catch (err) {
      toast.error('Failed to add payment method');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const method = methods.find(m => m.id === id);
      await deleteDoc(doc(db, 'paymentMethods', id));
      if (method?.isDefault && methods.length > 1) {
        const next = methods.find(m => m.id !== id);
        if (next) await updateDoc(doc(db, 'paymentMethods', next.id), { isDefault: true });
      }
      toast.success('Payment method removed');
    } catch (err) {
      toast.error('Failed to remove');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      const q = query(collection(db, 'paymentMethods'), where('userId', '==', user!.uid), where('isDefault', '==', true));
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        await updateDoc(doc(db, 'paymentMethods', d.id), { isDefault: false });
      }
      await updateDoc(doc(db, 'paymentMethods', id), { isDefault: true });
      toast.success('Default payment method updated');
    } catch (err) {
      toast.error('Failed to update default');
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'credit_card': case 'debit_card': return CreditCard;
      case 'upi': return Smartphone;
      case 'wallet': return Wallet;
      default: return CreditCard;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'credit_card': return 'Credit Card';
      case 'debit_card': return 'Debit Card';
      case 'upi': return 'UPI';
      case 'wallet': return 'Wallet';
      default: return type;
    }
  };

  const getCardGradient = (brand?: string) => {
    return CARD_BRANDS.find(b => b.id === brand)?.color || 'from-zinc-600 to-zinc-900';
  };

  if (loadingAuth || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-900" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10 flex items-center gap-4">
        <Link to="/profile" className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-500 shadow-sm transition-all hover:bg-zinc-50 hover:text-zinc-900">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Payment Methods</h1>
          <p className="text-sm text-zinc-500 mt-1">Manage your saved payment options for faster checkout.</p>
        </div>
      </motion.div>

      {/* Security Banner */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="mb-8 flex items-center gap-3 rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 px-5 py-4">
        <ShieldCheck size={20} className="text-emerald-600 shrink-0" />
        <p className="text-sm font-medium text-emerald-800">Your payment information is encrypted and stored securely. We never store full card numbers.</p>
      </motion.div>

      {/* Saved Methods */}
      <div className="space-y-4 mb-8">
        <AnimatePresence mode="popLayout">
          {methods.map((m, i) => {
            const Icon = getIcon(m.type);
            const isCard = m.type === 'credit_card' || m.type === 'debit_card';
            return (
              <motion.div key={m.id} layout initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                transition={{ delay: i * 0.05 }}
                className={`group relative overflow-hidden rounded-xl border bg-white p-5 transition-all duration-300 hover:shadow-md ${m.isDefault ? 'border-emerald-300 ring-1 ring-emerald-200' : 'border-zinc-200 hover:border-zinc-300'}`}>
                <div className="flex items-center gap-4">
                  {isCard ? (
                    <div className={`flex h-14 w-20 items-center justify-center rounded-lg bg-gradient-to-br ${getCardGradient(m.cardBrand)} text-white shadow-md`}>
                      <CreditCard size={24} />
                    </div>
                  ) : (
                    <div className={`flex h-14 w-14 items-center justify-center rounded-lg ${m.type === 'upi' ? 'bg-violet-100 text-violet-600' : 'bg-amber-100 text-amber-600'}`}>
                      <Icon size={24} />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-zinc-900 truncate">{m.label}</p>
                      {m.isDefault && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                          <Star size={8} className="fill-emerald-500" /> Default
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5">{getTypeLabel(m.type)}
                      {isCard && m.expiryMonth && m.expiryYear && ` • Expires ${m.expiryMonth}/${m.expiryYear}`}
                      {m.type === 'wallet' && m.walletProvider && ` • ${WALLET_PROVIDERS.find(w => w.id === m.walletProvider)?.name}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {!m.isDefault && (
                      <button onClick={() => handleSetDefault(m.id)}
                        className="rounded-lg border border-zinc-200 px-3 py-1.5 text-[11px] font-semibold text-zinc-600 transition-all hover:bg-zinc-50 hover:border-zinc-300 active:scale-95">
                        Set Default
                      </button>
                    )}
                    <button onClick={() => handleDelete(m.id)} disabled={deletingId === m.id}
                      className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50">
                      {deletingId === m.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {methods.length === 0 && !showAddForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50/50 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-zinc-100 text-zinc-400 mb-4">
              <Wallet size={32} />
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 tracking-tight">No payment methods yet</h3>
            <p className="text-sm text-zinc-500 mt-1 mb-6">Add a payment method to make booking faster and easier.</p>
          </motion.div>
        )}
      </div>

      {/* Add Method Buttons */}
      {!showAddForm && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {([
            { type: 'credit_card' as AddFormType, icon: CreditCard, label: 'Credit Card', desc: 'Visa, Mastercard, etc.' },
            { type: 'debit_card' as AddFormType, icon: Building2, label: 'Debit Card', desc: 'Bank debit card' },
            { type: 'upi' as AddFormType, icon: Smartphone, label: 'UPI', desc: 'UPI ID payment' },
            { type: 'wallet' as AddFormType, icon: Wallet, label: 'Wallet', desc: 'Paytm, GPay, etc.' },
          ]).map((item) => (
            <button key={item.type} onClick={() => setShowAddForm(item.type)}
              className="flex flex-col items-center gap-2 rounded-xl border border-zinc-200 bg-white p-5 text-center transition-all duration-200 hover:border-zinc-400 hover:shadow-md active:scale-[0.97]">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600">
                <item.icon size={22} />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-900">{item.label}</p>
                <p className="text-[11px] text-zinc-500">{item.desc}</p>
              </div>
              <Plus size={14} className="text-zinc-400" />
            </button>
          ))}
        </motion.div>
      )}

      {/* Add Form Modal */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-base font-semibold text-zinc-900 tracking-tight">
                Add {getTypeLabel(showAddForm)}
              </h3>
              <button onClick={resetForm} className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 transition-colors">
                <X size={18} />
              </button>
            </div>

            {(showAddForm === 'credit_card' || showAddForm === 'debit_card') && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-700">Card Brand</label>
                  <div className="grid grid-cols-4 gap-2">
                    {CARD_BRANDS.map((b) => (
                      <button key={b.id} onClick={() => setCardBrand(b.id as any)}
                        className={`rounded-lg border py-2 text-xs font-semibold transition-all ${cardBrand === b.id ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400'}`}>
                        {b.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-700">Card Number</label>
                  <input type="text" maxLength={19} value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').slice(0, 16))}
                    placeholder="1234 5678 9012 3456"
                    className="w-full rounded-lg border border-zinc-200 bg-white p-3 text-sm font-medium focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 outline-none transition-all" />
                  <p className="text-[11px] text-zinc-400">Only the last 4 digits will be stored</p>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-700">Cardholder Name</label>
                  <input type="text" value={cardHolder} onChange={(e) => setCardHolder(e.target.value)}
                    placeholder="Name on card"
                    className="w-full rounded-lg border border-zinc-200 bg-white p-3 text-sm font-medium focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 outline-none transition-all" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-700">Expiry Month</label>
                    <select value={expiryMonth} onChange={(e) => setExpiryMonth(e.target.value)}
                      className="w-full rounded-lg border border-zinc-200 bg-white p-3 text-sm font-medium focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 outline-none transition-all">
                      <option value="">MM</option>
                      {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-700">Expiry Year</label>
                    <select value={expiryYear} onChange={(e) => setExpiryYear(e.target.value)}
                      className="w-full rounded-lg border border-zinc-200 bg-white p-3 text-sm font-medium focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 outline-none transition-all">
                      <option value="">YY</option>
                      {Array.from({ length: 10 }, (_, i) => String(new Date().getFullYear() + i).slice(-2)).map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {showAddForm === 'upi' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-700">UPI ID</label>
                  <input type="text" value={upiId} onChange={(e) => setUpiId(e.target.value)}
                    placeholder="yourname@upi"
                    className="w-full rounded-lg border border-zinc-200 bg-white p-3 text-sm font-medium focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 outline-none transition-all" />
                  <p className="text-[11px] text-zinc-400">Enter your UPI ID (e.g. name@oksbi, name@ybl)</p>
                </div>
              </div>
            )}

            {showAddForm === 'wallet' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-700">Wallet Provider</label>
                  <div className="grid grid-cols-2 gap-2">
                    {WALLET_PROVIDERS.map((w) => (
                      <button key={w.id} onClick={() => setWalletProvider(w.id as any)}
                        className={`rounded-lg border py-2.5 text-xs font-semibold transition-all ${walletProvider === w.id ? 'border-zinc-900 bg-zinc-900 text-white' : `${w.color} hover:opacity-80`}`}>
                        {w.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-700">Linked Phone Number</label>
                  <input type="tel" value={walletPhone} onChange={(e) => setWalletPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="10-digit mobile number"
                    className="w-full rounded-lg border border-zinc-200 bg-white p-3 text-sm font-medium focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 outline-none transition-all" />
                </div>
              </div>
            )}

            <div className="flex gap-2 mt-6">
              <button onClick={resetForm}
                className="flex-1 rounded-lg border border-zinc-200 py-3 text-sm font-semibold text-zinc-600 transition-all hover:bg-zinc-50 active:scale-[0.98]">
                Cancel
              </button>
              <button onClick={handleAdd} disabled={saving}
                className="flex-[2] flex items-center justify-center gap-2 rounded-lg bg-zinc-900 py-3 text-sm font-semibold text-white transition-all hover:bg-zinc-800 active:scale-[0.98] disabled:opacity-50 shadow-sm">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <><CheckCircle2 size={16} /> Save Payment Method</>}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
