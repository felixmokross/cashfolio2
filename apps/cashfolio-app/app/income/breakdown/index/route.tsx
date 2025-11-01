import { redirect, type LoaderFunctionArgs } from "react-router";
import { ensureAuthorized } from "~/account-books/functions.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
  await ensureAuthorized(request, params);
  throw redirect("./chart");
}
