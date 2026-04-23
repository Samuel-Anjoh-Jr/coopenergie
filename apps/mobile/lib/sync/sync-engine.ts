import { AppState } from "react-native";

import { api } from "@/lib/api";
import {
  dequeue,
  getQueue,
  incrementAttempts,
  markFailed,
  OfflineAction,
} from "@/lib/offline/action-queue";
import { saveContributions, saveLedger, saveProposals } from "@/lib/offline/db";

const MAX_RETRIES = 5;
const BACKOFF_MS = [1000, 2000, 4000, 8000];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getEndpoint(action: OfflineAction) {
  if (action.type === "contribution.create") {
    return "/contributions";
  }

  if (action.type === "proposal.create") {
    return "/proposals";
  }

  if (action.type === "vote.cast") {
    return "/votes";
  }

  return (action.payload.path as string | undefined) || "";
}

async function refreshCacheForAction(action: OfflineAction) {
  const cooperativeId = action.payload.cooperativeId as string | undefined;

  if (!cooperativeId) {
    return;
  }

  try {
    const [contributions, proposals, ledger] = await Promise.all([
      api.get<Array<{ id: string } & Record<string, unknown>>>(
        `/contributions/cooperative/${cooperativeId}`,
      ),
      api.get<Array<{ id: string } & Record<string, unknown>>>(
        `/proposals/cooperative/${cooperativeId}`,
      ),
      api.get<Array<{ id: string } & Record<string, unknown>>>(
        `/ledger/cooperative/${cooperativeId}`,
      ),
    ]);

    await saveContributions(cooperativeId, contributions);
    await saveProposals(cooperativeId, proposals);
    await saveLedger(cooperativeId, ledger);
  } catch {
    // Ignore cache refresh errors so successful server sync is not rolled back.
  }
}

async function processAction(action: OfflineAction) {
  const endpoint = getEndpoint(action);

  if (!endpoint) {
    dequeue(action.idempotencyKey);
    return;
  }

  while (true) {
    try {
      await api.post(endpoint, action.payload, {
        headers: {
          "Idempotency-Key": action.idempotencyKey,
        },
      });

      dequeue(action.idempotencyKey);
      await refreshCacheForAction(action);
      return;
    } catch {
      incrementAttempts(action.idempotencyKey);
      const latest = getQueue().find(
        (item) => item.idempotencyKey === action.idempotencyKey,
      );

      if (!latest) {
        return;
      }

      if (latest.attemptCount >= MAX_RETRIES) {
        markFailed(action.idempotencyKey);
        return;
      }

      const delayIndex = Math.min(
        latest.attemptCount - 1,
        BACKOFF_MS.length - 1,
      );
      await sleep(BACKOFF_MS[delayIndex]);
    }
  }
}

export async function processQueue() {
  const queue = getQueue().filter((action) => !action.failed);

  for (const action of queue) {
    await processAction(action);
  }
}

let syncStarted = false;

export function startSync() {
  if (syncStarted) {
    return;
  }

  syncStarted = true;

  AppState.addEventListener("change", (state) => {
    if (state === "active") {
      void processQueue();
    }
  });
}
