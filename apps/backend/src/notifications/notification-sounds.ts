export const NOTIFICATION_SOUND_BY_TYPE = {
  CONTRIBUTION: "contribution.wav",
  PROPOSAL: "governance.wav",
  VOTE: "governance.wav",
  WITHDRAWAL_APPROVED: "approval.wav",
  WITHDRAWAL_DISBURSED: "transfer.wav",
  WITHDRAWAL_FAILED: "alert.wav",
  PAYMENT_CONFIRMED: "payment.wav",
  PAYMENT_FAILED: "alert.wav",
  MEMBER_JOINED: "member.wav",
} as const;

export type NotificationSoundKey = keyof typeof NOTIFICATION_SOUND_BY_TYPE;
