import { data } from "react-router";
import { prisma } from "~/prisma.server";

export async function action({ request }: { request: Request }) {
  const form = await request.formData();

  const accountId = form.get("accountId");
  if (typeof accountId !== "string") {
    return data(
      { success: false, errors: { accountId: "This field is required" } },
      { status: 400 },
    );
  }

  await prisma.account.delete({ where: { id: accountId } });
  return { success: true };
}
