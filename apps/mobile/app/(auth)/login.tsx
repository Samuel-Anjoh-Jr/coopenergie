import { Link, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

import { login } from "@/lib/auth";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit() {
    try {
      setIsSubmitting(true);
      await login(email.trim(), password);
      router.replace("/(dashboard)/dashboard");
    } catch (error) {
      Alert.alert(
        "Connexion impossible",
        error instanceof Error ? error.message : "Une erreur est survenue.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View className="flex-1 bg-[#F5F8F5] px-6 py-10 justify-center">
      <View className="rounded-3xl bg-white border border-[#DDEBDD] p-6">
        <Text className="text-3xl font-bold text-[#1B5E20] mb-2">
          CoopEnergie
        </Text>
        <Text className="text-base text-slate-600 mb-6">
          Connectez-vous a votre cooperative.
        </Text>

        <Text className="text-[#1B5E20] font-semibold mb-2">Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="vous@exemple.com"
          className="bg-[#F1F7F1] border border-[#CFE3CF] rounded-xl px-4 py-3 mb-4"
        />

        <Text className="text-[#1B5E20] font-semibold mb-2">Mot de passe</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="********"
          className="bg-[#F1F7F1] border border-[#CFE3CF] rounded-xl px-4 py-3 mb-6"
        />

        <Pressable
          onPress={onSubmit}
          disabled={isSubmitting || !email.trim() || !password}
          className="rounded-xl bg-[#1B5E20] px-4 py-3 items-center"
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="text-white font-semibold">Connexion</Text>
          )}
        </Pressable>

        <Link href="/(auth)/register" asChild>
          <Pressable className="mt-4 rounded-xl border border-[#1B5E20] px-4 py-3 items-center">
            <Text className="text-[#1B5E20] font-medium">Creer un compte</Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}
