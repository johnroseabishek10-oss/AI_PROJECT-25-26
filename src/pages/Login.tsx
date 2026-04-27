import { useState, useEffect } from 'react';
import { auth, signInWithGoogle, db, doc, getDoc, setDoc, serverTimestamp, handleFirestoreError, OperationType } from '../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useNavigate } from 'react-router-dom';
import { Wrench, User, Briefcase, LogIn, Loader2, CheckCircle2, ArrowRight, Zap, Droplets, ThermometerSnowflake, Refrigerator } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';

export default function Login() {
  const [user, loadingAuth] = useAuthState(auth);
  const [step, setStep] = useState<'login' | 'role-selection' | 'tech-setup' | 'loading'>('login');
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('electrician');
  const navigate = useNavigate();

  const CATEGORIES = [
    { id: 'electrician', name: 'Electrician', icon: Zap },
    { id: 'plumber', name: 'Plumber', icon: Droplets },
    { id: 'ac', name: 'AC Repair', icon: ThermometerSnowflake },
    { id: 'fridge', name: 'Fridge Repair', icon: Refrigerator },
  ];

  useEffect(() => {
    if (loadingAuth) return;
    if (user) {
      checkUserProfile();
    }
  }, [user, loadingAuth]);

  const checkUserProfile = async () => {
    if (!user) return;
    setStep('loading');
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        // Clear pending role if user already exists
        localStorage.removeItem('pending_role');
        if (data.role === 'technician') {
          navigate('/technician-dashboard');
        } else {
          navigate('/');
        }
      } else {
        const pendingRole = localStorage.getItem('pending_role') as 'user' | 'technician' | null;
        if (pendingRole === 'technician') {
          setStep('tech-setup');
        } else if (pendingRole === 'user') {
          await createProfile('user');
        } else {
          setStep('role-selection');
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
      setStep('login');
    }
  };

  const handleGoogleLogin = async (role: 'user' | 'technician', forceSelect = false) => {
    setLoading(true);
    try {
      localStorage.setItem('pending_role', role);
      await signInWithGoogle(forceSelect);
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Failed to sign in with Google');
      setLoading(false);
    }
  };

  const selectRole = async (role: 'user' | 'technician') => {
    if (role === 'technician') {
      setStep('tech-setup');
    } else {
      await createProfile('user');
    }
  };

  const createProfile = async (role: 'user' | 'technician') => {
    if (!user) return;
    setLoading(true);
    try {
      const userData = {
        uid: user.uid,
        name: user.displayName || 'Anonymous User',
        email: user.email || '',
        role: role,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'users', user.uid), userData);

      if (role === 'technician') {
        await setDoc(doc(db, 'technicians', user.uid), {
          name: user.displayName || 'Anonymous Technician',
          email: user.email || '',
          category: selectedCategory,
          online: false,
          verified: false,
          basePrice: 500,
          location: { lat: 19.0760, lng: 72.8777 },
          createdAt: serverTimestamp(),
        });
        navigate('/technician-dashboard');
      } else {
        navigate('/');
      }
      toast.success(`Welcome to FixIt Pro! Profile created as ${role}.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
      toast.error('Failed to create profile');
    } finally {
      setLoading(false);
    }
  };

  if (loadingAuth || step === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-zinc-900" />
          <p className="text-sm font-bold text-zinc-500">Preparing your experience...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 text-white shadow-xl">
            <Wrench size={32} />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-zinc-900">FixIt Pro</h1>
          <p className="mt-2 text-sm font-bold text-zinc-500">Professional Home Services, On Demand.</p>
        </div>

        <AnimatePresence mode="wait">
          {step === 'login' ? (
            <motion.div
              key="login"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-xl">
                <h2 className="mb-6 text-center text-xl font-bold text-zinc-900 tracking-tight">Sign in to continue</h2>
                
                <div className="space-y-3">
                  <button
                    onClick={() => handleGoogleLogin('user')}
                    disabled={loading}
                    className="flex w-full items-center justify-center gap-3 rounded-xl border border-zinc-200 bg-white py-4 text-sm font-bold text-zinc-700 transition-all hover:bg-zinc-50 hover:border-zinc-300 active:scale-[0.98] shadow-sm"
                  >
                    {loading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="h-5 w-5" alt="Google" />
                        <span>Sign in as Customer</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleGoogleLogin('technician')}
                    disabled={loading}
                    className="flex w-full items-center justify-center gap-3 rounded-xl border border-zinc-900 bg-zinc-900 py-4 text-sm font-bold text-white transition-all hover:bg-zinc-800 active:scale-[0.98] shadow-sm"
                  >
                    {loading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <Briefcase size={18} />
                        <span>Sign in as Technician</span>
                      </>
                    )}
                  </button>

                  <div className="pt-2 text-center">
                    <button
                      onClick={() => handleGoogleLogin('user', true)}
                      disabled={loading}
                      className="text-xs font-bold text-zinc-400 hover:text-zinc-900 transition-colors"
                    >
                      Sign in with another Google account
                    </button>
                  </div>
                </div>
                
                <div className="mt-8 flex items-center gap-4">
                  <div className="h-px flex-1 bg-zinc-100" />
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Trust & Safety</span>
                  <div className="h-px flex-1 bg-zinc-100" />
                </div>
                
                <div className="mt-8 space-y-4">
                  {[
                    'Verified professionals only',
                    'Real-time live tracking',
                    'Secure digital payments',
                    '24/7 customer support'
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-3 text-sm font-bold text-zinc-500">
                      <CheckCircle2 size={16} className="text-emerald-500" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : step === 'role-selection' ? (
            <motion.div
              key="role-selection"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <h2 className="mb-6 text-center text-2xl font-black text-zinc-900 tracking-tight">How will you use FixIt Pro?</h2>
              
              <button
                onClick={() => selectRole('user')}
                disabled={loading}
                className="group flex w-full items-center gap-4 rounded-3xl border border-zinc-200 bg-white p-6 text-left transition-all hover:border-zinc-900 hover:shadow-xl active:scale-[0.98]"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-600 transition-colors group-hover:bg-zinc-900 group-hover:text-white">
                  <User size={28} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-zinc-900">I am a Customer</h3>
                  <p className="text-sm font-medium text-zinc-500">I want to book repair services for my home.</p>
                </div>
                <ArrowRight size={20} className="text-zinc-300 group-hover:text-zinc-900" />
              </button>

              <button
                onClick={() => selectRole('technician')}
                disabled={loading}
                className="group flex w-full items-center gap-4 rounded-3xl border border-zinc-200 bg-white p-6 text-left transition-all hover:border-zinc-900 hover:shadow-xl active:scale-[0.98]"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-600 transition-colors group-hover:bg-zinc-900 group-hover:text-white">
                  <Briefcase size={28} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-zinc-900">I am a Technician</h3>
                  <p className="text-sm font-medium text-zinc-500">I want to offer my services and find jobs.</p>
                </div>
                <ArrowRight size={20} className="text-zinc-300 group-hover:text-zinc-900" />
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="tech-setup"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-xl"
            >
              <h2 className="mb-6 text-center text-xl font-bold text-zinc-900 tracking-tight">Select your expertise</h2>
              <div className="grid grid-cols-2 gap-3">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`flex flex-col items-center gap-3 rounded-2xl border p-4 transition-all ${
                      selectedCategory === cat.id
                        ? 'border-zinc-900 bg-zinc-900 text-white shadow-md'
                        : 'border-zinc-100 bg-zinc-50 text-zinc-600 hover:border-zinc-200'
                    }`}
                  >
                    <cat.icon size={24} />
                    <span className="text-xs font-bold">{cat.name}</span>
                  </button>
                ))}
              </div>
              
              <button
                onClick={() => createProfile('technician')}
                disabled={loading}
                className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 py-4 text-sm font-bold text-white transition-all hover:bg-zinc-800 active:scale-[0.98] shadow-sm"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <span>Complete Setup</span>}
              </button>
              
              <button
                onClick={() => setStep('role-selection')}
                className="mt-4 w-full text-center text-xs font-bold text-zinc-400 hover:text-zinc-900"
              >
                Go back
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
