# Google Sign-In setup

This guide configures Google OAuth for the A-YOS mobile/web client through Supabase Auth. Complete the provider setup before testing production sign-in.

## 1. Create Google OAuth credentials

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Select the project used for A-YOS, or create one.
3. Configure the OAuth consent screen with the app name and support email.
4. Create an OAuth client ID for a **Web application**.
5. Add this authorized redirect URI:

   `https://qsurouiyvisykjkgjqmz.supabase.co/auth/v1/callback`

6. Copy the client ID and client secret.

## 2. Enable Google in Supabase

1. Open the Supabase project.
2. Go to **Authentication → Providers → Google**.
3. Turn on Google.
4. Paste the Google client ID and client secret.
5. Save the provider settings.

## 3. Configure redirect URLs

In **Authentication → URL Configuration**, set the production site URL to:

`https://ayos-final-mobile.vercel.app`

Add the production callback/deep-link patterns required by the app, including:

- `https://ayos-final-mobile.vercel.app/**`
- `ayos://**`

Keep localhost URLs only for local development.

## 4. Verify

1. Open the production app in a private browser window.
2. Select **Continue with Google**.
3. Complete Google consent and confirm the app returns to A-YOS.
4. Confirm a user profile is created in Supabase and the authenticated session persists after reload.

Never commit the client secret or any service-role key. Store secrets only in the Supabase dashboard or the deployment secret manager.
