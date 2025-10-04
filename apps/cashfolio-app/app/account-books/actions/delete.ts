import { data, redirect, type ActionFunctionArgs } from "react-router";
import { ensureAuthenticated } from "~/auth/functions.server";
import { prisma } from "~/prisma.server";
import { getUserOrThrow } from "~/users/data";

export async function action({ request }: ActionFunctionArgs) {
  const userContext = await ensureAuthenticated(request);
  const user = await getUserOrThrow(userContext);

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

  const userAccountBookLink = await prisma.userAccountBookLink.findUnique({
    where: { userId_accountBookId: { userId: user.id, accountBookId } },
  });

  if (!userAccountBookLink) {
    return data(
      { success: false, errors: { accountBookId: "Not found" } },
      { status: 404 },
    );
  }

  await prisma.accountBook.delete({
    where: { id: accountBookId },
  });

  return redirect("/");
}
