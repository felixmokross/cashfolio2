import { redirect, type LoaderFunctionArgs } from "react-router";
import invariant from "tiny-invariant";
import { ensureAuthorizedForUserAndAccountBookId } from "~/account-books/functions.server";
import { ensureUser } from "~/users/functions.server";
import { viewKey } from "~/view-preferences/functions";
import { getViewPreference } from "~/view-preferences/functions.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const user = await ensureUser(request);

  invariant(params.accountBookId, "accountBookId not found");
  const link = await ensureAuthorizedForUserAndAccountBookId(
    user,
    params.accountBookId,
  );

  const lastUsedView =
    getViewPreference(user, viewKey(link.accountBookId)) ?? "breakdown";

  return redirect(
    lastUsedView === "timeline" ? "timeline/totals" : lastUsedView,
  );
}
