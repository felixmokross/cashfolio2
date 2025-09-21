import { data } from "react-router";
import { prisma } from "~/prisma.server";
import { purgeCachedBalances } from "./shared";

export async function action({ request }: { request: Request }) {
  const form = await request.formData();
  const transactionId = form.get("transactionId");
  if (typeof transactionId !== "string") {
    return data(
      { success: false, errors: { transactionId: "This field is required" } },
      {
        status: 400,
      },
    );
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

  return data({ success: true });
}
