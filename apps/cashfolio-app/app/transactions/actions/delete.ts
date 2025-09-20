import { redirect } from "react-router";
import { prisma } from "~/prisma.server";
import { purgeCachedBalances } from "./shared";

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

  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: { bookings: true },
  });
  if (!transaction) {
    return new Response("Not Found", { status: 404 });
  }

  await prisma.transaction.delete({
    where: { id: transactionId },
  });

  await purgeCachedBalances(transaction.bookings);

  return redirect(`/accounts/${returnToAccountId}`);
}
