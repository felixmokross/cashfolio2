import { makeLogtoRemix } from "@logto/remix";
import type { SessionStorage } from "react-router";
import invariant from "tiny-invariant";
import * as sessionStorage from "~/sessions.server";

invariant(!!process.env.LOGTO_ENDPOINT, "LOGTO_ENDPOINT must be set");
invariant(!!process.env.LOGTO_APP_ID, "LOGTO_APP_ID must be set");
invariant(!!process.env.LOGTO_APP_SECRET, "LOGTO_APP_SECRET must be set");
invariant(!!process.env.BASE_URL, "BASE_URL must be set");

export const logto = makeLogtoRemix(
  {
    endpoint: process.env.LOGTO_ENDPOINT,
    appId: process.env.LOGTO_APP_ID,
    appSecret: process.env.LOGTO_APP_SECRET,
    baseUrl: process.env.BASE_URL,
  },
  { sessionStorage: sessionStorage as SessionStorage },
);
