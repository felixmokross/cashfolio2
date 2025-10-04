import { data, type ActionFunctionArgs } from "react-router";
import { prisma } from "~/prisma.server";
import { purgeCachedBalances } from "./shared";
import { ensureAuthenticated } from "~/auth/functions.server";
import invariant from "tiny-invariant";

export async function action({ request, params }: ActionFunctionArgs) {
  await ensureAuthenticated(request);
  invariant(params.accountBookId, "accountBookId not found");

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
        accountBookId: params.accountBookId,
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
        accountBookId: params.accountBookId,
      },
    },
  });

  await purgeCachedBalances(transaction.bookings);

  return data({ success: true });
}
