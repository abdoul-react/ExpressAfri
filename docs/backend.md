# Backend integration guide

This project runs with mocked data by default to make development (Expo Go) fast. Follow these steps to connect a real backend and prepare for production.

Environment variables

- `EXPO_PUBLIC_API_URL` or `API_BASE_URL`: base URL of your backend (e.g. `https://api.example.com`).
- `USE_MOCK`: set to `false` to disable mocks at build time.

Runtime toggle (Expo Go)

- You can toggle mocks at runtime by setting a global before services are imported:

```js
// App.tsx (top of file, before other imports)
// @ts-ignore
global.__USE_MOCK__ = false;
```

How services are organized

- `src/services/apiAdapter.ts`: single HTTP adapter used by all services. It will call your backend when mocks are disabled.
- `src/services/*Service.ts`: adapters that return normalized data. Replace their internal API calls if needed.
- `src/features/*/*Service.ts`: business logic services (not the UI). Keep UI screens thin.

Recommended steps when wiring backend

1. Set `EXPO_PUBLIC_API_URL` in your `.env` / `app.json` `expo.extra` and set `USE_MOCK=false` for production builds.
2. Implement authentication: add token injection in `apiAdapter.safeFetch` (Authorization header) and refresh handling for 401.
3. Add error handling and monitoring (Sentry, Bugsnag) around `apiAdapter`.
4. Ensure all data contracts match the services; update service mappers to normalize backend responses.
5. Run CI checks: TypeScript, tests, lint, and production build.

CI suggestion

- Add a GitHub Actions workflow to run `npm ci`, `npx tsc --noEmit`, `npm test`, and `expo prebuild` as appropriate.

If you want, I can:

- Add the auth token injection and 401 handling in `apiAdapter`.
- Create a `docs/env.example` file and a GitHub Actions CI workflow.
