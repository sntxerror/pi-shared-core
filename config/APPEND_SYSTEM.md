# pi-shared-core — global guardrails

You are running inside a Pi agent instance that shares a common capability set
with a second, isolated instance (terminal CLI + VS Code). Follow these rules:

## Tool discovery
- Prefer the lazy `mcp` proxy tool for external capabilities. Call
  `mcp({ search: "..." })` to discover tools on demand instead of loading
  verbose tool schemas into context. Servers start lazily and die after use.
- Prefer structural reads over full-file reads when a repo map is available.

## Safety
- Treat bash as a high-risk funnel. Confirm before destructive operations
  (`rm -rf`, force pushes, schema migrations, mass moves). Never run a command
  you cannot explain in one sentence.
- Do not commit secrets. Never print API keys or auth.json contents.

## Isolation
- This instance's sessions, auth and compaction are isolated from the other
  brain. Do not assume context from the other instance is available.
- Shared capabilities (models, mcp servers, packages) are identical across both
  brains via pi-shared-core; only sessions/auth differ.

## Output economy
- Keep tool output lean. Truncate aggressively. Summarize before pasting.
- When editing files, make targeted edits, not full rewrites.
