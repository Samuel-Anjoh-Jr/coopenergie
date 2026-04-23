importScripts("https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "NEXT_PUBLIC_FIREBASE_API_KEY_PLACEHOLDER",
  projectId: "NEXT_PUBLIC_FIREBASE_PROJECT_ID_PLACEHOLDER",
  messagingSenderId: "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID_PLACEHOLDER",
  appId: "NEXT_PUBLIC_FIREBASE_APP_ID_PLACEHOLDER",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload?.notification?.title ?? "CoopEnergie";
  const body = payload?.notification?.body ?? "";

  self.registration.showNotification(title, {
    body,
    icon: "/icon-light-32x32.png",
    badge: "/icon-dark-32x32.png",
    data: payload?.data,
  });
});