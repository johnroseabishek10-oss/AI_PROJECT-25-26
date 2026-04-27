import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Home from './pages/Home';
import BookingsHistory from './pages/BookingsHistory';
import Tracking from './pages/Tracking';
import Profile from './pages/Profile';
import Login from './pages/Login';
import TechnicianDashboard from './pages/TechnicianDashboard';
import PaymentMethods from './pages/PaymentMethods';
import NotificationManager from './components/NotificationManager';
import { Toaster } from 'react-hot-toast';
import { useEffect, useState } from 'react';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { isNative } from './utils/platform';
import { auth, db, doc, onSnapshot } from './firebase';
import { useAuthState } from 'react-firebase-hooks/auth';

export default function App() {
  const [user, loadingAuth] = useAuthState(auth);
  const [role, setRole] = useState<string | null>(null);
  const [loadingRole, setLoadingRole] = useState(true);

  useEffect(() => {
    if (isNative()) {
      StatusBar.setStyle({ style: Style.Light });
      SplashScreen.hide();
    }
  }, []);

  useEffect(() => {
    if (loadingAuth) return;
    
    if (!user) {
      setRole(null);
      setLoadingRole(false);
      return;
    }

    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        setRole(docSnap.data().role);
      } else {
        setRole(null);
      }
      setLoadingRole(false);
    }, (error) => {
      console.error('Error fetching role:', error);
      setLoadingRole(false);
    });

    return () => unsubscribe();
  }, [user, loadingAuth]);

  if (loadingAuth || (user && loadingRole)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-900" />
          <p className="text-xs font-black uppercase tracking-widest text-zinc-400">Loading Session...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className={`min-h-screen font-sans antialiased transition-colors duration-500 ${
        role === 'technician' ? 'bg-zinc-950 text-white' : 'bg-zinc-50 text-zinc-900'
      }`}>
        <Header />
        <NotificationManager />
        <Routes>
          <Route path="/login" element={!user || !role ? <Login /> : <Navigate to={role === 'technician' ? '/technician-dashboard' : '/'} />} />
          <Route path="/" element={user && role ? (role === 'technician' ? <Navigate to="/technician-dashboard" /> : <Home />) : <Navigate to="/login" />} />
          <Route path="/history" element={user && role ? <BookingsHistory /> : <Navigate to="/login" />} />
          <Route path="/tracking/:bookingId" element={user && role ? <Tracking /> : <Navigate to="/login" />} />
          <Route path="/profile" element={user && role ? <Profile /> : <Navigate to="/login" />} />
          <Route path="/payment-methods" element={user && role ? <PaymentMethods /> : <Navigate to="/login" />} />
          <Route path="/technician-dashboard" element={user && role === 'technician' ? <TechnicianDashboard /> : <Navigate to="/login" />} />
        </Routes>
        <Toaster position="bottom-right" />
      </div>
    </Router>
  );
}
