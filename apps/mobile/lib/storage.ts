import { createMMKV } from "react-native-mmkv";

export const storage = createMMKV();

export const tokenStorage = {
  get: () => storage.getString("auth_token"),
  set: (token: string) => storage.set("auth_token", token),
  clear: () => storage.remove("auth_token"),
};

export const cooperativeStorage = {
  get: () => storage.getString("active_cooperative"),
  set: (id: string) => storage.set("active_cooperative", id),
};

export const invitationTokenStorage = {
  get: () => storage.getString("pending_invitation_token"),
  set: (token: string) => storage.set("pending_invitation_token", token),
  clear: () => storage.remove("pending_invitation_token"),
};
