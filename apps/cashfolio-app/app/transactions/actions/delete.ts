import { data, type ActionFunctionArgs } from "react-router";
import { prisma } from "~/prisma.server";
import { purgeCachedBalances, purgeCachedMonthlyIncome } from "./shared";
import { ensureAuthorized } from "~/account-books/functions.server";

export async function action({ request, params }: ActionFunctionArgs) {
  const link = await ensureAuthorized(request, params);

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
    where: {
      id_accountBookId: {
        id: transactionId,
        accountBookId: link.accountBookId,
      },
    },
    include: { bookings: true },
  });
  if (!transaction) {
    return new Response("Not Found", { status: 404 });
  }

  await prisma.transaction.delete({
    where: {
      id_accountBookId: {
        id: transactionId,
        accountBookId: link.accountBookId,
      },
    },
  });

  await purgeCachedBalances(link.accountBookId, transaction.bookings);
  await purgeCachedMonthlyIncome(link.accountBookId, transaction.bookings);

  return data({ success: true });
}
