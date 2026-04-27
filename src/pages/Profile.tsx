import React, { useState, useEffect } from 'react';
import { auth, db, doc, getDoc, setDoc, handleFirestoreError, OperationType, serverTimestamp } from '../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { User, MapPin, Phone, Mail, Save, Loader2, ArrowLeft, Database, Sparkles, CreditCard, ChevronRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { motion } from 'motion/react';
import { seedDatabase } from '../utils/seedData';

export default function Profile() {
  const [user, loadingAuth] = useAuthState(auth);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [exists, setExists] = useState(false);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    email: '',
  });

  useEffect(() => {
    if (loadingAuth) return;
    if (!user) {
      navigate('/');
      return;
    }

    const fetchProfile = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setExists(true);
          const data = userDoc.data();
          setFormData({
            name: data.name || user.displayName || '',
            phone: data.phone || '',
            address: data.address || '',
            email: data.email || user.email || '',
          });
        } else {
          setExists(false);
          // Initialize with auth data if doc doesn't exist
          setFormData({
            name: user.displayName || '',
            phone: '',
            address: '',
            email: user.email || '',
          });
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user, loadingAuth, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    try {
      const updateData: any = {
        ...formData,
        role: 'user',
        updatedAt: serverTimestamp(),
      };

      if (!exists) {
        updateData.createdAt = serverTimestamp();
      }

      await setDoc(doc(db, 'users', user.uid), updateData, { merge: true });
      
      setExists(true);
      toast.success('Profile updated successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSeedData = async () => {
    setSeeding(true);
    try {
      const getUserLocation = () => new Promise<{lat: number, lng: number}>((resolve) => {
        if ('geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            () => resolve({ lat: 19.0760, lng: 72.8777 }) // Fallback to Mumbai
          );
        } else {
          resolve({ lat: 19.0760, lng: 72.8777 });
        }
      });
      
      const location = await getUserLocation();
      await seedDatabase(location);
      toast.success('Database seeded successfully!');
    } catch (error) {
      toast.error('Failed to seed database');
    } finally {
      setSeeding(false);
    }
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
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10 flex items-center gap-4"
      >
        <Link
          to="/"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-500 shadow-sm transition-all hover:bg-zinc-50 hover:text-zinc-900"
        >
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">My Profile</h1>
      </motion.div>

      <div className="grid gap-8 md:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="md:col-span-1"
        >
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-6 h-24 w-24 overflow-hidden rounded-xl border border-zinc-100 bg-zinc-50 shadow-sm">
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={formData.name}
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-zinc-400">
                  <User size={40} />
                </div>
              )}
            </div>
            <h2 className="text-xl font-bold text-zinc-900">{formData.name}</h2>
            <p className="mt-1 text-sm font-medium text-zinc-500">{formData.email}</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="md:col-span-2"
        >
          <form onSubmit={handleSubmit} className="space-y-8 rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
            <div className="space-y-6">
              <div>
                <label htmlFor="name" className="mb-2 block text-sm font-semibold text-zinc-700">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                  <input
                    id="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2.5 pl-11 pr-4 text-sm font-medium text-zinc-900 transition-all focus:border-zinc-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900"
                    placeholder="Enter your full name"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-semibold text-zinc-700">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                  <input
                    id="email"
                    type="email"
                    disabled
                    value={formData.email}
                    className="w-full cursor-not-allowed rounded-lg border border-zinc-200 bg-zinc-100 py-2.5 pl-11 pr-4 text-sm font-medium text-zinc-500"
                  />
                </div>
                <p className="mt-2 text-xs font-medium text-zinc-400">Email cannot be changed</p>
              </div>

              <div>
                <label htmlFor="phone" className="mb-2 block text-sm font-semibold text-zinc-700">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                  <input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2.5 pl-11 pr-4 text-sm font-medium text-zinc-900 transition-all focus:border-zinc-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900"
                    placeholder="Enter your phone number"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="address" className="mb-2 block text-sm font-semibold text-zinc-700">
                  Physical Address
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-3 text-zinc-400" size={18} />
                  <textarea
                    id="address"
                    rows={3}
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2.5 pl-11 pr-4 text-sm font-medium text-zinc-900 transition-all focus:border-zinc-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900"
                    placeholder="Enter your full address"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 py-2.5 text-sm font-semibold text-white transition-all hover:bg-zinc-800 active:scale-[0.98] disabled:opacity-50 shadow-sm"
            >
              {saving ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Save size={16} />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </form>

          {/* Payment Methods Link */}
          <Link
            to="/payment-methods"
            className="mt-6 flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-all hover:border-zinc-300 hover:shadow-md group"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
                <CreditCard size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-900">Payment Methods</p>
                <p className="text-xs text-zinc-500">Manage saved cards, UPI & wallets</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-zinc-400 transition-transform group-hover:translate-x-1" />
          </Link>

          {/* Admin Section */}
          {user?.email === 'ramanathan2007trt@gmail.com' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-6 space-y-4 rounded-xl border border-emerald-200 bg-emerald-50/50 p-6 shadow-sm"
            >
              <div className="flex items-center gap-2 text-emerald-800">
                <Database size={18} />
                <h3 className="text-base font-semibold tracking-tight">Admin Controls</h3>
              </div>
              <p className="text-sm font-medium text-emerald-700/80 leading-relaxed">
                Populate the database with mock technicians and service data for testing.
              </p>
              <button
                onClick={handleSeedData}
                disabled={seeding}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white transition-all hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50 shadow-sm"
              >
                {seeding ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>Seed Mock Data</span>
                  </>
                )}
              </button>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
