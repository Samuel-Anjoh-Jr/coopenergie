import { getApps, initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const hasFirebaseConfig = Object.values(firebaseConfig).every(Boolean);

export const app = hasFirebaseConfig
  ? !getApps().length
    ? initializeApp(firebaseConfig)
    : getApps()[0]
  : null;

export async function requestNotificationPermission(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  if (!app) return null;
  if (!("Notification" in window)) return null;
  if (!("serviceWorker" in navigator)) return null;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  const registration =
    (await navigator.serviceWorker.getRegistration("/api/firebase-messaging-sw")) ??
    (await navigator.serviceWorker.getRegistration()) ??
    (await navigator.serviceWorker.ready.catch(() => null));

  if (!registration) return null;

  const messaging = getMessaging(app);
  const token = await getToken(messaging, {
    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: registration,
  });

  return token;
}

export function onForegroundMessage(callback: (payload: any) => void) {
  if (typeof window === "undefined") return () => {};
  if (!app) return () => {};

  const messaging = getMessaging(app);
  return onMessage(messaging, callback);
}