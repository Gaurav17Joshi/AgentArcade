# Local API-key setup

Agent Arcade is designed so you never paste an API key into chat or save one in Git.

1. In the project folder, copy `.env.example` to `.env.local`.
2. Open `.env.local` in a local editor and enter your own values:

   ```bash
   OPENAI_API_KEY=your_openai_key_here
   ANTHROPIC_API_KEY=your_anthropic_key_here
   ```

3. Start the supplied local server instead of Python's static server:

   ```bash
   node server.mjs
   ```

4. Open `http://127.0.0.1:4173`, click **API keys**, and look for green status dots. A green dot means the local server found a key; it is not a billing or validity check.

If port 4173 is busy, use another local port, for example `PORT=4174 node server.mjs`.

`.env.local` is ignored by Git. The browser never receives or displays the key.

## Live runs available now

- **Claude / logic puzzles:** the local server runs a real tool loop and streams its public events to the browser as newline-delimited JSON. The main agent can inspect the board, publish a readable progress checkpoint, spawn an isolated explorer, write and run a small restricted `.py` helper in a temporary workspace, and make deliberate batches of one to five validated moves. The Agents drawer selects one of three explicit run styles: **Free agent** (no route hints), **Action checker** (checks only a self-proposed batch and never searches), or **Solver aid** (a deterministic completion route only on explicit request). Free agent is the default. The visible board updates while the agent continues working; it is never presented as solved unless all goals are actually filled.
- **Claude / virtual-mouse puzzles:** **Klotski · Cursor doorway** and **Jigsaw · Cursor cat 16** are computer-control environments. The browser renders a screenshot of the actual virtual board, tray/reference (when enabled), and cursor; Claude receives that image plus a coordinate frame, then can change the puzzle only through validated mouse-drag start/end points. The visible cursor follows each accepted drag. Reference-hidden Jigsaw runs do not send the cat image.
- **OpenAI:** `/api/test-provider` tests an OpenAI key server-side using the exact model ID selected in the Agents drawer. The puzzle-specific OpenAI runner is intentionally not wired yet; the UI keeps the limitation explicit rather than silently falling back to a different model.

The Agents drawer accepts the exact model ID for the selected provider. The current live Claude default is `claude-sonnet-5`; the default OpenAI verification model is `gpt-5.6-terra`. Each live Claude run displays accumulated input/output-token usage and a base-rate cost estimate. It is an estimate, not the provider invoice.

Temporary agent artifacts live under the operating system's temporary directory, not in this repository or in the browser. A previously written `.py` helper can be run only through the restricted algorithm runner: it has a short CPU/memory limit and no filesystem, shell, browser, network, environment-variable, or API-key access. It is intended for calculations, not general computer control.

## Why not use a browser-only key field?

Putting a secret in browser JavaScript risks exposing it through the page, browser tools, or logs. A local server keeps the key in the process environment and makes it possible to add the OpenAI Agents SDK and other provider adapters without leaking secrets to the client.
