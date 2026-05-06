import { MaterialIcons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

import { useMobileTranslations } from "@/lib/translations";

export default function VendorDashboardTabsLayout() {
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
        },
        tabBarActiveTintColor: "#1B5E20",
        tabBarInactiveTintColor: "#6B7280",
      }}
    >
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen
        name="overview"
        options={{
          title: t("vendorDashboard.tabs.overview"),
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="dashboard" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("vendorDashboard.tabs.profile"),
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="badge" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="contact"
        options={{
          title: t("vendorDashboard.tabs.contact"),
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="contacts" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: t("vendorDashboard.tabs.products"),
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="inventory" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="subscription"
        options={{
          title: t("vendorDashboard.tabs.subscription"),
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="payments" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="reviews"
        options={{
          title: t("vendorDashboard.tabs.reviews"),
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="reviews" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
