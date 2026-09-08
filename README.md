# Hey Nav

<img width="1280" height="800" alt="heynav-login-preview" src="https://github.com/user-attachments/assets/26304b47-2bed-43ce-8e3f-73322dd2a884" />



Front end for **Hey Nav**, MIKE LLC's governed CUI workspace, built on the
[AsterionDB](https://asteriondb.com) data-layer architecture. This repository currently
contains the sign-in / sign-out flow and the signed-in application shell (sidebar navigation,
profile menu, dashboard). The seven product functions are stubbed and will be wired to DbTwig as
their build cards land.

The application follows the `vm-manager` reference in
[JumpinJackFlash/database-os](https://github.com/JumpinJackFlash/database-os): the browser only
calls Next.js Server Actions; those call DbTwig with a `Bearer <sessionId>` header read from an
httpOnly cookie. The session id never reaches the browser.

## Prerequisites

- Node.js 20.9 or newer (an `.nvmrc` is included — `nvm use`)
- npm 10+
- Network access to the AsterionDB instance you are pointing at (defaults to
  `https://cloud-test.asteriondb.com/dbTwig`)
- A user account on that instance (created in AsterionDB, not in this app)

## Quick start

```bash
git clone <this-repo> heynav
cd heynav
cp .env.example .env.local        # edit if you are not using cloud-test
npm install
npm run dev
```

Open http://localhost:3000. You are routed to `/login`. Sign in with your AsterionDB
identification and password; on success you land on `/workspace`.

## Configuration

All configuration is by environment variable. `.env.local` is git-ignored; never commit real
endpoints or secrets.

| Variable | Default | Purpose |
| --- | --- | --- |
| `DB_TWIG_URL` | `https://cloud-test.asteriondb.com/dbTwig` | DbTwig endpoint of the AsterionDB instance |
| `DB_TWIG_LOGIN_SETTINGS_API` | `dbBunker/getLoginPageSettings` | Anonymous call made when the login page renders. Change to the Hey Nav service once it is enrolled in DbTwig. |
| `DB_TWIG_LOG_SECRETS` | `0` | `1` prints full session ids in the server log instead of a redacted prefix |
| `PORT` | `3000` | Port for `npm start` / the container |

## Watching the API calls

Every DbTwig call is traced in **the terminal running the server** (this is where the actual
HTTP requests happen):

```
[middleware] /login — session: none
[dbTwig →] GET https://cloud-test.asteriondb.com/dbTwig/dbBunker/getLoginPageSettings { headers: … }
[dbTwig ←] 200 OK dbBunker/getLoginPageSettings (212 ms) { … }
[dbTwig →] POST https://cloud-test.asteriondb.com/dbTwig/icam/createUserSession { body: { identification, password: "••••••••" } }
[dbTwig ←] 200 OK icam/createUserSession (388 ms) { sessionId: "A49CF6ED…", sessionStatus: "active", firstName: … }
[cookie] set heynav.session for AsterionDB Administrator
[middleware] /workspace — session: present
[dbTwig →] GET https://cloud-test.asteriondb.com/dbTwig/icam/terminateUserSession { headers: { Authorization: "Bearer A49CF6ED…" } }
[cookie] deleted heynav.session
```

The **browser console** shows the client half (`[login] …`, `[profile] …`, `[logout] …`) with
sanitized responses.

## Routes and DbTwig calls

| Route | What it does | DbTwig call |
| --- | --- | --- |
| `/` | Redirects by session state | — |
| `/login` | Sign-in screen | `GET  <DB_TWIG_LOGIN_SETTINGS_API>` on render; `POST icam/createUserSession` on submit |
| `/workspace` | Dashboard inside the app shell | — (protected) |
| `/workspace/<slug>` | Placeholder for each function (ask, shred, comply, draft, red-team, share, vault, evidence, audit, workspaces, library, settings) | — (protected) |
| `/logout` | Terminates the session, shows a receipt | `GET icam/terminateUserSession`, then the cookie is cleared |

`middleware.ts` sends anonymous requests for `/workspace/*` to `/login?next=…` and sends
signed-in requests for `/login` to `/workspace`.

## Project layout

```
src/
  middleware.ts                 route guard (reads the cookie, no DbTwig call)
  utils/
    dbTwig.ts                   fetch wrapper + tracing (equivalent of vm-manager callDbTwig)
    sessionCookie.ts            httpOnly cookie helpers (equivalent of coookieMonster.ts)
    serverFunctions.ts          getLoginPageSettings / createUserSession / terminateUserSession / getSessionSummary
  app/
    layout.tsx                  fonts (self-hosted via next/font) + global CSS
    globals.css                 brand tokens and auth-screen styles
    components/                 MarkingBar, Wordmark
    login/                      page.tsx (server, fetches settings) + LoginForm.tsx (client)
    logout/page.tsx             terminates the session on arrival, shows a receipt
    workspace/
      layout.tsx                session check, wraps children in the shell
      AppShell.tsx              sidebar + top bar (client)
      ProfileMenu.tsx           avatar / name / sign-out menu
      nav.ts                    navigation structure — add routes here
      Icon.tsx                  inline SVG icons
      app.css                   shell styles
      page.tsx                  dashboard
      [section]/page.tsx        placeholder per nav item
public/mike-llc-logo.png
```

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server with hot reload |
| `npm run typecheck` | TypeScript check without emitting |
| `npm run build` | Production build (`.next/standalone`) |
| `npm start` | Serve the production build |

## Running in a container

The `Dockerfile` produces a standalone image; the container makes no outbound request other than
to `DB_TWIG_URL` (fonts are baked in at build time).

```bash
docker build -t heynav .
docker run --rm -p 3000:3000 -e DB_TWIG_URL=https://cloud-test.asteriondb.com/dbTwig heynav
# or
docker compose up --build
```

Podman works the same way (`podman build`, `podman run`, `podman compose`). This is the same
pattern `vm-manager` uses to run beside DbTwig on the AsterionDB host.

### Where it should run

Development: anywhere that can reach the DbTwig endpoint. Production: inside the customer's
authorized boundary (OCI Government/Defense realm tenancy or on-prem Oracle), on a private
subnet next to the AsterionDB database, behind the customer's load balancer. Do not deploy to a
hosted Next.js platform — the server holds live database sessions and would move CUI outside the
boundary.

## Adding a new page

1. Add an entry to `NAV` in `src/app/workspace/nav.ts` (label, icon, description, build card).
2. It appears in the sidebar and gets a placeholder at `/workspace/<slug>`.
3. Replace the placeholder with a real page at `src/app/workspace/<slug>/page.tsx` — it will
   take precedence over the `[section]` route. Fetch data through a new function in
   `serverFunctions.ts` that calls `callDbTwig('<service>/<api>')`.
4. On a `403` from any call, send the user to `/logout`; the session was invalidated
   server-side.

## Troubleshooting

- **Login page shows "Settings call … unreachable" / HTTP 0** — the server cannot reach
  `DB_TWIG_URL`. Check the URL, DNS, and any egress proxy. The sign-in form still renders.
- **HTTP 403 on `getLoginPageSettings`** — the settings API is not exposed anonymously on this
  instance. Set `DB_TWIG_LOGIN_SETTINGS_API` to one that is, or leave it; login still works.
- **Sign-in rejected** — the error block shows DbTwig's `errorMessage` and the HTTP status. The
  account must exist in AsterionDB's ICAM.
- **Stuck redirecting to `/login` after signing in** — the cookie could not be set. In
  production the cookie is `secure`, so the site must be served over HTTPS.
- **Build fails fetching fonts** — `next/font` needs outbound access to Google Fonts at build
  time only. Build on a machine with internet access, then ship the image.

## Continuous integration

`.github/workflows/ci.yml` runs `npm ci`, `npm run typecheck`, and `npm run build` on every
push to `main` and every pull request.
