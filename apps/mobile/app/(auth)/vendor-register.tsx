import { Link, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Text,
  TextInput,
  View,
} from "react-native";

import PressableScale from "@/components/pressable-scale";
import { ScreenReveal } from "@/components/screen-reveal";
import { api } from "@/lib/api";
import { getPostLoginPath, login } from "@/lib/auth";
import { useMobileTranslations } from "@/lib/translations";

type VendorRegisterResponse = {
  paymentRequired?: boolean;
  platformSettings?: {
    vendorOneTimeFeeXAF?: number;
  };
};

export default function VendorRegisterScreen() {
  const router = useRouter();
  const { t } = useMobileTranslations();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showPayment, setShowPayment] = useState(false);
  const [paymentPhone, setPaymentPhone] = useState("");
  const [feeXaf, setFeeXaf] = useState(0);
  const [isPaying, setIsPaying] = useState(false);

  const [authToken, setAuthToken] = useState("");

  async function pollActivation(token: string) {
    const timeoutAt = Date.now() + 5 * 60 * 1000;

    while (Date.now() < timeoutAt) {
      try {
        const dashboard = await api.get<{ accountStatus?: string }>(
          "/vendors/dashboard/me",
        );

        if (
          dashboard.accountStatus === "ACTIVE" ||
          dashboard.accountStatus === "SUBSCRIPTION_EXPIRED"
        ) {
          router.replace("/vendor-dashboard");
          return;
        }
      } catch {
        // Keep polling until timeout.
      }

      await new Promise((resolve) => setTimeout(resolve, 3000));
    }

    Alert.alert(t("vendorSignup.paymentPendingTitle"), t("vendorSignup.paymentPendingMessage"));
  }

  async function onSubmit() {
    if (!acceptTerms) {
      Alert.alert(t("vendorSignup.termsTitle"), t("vendorSignup.termsRequiredMessage"));
      return;
    }

    try {
      setIsSubmitting(true);

      const registration = await api.post<VendorRegisterResponse>(
        "/vendors/register",
        {
          name: name.trim(),
          email: email.trim(),
          password,
          businessName: businessName.trim(),
          description: description.trim(),
          city: city.trim(),
          country: "CM",
          whatsappNumber: whatsappNumber.trim() || undefined,
          contactEmail: email.trim(),
        },
      );

      const loginResult = await login(email.trim(), password);
      setAuthToken(loginResult.token);

      const fee = Number(registration.platformSettings?.vendorOneTimeFeeXAF ?? 0);
      const needsPayment = Boolean(registration.paymentRequired) && fee > 0;

      if (!needsPayment) {
        router.replace(getPostLoginPath(loginResult.user));
        return;
      }

      setFeeXaf(fee);
      setShowPayment(true);
      Alert.alert(t("vendorSignup.accountCreatedTitle"), t("vendorSignup.completePaymentMessage"));
    } catch (error) {
      Alert.alert(
        t("vendorSignup.registrationFailedTitle"),
        error instanceof Error ? error.message : t("vendorSignup.unknownError"),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onPay() {
    if (!authToken) {
      Alert.alert(t("vendorSignup.sessionTitle"), t("vendorSignup.reconnectMessage"));
      return;
    }

    if (!paymentPhone.trim()) {
      Alert.alert(t("vendorSignup.paymentTitle"), t("vendorSignup.paymentPhoneRequired"));
      return;
    }

    try {
      setIsPaying(true);
      await api.post(
        "/vendors/payment/register",
        {
          phoneNumber: paymentPhone.trim(),
        },
      );

      setShowPayment(false);
      Alert.alert(t("vendorSignup.paymentStartedTitle"), t("vendorSignup.paymentStartedMessage"));
      await pollActivation(authToken);
    } catch (error) {
      Alert.alert(
        t("vendorSignup.paymentFailedTitle"),
        error instanceof Error ? error.message : t("vendorSignup.unknownError"),
      );
    } finally {
      setIsPaying(false);
    }
  }

  return (
    <ScreenReveal className="bg-[#F5F8F5] px-6 py-10 justify-center">
      <View className="rounded-3xl bg-white border border-[#DDEBDD] p-6">
        <View className="mb-3 flex-row items-center gap-3">
          <Image
            source={require("../../assets/logo-full.png")}
            style={{ width: 176, height: 44 }}
            resizeMode="contain"
          />
        </View>

        <Text className="text-2xl font-bold text-[#1B5E20] mb-2">
          {t("vendorSignup.title")}
        </Text>
        <Text className="text-base text-slate-600 mb-4">
          {t("vendorSignup.subtitle")}
        </Text>

        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={t("vendorSignup.fullName")}
          className="bg-[#F1F7F1] border border-[#CFE3CF] rounded-xl px-4 py-3 mb-3"
        />
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          placeholder={t("vendorSignup.email")}
          className="bg-[#F1F7F1] border border-[#CFE3CF] rounded-xl px-4 py-3 mb-3"
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder={t("vendorSignup.password")}
          className="bg-[#F1F7F1] border border-[#CFE3CF] rounded-xl px-4 py-3 mb-3"
        />
        <TextInput
          value={businessName}
          onChangeText={setBusinessName}
          placeholder={t("vendorSignup.businessName")}
          className="bg-[#F1F7F1] border border-[#CFE3CF] rounded-xl px-4 py-3 mb-3"
        />
        <TextInput
          value={city}
          onChangeText={setCity}
          placeholder={t("vendorSignup.city")}
          className="bg-[#F1F7F1] border border-[#CFE3CF] rounded-xl px-4 py-3 mb-3"
        />
        <TextInput
          value={whatsappNumber}
          onChangeText={setWhatsappNumber}
          placeholder={t("vendorSignup.whatsapp")}
          className="bg-[#F1F7F1] border border-[#CFE3CF] rounded-xl px-4 py-3 mb-3"
        />
        <TextInput
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          placeholder={t("vendorSignup.description")}
          className="bg-[#F1F7F1] border border-[#CFE3CF] rounded-xl px-4 py-3 mb-3"
          style={{ textAlignVertical: "top" }}
        />

        <PressableScale
          className={`rounded-xl border px-4 py-3 items-center mb-3 ${
            acceptTerms ? "border-[#1B5E20] bg-[#E8F3E8]" : "border-[#CFE3CF]"
          }`}
          onPress={() => setAcceptTerms((value) => !value)}
        >
          <Text className="text-[#1B5E20]">
            [{acceptTerms ? "x" : " "}] {t("vendorSignup.acceptTerms")}
          </Text>
        </PressableScale>

        <PressableScale
          onPress={onSubmit}
          disabled={
            isSubmitting ||
            !name.trim() ||
            !email.trim() ||
            !password ||
            !businessName.trim() ||
            !description.trim() ||
            !city.trim()
          }
          className="rounded-xl bg-[#1B5E20] px-4 py-3 items-center"
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="text-white font-semibold">{t("vendorSignup.submit")}</Text>
          )}
        </PressableScale>

        <Link href="/(auth)/register" asChild>
          <PressableScale className="mt-4 rounded-xl border border-[#1B5E20] px-4 py-3 items-center">
            <Text className="text-[#1B5E20] font-medium">{t("vendorSignup.switchToCoopSignup")}</Text>
          </PressableScale>
        </Link>
      </View>

      {showPayment ? (
        <View className="absolute inset-0 items-center justify-center bg-black/40 px-6">
          <View className="w-full rounded-2xl bg-white p-5 border border-[#DDEBDD]">
            <Text className="text-lg font-semibold text-[#1B5E20]">{t("vendorSignup.paymentRequired")}</Text>
            <Text className="mt-2 text-slate-600">{t("vendorSignup.amount")} {feeXaf.toLocaleString("fr-CM")} XAF</Text>
            <TextInput
              value={paymentPhone}
              onChangeText={setPaymentPhone}
              placeholder={t("vendorSignup.paymentPhone")}
              className="mt-4 bg-[#F1F7F1] border border-[#CFE3CF] rounded-xl px-4 py-3"
            />

            <View className="mt-4 flex-row gap-2">
              <PressableScale
                className="flex-1 rounded-xl border border-[#1B5E20] px-4 py-3 items-center"
                onPress={() => setShowPayment(false)}
                disabled={isPaying}
              >
                <Text className="text-[#1B5E20]">{t("vendorSignup.later")}</Text>
              </PressableScale>

              <PressableScale
                className="flex-1 rounded-xl bg-[#1B5E20] px-4 py-3 items-center"
                onPress={onPay}
                disabled={isPaying}
              >
                {isPaying ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text className="text-white font-semibold">{t("vendorSignup.pay")}</Text>
                )}
              </PressableScale>
            </View>
          </View>
        </View>
      ) : null}
    </ScreenReveal>
  );
}
