# App Accessibility

## Web app

Deployment target: Expo web static export hosted on Vercel or Netlify.

One-time Vercel login, if needed:

```bash
npx vercel login
```

Build command:

```bash
npm install
npx expo export --platform web
```

Publish directory:

```text
dist
```

Required environment variables:

```text
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
EXPO_PUBLIC_API_URL
```

Current backend URL:

```text
https://nuslink-backend-production.up.railway.app
```

Submission link:

```text
Web app: TODO_ADD_DEPLOYED_WEB_URL
```

Deploy command:

```bash
npx vercel --prod --yes
```

## Android APK

The project is configured for an Expo EAS internal APK build using `eas.json`.

One-time Expo login, if needed:

```bash
npx --yes eas-cli login
```

Build command:

```bash
npx --yes eas-cli build --platform android --profile preview
```

After the build completes, EAS provides a downloadable APK artifact URL. Add that URL here:

```text
Android APK: TODO_ADD_EAS_APK_DOWNLOAD_URL
```

## Evaluator Android Emulator Instructions

1. Install Android Studio.
2. Open Android Studio, then open Device Manager.
3. Create or start any Android Virtual Device.
4. Download the APK from the link above.
5. Install it by dragging the APK onto the emulator window.
6. Alternatively, install it from a terminal:

```bash
adb install path/to/NUSLink.apk
```

7. Open NUSLink from the emulator app launcher.

## Evaluator Access Notes

The app uses Supabase email/password authentication and the deployed FastAPI backend.

Test account:

```text
Email: TODO_ADD_TEST_EMAIL
Password: TODO_ADD_TEST_PASSWORD
```

If no test account is provided, evaluators can create an account from the app's sign-up screen.
