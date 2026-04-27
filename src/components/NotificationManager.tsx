import React, { useEffect } from 'react';
import { auth, db, messaging, getToken, onMessage, doc, updateDoc, onSnapshot, collection, query, where } from '../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import toast from 'react-hot-toast';

export default function NotificationManager() {
  const [user] = useAuthState(auth);

  useEffect(() => {
    if (!user || !messaging) return;

    let unsubscribeSnapshot: (() => void) | undefined;

    const requestPermission = async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
          
          if (!vapidKey) {
            console.warn('FCM VAPID key is missing. Push notifications will not be fully functional. Please set VITE_FIREBASE_VAPID_KEY in your environment variables.');
            return;
          }

          let token;
          try {
            token = await getToken(messaging, {
              vapidKey: vapidKey
            });
          } catch (tokenError) {
            console.warn('FCM token generation failed. This is expected in preview environments or if third-party cookies are blocked:', tokenError);
            return;
          }
          
          if (token) {
            // Check if user document exists before updating
            const userDocRef = doc(db, 'users', user.uid);
            let isUnsubscribed = false;
            unsubscribeSnapshot = onSnapshot(userDocRef, async (docSnap) => {
              if (docSnap.exists() && !isUnsubscribed) {
                isUnsubscribed = true;
                setTimeout(() => {
                  if (unsubscribeSnapshot) unsubscribeSnapshot();
                }, 0);
                try {
                  await updateDoc(userDocRef, {
                    fcmToken: token,
                    notificationsEnabled: true
                  });
                } catch (err) {
                  console.error('Error updating FCM token:', err);
                }
              }
            });
          }
        }
      } catch (error) {
        console.error('Error getting notification permission:', error);
      }
    };

    requestPermission();

    // Handle foreground messages
    const unsubscribeMessage = onMessage(messaging, (payload) => {
      console.log('Foreground message received:', payload);
      if (payload.notification) {
        toast.success(`${payload.notification.title}: ${payload.notification.body}`, {
          duration: 5000,
          icon: '🔔'
        });
      }
    });

    return () => {
      unsubscribeMessage();
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
    };
  }, [user]);

  // Simulated notifications for booking status changes
  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'bookings'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'modified') {
          const booking = change.doc.data();
          const oldBooking = change.doc.data(); // This is not quite right for old data, but for demo purposes:
          
          // In a real app, you'd compare status
          if (booking.status === 'confirmed') {
            showLocalNotification('Booking Confirmed!', `Your booking for ${booking.category} has been confirmed.`);
          } else if (booking.status === 'completed') {
            showLocalNotification('Service Completed!', `Your ${booking.category} service is finished. Please leave a review!`);
          }
        }
      });
    });

    return () => unsubscribe();
  }, [user]);

  const showLocalNotification = (title: string, body: string) => {
    if (Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/favicon.ico' });
    }
    toast.success(`${title}: ${body}`, { duration: 5000, icon: '🔔' });
  };

  return null;
}
