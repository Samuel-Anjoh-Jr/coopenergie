import { ReactNode } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View } from "react-native";

import { ScreenReveal } from "@/components/screen-reveal";

type ScreenShellProps = {
  children: ReactNode;
};

export function ScreenShell({ children }: ScreenShellProps) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F5F8F5" }}>
      <ScreenReveal>
        <View className="flex-1 px-6 py-4">{children}</View>
      </ScreenReveal>
    </SafeAreaView>
  );
}
