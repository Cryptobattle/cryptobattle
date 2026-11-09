declare global {
  interface Window {
    __CRYPTOBATTLE_CONFIG__?: Record<string, string>;
  }
}

// Docker supplies public settings at startup; Vite settings remain the development fallback.
export const frontendConfig: Record<string, string | undefined> = Object.freeze({
  ...import.meta.env,
  ...window.__CRYPTOBATTLE_CONFIG__,
});
