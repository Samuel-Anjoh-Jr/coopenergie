import { ReactNode, useEffect, useRef } from "react";
import { Animated, StyleProp, ViewStyle } from "react-native";

import { useReducedMotion } from "@/lib/use-reduced-motion";

type Direction = "up" | "down" | "left" | "right";

type SectionRevealProps = {
  children: ReactNode;
  delay?: number;
  direction?: Direction;
  distance?: number;
  style?: StyleProp<ViewStyle>;
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

export function SectionReveal({
  children,
  delay = 0,
  direction = "up",
  distance = 16,
  style,
}: SectionRevealProps) {
  const reducedMotionEnabled = useReducedMotion();
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
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: 0,
        duration: 320,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 320,
        delay,
        useNativeDriver: true,
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
    <Animated.View style={[{ opacity, transform: [{ translateX }, { translateY }] }, style]}>
      {children}
    </Animated.View>
  );
}
