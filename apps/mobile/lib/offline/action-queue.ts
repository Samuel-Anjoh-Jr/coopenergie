import { storage } from "@/lib/storage";

const QUEUE_KEY = "offline_action_queue";

export type OfflineAction = {
  type: string;
  payload: Record<string, unknown>;
  idempotencyKey: string;
  attemptCount: number;
  failed?: boolean;
};

function readQueue(): OfflineAction[] {
  const raw = storage.getString(QUEUE_KEY);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as OfflineAction[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: OfflineAction[]) {
  storage.set(QUEUE_KEY, JSON.stringify(queue));
}

export function enqueue(action: OfflineAction) {
  const queue = readQueue();
  queue.push(action);
  writeQueue(queue);
}

export function getQueue() {
  return readQueue();
}

export function dequeue(idempotencyKey: string) {
  const queue = readQueue().filter(
    (item) => item.idempotencyKey !== idempotencyKey,
  );
  writeQueue(queue);
}

export function incrementAttempts(idempotencyKey: string) {
  const queue = readQueue().map((item) => {
    if (item.idempotencyKey === idempotencyKey) {
      return {
        ...item,
        attemptCount: item.attemptCount + 1,
      };
    }

    return item;
  });

  writeQueue(queue);
}

export function markFailed(idempotencyKey: string) {
  const queue = readQueue().map((item) => {
    if (item.idempotencyKey === idempotencyKey) {
      return {
        ...item,
        failed: true,
      };
    }

    return item;
  });

  writeQueue(queue);
}
