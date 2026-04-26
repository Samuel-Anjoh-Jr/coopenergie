import { ReactNode, useEffect, useRef } from "react";
import { Animated, StyleProp, View, ViewStyle } from "react-native";

type ScreenRevealProps = {
  children: ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
};

export function ScreenReveal({
  children,
  className,
  style,
}: ScreenRevealProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 320,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY]);

  return (
    <Animated.View
      style={[{ flex: 1, opacity, transform: [{ translateY }] }, style]}
    >
      <View className={className} style={{ flex: 1 }}>
        {children}
      </View>
    </Animated.View>
  );
}
