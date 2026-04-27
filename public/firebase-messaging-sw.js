importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyALfh4kEwXjeGwkp_uXZIkPzGt2h18ds0w",
  authDomain: "gen-lang-client-0264555127.firebaseapp.com",
  projectId: "gen-lang-client-0264555127",
  storageBucket: "gen-lang-client-0264555127.firebasestorage.app",
  messagingSenderId: "468727272740",
  appId: "1:468727272740:web:b8bec4788ccb6272938fb1"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/favicon.ico'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
