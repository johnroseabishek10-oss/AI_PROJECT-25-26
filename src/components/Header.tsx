import { auth, db, doc, getDoc, logout } from '../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Link, useNavigate } from 'react-router-dom';
import { Wrench, LogOut, User, History, LayoutDashboard } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function Header() {
  const [user] = useAuthState(auth);
  const [role, setRole] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      setRole(null);
      return;
    }

    const fetchRole = async () => {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        setRole(userDoc.data().role);
      }
    };
    fetchRole();
  }, [user]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <header className={`sticky top-0 z-50 w-full border-b transition-colors duration-300 ${
      role === 'technician' 
        ? 'border-zinc-800 bg-zinc-950 text-white' 
        : 'border-zinc-200 bg-white/90 backdrop-blur-xl text-zinc-900'
    }`}>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg shadow-sm ${
            role === 'technician' ? 'bg-emerald-500 text-zinc-950' : 'bg-zinc-900 text-white'
          }`}>
            <Wrench size={16} />
          </div>
          <div className="flex items-baseline gap-1">
            <span className={`text-xl font-bold tracking-tight ${
              role === 'technician' ? 'text-white' : 'text-zinc-900'
            }`}>
              {role === 'technician' ? 'Control' : 'FixIt'}
            </span>
            <span className={`text-xs font-semibold tracking-wide ${
              role === 'technician' ? 'text-emerald-500 uppercase italic' : 'text-emerald-600'
            }`}>
              {role === 'technician' ? 'Center' : 'Pro'}
            </span>
          </div>
        </Link>

        <nav className="flex items-center gap-6">
          {user ? (
            <div className="flex items-center gap-6">
              {role === 'technician' ? (
                <Link
                  to="/technician-dashboard"
                  className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400 transition-colors hover:text-white"
                >
                  <LayoutDashboard size={14} />
                  <span className="hidden sm:inline">System Dashboard</span>
                </Link>
              ) : (
                <Link
                  to="/history"
                  className="flex items-center gap-2 text-sm font-bold text-zinc-600 transition-colors hover:text-zinc-900"
                >
                  <History size={16} />
                  <span className="hidden sm:inline">Bookings</span>
                </Link>
              )}
              
              <div className={`h-4 w-px ${role === 'technician' ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
              
              <div className="flex items-center gap-4">
                <Link to="/profile" className="flex items-center gap-3 transition-opacity hover:opacity-80">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'User'}
                      className={`h-8 w-8 rounded-lg object-cover ${
                        role === 'technician' ? 'border-zinc-800' : 'border-zinc-200'
                      }`}
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg border ${
                      role === 'technician' 
                        ? 'bg-zinc-900 text-zinc-400 border-zinc-800' 
                        : 'bg-zinc-100 text-zinc-600 border-zinc-200'
                    }`}>
                      <User size={14} />
                    </div>
                  )}
                  <span className={`hidden text-sm font-bold sm:block ${
                    role === 'technician' ? 'text-zinc-300' : 'text-zinc-700'
                  }`}>
                    {user.displayName?.split(' ')[0]}
                  </span>
                </Link>
                
                <button
                  onClick={handleLogout}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                    role === 'technician' 
                      ? 'text-zinc-500 hover:bg-zinc-900 hover:text-white' 
                      : 'text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900'
                  }`}
                  title="Logout"
                >
                  <LogOut size={14} />
                </button>
              </div>
            </div>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
