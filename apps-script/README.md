# JK Foundry services API setup

The API uses the existing spreadsheet's `Web Master` tab. Its first 20 rows
must include the headers `sr. no.`, `system name`, and `system link` in any
columns. The API preserves other columns and locates the service headers when
reading or writing. Existing
service rows are available to every signed-in Google user. Only the admin email
listed in `Code.gs` can change them.

## Deploy the Apps Script API

1. Open the existing services spreadsheet and choose **Extensions → Apps Script**.
2. Replace the contents of `Code.gs` with the project copy of [`Code.gs`](./Code.gs).
3. In Google Cloud Console, verify the **Web application OAuth client ID** used
   by the portal and add `https://jk-app-eight.vercel.app` as an authorized
   JavaScript origin. The OAuth client ID is public; do not create or paste a
   client secret into this project. `Code.gs` and Vercel's `GOOGLE_CLIENT_ID`
   must use the same ID.
4. In **Project Settings → Script Properties**, add `PORTAL_SHARED_SECRET`.
   Set it to the same randomly generated value as Vercel's
   `PORTAL_SHARED_SECRET`; use at least 32 random bytes and do not put it in
   source code.
5. Save the script and choose **Deploy → New deployment → Web app**. Set
   **Execute as** to your account (the spreadsheet owner) and **Who has access**
   to **Anyone**. The portal backend authenticates users with Google and signs
   its server-to-server Apps Script requests with the shared secret. Apps Script
   only accepts a signed request once and only permits users in `adminEmails`
   to write.
6. Authorize the script to access the spreadsheet and make the deployment. Copy
   the URL ending in `/exec`.

## Configure Vercel

In the Vercel project's **Settings → Environment Variables**, set:

- `VITE_GOOGLE_CLIENT_ID`: Google OAuth web client ID used by the sign-in button
- `GOOGLE_CLIENT_ID`: the same OAuth client ID, for server-side token verification
- `APPS_SCRIPT_API_URL`: the deployed Apps Script URL ending in `/exec`
- `PORTAL_SHARED_SECRET`: the exact same random secret saved in Apps Script
- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`: the REST credentials
  created by the Upstash integration
- `SESSION_TTL_SECONDS`: optional session lifetime in seconds (default: `604800`,
  seven days; maximum: 30 days)

Add them for the Production environment, save, and redeploy. Repeat for Preview
if preview deployments need to work, and add each preview hostname as an
authorized origin in the OAuth client.

Do not prefix server-only values with `VITE_`: Vite exposes `VITE_` variables in
the browser bundle. Generate the shared secret locally (for example, with
`openssl rand -hex 32`) and enter it directly into Vercel and Apps Script Script
Properties. Do not commit it or paste it into chat.

The login accepts any verified Google account as a viewer. Server-side code in
`Code.gs` treats only the email in `adminEmails` as an administrator. To grant
or revoke management access, update that list and create a new Apps Script
deployment version.

After the first Google sign-in, the Vercel API stores a random session record in
Upstash Redis and sets a `Secure`, `HttpOnly`, `SameSite=Lax` cookie. The Google
ID token is not saved in the browser or Redis. Reopening the app restores the
session using the cookie until its Redis TTL expires; **Sign out** revokes the
Redis session and clears the cookie.

## Verify

After deploying the new Apps Script version and Vercel environment variables,
sign in at the portal. Confirm that a normal Google account can see dashboards
but not **Manage services**, and that the configured admin can add a service.
Close and reopen the app to confirm the session restores without the sign-in
page. Sign out, reopen the app, and confirm that sign-in is required again.
