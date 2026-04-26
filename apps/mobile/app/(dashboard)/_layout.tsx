import { MaterialIcons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useEffect, useRef } from "react";
import { Animated } from "react-native";

import { usePushNotifications } from "@/lib/notifications/use-push-notifications";
import { useMobileTranslations } from "@/lib/translations";

type AnimatedTabIconProps = {
  name: keyof typeof MaterialIcons.glyphMap;
  color: string;
  size: number;
  focused: boolean;
};

function AnimatedTabIcon({ name, color, size, focused }: AnimatedTabIconProps) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: focused ? 1.12 : 1,
      useNativeDriver: true,
      speed: 18,
      bounciness: 7,
    }).start();
  }, [focused, scale]);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <MaterialIcons name={name} size={size} color={color} />
    </Animated.View>
  );
}

export default function DashboardLayout() {
  usePushNotifications();
  const { t } = useMobileTranslations();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: "#1B5E20" },
        headerTintColor: "#F4FBF4",
        sceneStyle: { backgroundColor: "#F5F8F5" },
        tabBarStyle: {
          backgroundColor: "#F4FBF4",
          borderTopColor: "#D9E8D9",
          height: 68,
          paddingTop: 8,
          paddingBottom: 8,
        },
        tabBarItemStyle: {
          borderRadius: 14,
          marginHorizontal: 4,
        },
        tabBarActiveBackgroundColor: "#E7F4E7",
        tabBarActiveTintColor: "#1B5E20",
        tabBarInactiveTintColor: "#6B7280",
        animation: "fade",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: t("tabs.dashboard"),
          tabBarIcon: ({ color, size, focused }) => (
            <AnimatedTabIcon
              name="dashboard"
              color={color}
              size={size}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="contributions"
        options={{
          title: t("tabs.contributions"),
          tabBarIcon: ({ color, size, focused }) => (
            <AnimatedTabIcon
              name="payments"
              color={color}
              size={size}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="proposals"
        options={{
          title: t("tabs.proposals"),
          tabBarIcon: ({ color, size, focused }) => (
            <AnimatedTabIcon
              name="how-to-vote"
              color={color}
              size={size}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="ledger"
        options={{
          title: t("tabs.ledger"),
          tabBarIcon: ({ color, size, focused }) => (
            <AnimatedTabIcon
              name="receipt-long"
              color={color}
              size={size}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: t("tabs.report"),
          tabBarIcon: ({ color, size, focused }) => (
            <AnimatedTabIcon
              name="assessment"
              color={color}
              size={size}
              focused={focused}
            />
          ),
        }}
      />
    </Tabs>
  );
}
