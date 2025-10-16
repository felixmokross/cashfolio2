import { redirect, type LoaderFunctionArgs } from "react-router";
import { UserRole } from "~/.prisma-client/enums";
import { ensureUserHasRole } from "~/users/functions.server";

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserHasRole(request, UserRole.ADMIN);

  throw redirect("./account-books");
}
