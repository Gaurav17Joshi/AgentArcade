# Agent Arcade

A browser-based workspace for watching agents solve interactive logic and visual puzzles.

## Run locally

```bash
node server.mjs
```

Open <http://127.0.0.1:4173>.

Read [the product and technical design report](AGENT_ARCADE_REPORT.md), [the implementation report](IMPLEMENTATION_REPORT.html), [the local API-key setup](API_SETUP.md), and [asset / puzzle sources](SOURCES.md).

## Publish a hackathon link

The app includes a Render Blueprint for a single HTTPS web service. It hosts both the front end and the Node agent server, in **bring-your-own-key mode**: visitors provide a key for their own live run and no author API key is deployed. Follow [RENDER_DEPLOY.md](RENDER_DEPLOY.md).
