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

import { api } from "@/lib/api";
import { login } from "@/lib/auth";
import { invitationTokenStorage } from "@/lib/storage";

export default function RegisterScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit() {
    try {
      setIsSubmitting(true);

      await api.post("/auth/register", {
        name: name.trim(),
        email: email.trim(),
        password,
      });

      await login(email.trim(), password);

      const invitationToken = invitationTokenStorage.get();
      if (invitationToken) {
        await api.post("/invitations/accept", {
          token: invitationToken,
        });
        invitationTokenStorage.clear();
      }

      router.replace("/(dashboard)/dashboard");
    } catch (error) {
      Alert.alert(
        "Inscription impossible",
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
          Inscription
        </Text>
        <Text className="text-base text-slate-600 mb-6">
          Creez votre compte CoopEnergie.
        </Text>

        <Text className="text-[#1B5E20] font-semibold mb-2">Nom</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          placeholder="Votre nom"
          className="bg-[#F1F7F1] border border-[#CFE3CF] rounded-xl px-4 py-3 mb-4"
        />

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
          disabled={isSubmitting || !name.trim() || !email.trim() || !password}
          className="rounded-xl bg-[#1B5E20] px-4 py-3 items-center"
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="text-white font-semibold">S&apos;inscrire</Text>
          )}
        </Pressable>

        <Link href="/(auth)/login" asChild>
          <Pressable className="mt-4 rounded-xl border border-[#1B5E20] px-4 py-3 items-center">
            <Text className="text-[#1B5E20] font-medium">
              Retour a la connexion
            </Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}
