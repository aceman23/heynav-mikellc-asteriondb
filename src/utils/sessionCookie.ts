// Equivalent of vm-manager/src/utils/coookieMonster.ts.
// The DbTwig sessionId lives only in an httpOnly cookie; the browser never
// sees it. Server functions read it back to build the Bearer header.

import { cookies } from "next/headers";
import type { SessionCookieT } from "./types";

export type { SessionCookieT };

const SESSION_COOKIE = "heynav.session";

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
  cookieStore.delete(SESSION_COOKIE);
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
