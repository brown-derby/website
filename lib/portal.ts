import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

export const ACCESS_COOKIE = "bd_access_token";
export const REFRESH_COOKIE = "bd_refresh_token";

const secureCookies = process.env.NODE_ENV === "production";

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(name + " is not configured");
  return value;
}

export function portalConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
}

export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.ORDER_EMAIL_FROM);
}

export function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).origin === request.nextUrl.origin;
  } catch {
    return false;
  }
}

export async function authRequest(path: string, init: RequestInit = {}) {
  const base = required("SUPABASE_URL").replace(/\/$/, "");
  const anon = required("SUPABASE_ANON_KEY");
  return fetch(base + "/auth/v1" + path, {
    ...init,
    cache: "no-store",
    headers: {
      apikey: anon,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
}

export async function databaseRequest(
  path: string,
  accessToken: string,
  init: RequestInit = {}
) {
  const base = required("SUPABASE_URL").replace(/\/$/, "");
  const anon = required("SUPABASE_ANON_KEY");
  return fetch(base + "/rest/v1/" + path, {
    ...init,
    cache: "no-store",
    headers: {
      apikey: anon,
      Authorization: "Bearer " + accessToken,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
}

type AuthPayload = {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  user?: PortalUser;
};

export type PortalUser = {
  id: string;
  email?: string;
  user_metadata?: {
    business_name?: string;
    contact_name?: string;
    [key: string]: unknown;
  };
};

export async function setSessionCookies(payload: AuthPayload) {
  const store = await cookies();
  store.set(ACCESS_COOKIE, payload.access_token, {
    httpOnly: true,
    secure: secureCookies,
    sameSite: "lax",
    path: "/",
    maxAge: payload.expires_in || 3600,
  });
  store.set(REFRESH_COOKIE, payload.refresh_token, {
    httpOnly: true,
    secure: secureCookies,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSessionCookies() {
  const store = await cookies();
  store.set(ACCESS_COOKIE, "", {
    httpOnly: true,
    secure: secureCookies,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  store.set(REFRESH_COOKIE, "", {
    httpOnly: true,
    secure: secureCookies,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

async function userFromToken(accessToken: string) {
  const response = await authRequest("/user", {
    headers: { Authorization: "Bearer " + accessToken },
  });
  if (!response.ok) return null;
  return (await response.json()) as PortalUser;
}

export async function getSession() {
  if (!portalConfigured()) return null;
  const store = await cookies();
  let accessToken = store.get(ACCESS_COOKIE)?.value;
  const refreshToken = store.get(REFRESH_COOKIE)?.value;

  if (accessToken) {
    const user = await userFromToken(accessToken);
    if (user) return { user, accessToken };
  }

  if (!refreshToken) return null;

  const refreshed = await authRequest("/token?grant_type=refresh_token", {
    method: "POST",
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!refreshed.ok) {
    await clearSessionCookies();
    return null;
  }

  const payload = (await refreshed.json()) as AuthPayload;
  await setSessionCookies(payload);
  accessToken = payload.access_token;
  const user = payload.user || (await userFromToken(accessToken));
  return user ? { user, accessToken } : null;
}

export function customerSnapshot(user: PortalUser) {
  return {
    email: user.email || "",
    businessName:
      typeof user.user_metadata?.business_name === "string"
        ? user.user_metadata.business_name
        : "",
    contactName:
      typeof user.user_metadata?.contact_name === "string"
        ? user.user_metadata.contact_name
        : "",
  };
}

export function orderRecipient() {
  return process.env.ORDER_EMAIL_TO || "csr@brownderby.ca";
}

export function siteUrl(fallbackOrigin?: string) {
  return process.env.NEXT_PUBLIC_SITE_URL || fallbackOrigin || "";
}
