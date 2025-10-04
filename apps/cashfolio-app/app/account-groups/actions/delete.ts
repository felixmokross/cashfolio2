import { data, type ActionFunctionArgs } from "react-router";
import { ensureAuthorized } from "~/account-books/functions.server";
import { prisma } from "~/prisma.server";

export async function action({ request, params }: ActionFunctionArgs) {
  const link = await ensureAuthorized(request, params);

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
        accountBookId: link.accountBookId,
      },
    },
  });

  return { success: true };
}
