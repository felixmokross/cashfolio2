import { redirect } from "react-router";
import { prisma } from "~/prisma.server";

export async function action({ request }: { request: Request }) {
  const form = await request.formData();

  const accountGroupId = form.get("accountGroupId");
  if (typeof accountGroupId !== "string") {
    return new Response(null, { status: 400 });
  }

  await prisma.accountGroup.delete({ where: { id: accountGroupId } });

  return redirect("/accounts");
}
