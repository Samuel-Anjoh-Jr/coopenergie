import { MaterialIcons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

import { usePushNotifications } from "@/lib/notifications/use-push-notifications";
import { useMobileTranslations } from "@/lib/translations";

export default function DashboardLayout() {
  usePushNotifications();
  const { t } = useMobileTranslations();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: "#1B5E20" },
        headerTintColor: "#F4FBF4",
        sceneStyle: { backgroundColor: "#F5F8F5" },
        tabBarStyle: { backgroundColor: "#F4FBF4", borderTopColor: "#D9E8D9" },
        tabBarActiveTintColor: "#1B5E20",
        tabBarInactiveTintColor: "#6B7280",
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
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="dashboard" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="contributions"
        options={{
          title: t("tabs.contributions"),
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="payments" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="proposals"
        options={{
          title: t("tabs.proposals"),
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="how-to-vote" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="ledger"
        options={{
          title: t("tabs.ledger"),
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="receipt-long" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: t("tabs.report"),
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="assessment" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
