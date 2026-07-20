# Publish Agent Arcade on Render

This repository is configured for a single Render **Web Service**: it serves the browser app and the Node agent routes from the same HTTPS URL.

## What the public site does with keys

- It is **BYOK-only**: `render.yaml` sets `BYOK_ONLY=true`.
- Do **not** add `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` to Render.
- A visitor enters a key in the **API keys** drawer. The key is held only in that page's memory, sent over HTTPS only for the visitor's provider request, and cleared on reload.
- The server does not write, log, or persist visitor keys.

## Deploy

1. Create or sign in to [Render](https://render.com/), then choose **New → Blueprint**.
2. Connect the `Gaurav17Joshi/AgentArcade` GitHub repository and select its `main` branch.
3. Render reads [`render.yaml`](render.yaml). Confirm the **Free** instance and create the service.
4. When the deploy completes, open the generated `https://…onrender.com` link.
5. Verify `https://your-service.onrender.com/api/health` returns `{"ok":true,"mode":"byok"}`.

The Free web-service option is suitable for the hackathon link. It spins down after 15 minutes idle and can take about a minute to wake up, so open the URL shortly before a judging demo. See [Render's free-tier documentation](https://render.com/docs/free).

Every later push to `main` can automatically redeploy the service after GitHub is connected.
