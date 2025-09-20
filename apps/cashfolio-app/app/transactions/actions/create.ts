import { Prisma, Unit } from "@prisma/client";
import { prisma } from "~/prisma.server";
import {
  hasErrors,
  parseBookings,
  purgeCachedBalances,
  validate,
} from "./shared";
import { data } from "react-router";
import invariant from "tiny-invariant";

export async function action({ request }: { request: Request }) {
  const form = await request.formData();
  const description = form.get("description");
  invariant(typeof description === "string");

  const bookings = parseBookings(form);

  const errors = validate(bookings);
  if (hasErrors(errors)) {
    return data({ success: false, errors }, { status: 400 });
  }

  await prisma.transaction.create({
    data: {
      description,
      bookings: {
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
    bookings.map((b) => ({ date: new Date(b.date), accountId: b.accountId })),
  );
  return data({ success: true, errors: undefined });
}
