// Equivalent of vm-manager/src/utils/coookieMonster.ts.
// The DbTwig sessionId lives only in an httpOnly cookie; the browser never
// sees it. Server functions read it back to build the Bearer header.

import { cookies } from "next/headers";

const SESSION_COOKIE = "heynav.session";

export type SessionCookieT = {
  sessionId: string;
  displayName: string;
  emailAddress: string | null;
  signedInAt: string; // ISO timestamp
};

export async function createSessionCookie(data: SessionCookieT) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, JSON.stringify(data), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
  console.log(`[cookie] set ${SESSION_COOKIE} for ${data.displayName}`);
}

export async function deleteSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete({ name: SESSION_COOKIE, path: "/" });
  console.log(`[cookie] deleted ${SESSION_COOKIE}`);
}

export async function getSessionCookie(): Promise<SessionCookieT | undefined> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE);
  if (!raw || "" === raw.value) return undefined;
  try {
    return JSON.parse(raw.value) as SessionCookieT;
  } catch {
    return undefined;
  }
}

// ---- Default NAICS mirror --------------------------------------------------
// heyNav/setDefaultNaicsCodes stores the user's defaults, but there is no read
// entry point yet. Until there is, the app keeps a copy of what it last saved
// successfully in this cookie so the profile page and "My NAICS" preset work.
// Once HEYNAV_GET_PROFILE_API is set, the database is read instead.

const NAICS_COOKIE = "heynav.naics";

export async function setNaicsMirror(codes: { naicsCodeId: number; naicsCode: string; title: string; sectorCode: string }[]) {
  const cookieStore = await cookies();
  cookieStore.set(NAICS_COOKIE, JSON.stringify(codes), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function getNaicsMirror(): Promise<{ naicsCodeId: number; naicsCode: string; title: string; sectorCode: string }[]> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(NAICS_COOKIE)?.value;
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
