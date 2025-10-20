import { prisma } from "~/prisma.server";
import {
  hasErrors,
  parseBookings,
  purgeCachedBalances,
  purgeCachedMonthlyIncome,
  validate,
} from "./shared";
import { data, type ActionFunctionArgs } from "react-router";
import invariant from "tiny-invariant";
import { Unit } from "~/.prisma-client/enums";
import { Decimal } from "@prisma/client/runtime/library";
import { ensureAuthorized } from "~/account-books/functions.server";

export async function action({ request, params }: ActionFunctionArgs) {
  const link = await ensureAuthorized(request, params);

  const form = await request.formData();

  const transactionId = form.get("transactionId");
  invariant(typeof transactionId === "string");
  const description = form.get("description");
  invariant(typeof description === "string");

  const bookingFormValues = parseBookings(form);

  const errors = validate(bookingFormValues);
  if (hasErrors(errors)) {
    return data({ success: false, errors }, { status: 400 });
  }

  const transactionBeforeUpdate = await prisma.transaction.findUnique({
    where: {
      id_accountBookId: {
        id: transactionId,
        accountBookId: link.accountBookId,
      },
    },
    include: { bookings: true },
  });
  if (!transactionBeforeUpdate) {
    return new Response("Not Found", { status: 404 });
  }

  await prisma.transaction.update({
    where: {
      id_accountBookId: {
        id: transactionId,
        accountBookId: link.accountBookId,
      },
    },
    data: {
      description,
      bookings: {
        deleteMany: {},
        create: bookingFormValues.map((b) => ({
          date: new Date(b.date),
          description: b.description,
          accountId: b.accountId,
          unit: Unit.CURRENCY,
          currency: b.currency,
          cryptocurrency: null, // TODO
          value: new Decimal(b.value),
        })),
      },
    },
  });

  const bookingsBeforeAndAfterUpdate = bookingFormValues
    .map((b) => ({ date: new Date(b.date), accountId: b.accountId }))
    .concat(transactionBeforeUpdate.bookings);

  await purgeCachedBalances(link.accountBookId, bookingsBeforeAndAfterUpdate);

  await purgeCachedMonthlyIncome(
    link.accountBookId,
    bookingsBeforeAndAfterUpdate,
  );

  return data({ success: true });
}
