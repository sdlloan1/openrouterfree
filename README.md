# srt ai

A free, private AI chat with a Venice-style interface, powered by OpenRouter's free
open models. The interface is light-only by design.

Attach files from the composer: images are downscaled in the browser and sent as
vision inputs, while text/code files are inlined into the prompt. Up to three
attachments per message, 8 MB each.

- `client/` — Vite + React single-page app (dev server on port 3000)
- `api/` — Express service that streams chat completions from OpenRouter
  (`/api/models`, `/api/chat`, `/api/health`; `/` returns a status summary)

## Local development

```bash
# terminal 1
cd api && npm install && OPENROUTER_API_KEY=sk-or-... npm run dev

# terminal 2
cd client && npm install && npm run dev
```

The Vite dev server proxies `/api/*` to `http://127.0.0.1:8000`, so the browser
talks to a single origin.

## Configuration

| Variable | Purpose |
| --- | --- |
| `OPENROUTER_API_KEY` | Required to chat. Create a free key at <https://openrouter.ai/keys>. |
| `PORT` | API port (default `8000`). |
| `OPENROUTER_BASE_URL` | Override the OpenRouter API base (default `https://openrouter.ai/api/v1`). |
| `PUBLIC_APP_URL` | Sent to OpenRouter as the referrer / app title context. |
| `API_INTERNAL_URL` | Where the Vite dev server proxies `/api` (default `http://127.0.0.1:8000`). |
| `VITE_API_BASE_URL` | API origin baked into the client build. Empty means same-origin (`/api`), which is what local dev uses. |
| `ALLOWED_ORIGINS` | Comma-separated browser origins allowed to call the API cross-origin (e.g. `https://sdlloan1.github.io`). |

The model picker is filled from OpenRouter's catalogue filtered to models priced
at zero, so new free models show up without a code change. Chats are stored in
the browser's `localStorage`; no account or database is involved.

## Deployment — GitHub Pages (client) + Render (API)

The interface is static, so it is published to GitHub Pages at
<https://sdlloan1.github.io/openrouterfree/>. GitHub Pages cannot run the Express
service, so the API runs on Render and the deployed client calls it directly.

1. **API on Render** — Render dashboard → *New* → *Blueprint* → pick this
   repository. `render.yaml` creates the Node web service from `api/`, health
   check `/api/health`, with `ALLOWED_ORIGINS=https://sdlloan1.github.io`. Set
   `OPENROUTER_API_KEY` when prompted (it is marked `sync: false`, so it is never
   stored in the repository). Note the service URL, e.g.
   `https://openrouterfree-api.onrender.com`.
2. **Client build target** — repository *Settings* → *Secrets and variables* →
   *Actions* → *Variables* → new variable `API_BASE_URL` with that Render URL
   (no trailing slash).
3. **Pages source** — *Settings* → *Pages* → *Build and deployment* → *Source*:
   **GitHub Actions**.
4. Push to `main` (or run *Deploy client to GitHub Pages* manually). The workflow
   builds `client/` with `VITE_API_BASE_URL` and publishes `client/dist` to
   <https://sdlloan1.github.io/openrouterfree/>.

`client/vite.config.js` sets `base: '/openrouterfree/'` for production builds
only; `vite dev` still serves from `/`. If you fork this under another owner or
repository name, change that base and the `render.yaml` origin values to match.

## Sandbox preview

`docker-compose.base44.yml` is kept in the environment configuration repository,
not here. It runs both services from the live source with `npm install` on
startup and named volumes for `node_modules`. `BASE44_PREVIEW_MODE=1` enables
the preview-only additions in `client/vite.config.js` (host allowlist entry for
the rotating sandbox hostname, polling file watch, HMR over port 443); with the
flag unset the original defaults apply.
