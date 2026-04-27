import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, GripHorizontal, Star, Loader2 } from 'lucide-react';
import { db, addDoc, collection, Timestamp, handleFirestoreError, OperationType, updateDoc, doc } from '../firebase';
import { Booking } from '../types';
import toast from 'react-hot-toast';

interface ReviewModalProps {
  booking: Booking;
  onClose: () => void;
}

export default function ReviewModal({ booking, onClose }: ReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    setIsSubmitting(true);
    try {
      const reviewData = {
        bookingId: booking.id,
        technicianId: booking.technicianId,
        userId: booking.userId,
        rating,
        comment: comment.trim(),
        createdAt: Timestamp.now(),
      };

      await addDoc(collection(db, 'reviews'), reviewData);
      
      // Update booking to mark as hasFeedback
      await updateDoc(doc(db, 'bookings', booking.id), {
        hasFeedback: true
      });

      toast.success('Thank you for your feedback!');
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'reviews');
      toast.error('Failed to submit feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
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
          className="relative w-full max-w-md overflow-hidden rounded-xl bg-white p-6 shadow-xl border border-zinc-200"
        >
          <div className="flex items-center justify-between mb-5 cursor-grab active:cursor-grabbing bg-zinc-50/80 backdrop-blur-md -m-6 p-5 mb-6 select-none border-b border-zinc-100">
            <div className="flex items-center gap-2 pointer-events-none">
              <GripHorizontal size={16} className="text-zinc-400" />
              <h3 className="text-base font-semibold text-zinc-900 tracking-tight">Leave Feedback</h3>
            </div>
            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-900 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
          
          <p className="text-zinc-600 text-sm mb-5 leading-relaxed">
            How was your <span className="font-semibold text-zinc-900 capitalize">{booking.category}</span> service? Your feedback helps us improve.
          </p>

          <div className="mb-6 flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className="transition-transform hover:scale-110 focus:outline-none"
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(star)}
              >
                <Star
                  size={36}
                  className={`transition-colors ${
                    star <= (hoverRating || rating)
                      ? 'fill-amber-400 text-amber-400 drop-shadow-sm'
                      : 'fill-zinc-100 text-zinc-200'
                  }`}
                />
              </button>
            ))}
          </div>

          <div className="mb-6 space-y-2">
            <label className="text-xs font-semibold text-zinc-700">Add a comment (optional)</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell us about your experience..."
              className="w-full min-h-[100px] rounded-lg border border-zinc-200 bg-white p-3 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all resize-none"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 rounded-lg border border-zinc-200 py-2.5 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors active:scale-[0.98]"
            >
              Skip
            </button>
            <button
              disabled={isSubmitting || rating === 0}
              onClick={handleSubmit}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-all disabled:opacity-50 active:scale-[0.98] shadow-sm"
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : 'Submit'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
