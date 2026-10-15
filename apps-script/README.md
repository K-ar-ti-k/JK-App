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
3. In Google Cloud Console, create a **Web application OAuth client ID**. Add
   `https://jk-app-eight.vercel.app` as an authorized JavaScript origin. The OAuth
   client ID is public; do not create or paste a client secret into this project.
4. In `Code.gs`, replace `REPLACE_WITH_GOOGLE_OAUTH_WEB_CLIENT_ID` with that
   client ID.
5. Save the script and choose **Deploy → New deployment → Web app**. Set
   **Execute as** to your account (the spreadsheet owner) and **Who has access**
   to **Anyone**. Apps Script verifies a Google sign-in token on every request;
   the web app itself does not permit writes from a user who is not in
   `adminEmails`.
6. Authorize the script to access the spreadsheet and make the deployment. Copy
   the URL ending in `/exec`.

## Configure Vercel

In the Vercel project's **Settings → Environment Variables**, set:

- `VITE_GOOGLE_CLIENT_ID`: the same OAuth web client ID as in `Code.gs`
- `VITE_APPS_SCRIPT_API_URL`: the deployed Apps Script URL ending in `/exec`

Add them for the Production environment, save, and redeploy. Repeat for Preview
if preview deployments need to work, and add each preview hostname as an
authorized origin in the OAuth client.

The login accepts any verified Google account as a viewer. Server-side code in
`Code.gs` treats only the email in `adminEmails` as an administrator. To grant
or revoke management access, update that list and create a new Apps Script
deployment version.

The portal asks Google to automatically restore a returning user's sign-in when
Google can verify the existing browser session. The portal does not save Google
ID tokens in browser storage; if Google cannot restore the session, use the
Google sign-in button again. **Sign out** disables automatic sign-in.

## Verify

Sign in at the deployed portal. Confirm that a normal Google account can see
dashboards but not **Manage services**. Sign in as the configured admin and
confirm that adding a service updates rows below the headers in `Web Master`.
