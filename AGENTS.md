# Repository working branches

- `main` is the user's Google Studio branch. Keep its game source, generated web export, native app and assets as supplied by Studio.
- Put assistant development on `codex/development`. Do not merge or push assistant changes into `main` unless the user explicitly requests that integration.
- Refresh this branch from `origin/main` when needed; resolve conflicts here. Do not merge this branch into main automatically.
- When asked for the Studio APK, build the exact requested `main` commit using its original root `app/` Android project and committed `app/src/main/assets/public/` bundle. Do not run Vite or Capacitor sync to replace that bundle.
- Verify packaged web files with `scripts/verify-studio-apk.py`. Only publish a Studio release for the actual main source commit, never label a development APK as the main build.
