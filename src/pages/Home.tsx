import { useState, useEffect, useMemo } from 'react';
import { Search, MapPin, Loader2, Zap, Droplets, ThermometerSnowflake, Refrigerator, LayoutGrid, Map as MapIcon } from 'lucide-react';
import { db, collection, onSnapshot, query, where, handleFirestoreError, OperationType, auth } from '../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Technician, UserLocation } from '../types';
import { haversine } from '../utils/haversine';
import TechCard from '../components/TechCard';
import BookingModal from '../components/BookingModal';
import TechnicianMap from '../components/TechnicianMap';
import AIAssistant from '../components/AIAssistant';
import { motion, AnimatePresence } from 'motion/react';

const CATEGORIES = [
  { id: 'all', name: 'All Services', icon: LayoutGrid },
  { id: 'electrician', name: 'Electrician', icon: Zap },
  { id: 'plumber', name: 'Plumber', icon: Droplets },
  { id: 'ac', name: 'AC Repair', icon: ThermometerSnowflake },
  { id: 'fridge', name: 'Fridge Repair', icon: Refrigerator },
];

export default function Home() {
  const [user] = useAuthState(auth);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [selectedTech, setSelectedTech] = useState<Technician | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');

  // Get user location
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        (err) => {
          console.error('Geolocation error:', err);
          // Fallback to a default location (e.g., Mumbai)
          setUserLocation({ lat: 19.0760, lng: 72.8777 });
        }
      );
    }
  }, []);

  // Fetch technicians
  useEffect(() => {
    const q = query(collection(db, 'technicians'), where('online', '==', true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const techs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Technician[];
      
      if (techs.length === 0) {
        setLoading(false);
      } else {
        setTechnicians(techs);
        setLoading(false);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'technicians');
    });

    return () => unsubscribe();
  }, [user]);

  const filteredTechs = useMemo((): (Technician & { distance: number })[] => {
    return technicians
      .filter(tech => {
        const matchesCategory = selectedCategory === 'all' || tech.category === selectedCategory;
        const matchesSearch = tech.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            tech.category.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
      })
      .map(tech => ({
        ...tech,
        distance: userLocation ? haversine(userLocation.lat, userLocation.lng, tech.location.lat, tech.location.lng) : 0
      }))
      .sort((a, b) => (a.distance || 0) - (b.distance || 0));
  }, [technicians, selectedCategory, searchQuery, userLocation]);

  return (
    <div className="min-h-screen bg-zinc-50 pb-20">
      {/* Hero Section */}
      <section className="relative bg-white py-24 text-zinc-900 sm:py-32 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000005_1px,transparent_1px),linear-gradient(to_bottom,#00000005_1px,transparent_1px)] bg-[size:40px_40px]" />
          <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-emerald-50 blur-3xl opacity-50" />
          <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-blue-50 blur-3xl opacity-50" />
        </div>
        
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-8 rounded-full bg-zinc-100 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 border border-zinc-200"
            >
              Verified Home Services
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-4xl text-5xl font-black tracking-tighter sm:text-8xl leading-[0.9]"
            >
              Your home, <br className="hidden sm:block" />
              <span className="text-emerald-500 italic">perfectly</span> handled.
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-8 max-w-xl text-lg text-zinc-500 font-medium leading-relaxed"
            >
              Connect with local experts for everything from quick fixes to major renovations. Simple, transparent, and trusted.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-12 flex w-full max-w-3xl flex-col gap-4 sm:flex-row p-2 bg-white rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.08)] border border-zinc-100"
            >
              <div className="relative flex-1">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-300" size={20} />
                <input
                  type="text"
                  placeholder="What do you need help with?"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-16 w-full rounded-[24px] bg-zinc-50 pl-14 pr-6 text-zinc-900 placeholder:text-zinc-400 border-none outline-none transition-all focus:bg-zinc-100 text-sm font-bold"
                />
              </div>
              <div className="flex h-16 items-center gap-4 rounded-[24px] bg-zinc-50 px-6 border-none">
                <MapPin size={20} className="text-emerald-500" />
                <div className="text-left">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Location</p>
                  <p className="text-sm font-bold text-zinc-900">
                    {userLocation ? 'Mumbai, India' : 'Detecting...'}
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Categories Bar */}
      <div className="sticky top-16 z-40 border-b border-zinc-100 bg-white/80 backdrop-blur-2xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 overflow-x-auto py-6 scrollbar-hide">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex flex-shrink-0 items-center gap-2 rounded-full px-6 py-3 text-xs font-black uppercase tracking-widest transition-all duration-300 ${
                  selectedCategory === cat.id
                    ? 'bg-zinc-900 text-white shadow-xl shadow-zinc-200'
                    : 'bg-zinc-50 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 border border-zinc-100'
                }`}
              >
                <cat.icon size={14} />
                <span>{cat.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="mx-auto mt-16 max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* How it Works */}
        <section className="mb-24 grid grid-cols-1 gap-12 sm:grid-cols-3">
          {[
            { step: '01', title: 'Choose Service', desc: 'Select from our verified list of home experts.' },
            { step: '02', title: 'Pick a Time', desc: 'Schedule a visit that fits your busy lifestyle.' },
            { step: '03', title: 'Get it Fixed', desc: 'Relax while our pros handle the rest.' },
          ].map((item) => (
            <div key={item.step} className="group relative">
              <span className="text-6xl font-black text-zinc-100 transition-colors group-hover:text-emerald-50">{item.step}</span>
              <div className="absolute top-8 left-0">
                <h3 className="text-lg font-black uppercase tracking-tight text-zinc-900">{item.title}</h3>
                <p className="mt-1 text-sm text-zinc-500 font-medium">{item.desc}</p>
              </div>
            </div>
          ))}
        </section>

        <div className="mb-12 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Live Availability</span>
            </div>
            <h2 className="text-4xl font-black tracking-tighter text-zinc-900 uppercase italic">
              {selectedCategory === 'all' ? 'Top Professionals' : `${CATEGORIES.find(c => c.id === selectedCategory)?.name} Experts`}
            </h2>
          </div>
          
          <div className="flex items-center gap-1 rounded-full bg-zinc-100 p-1.5 border border-zinc-200">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-2 rounded-full px-5 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                viewMode === 'grid' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-400 hover:text-zinc-900'
              }`}
            >
              <LayoutGrid size={14} />
              <span>Grid</span>
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-2 rounded-full px-5 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                viewMode === 'map' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-400 hover:text-zinc-900'
              }`}
            >
              <MapIcon size={14} />
              <span>Map</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex h-64 flex-col items-center justify-center gap-4">
            <Loader2 className="animate-spin text-zinc-900" size={32} />
            <p className="text-sm font-medium text-zinc-500">Loading professionals...</p>
          </div>
        ) : filteredTechs.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <AnimatePresence mode="popLayout">
                {filteredTechs.map((tech) => (
                  <TechCard
                    key={tech.id}
                    technician={tech}
                    distance={tech.distance}
                    onBook={(t) => setSelectedTech(t)}
                  />
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm h-[600px]"
            >
              <TechnicianMap
                technicians={filteredTechs}
                userLocation={userLocation}
                onSelectTech={(t) => setSelectedTech(t)}
              />
            </motion.div>
          )
        ) : (
          <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-100 text-zinc-400 mb-4 border border-zinc-200">
              <Search size={20} />
            </div>
            <h3 className="text-base font-semibold text-zinc-900">No professionals found</h3>
            <p className="mt-1 text-sm text-zinc-500">Try adjusting your search or category filters.</p>
          </div>
        )}
      </main>

      <BookingModal
        technician={selectedTech}
        onClose={() => setSelectedTech(null)}
        onSuccess={() => {
          // Refresh or show success
        }}
        userLocation={userLocation || undefined}
        distance={selectedTech?.distance}
      />
      <AIAssistant userLocation={userLocation} />
    </div>
  );
}
