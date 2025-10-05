import { data, type ActionFunctionArgs } from "react-router";
import invariant from "tiny-invariant";
import { commitSession, getSession } from "~/sessions.server";

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const key = formData.get("key");
  const value = formData.get("value");
  invariant(typeof key === "string", "value is required");
  invariant(typeof value === "string", "value is required");

  const session = await getSession(request.headers.get("Cookie"));
  const viewPreferences = session.get("viewPreferences");
  session.set("viewPreferences", {
    ...(viewPreferences ?? {}),
    [key]: value,
  });

  return data(
    { success: true },
    { headers: { "Set-Cookie": await commitSession(session) } },
  );
}
