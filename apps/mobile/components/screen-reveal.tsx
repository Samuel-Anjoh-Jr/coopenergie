import { ReactNode, useEffect, useRef } from "react";
import { Animated, Platform, StyleProp, View, ViewStyle } from "react-native";
import { useReducedMotion } from "@/lib/use-reduced-motion";

type Direction = "up" | "down" | "left" | "right";

type ScreenRevealProps = {
  children: ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
  direction?: Direction;
  delay?: number;
  distance?: number;
};

function getInitialTransform(direction: Direction, distance: number) {
  switch (direction) {
    case "down":
      return { translateX: 0, translateY: -distance };
    case "left":
      return { translateX: -distance, translateY: 0 };
    case "right":
      return { translateX: distance, translateY: 0 };
    case "up":
    default:
      return { translateX: 0, translateY: distance };
  }
}

export function ScreenReveal({
  children,
  className,
  style,
  direction = "up",
  delay = 0,
  distance = 12,
}: ScreenRevealProps) {
  const reducedMotionEnabled = useReducedMotion();
  const canUseNativeDriver = Platform.OS !== "web";
  const { translateX: initialX, translateY: initialY } = getInitialTransform(
    direction,
    distance,
  );

  const opacity = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(initialX)).current;
  const translateY = useRef(new Animated.Value(initialY)).current;

  useEffect(() => {
    if (reducedMotionEnabled) {
      opacity.setValue(1);
      translateX.setValue(0);
      translateY.setValue(0);
      return;
    }

    opacity.setValue(0);
    translateX.setValue(initialX);
    translateY.setValue(initialY);

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 280,
        delay,
        useNativeDriver: canUseNativeDriver,
      }),
      Animated.timing(translateX, {
        toValue: 0,
        duration: 320,
        delay,
        useNativeDriver: canUseNativeDriver,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 320,
        delay,
        useNativeDriver: canUseNativeDriver,
      }),
    ]).start();
  }, [
    delay,
    initialX,
    initialY,
    opacity,
    reducedMotionEnabled,
    translateX,
    translateY,
  ]);

  return (
    <Animated.View
      style={[{ flex: 1, opacity, transform: [{ translateX }, { translateY }] }, style]}
    >
      <View className={className} style={{ flex: 1 }}>
        {children}
      </View>
    </Animated.View>
  );
}
