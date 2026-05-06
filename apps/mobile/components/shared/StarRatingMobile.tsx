import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";
import { View } from "react-native";

type StarRatingMobileProps = {
  rating: number;
  size?: number;
};

const STAR_PATH =
  "M12 17.27L18.18 21l-1.64-7.03L22 9.24" +
  "l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function StarRatingMobile({ rating, size = 16 }: StarRatingMobileProps) {
  const safeRating = clamp(rating, 0, 5);

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      {Array.from({ length: 5 }).map((_, index) => {
        const fill = clamp(safeRating - index, 0, 1);
        const fillPct = `${Math.round(fill * 100)}%`;
        const gradientId = `mobile-star-${index}-${size}-${Math.round(safeRating * 10)}`;

        return (
          <Svg key={`${gradientId}-${index}`} width={size} height={size} viewBox="0 0 24 24">
            <Defs>
              <LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                <Stop offset="0%" stopColor="#F59E0B" />
                <Stop offset={fillPct} stopColor="#F59E0B" />
                <Stop offset={fillPct} stopColor="#E5E7EB" />
                <Stop offset="100%" stopColor="#E5E7EB" />
              </LinearGradient>
            </Defs>
            <Path d={STAR_PATH} fill={`url(#${gradientId})`} stroke="#D1D5DB" strokeWidth={1} />
          </Svg>
        );
      })}
    </View>
  );
}
