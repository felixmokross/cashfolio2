import { data, type ActionFunctionArgs } from "react-router";
import { ensureAuthorized } from "~/account-books/functions.server";
import { prisma } from "~/prisma.server";

export async function action({ request, params }: ActionFunctionArgs) {
  const link = await ensureAuthorized(request, params);

  const form = await request.formData();

  const accountId = form.get("accountId");
  if (typeof accountId !== "string") {
    return data(
      { success: false, errors: { accountId: "This field is required" } },
      { status: 400 },
    );
  }

  await prisma.account.delete({
    where: {
      id_accountBookId: { id: accountId, accountBookId: link.accountBookId },
    },
  });
  return { success: true };
}
