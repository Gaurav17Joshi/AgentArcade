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

4. Open `http://127.0.0.1:4173`, click **API keys**, and look for green status dots.

If port 4173 is busy, use another local port, for example `PORT=4174 node server.mjs`.

`.env.local` is ignored by Git. The browser never receives or displays the key. The new local server only reports whether a provider is configured; the live provider adapters will use those keys server-side in the next runtime integration.

## Why not use a browser-only key field?

Putting a secret in browser JavaScript risks exposing it through the page, browser tools, or logs. A local server keeps the key in the process environment and makes it possible to add the OpenAI Agents SDK and other provider adapters without leaking secrets to the client.
