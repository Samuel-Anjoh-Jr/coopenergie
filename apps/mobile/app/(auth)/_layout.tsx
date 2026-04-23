import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#1B5E20" },
        headerTintColor: "#F4FBF4",
        contentStyle: { backgroundColor: "#F5F8F5" },
      }}
    >
      <Stack.Screen name="login" options={{ title: "Connexion" }} />
      <Stack.Screen name="register" options={{ title: "Inscription" }} />
      <Stack.Screen name="join" options={{ title: "Invitation" }} />
    </Stack>
  );
}
