"use client";

type Props = {
  rating: number; // 0–5 float
  size?: "sm" | "md" | "lg";
};

const SIZES = { sm: 12, md: 16, lg: 22 };

// SVG star path centred at (12,12) in a 24×24 viewBox
const STAR_PATH =
  "M12 2l2.4 7.2H22l-6.2 4.5 2.4 7.2L12 17l-6.2 4.9 2.4-7.2L2 9.2h7.6z";

export function StarRating({ rating, size = "md" }: Props) {
  const px = SIZES[size];

  return (
    <span className="inline-flex items-center gap-px" aria-label={`${rating.toFixed(1)} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => {
        const fullness = Math.min(1, Math.max(0, rating - i));
        const gradId = `sr-${i}-${Math.round(fullness * 100)}`;
        const fillPct = `${(fullness * 100).toFixed(1)}%`;

        return (
          <svg
            key={i}
            width={px}
            height={px}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
                <stop offset={fillPct} stopColor="#F59E0B" />
                <stop offset={fillPct} stopColor="#D1D5DB" />
              </linearGradient>
            </defs>
            <path
              d={STAR_PATH}
              fill={`url(#${gradId})`}
              stroke={fullness > 0 ? "#F59E0B" : "#D1D5DB"}
              strokeWidth="0.5"
            />
          </svg>
        );
      })}
    </span>
  );
}
