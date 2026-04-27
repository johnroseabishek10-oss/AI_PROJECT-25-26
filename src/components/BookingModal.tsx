import { X, Calendar, Clock, MapPin, CheckCircle2, Loader2, Info, GripHorizontal, Navigation, CreditCard, Wallet, Banknote } from 'lucide-react';
import { Technician } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect, useMemo } from 'react';
import { auth, db, addDoc, collection, Timestamp, handleFirestoreError, OperationType, query, where, getDocs, getDoc, doc } from '../firebase';
import { detectFakeCustomer } from '../services/aiService';
import toast from 'react-hot-toast';

interface BookingModalProps {
  technician: Technician | null;
  onClose: () => void;
  onSuccess: () => void;
  userLocation?: { lat: number; lng: number };
  distance?: number;
}

const TIME_SLOTS = [
  '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'
];

const DISTANCE_RATE = 15; // ₹15 per km

export default function BookingModal({ technician, onClose, onSuccess, userLocation, distance }: BookingModalProps) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'Online Payment' | 'Cash on Delivery'>('Online Payment');
  const [step, setStep] = useState<'details' | 'payment' | 'confirm' | 'success'>('details');

  const estimatedTotal = useMemo(() => {
    if (!technician) return 0;
    return technician.basePrice;
  }, [technician]);

  const companyFee = useMemo(() => {
    return Math.round(estimatedTotal * 0.10);
  }, [estimatedTotal]);

  const technicianEarnings = useMemo(() => {
    return estimatedTotal - companyFee;
  }, [estimatedTotal, companyFee]);

  const estimatedTravelTime = useMemo(() => {
    if (!distance) return 0;
    // Assume 20km/h average speed in city traffic
    const travelTimeMinutes = Math.round((distance / 20) * 60);
    return travelTimeMinutes + 10; // 10 mins buffer for preparation/traffic
  }, [distance]);

  const isToday = useMemo(() => {
    if (!date) return false;
    const today = new Date().toISOString().split('T')[0];
    return date === today;
  }, [date]);

  useEffect(() => {
    const fetchUserData = async () => {
      if (auth.currentUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            if (data.address) setAddress(data.address);
            if (data.phone) setPhone(data.phone);
          }
        } catch (error) {
          console.error("Error fetching user data", error);
        }
      }
    };
    fetchUserData();
  }, []);

  useEffect(() => {
    if (date && technician) {
      fetchAvailability();
    }
  }, [date, technician]);

  const fetchAvailability = async () => {
    if (!date || !technician) return;
    setCheckingAvailability(true);
    try {
      const q = query(
        collection(db, 'bookings'),
        where('technicianId', '==', technician.id),
        where('date', '==', date),
        where('status', '!=', 'cancelled')
      );
      const snapshot = await getDocs(q);
      const booked = snapshot.docs.map(doc => doc.data().time);
      setBookedSlots(booked);
      // Reset time if it's now booked
      if (booked.includes(time)) {
        setTime('');
      }
    } catch (error) {
      console.error('Error fetching availability:', error);
    } finally {
      setCheckingAvailability(false);
    }
  };

  if (!technician) return null;

  const saveBookingToFirebase = async (paymentId?: string) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser!.uid));
      const userData = userDoc.exists() ? userDoc.data() : {};

      const fakeCheck = await detectFakeCustomer({
        userName: userData.name || auth.currentUser!.displayName || 'Unknown',
        userEmail: userData.email || auth.currentUser!.email || 'Unknown',
        userPhone: userData.phone,
        address: userData.address,
        category: technician.category,
        date,
        time,
        distance: distance || 0,
      });

      if (fakeCheck.isFake) {
        toast.error(`Booking flagged as suspicious: ${fakeCheck.reason}`);
      }

      const bookingData = {
        userId: auth.currentUser!.uid,
        technicianId: technician.id,
        category: technician.category,
        date,
        time,
        address,
        phone,
        status: 'pending',
        price: estimatedTotal,
        companyFee,
        technicianEarnings,
        distance: distance || 0,
        paymentStatus: paymentId ? 'paid' : 'pending',
        paymentMethod,
        razorpayPaymentId: paymentId || null,
        isFake: fakeCheck.isFake,
        fakeReason: fakeCheck.reason,
        createdAt: Timestamp.now(),
      };

      await addDoc(collection(db, 'bookings'), bookingData);
      setStep('success');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'bookings');
    } finally {
      setLoading(false);
      setPaymentProcessing(false);
    }
  };

  const handleBooking = async () => {
    if (!auth.currentUser) return;
    
    setLoading(true);

    if (paymentMethod === 'Online Payment') {
      setPaymentProcessing(true);
      
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: estimatedTotal * 100, // Amount is in currency subunits.
        currency: 'INR',
        name: 'FixIt Near Me',
        description: `Booking for ${technician.category}`,
        image: 'https://picsum.photos/100/100',
        handler: async function (response: any) {
          try {
             await saveBookingToFirebase(response.razorpay_payment_id);
          } catch(e) {
             console.error(e);
             toast.error('Failed to save booking.');
             setLoading(false);
             setPaymentProcessing(false);
          }
        },
        prefill: {
          name: auth.currentUser.displayName || '',
          email: auth.currentUser.email || '',
          contact: phone,
        },
        theme: {
          color: '#059669', // Emerald 600
        },
        modal: {
          ondismiss: function() {
            setPaymentProcessing(false);
            setLoading(false);
          }
        }
      };
      
      const rzp1 = new (window as any).Razorpay(options);
      rzp1.on('payment.failed', function (response: any){
         toast.error(`Payment Failed: ${response.error.description}`);
         setPaymentProcessing(false);
         setLoading(false);
      });
      rzp1.open();
    } else {
       await saveBookingToFirebase();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
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
          className="relative w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-xl border border-zinc-200"
        >
          <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4 cursor-grab active:cursor-grabbing bg-zinc-50/80 select-none backdrop-blur-md">
            <div className="flex items-center gap-2">
              <GripHorizontal size={16} className="text-zinc-400" />
              <h2 className="text-base font-semibold text-zinc-900 pointer-events-none tracking-tight">
                {step === 'success' ? 'Booking Confirmed' : `Book ${technician.name}`}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-200 hover:text-zinc-900"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-5">
            {step === 'details' && (
              <div className="space-y-6">
                <div className="flex items-center gap-4 rounded-lg bg-zinc-50 border border-zinc-100 p-4">
                  <div className="h-12 w-12 overflow-hidden rounded-md bg-white shadow-sm border border-zinc-200">
                    <img
                      src={`https://picsum.photos/seed/${technician.id}/100/100`}
                      alt={technician.name}
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-zinc-500 mb-0.5">{technician.category}</p>
                    <p className="text-sm font-semibold text-zinc-900">Base Price: <span className="text-emerald-600">₹{technician.basePrice}</span></p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-700">1. Choose Date</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full rounded-lg border border-zinc-200 bg-white py-2.5 pl-10 pr-3 text-sm font-medium focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 outline-none transition-all"
                      />
                    </div>
                  </div>

                  {date && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-zinc-700">2. Available Slots</label>
                        {checkingAvailability && <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-400" />}
                      </div>
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                        {TIME_SLOTS.map((slot) => {
                          const isBooked = bookedSlots.includes(slot);
                          return (
                            <button
                              key={slot}
                              disabled={isBooked || checkingAvailability}
                              onClick={() => setTime(slot)}
                              className={`rounded-lg py-2 text-xs font-medium transition-all duration-200 ${
                                time === slot
                                  ? 'bg-zinc-900 text-white shadow-sm'
                                  : isBooked
                                  ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed opacity-50'
                                  : 'bg-zinc-50 text-zinc-600 border border-zinc-200 hover:border-zinc-400 hover:text-zinc-900'
                              }`}
                            >
                              {slot}
                            </button>
                          );
                        })}
                      </div>
                      {bookedSlots.length > 0 && !checkingAvailability && (
                        <p className="text-[11px] text-zinc-500">Some slots are already booked for this day.</p>
                      )}
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-700">3. Service Address</label>
                    <textarea
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Enter your full address"
                      className="w-full rounded-lg border border-zinc-200 bg-white p-3 text-sm font-medium focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 outline-none transition-all resize-none h-20"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-700">4. Phone Number</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Enter your phone number"
                      className="w-full rounded-lg border border-zinc-200 bg-white p-3 text-sm font-medium focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="rounded-lg bg-zinc-50 border border-zinc-100 p-4">
                  <div className="flex items-start gap-2.5">
                    <Info size={16} className="mt-0.5 text-zinc-400 shrink-0" />
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-zinc-900">Estimated Total: <span className="text-emerald-600">₹{estimatedTotal}</span></p>
                      <p className="text-xs text-zinc-500 leading-relaxed">
                        This is the base price for the service. Final price may vary based on actual work required.
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  disabled={!date || !time || !address.trim() || !phone.trim() || checkingAvailability}
                  onClick={() => setStep('payment')}
                  className="w-full rounded-lg bg-zinc-900 py-3 text-sm font-semibold text-white transition-all hover:bg-zinc-800 disabled:opacity-50 disabled:hover:bg-zinc-900 active:scale-[0.98] shadow-sm"
                >
                  Continue to Payment
                </button>
              </div>
            )}

            {step === 'payment' && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-zinc-700">Select Payment Method</label>
                  <div className="space-y-2">
                    {[
                      { id: 'Online Payment', icon: CreditCard, label: 'Online Payment (Razorpay)' },
                      { id: 'Cash on Delivery', icon: Banknote, label: 'Cash on Delivery' },
                    ].map((method) => (
                      <button
                        key={method.id}
                        onClick={() => setPaymentMethod(method.id as any)}
                        className={`flex w-full items-center gap-3 rounded-lg border p-3 transition-all duration-200 ${
                          paymentMethod === method.id
                            ? 'border-zinc-900 bg-zinc-50 ring-1 ring-zinc-900'
                            : 'border-zinc-200 bg-white hover:border-zinc-300'
                        }`}
                      >
                        <div className={`flex h-10 w-10 items-center justify-center rounded-md transition-colors ${
                          paymentMethod === method.id ? 'bg-zinc-900 text-white shadow-sm' : 'bg-zinc-100 text-zinc-500'
                        }`}>
                          <method.icon size={18} />
                        </div>
                        <span className={`font-medium text-sm ${paymentMethod === method.id ? 'text-zinc-900' : 'text-zinc-700'}`}>
                          {method.label}
                        </span>
                        {paymentMethod === method.id && (
                          <div className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-white shadow-sm">
                            <CheckCircle2 size={12} />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setStep('details')}
                    className="flex-1 rounded-lg border border-zinc-200 py-3 text-sm font-semibold text-zinc-600 transition-all hover:bg-zinc-50 active:scale-[0.98]"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setStep('confirm')}
                    className="flex-[2] rounded-lg bg-zinc-900 py-3 text-sm font-semibold text-white transition-all hover:bg-zinc-800 active:scale-[0.98] shadow-sm"
                  >
                    Continue to Confirmation
                  </button>
                </div>
              </div>
            )}

            {step === 'confirm' && (
              <div className="space-y-6">
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-5 space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-zinc-500">Service</span>
                    <span className="font-semibold text-zinc-900">{technician.category}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-zinc-500">Professional</span>
                    <span className="font-semibold text-zinc-900">{technician.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-zinc-500">Date & Time</span>
                    <span className="font-semibold text-zinc-900">{new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} at {time}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-zinc-500">Address</span>
                    <span className="font-semibold text-zinc-900 text-right max-w-[60%] truncate">{address}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-zinc-500">Phone</span>
                    <span className="font-semibold text-zinc-900">{phone}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-zinc-500">Payment Method</span>
                    <span className="font-semibold text-zinc-900">{paymentMethod}</span>
                  </div>
                  {isToday && (
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-zinc-500">Est. Arrival Time</span>
                      <div className="flex items-center gap-1.5 font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                        <Navigation size={12} className="rotate-45" />
                        <span>~{estimatedTravelTime} mins</span>
                      </div>
                    </div>
                  )}
                  <div className="border-t border-zinc-200 pt-4 flex justify-between items-end">
                    <div className="space-y-0.5">
                      <span className="font-semibold text-zinc-900">Total Amount</span>
                      <p className="text-[11px] text-zinc-500">Incl. base price & travel fee</p>
                    </div>
                    <span className="text-xl font-bold text-emerald-600">₹{estimatedTotal}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setStep('payment')}
                    className="flex-1 rounded-lg border border-zinc-200 py-3 text-sm font-semibold text-zinc-600 transition-all hover:bg-zinc-50 active:scale-[0.98]"
                  >
                    Back
                  </button>
                  <button
                    disabled={loading}
                    onClick={handleBooking}
                    className="flex-[2] flex items-center justify-center gap-2 rounded-lg bg-emerald-600 py-3 text-sm font-semibold text-white transition-all hover:bg-emerald-700 active:scale-[0.98] shadow-sm"
                  >
                    {paymentProcessing ? (
                      <>
                        <Loader2 className="animate-spin" size={20} />
                        <span>Processing Payment...</span>
                      </>
                    ) : loading ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : (
                      'Confirm Booking'
                    )}
                  </button>
                </div>
              </div>
            )}

            {step === 'success' && (
              <div className="py-8 text-center space-y-5">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <CheckCircle2 size={40} />
                </div>
                <div>
                  <h3 className="text-2xl font-semibold text-zinc-900 tracking-tight">Awesome!</h3>
                  <p className="mt-2 text-sm text-zinc-500">Your booking request has been sent to <span className="font-semibold text-zinc-900">{technician.name}</span>.</p>
                  {isToday && (
                    <div className="mt-5 inline-flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-100 px-4 py-2.5 text-sm font-medium text-emerald-700">
                      <Clock size={16} />
                      <span>Estimated arrival in {estimatedTravelTime} mins</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
