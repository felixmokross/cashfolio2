import { logto } from "./logto.server";
import { redirect } from "react-router";

export async function ensureAuthenticated(request: Request) {
  const context = await logto.getContext({ getAccessToken: false })(request);
  if (!context.isAuthenticated) {
    throw redirect("/api/logto/sign-in");
  }

  return context;
}
