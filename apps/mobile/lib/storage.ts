type StorageLike = {
  getString: (key: string) => string | undefined;
  set: (key: string, value: string) => void;
  remove: (key: string) => void;
  clearAll: () => void;
};

function createFallbackStorage(): StorageLike {
  const memory = new Map<string, string>();

  return {
    getString: (key: string) => memory.get(key),
    set: (key: string, value: string) => {
      memory.set(key, value);
    },
    remove: (key: string) => {
      memory.delete(key);
    },
    clearAll: () => {
      memory.clear();
    },
  };
}

function createStorage(): StorageLike {
  try {
    // Use dynamic require to avoid loading NitroModules in Expo Go.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createMMKV } = require("react-native-mmkv") as {
      createMMKV: () => StorageLike;
    };
    return createMMKV();
  } catch {
    return createFallbackStorage();
  }
}

export const storage = createStorage();

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
