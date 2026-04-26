import { ReactNode, useRef } from "react";
import {
  Animated,
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
} from "react-native";

type PressableScaleProps = PressableProps & {
  children: ReactNode;
  scaleTo?: number;
  style?: StyleProp<ViewStyle>;
};

function PressableScale({
  children,
  scaleTo = 0.97,
  style,
  onPressIn,
  onPressOut,
  ...props
}: PressableScaleProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (toValue: number) => {
    Animated.spring(scale, {
      toValue,
      useNativeDriver: true,
      speed: 28,
      bounciness: 4,
    }).start();
  };

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        {...props}
        onPressIn={(event) => {
          animateTo(scaleTo);
          onPressIn?.(event);
        }}
        onPressOut={(event) => {
          animateTo(1);
          onPressOut?.(event);
        }}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

export { PressableScale };
export default PressableScale;
