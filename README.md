# srt ai

A free, private AI chat with a Venice-style interface, powered by OpenRouter's free
open models.

- `client/` — Vite + React single-page app (dev server on port 3000)
- `api/` — Express service that streams chat completions from OpenRouter
  (`/api/models`, `/api/chat`, `/api/health`)

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

The model picker is filled from OpenRouter's catalogue filtered to models priced
at zero, so new free models show up without a code change. Chats are stored in
the browser's `localStorage`; no account or database is involved.

## Sandbox preview

`docker-compose.base44.yml` is kept in the environment configuration repository,
not here. It runs both services from the live source with `npm install` on
startup and named volumes for `node_modules`. `BASE44_PREVIEW_MODE=1` enables
the preview-only additions in `client/vite.config.js` (host allowlist entry for
the rotating sandbox hostname, polling file watch, HMR over port 443); with the
flag unset the original defaults apply.
