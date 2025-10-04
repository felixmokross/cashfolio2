import { prisma } from "~/prisma.server";
import {
  hasErrors,
  parseBookings,
  purgeCachedBalances,
  validate,
} from "./shared";
import { data, type ActionFunctionArgs } from "react-router";
import invariant from "tiny-invariant";
import { ensureAuthenticated } from "~/auth/functions.server";
import { Unit } from "~/.prisma-client/enums";
import { Decimal } from "@prisma/client/runtime/library";

export async function action({ request, params }: ActionFunctionArgs) {
  await ensureAuthenticated(request);
  invariant(params.accountBookId, "accountBookId not found");

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
          accountId: b.accountId,
          unit: Unit.CURRENCY,
          currency: b.currency,
          cryptocurrency: null, // TODO
          value: new Decimal(b.value),
        })),
      },
      accountBookId: params.accountBookId,
    },
  });

  await purgeCachedBalances(
    bookings.map((b) => ({ date: new Date(b.date), accountId: b.accountId })),
  );
  return data({ success: true, errors: undefined });
}
