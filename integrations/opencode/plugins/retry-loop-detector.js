import { createHash } from "node:crypto";

const WARN_THRESHOLD = 3;
const BLOCK_THRESHOLD = 5;
const sessions = new Map();

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, stable(value[key])]),
    );
  }
  return value;
}

function fingerprint(input, output) {
  const tool = String(input?.tool ?? input?.name ?? "unknown");
  const args = output?.args ?? input?.args ?? input?.input ?? {};
  const body = JSON.stringify(stable(args));
  return `${tool}:${createHash("sha256").update(body).digest("hex")}`;
}

export const RetryLoopDetectorPlugin = async ({ client } = {}) => {
  await client?.app?.log?.({
    body: {
      service: "retry-loop-detector",
      level: "info",
      message: "plugin initialized",
    },
  });
  return {
    "tool.execute.before": async (input, output) => {
      if (process.env.DISABLE_RETRY_LOOP_DETECTOR === "1") return;

      const sessionID = String(input?.sessionID ?? "unknown");
      const fp = fingerprint(input, output);
      const previous = sessions.get(sessionID);
      const count = fp === previous?.fingerprint ? previous.count + 1 : 1;
      sessions.set(sessionID, { fingerprint: fp, count });

      const tool = String(input?.tool ?? input?.name ?? "tool");
      if (count >= BLOCK_THRESHOLD) {
        throw new Error(
          `${tool} was called ${count} times consecutively with identical arguments. This looks like a retry loop. Stop and try a different approach, or set DISABLE_RETRY_LOOP_DETECTOR=1 to bypass.`,
        );
      }

      if (count >= WARN_THRESHOLD && client?.app?.log) {
        await client.app.log({
          body: {
            service: "retry-loop-detector",
            level: "warn",
            message: `${tool} called ${count} times with identical arguments`,
          },
        });
      }
    },
    event: async ({ event }) => {
      if (event?.type === "session.deleted") {
        sessions.delete(String(event.properties?.info?.id ?? event.properties?.sessionID ?? ""));
      }
    },
  };
};
