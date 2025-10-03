import { logto } from "./logto.server";
import { redirect } from "react-router";

export async function ensureAuthenticated(
  request: Request,
  fetchUserInfo = false,
) {
  const context = await logto.getContext({
    getAccessToken: false,
    fetchUserInfo,
  })(request);
  if (!context.isAuthenticated) {
    throw redirect("/api/logto/sign-in");
  }

  return context;
}
