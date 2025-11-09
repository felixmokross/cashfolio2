import { redirect, type LoaderFunctionArgs } from "react-router";
import { ensureAuthorized } from "~/account-books/functions.server";
import { prisma } from "~/prisma.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const link = await ensureAuthorized(request, params);

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: link.userId },
  });

  const viewPreferences = user.viewPreferences as Record<string, string>;

  const lastUsedView =
    viewPreferences[`account-book-${link.accountBookId}-view`] ?? "breakdown";

  return redirect(lastUsedView);
}
