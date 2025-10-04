import { data, type ActionFunctionArgs } from "react-router";
import invariant from "tiny-invariant";
import { ensureAuthenticated } from "~/auth/functions.server";
import { prisma } from "~/prisma.server";

export async function action({ request, params }: ActionFunctionArgs) {
  await ensureAuthenticated(request);
  invariant(params.accountBookId, "accountBookId not found");

  const form = await request.formData();

  const accountGroupId = form.get("accountGroupId");
  if (typeof accountGroupId !== "string") {
    return data(
      {
        success: false,
        errors: { accountGroupId: "This field is required" },
      },
      { status: 400 },
    );
  }

  await prisma.accountGroup.delete({
    where: {
      id_accountBookId: {
        id: accountGroupId,
        accountBookId: params.accountBookId,
      },
    },
  });

  return { success: true };
}
