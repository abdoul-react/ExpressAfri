// Marker and helpers for mock/local data.
// Default: mocks enabled so the app can run without a backend.
// Toggle options (in order of precedence):
// 1. globalThis.__USE_MOCK__ (runtime, useful for Expo Go)
// 2. EXPO_PUBLIC_USE_MOCK (build-time env)
// 3. process.env.USE_MOCK (legacy build-time env)
// 4. Expo Constants.manifest.extra.USE_MOCK (when provided)

import Constants from "expo-constants";

function detectIsMock(): boolean {
  try {
    // runtime global toggle (useful on device)
    if (
      typeof globalThis !== "undefined" &&
      typeof (globalThis as Record<string, unknown>).__USE_MOCK__ !== "undefined"
    ) {
      return Boolean((globalThis as Record<string, unknown>).__USE_MOCK__);
    }
  } catch {}

  try {
    if (typeof process !== "undefined" && typeof process.env !== "undefined") {
      if (typeof process.env.EXPO_PUBLIC_USE_MOCK !== "undefined") {
        return !(
          process.env.EXPO_PUBLIC_USE_MOCK === "false" ||
          process.env.EXPO_PUBLIC_USE_MOCK === "0"
        );
      }
      if (typeof process.env.USE_MOCK !== "undefined") {
        return !(
          process.env.USE_MOCK === "false" || process.env.USE_MOCK === "0"
        );
      }
    }
  } catch {}

  try {
    const extra = Constants?.manifest?.extra || Constants?.expoConfig?.extra;
    if (extra && typeof extra.USE_MOCK !== "undefined") {
      return !(
        extra.USE_MOCK === "false" ||
        extra.USE_MOCK === false ||
        extra.USE_MOCK === "0"
      );
    }
  } catch {}

  // default to true so navigation and screens work without a backend
  return true;
}

export function isMock() {
  return detectIsMock();
}

const warnedFeatures = new Set<string>();

export function warnIfMock(feature: string) {
  if (isMock() && !warnedFeatures.has(feature)) {
    warnedFeatures.add(feature);
    // eslint-disable-next-line no-console
    console.warn(`[mock] Using mocked data for ${feature}`);
  }
}

export const IS_MOCK = isMock();

export default { IS_MOCK, isMock, warnIfMock };
