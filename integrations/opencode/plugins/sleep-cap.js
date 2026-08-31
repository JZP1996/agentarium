const DEFAULT_THRESHOLD_SECONDS = 60;

function shellCommand(input, output) {
  const tool = String(input?.tool ?? input?.name ?? "").toLowerCase();
  if (!["bash", "shell", "terminal"].includes(tool)) return "";
  return String(
    output?.args?.command ??
      output?.args?.cmd ??
      input?.args?.command ??
      input?.args?.cmd ??
      "",
  );
}

function sleepSeconds(token) {
  const match = String(token).match(/^([0-9]+(?:\.[0-9]+)?)([smh]?)$/);
  if (!match) return 0;
  const value = Number.parseFloat(match[1]);
  if (!Number.isFinite(value)) return 0;
  if (match[2] === "h") return Math.floor(value * 3600);
  if (match[2] === "m") return Math.floor(value * 60);
  return Math.floor(value);
}

function maxSleep(command) {
  let max = { original: "", seconds: 0 };
  const regex = /(?:^|[^A-Za-z0-9_.-])sleep\s+([0-9]+(?:\.[0-9]+)?[smh]?)/g;
  for (const match of command.matchAll(regex)) {
    const seconds = sleepSeconds(match[1]);
    if (seconds > max.seconds) max = { original: match[1], seconds };
  }
  return max;
}

export const SleepCapPlugin = async ({ client } = {}) => {
  await client?.app?.log?.({
    body: {
      service: "sleep-cap",
      level: "info",
      message: "plugin initialized",
    },
  });
  return {
    "tool.execute.before": async (input, output) => {
      if (process.env.OPENCODE_SLEEP_CAP_DISABLE === "1") return;

      const command = shellCommand(input, output);
      if (!command) return;

      const threshold =
        Number.parseInt(process.env.SLEEP_CAP_THRESHOLD ?? "", 10) ||
        DEFAULT_THRESHOLD_SECONDS;
      const found = maxSleep(command);
      if (found.seconds <= threshold) return;

      throw new Error(
        `sleep ${found.original} (${found.seconds}s) exceeds the ${threshold}s threshold. Use a background command or a shorter polling interval instead of waiting in the foreground.`,
      );
    },
  };
};
