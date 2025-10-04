import { data, redirect, type ActionFunctionArgs } from "react-router";
import { ensureAuthenticated } from "~/auth/functions.server";
import { prisma } from "~/prisma.server";

export async function action({ request, params }: ActionFunctionArgs) {
  await ensureAuthenticated(request);

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

  await prisma.accountBook.delete({
    where: { id: accountBookId },
  });

  return redirect("/");
}
