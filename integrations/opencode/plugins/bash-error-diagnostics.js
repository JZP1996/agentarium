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

function hasPipeline(command) {
  return command.replaceAll("||", "").includes("|");
}

export const BashErrorDiagnosticsPlugin = async ({ client } = {}) => {
  await client?.app?.log?.({
    body: {
      service: "bash-error-diagnostics",
      level: "info",
      message: "plugin initialized",
    },
  });
  return {
    "tool.execute.before": async (input, output) => {
      const command = shellCommand(input, output);
      if (!command || !hasPipeline(command) || command.includes("pipefail"))
        return;
      if (!output?.args || typeof output.args.command !== "string") return;

      output.args.command = `set -o pipefail; ${command}`;
    },
  };
};
