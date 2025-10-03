import { prisma } from "~/prisma.server";
import {
  hasErrors,
  parseBookings,
  purgeCachedBalances,
  validate,
} from "./shared";
import { Prisma, Unit } from "@prisma/client";
import { data } from "react-router";
import invariant from "tiny-invariant";
import { ensureAuthenticated } from "~/auth/functions.server";

export async function action({ request }: { request: Request }) {
  await ensureAuthenticated(request);

  const form = await request.formData();

  const transactionId = form.get("transactionId");
  invariant(typeof transactionId === "string");
  const description = form.get("description");
  invariant(typeof description === "string");

  const bookings = parseBookings(form);

  const errors = validate(bookings);
  if (hasErrors(errors)) {
    return data({ success: false, errors }, { status: 400 });
  }

  const transactionBeforeUpdate = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: { bookings: true },
  });
  if (!transactionBeforeUpdate) {
    return new Response("Not Found", { status: 404 });
  }

  await prisma.transaction.update({
    where: { id: transactionId },
    data: {
      description,
      bookings: {
        deleteMany: {},
        create: bookings.map((b) => ({
          date: new Date(b.date),
          description: b.description,
          account: { connect: { id: b.accountId } },
          unit: Unit.CURRENCY,
          currency: b.currency,
          cryptocurrency: null, // TODO
          value: new Prisma.Decimal(b.value),
        })),
      },
    },
  });

  await purgeCachedBalances(
    bookings
      .map((b) => ({ date: new Date(b.date), accountId: b.accountId }))
      .concat(transactionBeforeUpdate.bookings),
  );

  return data({ success: true });
}
