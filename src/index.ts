// pi-shared-core/src/index.ts
//
// Declarative config orchestrator. Zero custom tool code.
// On session_start it deploys shared JSON configs + APPEND_SYSTEM.md into the
// agent dir of whichever brain it is loaded into (terminal ~/.pi/agent or
// VS Code ~/.vscode-pi/agent). Files are only deployed when absent, so manual
// user edits are never clobbered.
//
// Corrected from the architecture plan:
//  * Uses getAgentDir() (exported by @earendil-works/pi-coding-agent) instead
//    of the buggy `join(ctx.cwd, "..", "..")` the plan proposed.
//  * Does NOT deploy a multi-pass.json: pi-multi-pass is an OAuth
//    multi-subscription rotator (TUI-managed via /subs, /pool, /mp-preset;
//    project config is .pi/multi-pass.json), not a global API-key provider
//    cascade. The plan's pools/chains/openrouter-members schema is fictional.
//  * models.json only ADDS the google-direct provider. It deliberately does
//    NOT redefine the built-in `openrouter` provider, so the existing
//    auth.json-based openrouter credentials keep working.

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { getAgentDir } from "@earendil-works/pi-coding-agent";
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Files deployed (copy-if-missing) from config/ into the agent dir.
// A default empty mcp.json ({"mcpServers":{}}) is deployed so pi-mcp-adapter has
// its Pi-global file present. Add servers to config/mcp.json later as a separate step.
const DEPLOY_FILES = ["models.json", "mcp.json", "APPEND_SYSTEM.md"];

function safeNotify(
  ctx: { ui?: { notify?: (m: string, t?: "info" | "warning" | "error") => void } } | undefined,
  message: string,
  type: "info" | "warning" | "error" = "info",
): void {
  try {
    ctx?.ui?.notify?.(message, type);
  } catch {
    // Non-tui modes (rpc/json/print) may not surface notifications.
  }
}

export default function (pi: ExtensionAPI) {
  pi.on("session_start", async (_event, ctx) => {
    try {
      const agentDir = getAgentDir();
      if (!existsSync(agentDir)) mkdirSync(agentDir, { recursive: true });

      const srcDir = dirname(fileURLToPath(import.meta.url));
      const configDir = join(srcDir, "..", "config");

      const deployed: string[] = [];
      for (const f of DEPLOY_FILES) {
        const src = join(configDir, f);
        const dest = join(agentDir, f);
        if (existsSync(src) && !existsSync(dest)) {
          copyFileSync(src, dest);
          deployed.push(f);
        }
      }
      if (deployed.length > 0) {
        safeNotify(
          ctx,
          `pi-shared-core: deployed ${deployed.join(", ")} -> ${agentDir} (restart pi to apply models/mcp)`,
          "info",
        );
      }
    } catch (err) {
      safeNotify(ctx, `pi-shared-core: config deploy failed: ${String(err)}`, "warning");
    }
  });

  pi.registerCommand("pi-core-diagnostics", {
    description: "pi-shared-core health: deployed configs and agent dir",
    handler: async (_args, ctx) => {
      const agentDir = getAgentDir();
      const present = DEPLOY_FILES.filter((f) => existsSync(join(agentDir, f)));
      safeNotify(
        ctx,
        `pi-shared-core diagnostics\n` +
          `agentDir: ${agentDir}\n` +
          `configs present: ${present.join(", ") || "none"}\n` +
          `run 'pi list' to see installed packages; '/mcp' to inspect MCP servers`,
        "info",
      );
    },
  });
}
