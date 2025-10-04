import { data, type ActionFunctionArgs } from "react-router";
import invariant from "tiny-invariant";
import { ensureAuthenticated } from "~/auth/functions.server";
import { prisma } from "~/prisma.server";

export async function action({ request, params }: ActionFunctionArgs) {
  await ensureAuthenticated(request);
  invariant(params.accountBookId, "accountBookId not found");

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
      id_accountBookId: { id: accountId, accountBookId: params.accountBookId },
    },
  });
  return { success: true };
}
