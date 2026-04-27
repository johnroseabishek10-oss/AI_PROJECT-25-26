import { useState, useEffect, useMemo } from 'react';
import { db, collection, query, where, orderBy, onSnapshot, auth, handleFirestoreError, OperationType, updateDoc, doc } from '../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Booking } from '../types';
import { Calendar, Clock, MapPin, CheckCircle2, Clock3, XCircle, AlertCircle, Loader2, History, Trash2, X, Navigation, GripHorizontal, Filter, ArrowUpDown, ChevronDown, Star, Phone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import ReviewModal from '../components/ReviewModal';

const CATEGORIES = [
  { id: 'all', name: 'All Services' },
  { id: 'electrician', name: 'Electrician' },
  { id: 'plumber', name: 'Plumber' },
  { id: 'ac', name: 'AC Repair' },
  { id: 'fridge', name: 'Fridge Repair' },
];

const STATUSES = [
  { id: 'all', name: 'All Statuses' },
  { id: 'pending', name: 'Pending' },
  { id: 'confirmed', name: 'Confirmed' },
  { id: 'completed', name: 'Completed' },
  { id: 'cancelled', name: 'Cancelled' },
];

export default function BookingsHistory() {
  const [user] = useAuthState(auth);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingBooking, setCancellingBooking] = useState<Booking | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  const [completingBooking, setCompletingBooking] = useState<Booking | null>(null);
  const [timeConsumed, setTimeConsumed] = useState<number>(1);
  const [isCompleting, setIsCompleting] = useState(false);

  const [reviewingBooking, setReviewingBooking] = useState<Booking | null>(null);

  // Filter and Sort State
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'bookings'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const bks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Booking[];
      setBookings(bks);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'bookings');
    });

    return () => unsubscribe();
  }, [user]);

  const handleCancelBooking = async () => {
    if (!cancellingBooking) return;
    if (!cancellationReason.trim()) {
      toast.error('Please provide a reason for cancellation');
      return;
    }
    setIsCancelling(true);
    try {
      await updateDoc(doc(db, 'bookings', cancellingBooking.id), {
        status: 'cancelled',
        cancellationReason: cancellationReason.trim()
      });
      toast.success('Booking cancelled successfully');
      setCancellingBooking(null);
      setCancellationReason('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `bookings/${cancellingBooking.id}`);
      toast.error('Failed to cancel booking');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleCompleteBooking = async () => {
    if (!completingBooking) return;
    if (timeConsumed <= 0) {
      toast.error('Please enter a valid time consumed');
      return;
    }
    setIsCompleting(true);
    try {
      // Calculate final cost: base price + (time * hourly rate)
      // Let's assume hourly rate is 200 for now.
      const hourlyRate = 200;
      const additionalTimeCost = Math.max(0, timeConsumed - 1) * hourlyRate; // first hour is included in base price
      const finalCost = completingBooking.price + additionalTimeCost;
      
      const companyFee = Math.round(finalCost * 0.10);
      const technicianEarnings = finalCost - companyFee;

      await updateDoc(doc(db, 'bookings', completingBooking.id), {
        status: 'completed',
        timeConsumed,
        finalCost,
        companyFee,
        technicianEarnings
      });
      toast.success('Service completed successfully');
      setCompletingBooking(null);
      setTimeConsumed(1);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `bookings/${completingBooking.id}`);
      toast.error('Failed to complete booking');
    } finally {
      setIsCompleting(false);
    }
  };

  const filteredAndSortedBookings = useMemo(() => {
    let result = [...bookings];

    // Filter by status
    if (statusFilter !== 'all') {
      result = result.filter(b => b.status === statusFilter);
    }

    // Filter by category
    if (categoryFilter !== 'all') {
      result = result.filter(b => b.category === categoryFilter);
    }

    // Sort by date (createdAt)
    result.sort((a, b) => {
      const dateA = a.createdAt?.toDate().getTime() || 0;
      const dateB = b.createdAt?.toDate().getTime() || 0;
      return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [bookings, statusFilter, categoryFilter, sortBy]);

  const statusIcons = {
    pending: { icon: Clock3, color: 'text-amber-600 bg-amber-50 border-amber-200' },
    confirmed: { icon: CheckCircle2, color: 'text-blue-600 bg-blue-50 border-blue-200' },
    completed: { icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    cancelled: { icon: XCircle, color: 'text-red-600 bg-red-50 border-red-200' },
  };

  if (!user) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center p-8 text-center">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-zinc-100 text-zinc-400 shadow-inner">
          <AlertCircle size={48} />
        </div>
        <h2 className="mt-6 text-3xl font-black text-zinc-900 tracking-tight">Sign in to view history</h2>
        <p className="mt-3 text-zinc-500 font-medium">You need to be logged in to see your booking history.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 py-12">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-md">
            <History size={24} />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900">My Bookings</h1>
            <p className="text-zinc-500 text-sm mt-1">Track your service requests and repair history.</p>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-all duration-200 ${
              showFilters || statusFilter !== 'all' || categoryFilter !== 'all'
                ? 'border-zinc-900 bg-zinc-50 text-zinc-900 shadow-sm'
                : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:border-zinc-300'
            }`}
          >
            <Filter size={16} />
            <span>Filters</span>
            {(statusFilter !== 'all' || categoryFilter !== 'all') && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-[10px] text-white shadow-sm">
                {(statusFilter !== 'all' ? 1 : 0) + (categoryFilter !== 'all' ? 1 : 0)}
              </span>
            )}
          </button>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mb-10 overflow-hidden"
            >
              <div className="grid grid-cols-1 gap-4 rounded-xl border border-zinc-200 bg-white p-5 sm:grid-cols-3 shadow-sm">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-600">Status</label>
                  <div className="relative">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full appearance-none rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm font-medium text-zinc-700 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all"
                    >
                      {STATUSES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-600">Service Type</label>
                  <div className="relative">
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="w-full appearance-none rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm font-medium text-zinc-700 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all"
                    >
                      {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-600">Sort By Date</label>
                  <div className="relative">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest')}
                      className="w-full appearance-none rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm font-medium text-zinc-700 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all"
                    >
                      <option value="newest">Newest First</option>
                      <option value="oldest">Oldest First</option>
                    </select>
                    <ArrowUpDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="flex h-64 flex-col items-center justify-center gap-5">
            <Loader2 className="animate-spin text-zinc-900" size={48} />
            <p className="text-zinc-500 font-medium">Loading your history...</p>
          </div>
        ) : filteredAndSortedBookings.length > 0 ? (
          <div className="space-y-5">
            <AnimatePresence mode="popLayout">
              {filteredAndSortedBookings.map((booking) => {
                const StatusIcon = statusIcons[booking.status].icon;
                const canCancel = ['pending', 'confirmed'].includes(booking.status);
                const canTrack = ['pending', 'confirmed'].includes(booking.status);

                return (
                  <motion.div
                    key={booking.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="group relative overflow-hidden rounded-xl border border-zinc-200 bg-white p-6 transition-all duration-300 hover:border-zinc-300 hover:shadow-md"
                  >
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                      <div className="flex-1 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className={`rounded-md border px-3 py-1 text-xs font-semibold capitalize ${statusIcons[booking.status].color}`}>
                              {booking.status}
                            </span>
                            <span className="text-xs font-medium text-zinc-500">
                              Booked on {booking.createdAt?.toDate().toLocaleDateString()}
                            </span>
                          </div>
                              <div className="flex items-center gap-4">
                                <span className="text-xl font-bold text-zinc-900">₹{booking.price}</span>
                                <div className="flex items-center gap-2">
                                  {canTrack && (
                                    <Link
                                      to={`/tracking/${booking.id}`}
                                      className="flex items-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-zinc-800 hover:shadow-sm active:scale-95"
                                    >
                                      <Navigation size={14} className="rotate-45" />
                                      <span>Track Live</span>
                                    </Link>
                                  )}
                                  {booking.status === 'pending' && (
                                    <button
                                      onClick={async () => {
                                        try {
                                          await updateDoc(doc(db, 'bookings', booking.id), { status: 'confirmed' });
                                          toast.success('Simulated: Booking confirmed');
                                        } catch (e) { console.error(e); }
                                      }}
                                      className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-[11px] font-semibold text-blue-700 transition-all hover:bg-blue-100"
                                      title="Simulate Confirmation"
                                    >
                                      Simulate Confirm
                                    </button>
                                  )}
                                  {booking.status === 'confirmed' && (
                                    <button
                                      onClick={() => setCompletingBooking(booking)}
                                      className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-[11px] font-semibold text-emerald-700 transition-all hover:bg-emerald-100"
                                      title="Simulate Completion"
                                    >
                                      Simulate Complete
                                    </button>
                                  )}
                                  {booking.status === 'completed' && !booking.hasFeedback && (
                                    <button
                                      onClick={() => setReviewingBooking(booking)}
                                      className="flex items-center gap-1.5 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-[11px] font-semibold text-amber-700 transition-all hover:bg-amber-100"
                                      title="Leave Feedback"
                                    >
                                      <Star size={12} className="fill-amber-500" />
                                      Leave Feedback
                                    </button>
                                  )}
                                  {canCancel && (
                                    <button
                                      onClick={() => setCancellingBooking(booking)}
                                      className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600"
                                      title="Cancel Booking"
                                    >
                                      <Trash2 size={18} />
                                    </button>
                                  )}
                                </div>
                              </div>
                        </div>

                        <div className="flex flex-wrap gap-x-6 gap-y-3">
                          <div className="flex items-center gap-2 text-sm text-zinc-600">
                            <Calendar size={16} className="text-zinc-400" />
                            <span className="font-medium">{booking.date}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-zinc-600">
                            <Clock size={16} className="text-zinc-400" />
                            <span className="font-medium">{booking.time}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-zinc-600">
                            <MapPin size={16} className="text-zinc-400" />
                            <span className="font-medium capitalize">{booking.category} Service</span>
                          </div>
                          {booking.address && (
                            <div className="flex items-center gap-2 text-sm text-zinc-600 w-full">
                              <MapPin size={16} className="text-zinc-400 shrink-0" />
                              <span className="font-medium truncate">{booking.address}</span>
                            </div>
                          )}
                          {booking.phone && (
                            <div className="flex items-center gap-2 text-sm text-zinc-600">
                              <Phone size={16} className="text-zinc-400 shrink-0" />
                              <span className="font-medium">{booking.phone}</span>
                            </div>
                          )}
                          {booking.status === 'completed' && booking.timeConsumed && (
                            <div className="flex items-center gap-2 text-sm text-zinc-600">
                              <Clock3 size={16} className="text-zinc-400" />
                              <span className="font-medium">Time: {booking.timeConsumed} hr(s)</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 border-t border-zinc-100 pt-5 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${statusIcons[booking.status].color.replace('border', '').replace('text', 'text').replace('bg', 'bg')}`}>
                          <StatusIcon size={24} />
                        </div>
                        <div className="text-sm">
                          <p className="font-semibold text-zinc-900 capitalize text-base">{booking.status}</p>
                          <p className="text-zinc-500 text-xs mt-0.5">
                            {booking.paymentMethod ? `${booking.paymentMethod} • ` : ''}
                            {booking.paymentStatus}
                          </p>
                          {booking.status === 'completed' && booking.finalCost && (
                            <p className="mt-1 text-xs font-semibold text-emerald-600">
                              Final Cost: ₹{booking.finalCost}
                            </p>
                          )}
                          {booking.status === 'cancelled' && booking.cancellationReason && (
                            <p className="mt-1 text-xs text-red-500">
                              Reason: {booking.cancellationReason}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-zinc-50 text-zinc-400 border border-zinc-100">
              <History size={32} />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-zinc-900 tracking-tight">
              {statusFilter !== 'all' || categoryFilter !== 'all' ? 'No matching bookings' : 'No bookings yet'}
            </h3>
            <p className="mt-1 text-sm text-zinc-500">
              {statusFilter !== 'all' || categoryFilter !== 'all' 
                ? 'Try adjusting your filters to find what you are looking for.' 
                : 'Your repair history will appear here once you book a service.'}
            </p>
            {(statusFilter !== 'all' || categoryFilter !== 'all') && (
              <button
                onClick={() => { setStatusFilter('all'); setCategoryFilter('all'); }}
                className="mt-4 text-sm font-semibold text-zinc-900 hover:text-emerald-600 transition-colors"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {cancellingBooking && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setCancellingBooking(null); setCancellationReason(''); }}
              className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm"
            />
            <motion.div
              drag
              dragMomentum={false}
              dragElastic={0.05}
              whileDrag={{ scale: 1.02, boxShadow: "0 25px 50px -12px rgb(0 0 0 / 0.25)" }}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md overflow-hidden rounded-xl bg-white p-6 shadow-xl border border-zinc-200"
            >
              <div className="flex items-center justify-between mb-5 cursor-grab active:cursor-grabbing bg-zinc-50/80 backdrop-blur-md -m-6 p-5 mb-6 select-none border-b border-zinc-100">
                <div className="flex items-center gap-2 pointer-events-none">
                  <GripHorizontal size={16} className="text-zinc-400" />
                  <h3 className="text-base font-semibold text-zinc-900 tracking-tight">Cancel Booking</h3>
                </div>
                <button
                  onClick={() => { setCancellingBooking(null); setCancellationReason(''); }}
                  className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-900 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              
              <p className="text-zinc-600 text-sm mb-5 leading-relaxed">
                Are you sure you want to cancel your <span className="font-semibold text-zinc-900">{cancellingBooking.category}</span> service on <span className="font-semibold text-zinc-900">{cancellingBooking.date}</span>? This action cannot be undone.
              </p>

              <div className="mb-6 space-y-2">
                <label className="text-xs font-semibold text-zinc-700">Reason for cancellation</label>
                <textarea
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  placeholder="Tell us why you are cancelling..."
                  className="w-full min-h-[100px] rounded-lg border border-zinc-200 bg-white p-3 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all resize-none"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => { setCancellingBooking(null); setCancellationReason(''); }}
                  className="flex-1 rounded-lg border border-zinc-200 py-2.5 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors active:scale-[0.98]"
                >
                  Keep Booking
                </button>
                <button
                  disabled={isCancelling}
                  onClick={handleCancelBooking}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-all disabled:opacity-50 active:scale-[0.98] shadow-sm"
                >
                  {isCancelling ? <Loader2 className="animate-spin" size={16} /> : 'Yes, Cancel'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Completion Modal */}
      <AnimatePresence>
        {completingBooking && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setCompletingBooking(null); setTimeConsumed(1); }}
              className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm"
            />
            <motion.div
              drag
              dragMomentum={false}
              dragElastic={0.05}
              whileDrag={{ scale: 1.02, boxShadow: "0 25px 50px -12px rgb(0 0 0 / 0.25)" }}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md overflow-hidden rounded-xl bg-white p-6 shadow-xl border border-zinc-200"
            >
              <div className="flex items-center justify-between mb-5 cursor-grab active:cursor-grabbing bg-zinc-50/80 backdrop-blur-md -m-6 p-5 mb-6 select-none border-b border-zinc-100">
                <div className="flex items-center gap-2 pointer-events-none">
                  <GripHorizontal size={16} className="text-zinc-400" />
                  <h3 className="text-base font-semibold text-zinc-900 tracking-tight">Complete Service</h3>
                </div>
                <button
                  onClick={() => { setCompletingBooking(null); setTimeConsumed(1); }}
                  className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-900 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              
              <p className="text-zinc-600 text-sm mb-5 leading-relaxed">
                Simulate completing the <span className="font-semibold text-zinc-900">{completingBooking.category}</span> service. Enter the time consumed by the technician to calculate the final cost.
              </p>

              <div className="mb-6 space-y-2">
                <label className="text-xs font-semibold text-zinc-700">Time Consumed (Hours)</label>
                <input
                  type="number"
                  min="1"
                  step="0.5"
                  value={timeConsumed}
                  onChange={(e) => setTimeConsumed(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-lg border border-zinc-200 bg-white p-3 text-sm font-medium outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Base price covers the first hour. Additional hours are charged at ₹200/hr.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => { setCompletingBooking(null); setTimeConsumed(1); }}
                  className="flex-1 rounded-lg border border-zinc-200 py-2.5 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors active:scale-[0.98]"
                >
                  Cancel
                </button>
                <button
                  disabled={isCompleting}
                  onClick={handleCompleteBooking}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-all disabled:opacity-50 active:scale-[0.98] shadow-sm"
                >
                  {isCompleting ? <Loader2 className="animate-spin" size={16} /> : 'Complete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {reviewingBooking && (
        <ReviewModal
          booking={reviewingBooking}
          onClose={() => setReviewingBooking(null)}
        />
      )}
    </div>
  );
}
