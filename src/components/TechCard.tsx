import React from 'react';
import { Star, MapPin, ShieldCheck, Briefcase } from 'lucide-react';
import { Technician } from '../types';
import { motion } from 'motion/react';

interface TechCardProps {
  technician: Technician;
  distance?: number;
  onBook: (tech: Technician) => void;
}

const TechCard: React.FC<TechCardProps> = ({ technician, distance, onBook }) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="group relative flex flex-col overflow-hidden rounded-[32px] border border-zinc-100 bg-white p-6 transition-all duration-500 hover:border-zinc-200 hover:shadow-[0_20px_50px_rgba(0,0,0,0.05)]"
    >
      <div className="mb-6 flex items-start justify-between">
        <div className="flex gap-4">
          <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-2xl bg-zinc-50 border border-zinc-100">
            <img
              src={`https://picsum.photos/seed/${technician.id}/200/200`}
              alt={technician.name}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
              referrerPolicy="no-referrer"
            />
            {technician.online && (
              <div className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-4 border-white ${technician.isBusy ? 'bg-amber-400' : 'bg-emerald-400'}`} />
            )}
          </div>
          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-zinc-900 tracking-tight">{technician.name}</h3>
              {technician.verified && (
                <ShieldCheck size={16} className="text-blue-500" aria-label="Verified" />
              )}
            </div>
            <div className="mt-1 flex items-center gap-2 text-sm text-zinc-500 font-medium">
              <div className="flex items-center gap-1">
                <Star size={14} className="fill-amber-400 text-amber-400" />
                <span className="text-zinc-900 font-bold">{technician.rating?.toFixed(1) || 'New'}</span>
                <span className="text-zinc-400">({technician.totalJobs || 0} jobs)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <div className="flex items-center gap-1.5 rounded-full bg-zinc-50 px-3 py-1.5 border border-zinc-100">
          <Briefcase size={12} className="text-zinc-400" />
          <span className="text-xs font-bold text-zinc-600">{technician.experience || 0}y Exp</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-zinc-50 px-3 py-1.5 border border-zinc-100">
          <MapPin size={12} className="text-zinc-400" />
          <span className="text-xs font-bold text-zinc-600">{distance?.toFixed(1) || '?'} km away</span>
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between pt-6 border-t border-zinc-50">
        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Base Price</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-zinc-900">₹{technician.basePrice}</span>
          </div>
        </div>
        <button
          onClick={() => onBook(technician)}
          disabled={technician.isBusy}
          className={`rounded-full px-8 py-3 text-sm font-black uppercase tracking-widest transition-all duration-300 active:scale-[0.95] ${
            technician.isBusy 
              ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed' 
              : 'bg-zinc-900 text-white hover:bg-zinc-800 shadow-xl shadow-zinc-200'
          }`}
        >
          {technician.isBusy ? 'Busy' : 'Book'}
        </button>
      </div>
    </motion.div>
  );
};

export default TechCard;
