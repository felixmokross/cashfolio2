import { redirect, type LoaderFunctionArgs } from "react-router";
import { ensureAuthorized } from "../functions.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
  await ensureAuthorized(request, params);

  throw redirect("./accounts");
}
