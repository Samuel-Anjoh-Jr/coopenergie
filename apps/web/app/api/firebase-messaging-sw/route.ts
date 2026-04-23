export const dynamic = "force-dynamic";

function value(name: string) {
  return process.env[name] ?? "";
}

export async function GET() {
  const script = `importScripts("https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: ${JSON.stringify(value("NEXT_PUBLIC_FIREBASE_API_KEY"))},
  authDomain: ${JSON.stringify(value("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"))},
  projectId: ${JSON.stringify(value("NEXT_PUBLIC_FIREBASE_PROJECT_ID"))},
  storageBucket: ${JSON.stringify(value("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"))},
  messagingSenderId: ${JSON.stringify(value("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"))},
  appId: ${JSON.stringify(value("NEXT_PUBLIC_FIREBASE_APP_ID"))},
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
`;

  return new Response(script, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
      "Service-Worker-Allowed": "/",
    },
  });
}