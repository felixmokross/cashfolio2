import { data, redirect, type ActionFunctionArgs } from "react-router";
import { prisma } from "~/prisma.server";
import { ensureUser } from "~/users/data";
import { ensureAuthorizedForUserAndAccountBookId } from "../functions.server";

export async function action({ request }: ActionFunctionArgs) {
  const user = await ensureUser(request);

  const form = await request.formData();

  const accountBookId = form.get("accountBookId");
  if (typeof accountBookId !== "string") {
    return data(
      {
        success: false,
        errors: { accountGroupId: "This field is required" },
      },
      { status: 400 },
    );
  }

  const link = await ensureAuthorizedForUserAndAccountBookId(
    user,
    accountBookId,
  );

  await prisma.accountBook.delete({
    where: { id: link.accountBookId },
  });

  return redirect("/");
}
