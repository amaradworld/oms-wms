# Building & Publishing to Google Play Store

This guide walks you through converting the GlobalSupply Techno web app into a native Android app on the Google Play Store using **Trusted Web Activity (TWA)** — the same approach used by Twitter Lite, Starbucks, and Pinterest.

## How it works

```
┌─────────────────────────────────────────────────────────┐
│  Play Store                                             │
│  ┌───────────────────────────────────────────────────┐  │
│  │  GlobalSupply Techno (in.globalsupply.techno)     │  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │  TWA WebView (fullscreen, no URL bar)       │  │  │
│  │  │  ┌────────────────────────────────────────┐ │  │  │
│  │  │  │  https://app.globalsupply.in/app       │ │  │  │
│  │  │  │  (your PWA, served as native app)     │ │  │  │
│  │  │  └────────────────────────────────────────┘ │  │  │
│  │  └─────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

The Android app is a thin wrapper (Trusted Web Activity) that opens your PWA at `https://app.globalsupply.in/app` in a fullscreen WebView. Users can't tell the difference from a native app.

---

## Prerequisites

Install on your local machine:

| Tool | Version | Download |
|------|---------|----------|
| Node.js | 18+ | https://nodejs.org |
| Java JDK | 17+ | https://adoptium.net |
| Android SDK | 34 | Auto-installed by Bubblewrap |

Set `JAVA_HOME` environment variable to your JDK install path.

---

## Step 1: Deploy the PWA updates

The TWA needs the PWA to be live at `https://app.globalsupply.in`. The current `main` branch has all the PWA fixes — just push and deploy:

```bash
git push origin main
# Vercel auto-deploys the frontend
# Render auto-deploys the backend
```

Verify the PWA is valid:
- Open https://app.globalsupply.in/manifest.json → should return valid JSON
- Open Chrome DevTools → Application → Manifest → should show "Installable"
- Open https://app.globalsupply.in/sw.js → should return the service worker
- Open https://app.globalsupply.in/.well-known/assetlinks.json → should return the Digital Asset Links (with placeholder fingerprint for now)

---

## Step 2: Generate Android signing keystore

```bash
node scripts/build-android.js keystore
```

This creates `android.keystore` with:
- Alias: `android`
- Password: `changeit` (change in production!)
- Validity: 25,000 days (~68 years)

**IMPORTANT:** Back up this file. If you lose it, you can NEVER update the app on Play Store.

It also extracts the SHA-256 fingerprint and updates `frontend/public/.well-known/assetlinks.json`.

---

## Step 3: Generate the Android project

```bash
node scripts/build-android.js init
```

This uses Bubblewrap to generate the `./android/` directory from `twa-manifest.json`.

---

## Step 4: Build the AAB (Android App Bundle)

```bash
node scripts/build-android.js build
```

Output: `android/app/build/outputs/bundle/release/app-release-bundle.aab`

This is the file you upload to Google Play Console.

---

## Or: run the full pipeline

```bash
node scripts/build-android.js
```

This runs keystore → init → build in one command.

---

## Step 5: Deploy Digital Asset Links

The TWA requires `assetlinks.json` to be live at `https://app.globalsupply.in/.well-known/assetlinks.json` with the correct SHA-256 fingerprint.

The build script auto-updates this file. Just commit and push:

```bash
git add frontend/public/.well-known/assetlinks.json
git commit -m "chore: update Digital Asset Links with release keystore fingerprint"
git push origin main
```

Vercel serves the `.well-known/` directory automatically.

**Verify:** Open https://app.globalsupply.in/.well-known/assetlinks.json in a browser — should return JSON with your fingerprint.

---

## Step 6: Upload to Google Play Console

1. Go to https://play.google.com/console
2. Click **Create app**
3. Fill in app details from `docs/PLAY_STORE_LISTING.md`
4. Go to **Release → Production → Create new release**
5. Upload `android/app/build/outputs/bundle/release/app-release-bundle.aab`
6. Add release notes (see PLAY_STORE_LISTING.md)
7. **Review and roll out**

Review typically takes 3–7 days for a new app.

---

## Step 7: Post-launch verification

After the app is live:

1. Install from Play Store on a real Android device
2. Verify it opens directly to the dashboard (no browser bar)
3. Test barcode scanning
4. Test offline mode (airplane mode → cached pages should still load)
5. Check push notifications (if configured)

---

## Updating the app

To push a new version:

1. Make your changes (web app updates are instant — no app update needed for most changes)
2. If you need a native-only change (icons, splash screen, native APIs):
   ```bash
   # Bump version in twa-manifest.json
   # appVersion: "1.0.1", appVersionCode: 2
   node scripts/build-android.js build
   ```
3. Upload new AAB to Play Console → Production → Create new release

Web app changes don't require Play Store review — users get them immediately on next launch.

---

## Troubleshooting

### "Digital Asset Links verification failed"
- Verify `https://app.globalsupply.in/.well-known/assetlinks.json` returns the correct fingerprint
- Check SHA-256 matches: `keytool -list -v -keystore android.keystore -alias android`
- Wait 5-10 minutes after deploying assetlinks.json (Google caches)

### "npm not found" during build
- Install Node.js 18+ and restart terminal

### "JAVA_HOME not set"
- Set JAVA_HOME to your JDK install path
- Windows: `setx JAVA_HOME "C:\Program Files\Eclipse Adoptium\jdk-17.0.10.7-hotspot"`

### "SDK location not found"
- Bubblewrap auto-downloads Android SDK to `./android-sdk/`
- Or set ANDROID_HOME to your existing SDK location

### "Build failed with Gradle error"
- Run `cd android && ./gradlew clean` then re-run build

---

## Architecture notes

- **App size**: ~2-3 MB (just the TWA wrapper)
- **Offline support**: Yes (via service worker)
- **Push notifications**: Yes (via web push + native bridge)
- **Updates**: Web app changes are instant; native changes need Play Store review
- **Play Store policy**: TWA apps must offer equivalent functionality to the web app (we do)
