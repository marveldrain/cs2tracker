# Deploy the current repository

This is the deployment path for `marveldrain/cs2tracker`, using the existing repository for both services.

## Current targets

- Repository: https://github.com/marveldrain/cs2tracker
- Deployment branch: `main`
- Vercel project root: `frontend`
- Render Blueprint path: root `render.yaml` (sets `rootDir: backend`)
- Database migration: `backend/db/001_initial.sql`
- Presentation route: `/demo`, linked from the homepage and navigation

The `/demo` route works without external services. Its player, matches, and messages are clearly labeled fictional examples. It never writes sample data into the database or claims that a real Steam account owns the sample stats. Real player routes require Supabase; replay imports require a configured backend and an authenticated user.

## Access needed

Use your own Vercel, Render, and Supabase accounts. Make provider access available through the task's supported connections. Put OAuth/API credentials in secure connection forms, never in chat or Git. A saved connection must expose the permissions and tools needed to create/update the intended project.

No hosting credentials were available when this deployment preparation was committed. A local Preview is available, but no public production deployment is claimed.

## Deployment sequence

1. **Supabase:** Create or choose the project. Run `001_initial.sql` once. Obtain the project URL, publishable/anon key, and TLS PostgreSQL connection string. Configure email login, invite the importer user, and add the final frontend `/login` URL to Auth redirects. If the DB endpoint uses the project's CA, download it and mount it on Render.
2. **Render:** Create a Blueprint from this repository using the deployment branch and root `render.yaml`. The Blueprint selects a paid `standard` service with one parser worker. Review the current provider price before provisioning. Configure `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `FRONTEND_ORIGIN`. Add `DATABASE_CA_PATH` if needed. Verify `/healthz` responds successfully.
3. **Vercel:** Import this GitHub repository, choose root directory `frontend`, Next.js, and Node 24. Set the production branch to `main` after merging the app into it. `frontend/vercel.json` defines install/build commands. Configure `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_API_URL` before deploying. `STEAM_WEB_API_KEY` is optional for vanity profile URLs.
4. **Origins:** Update Render's `FRONTEND_ORIGIN` and Supabase's Auth Site URL/redirect allowlist to the resulting Vercel domain. Redeploy affected services. If adding a custom domain later, repeat these origin updates.
5. **Presentation check:** Open `/` and `/demo` on the public domain. Filter maps, switch to Chat history, and search messages. Verify the fictional-data notice remains visible. Test desktop and mobile widths.
6. **Live-data check:** Sign in as an invited user and import a current Valve replay URL. Observe queued/running/completed status and open one of the parsed player's pages. Confirm persisted stats and recorded chat (if present in the replay). Verify the API stays responsive while parsing.

A production launch is complete only after the public frontend, backend health, database connection, sign-in, and real replay import have been verified. The sample dashboard alone does not verify that pipeline.

## Presentation walkthrough

1. Open the homepage and select **Explore sample dashboard**.
2. Explain the visible **Interactive sample** label: the records are fictional presentation data.
3. Select **Mirage** to show statistics and chart updates across a smaller match set.
4. Switch to **Chat history** and search for `flash` to show how conversation stays connected to the match.
5. Return to **All maps**, then **Match history** to show the full sample history.
6. Once a real replay has been imported, use that player's URL for the production walkthrough instead.

See [the full architecture guide](architecture-and-setup.md) for queue recovery, authentication, URL validation, parser substitution, and separate-repository alternatives.
