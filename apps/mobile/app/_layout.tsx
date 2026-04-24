import { Stack } from "expo-router";
import "../global.css";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { ApolloProvider } from "@apollo/client/react";
import { useEffect } from "react";

import { apolloClient } from "@/lib/apollo";
import { useNetworkStatus } from "@/lib/offline/network-monitor";
import { createTables } from "@/lib/offline/db";
import { startSync } from "@/lib/sync/sync-engine";

export default function RootLayout() {
  useNetworkStatus();

  useEffect(() => {
    void createTables();
    startSync();
  }, []);

  return (
    <SafeAreaProvider>
      <ApolloProvider client={apolloClient}>
        <StatusBar style="light" backgroundColor="#1B5E20" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: "#1B5E20" },
            headerTintColor: "#F4FBF4",
            contentStyle: { backgroundColor: "#F5F8F5" },
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(dashboard)" options={{ headerShown: false }} />
        </Stack>
      </ApolloProvider>
    </SafeAreaProvider>
  );
}
