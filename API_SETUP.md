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

- **Claude / Sokoban:** the local server runs a real tool loop. The main agent can inspect the board, spawn an isolated explorer, write a small `.md` or `.py` helper artifact in a temporary workspace, ask a deterministic sandbox solver for a plan, and apply only validated moves to the browser board.
- **Claude / Jigsaw:** the local server sends the cat reference only when reference mode is enabled. With it disabled, the model receives no hidden image and is deliberately prevented from placing tiles until a real board-observation tool exists.
- **OpenAI:** `/api/test-provider` tests an OpenAI key server-side. The puzzle-specific OpenAI runner is intentionally not wired yet; the UI keeps the failure explicit rather than silently falling back to a different model.

Temporary agent artifacts live under the operating system's temporary directory, not in this repository or in the browser. They cannot execute commands or access your home folder through this app.

## Why not use a browser-only key field?

Putting a secret in browser JavaScript risks exposing it through the page, browser tools, or logs. A local server keeps the key in the process environment and makes it possible to add the OpenAI Agents SDK and other provider adapters without leaking secrets to the client.
