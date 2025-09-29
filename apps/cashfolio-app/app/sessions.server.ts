import { createCookieSessionStorage } from "react-router";
import invariant from "tiny-invariant";
import type { Period } from "./period/types";

type SessionData = {
  period: Period;
};

type SessionFlashData = {
  error: string;
};

invariant(!!process.env.SESSION_SECRET, "SESSION_SECRET must be set");
invariant(!!process.env.COOKIE_DOMAIN, "COOKIE_DOMAIN must be set");

const { getSession, commitSession, destroySession } =
  createCookieSessionStorage<SessionData, SessionFlashData>({
    // a Cookie from `createCookie` or the CookieOptions to create one
    cookie: {
      name: "__session",

      // all of these are optional
      domain: process.env.COOKIE_DOMAIN,
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 365, // ca. 1 year
      path: "/",
      sameSite: "lax",
      secrets: [process.env.SESSION_SECRET],
      secure: true,
    },
  });

export { getSession, commitSession, destroySession };
