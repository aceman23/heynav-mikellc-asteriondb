# Hey Nav powered by AsterionDB

<img width="1280" height="800" alt="heynav-login-preview" src="https://github.com/user-attachments/assets/124e6a8e-970b-4080-a785-cc64f02b10f2" />


Front end for **Hey Nav**, MIKE LLC's governed CUI workspace, built on the
[AsterionDB](https://asteriondb.com) data-layer architecture. This repository currently
contains the sign-in / sign-out flow and the signed-in application shell (sidebar navigation,
profile menu, dashboard). The seven product functions are stubbed and will be wired to DbTwig as
their build cards land.

The application follows the `vm-manager` reference in
[JumpinJackFlash/database-os](https://github.com/JumpinJackFlash/database-os): the browser only
calls Next.js route handlers under `/api/`; those call DbTwig with a `Bearer <sessionId>` header read from an
httpOnly cookie. The session id never reaches the browser.

## Prerequisites

- Node.js 20.9 or newer (an `.nvmrc` is included — `nvm use`)
- npm 10+
- Network access to the AsterionDB instance you are pointing at (defaults to
  `https://cloud-test.asteriondb.com/dbTwig`)
- A user account on that instance (created in AsterionDB, not in this app)

## System Architecture Overview 

<img width="2720" height="2432" alt="heynav_system_architecture" src="https://github.com/user-attachments/assets/d4518315-f682-4285-bd03-3cb626725a47" />



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
| `DB_TWIG_LOGIN_SETTINGS_API` | `dgBunker/getLoginPageSettings` | Anonymous call made when the login page renders. Change to the Hey Nav service once it is enrolled in DbTwig. |
| `DB_TWIG_LOG_SECRETS` | `0` | `1` prints full session ids in the server log instead of a redacted prefix |
| `HEYNAV_SAMPLE_DATA` | `0` | `1` evaluates opportunity queries in-memory over marked sample rows (UI testing before the `heyNav` service exists) |
| `HEYNAV_QUERY_MODE` | `full` | `basic` fetches every row from `HEYNAV_LIST_API` (no parameters) and filters/sorts/pages in the app; `full` POSTs the query to `HEYNAV_QUERY_API` |
| `HEYNAV_LIST_API` | `heyNav/getBidOpportunities` | Parameterless list entry point used in `basic` mode |
| `HEYNAV_QUERY_API` | `heyNav/queryBidOpportunities` | DbTwig API for the opportunities query |
| `HEYNAV_GET_OPPORTUNITY_API` | `heyNav/getBidOpportunity` | DbTwig API for one opportunity incl. description |
| `HEYNAV_UPLOAD_API` | `dgBunker/uploadFiles` | Multipart upload entry point used by `/api/upload` |
| `HEYNAV_SET_FLAGS_API` | `heyNav/setOpportunityFlags` | Interested / rejected flags |
| `HEYNAV_ATTACH_DOCUMENT_API` | `heyNav/attachDocument` | Record an uploaded object against an opportunity |
| `HEYNAV_GET_DOCUMENTS_API` | `heyNav/getDocuments` | List documents for an opportunity |
| `HEYNAV_ASK_API` | `heyNav/askQuestion` | Grounded question answering with citations |
| `PORT` | `3000` | Port for `npm start` / the container. **Must be set in the shell or the service unit, not in `.env`/`.env.local`** — Next.js binds the port before it reads env files. `PORT=8080 npm start`, or `npm start -- -p 8080`. |

## Watching the API calls

Every DbTwig call is traced in **the terminal running the server** (this is where the actual
HTTP requests happen):

```
[middleware] /login — session: none
[dbTwig →] GET https://cloud-test.asteriondb.com/dbTwig/dgBunker/getLoginPageSettings { headers: … }
[dbTwig ←] 200 OK dgBunker/getLoginPageSettings (212 ms) { … }
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
| `/workspace/opportunities` | Query screen over `bid_opportunities` — every column filterable, sortable, choosable; URL is the query. Row drawer: interested/reject flags, attached documents, upload | `POST heyNav/queryBidOpportunities`; drawer → `getBidOpportunity`, `setOpportunityFlags`, `getDocuments`, `attachDocument`, `dgBunker/uploadFiles` |
| `/workspace/<slug>` | Placeholder for each function (ask, shred, comply, draft, red-team, share, vault, evidence, audit, workspaces, library, settings) | — (protected) |
| `/workspace/profile/naics` | Choose sectors and verify NAICS codes; saved to the user profile and used as the "My NAICS" preset | `getNaicsSectors`, `getNaicsBySector`, `getNaicsCodeDescriptions`, `getUserProfile`, `saveUserProfile` |
| `/workspace/ask` | Ask a question over vault documents (optionally scoped to one opportunity) | `POST heyNav/askQuestion` via `/api/ask` |
| `/workspace/vault` | Upload files into the bunker with per-file progress | `POST dgBunker/uploadFiles` (multipart, via `/api/upload`) |
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
| --- | --- | --- |
| `npm run dev` | Development server with hot reload |
| `npm run typecheck` | TypeScript check without emitting |
| `npm run build` | Production build (`.next/standalone`) |
| `npm start` | Serve the production build |

## Working against cloud-test from your machine

DbTwig on cloud-test listens on port 8080 on the compute node. Open an SSH tunnel (Steve has your public key on the node), then point the app at the tunnel:

```bash
ssh asterion@cloud-test-compute.asteriondb.com -L 8080:localhost:8080
# leave this running
```

In `.env.local`:

```
DB_TWIG_URL=http://localhost:8080/dbTwig
```

The tunnel forwards your local `localhost:8080` to the compute node's `localhost:8080`, so the app talks to DbTwig as if it were local. Keep the SSH session open while you work.

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

## Opportunities query screen

`/workspace/opportunities` queries the SAM.gov-shaped `bid_opportunities` table. All 50
columns are queryable: the field catalog in `src/app/workspace/opportunities/fields.ts` gives
each column a type (text, number, date, timestamp, flag, clob) which determines its operators.
Filters AND together; a quick-search box matches the identifying text columns; columns are
choosable and sortable; the URL encodes the whole query so results can be bookmarked or shared.

The API contract the screen is built against is in `docs/heynav-api-contract.md`; `db/heynav/` is a
reference PL/SQL implementation of it (see its README for install).
Three query modes, chosen by env: `HEYNAV_SAMPLE_DATA=1` drives the screen from rows marked
`SAMPLE-*`; `HEYNAV_QUERY_MODE=basic` calls the parameterless `heyNav/getBidOpportunities`, normalizes
whatever column names come back (camelCase, snake_case, or UPPERCASE; Oracle date formats), and runs
the filter/sort/page engine in the app; `full` sends the query to `heyNav/queryBidOpportunities`. The
results bar labels the mode. `/api/opportunities/raw` (signed in) shows the list entry point's raw
response and which catalog columns were recognised — use it to check a new entry point's shape.

## File uploads (Vault)

Uploads follow the reference dgBunker client: a multipart form with `name`, `lastModified`,
`size`, `newVersion` (`Y`/`N`), `objectId` (when replacing a version), and `file`, posted to
`dgBunker/uploadFiles` with the session bearer. Because the session id lives only in the
httpOnly cookie, the browser posts to `/api/upload` (`src/app/api/upload/route.ts`), which adds
the header and forwards the body unchanged. `src/utils/upload.ts` is the browser helper —
`uploadFile(file, { newVersionOf, onProgress })` — and `UploadDropzone` is the drag-and-drop
component. Progress events come from the browser→server leg; the server→DbTwig leg is logged
in the terminal like every other call.

Route handlers don't have the server-action body limit, but very large files are buffered in
memory on the Next.js server before forwarding; if multi-GB uploads are expected, switch the
handler to stream the request body.

## Adding a new page

1. Add an entry to `NAV` in `src/app/workspace/nav.ts` (label, icon, description, build card).
2. It appears in the sidebar and gets a placeholder at `/workspace/<slug>`.
3. Replace the placeholder with a real page at `src/app/workspace/<slug>/page.tsx` — it will
   take precedence over the `[section]` route. Fetch data through a new function in
   `serverFunctions.ts` that calls `callDbTwig('<service>/<api>')`.
4. On a `403` from any call, send the user to `/logout`; the session was invalidated
   server-side.

## Troubleshooting

- **HTTP 500 with `ORA-06502 … hex to raw conversion error` in `DBTWIG_ICAM.ICAM`** — DbTwig
  received an `Authorization: Bearer …` header whose value is not a hex session id (typically
  `Bearer null` on an anonymous call). Anonymous calls must send no `Authorization` header at
  all; `src/utils/dbTwig.ts` already does this. If you see it, check that nothing else (a proxy,
  a fetch wrapper) is adding the header.

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
