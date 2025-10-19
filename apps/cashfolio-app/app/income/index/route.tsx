import { redirect, type LoaderFunctionArgs } from "react-router";
import { ensureAuthorized } from "~/account-books/functions.server";

export function loader({ request, params }: LoaderFunctionArgs) {
  ensureAuthorized(request, params);
  throw redirect("./table");
}
