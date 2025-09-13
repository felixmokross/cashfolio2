import { redirect } from "react-router";
import { prisma } from "~/prisma.server";

export async function action({ request }: { request: Request }) {
  const form = await request.formData();
  const transactionId = form.get("transactionId");
  if (typeof transactionId !== "string") {
    return new Response("Bad Request", { status: 400 });
  }
  const returnToAccountId = form.get("returnToAccountId");
  if (typeof returnToAccountId !== "string") {
    return new Response("Bad Request", { status: 400 });
  }

  await prisma.transaction.delete({
    where: { id: transactionId },
  });

  return redirect(`/accounts/${returnToAccountId}`);
}
