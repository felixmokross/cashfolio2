import { redirect, type LoaderFunctionArgs } from "react-router";
import { ensureAuthenticated } from "~/auth/functions.server";

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureAuthenticated(request);

  throw redirect("/accounts");
}
