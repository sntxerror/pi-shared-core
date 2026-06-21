# pi-shared-core

Declarative config orchestrator for the dual-brain Pi setup
(terminal CLI `~/.pi/agent` + VS Code `~/.vscode-pi/agent`).

It contains **zero custom tool code**. Its only job is to deploy shared JSON
configs (`models.json`, `mcp.json`) and `APPEND_SYSTEM.md` into the agent dir
of whichever brain it is loaded into, and to expose a `/pi-core-diagnostics`
command. Community extensions are installed separately (see Setup).

## What it deploys

| File | Purpose |
|------|---------|
| `models.json` | Adds the `google-direct` provider (Gemini, native API). **Does not** redefine `openrouter` — that stays backed by `auth.json`. |
| `mcp.json` | Lazy MCP servers (Playwright browser, postgres) consumed by `pi-mcp-adapter`. |
| `APPEND_SYSTEM.md` | Global guardrails + tool-discovery rules appended to the system prompt. |

Files are deployed **copy-if-missing** on `session_start`, so manual edits are
never overwritten. Deployed `models.json` / `mcp.json` take effect after a pi
restart (they are read at startup, before `session_start`).

## Setup (both brains)

### Terminal brain (`~/.pi/agent`)
```bash
# community npm packages
for p in pi-mcp-adapter pi-lens pi-lean-ctx pi-simplify pi-multi-pass \
         @ayulab/pi-rewind @tintinweb/pi-subagents context-mode; do
  pi install "npm:$p"
done

# this orchestrator (local path)
pi install ~/pi-shared-core

# GitHub-only bash safety gatekeeper (enables approval gates — see its README)
pi install git:github.com/aslamplr/pi-safe-shell

# optional micro-VM sandbox (needs QEMU/krun runtime; see pasky/pi-gondolin)
# pi install git:github.com/pasky/pi-gondolin
```

### VS Code brain (`~/.vscode-pi/agent`)
Same as above, prefixed with the agent-dir override:
```bash
export PI_CODING_AGENT_DIR=~/.vscode-pi/agent
mkdir -p "$PI_CODING_AGENT_DIR"
cp ~/.pi/agent/auth.json "$PI_CODING_AGENT_DIR/auth.json"   # share openrouter key
chmod 600 "$PI_CODING_AGENT_DIR/auth.json"
for p in pi-mcp-adapter pi-lens pi-lean-ctx pi-simplify pi-multi-pass \
         @ayulab/pi-rewind @tintinweb/pi-subagents context-mode; do
  pi install "npm:$p"
done
pi install ~/pi-shared-core
pi install git:github.com/aslamplr/pi-safe-shell
unset PI_CODING_AGENT_DIR
```

### VS Code extension settings
```jsonc
{
  "pi.agentDir": "~/.vscode-pi/agent",
  "pi.binaryPath": "/home/sntx/.config/nvm/versions/node/v24.16.0/bin/pi"
}
```

## Deviations from the original architecture plan (corrected)

1. **`pi.binaryPath`** — plan said `~/.nvm/...`; correct path on this machine
   is `~/.config/nvm/versions/node/v24.16.0/bin/pi`.
2. **Agent-dir resolution** — plan's bootstrapper used `join(ctx.cwd,"..","..")`
   (wrong). Uses `getAgentDir()` from `@earendil-works/pi-coding-agent`.
3. **No `multi-pass.json`** — `pi-multi-pass` is an OAuth multi-subscription
   rotator (TUI-managed; project config `.pi/multi-pass.json`), not a global
   API-key provider cascade. The plan's pools/chains schema is fictional.
4. **`models.json` does not redefine `openrouter`** — the working openrouter
   auth lives in `auth.json` and `OPENROUTER_API_KEY` is not in the env, so
   redefining it would break the default model. Only `google-direct` is added.
5. **`bash-damage-from-within` not installed** — it is an educational demo
   repo, not a pi safety extension (would load demo extensions with full system
   access).
6. **`pi-gondolin` deferred** — optional; needs a QEMU/krun micro-VM runtime to
   function. Install command documented above.
7. **Community packages installed directly** (`pi install npm:...`) instead of
   bundled inside this package — pi requires explicit `node_modules` resource
   references to load bundled packages, which is fragile. Direct installs are
   robust and produce the same end state.

## Verify
```bash
pi list                                       # terminal brain packages
PI_CODING_AGENT_DIR=~/.vscode-pi/agent pi list  # vscode brain packages
```
In each instance: `/mcp` shows browser+postgres; `/model` shows `google-direct/*`
and `openrouter/*`; `/pi-core-diagnostics` reports the agent dir + configs.
