import { data, type ActionFunctionArgs } from "react-router";
import { commitSession, getSession } from "~/sessions.server";

export async function action({ request }: ActionFunctionArgs) {
  const form = await request.formData();
  const from = form.get("from") as string;
  const to = form.get("to") as string;

  const session = await getSession(request.headers.get("Cookie"));
  session.set("from", from);
  session.set("to", to);

  return data(
    {
      success: true,
    },
    {
      headers: {
        "Set-Cookie": await commitSession(session),
      },
    },
  );
}
