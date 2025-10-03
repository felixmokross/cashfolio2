import { data } from "react-router";
import { ensureAuthenticated } from "~/auth/functions.server";
import { prisma } from "~/prisma.server";

export async function action({ request }: { request: Request }) {
  await ensureAuthenticated(request);

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

  await prisma.accountGroup.delete({ where: { id: accountGroupId } });

  return { success: true };
}
