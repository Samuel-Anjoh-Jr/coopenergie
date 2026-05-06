import { Stack } from "expo-router";
import "../global.css";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { ApolloProvider } from "@apollo/client/react";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, ImageSourcePropType, View } from "react-native";

import { apolloClient } from "@/lib/apollo";
import { useNetworkStatus } from "@/lib/offline/network-monitor";
import { createTables } from "@/lib/offline/db";
import { startSync } from "@/lib/sync/sync-engine";

const LOGO_SOURCE = require("../assets/logo-full.png") as ImageSourcePropType;

export default function RootLayout() {
  useNetworkStatus();

  const [isReady, setIsReady] = useState(false);
  const logoScale = useRef(new Animated.Value(0.92)).current;
  const logoOpacity = useRef(new Animated.Value(0.7)).current;
  const barProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;

    const bootstrapApp = async () => {
      try {
        await createTables();
        startSync();
      } finally {
        setTimeout(() => {
          if (!cancelled) {
            setIsReady(true);
          }
        }, 900);
      }
    };

    void bootstrapApp();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const logoAnimation = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(logoScale, {
            toValue: 1,
            duration: 700,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(logoOpacity, {
            toValue: 1,
            duration: 700,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(logoScale, {
            toValue: 0.96,
            duration: 700,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(logoOpacity, {
            toValue: 0.84,
            duration: 700,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      ]),
    );

    const progressAnimation = Animated.loop(
      Animated.timing(barProgress, {
        toValue: 1,
        duration: 1400,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: false,
      }),
    );

    logoAnimation.start();
    progressAnimation.start();

    return () => {
      logoAnimation.stop();
      progressAnimation.stop();
    };
  }, [barProgress, logoOpacity, logoScale]);

  if (!isReady) {
    const loadingBarWidth = barProgress.interpolate({
      inputRange: [0, 1],
      outputRange: ["18%", "92%"],
    });

    return (
      <SafeAreaProvider>
        <StatusBar style="dark" backgroundColor="#F8FAFC" />
        <View className="flex-1 items-center justify-center bg-[#F8FAFC] px-8">
          <Animated.Image
            source={LOGO_SOURCE}
            resizeMode="contain"
            style={{
              width: 240,
              height: 60,
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            }}
          />

          <View className="mt-8 h-1.5 w-44 overflow-hidden rounded-full bg-[#DBEAFE]">
            <Animated.View
              style={{
                width: loadingBarWidth,
                height: "100%",
                borderRadius: 999,
                backgroundColor: "#2563EB",
              }}
            />
          </View>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <ApolloProvider client={apolloClient}>
        <StatusBar style="light" backgroundColor="#1B5E20" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: "#1B5E20" },
            headerTintColor: "#F4FBF4",
            contentStyle: { backgroundColor: "#F5F8F5" },
            animation: "fade_from_bottom",
            gestureEnabled: true,
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(dashboard)" options={{ headerShown: false }} />
          <Stack.Screen
            name="vendor-dashboard"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="admin-dashboard"
            options={{ title: "Platform Admin" }}
          />
        </Stack>
      </ApolloProvider>
    </SafeAreaProvider>
  );
}
