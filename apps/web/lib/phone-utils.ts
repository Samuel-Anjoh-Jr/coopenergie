export type MobileMoneyDestination = "MTN_MOMO" | "ORANGE_MONEY";
export type MobileMoneyCarrier = "MTN" | "ORANGE";

const MTN_PREFIXES = new Set(["67", "68", "650", "651", "652", "653", "654"]);
const ORANGE_PREFIXES = new Set(["69", "655", "656", "657", "658", "659"]);

export function normalizeCameroonPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");

  if (digits.length === 9 && digits.startsWith("6")) {
    return `237${digits}`;
  }

  if (digits.length === 12 && digits.startsWith("2376")) {
    return digits;
  }

  return null;
}

export function detectCameroonMobileMoney(raw: string): {
  normalizedPhone: string;
  carrier: MobileMoneyCarrier;
  destinationType: MobileMoneyDestination;
} | null {
  const normalizedPhone = normalizeCameroonPhone(raw);
  if (!normalizedPhone) {
    return null;
  }

  const local = normalizedPhone.slice(3);
  const shortPrefix = local.slice(0, 2);
  const longPrefix = local.slice(0, 3);

  if (MTN_PREFIXES.has(longPrefix) || MTN_PREFIXES.has(shortPrefix)) {
    return {
      normalizedPhone,
      carrier: "MTN",
      destinationType: "MTN_MOMO",
    };
  }

  if (ORANGE_PREFIXES.has(longPrefix) || ORANGE_PREFIXES.has(shortPrefix)) {
    return {
      normalizedPhone,
      carrier: "ORANGE",
      destinationType: "ORANGE_MONEY",
    };
  }

  return null;
}
