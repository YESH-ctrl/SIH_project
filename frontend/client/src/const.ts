export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

export function getApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && envUrl.trim() !== "" && !envUrl.includes("localhost") && !envUrl.includes("127.0.0.1")) {
    return envUrl;
  }
  if (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
    return "https://sihbackend-six.vercel.app/api/v1";
  }
  return envUrl || "http://localhost:8000/api/v1";
}

export function getWsBaseUrl(): string {
  const envWs = import.meta.env.VITE_WS_BASE_URL;
  if (envWs && envWs.trim() !== "" && !envWs.includes("localhost") && !envWs.includes("127.0.0.1")) {
    return envWs;
  }
  if (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
    return "wss://sihbackend-six.vercel.app";
  }
  return envWs || "ws://localhost:8000";
}

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = () => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);

  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
};
