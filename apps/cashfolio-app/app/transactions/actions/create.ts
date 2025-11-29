import { prisma } from "~/prisma.server";
import {
  hasErrors,
  parseBookings,
  purgeCachedBalances,
  validate,
} from "./shared";
import { data, type ActionFunctionArgs } from "react-router";
import invariant from "tiny-invariant";
import { Unit } from "~/.prisma-client/enums";
import { Decimal } from "@prisma/client/runtime/library";
import { ensureAuthorized } from "~/account-books/functions.server";
import { parseISO } from "date-fns";

export async function action({ request, params }: ActionFunctionArgs) {
  const link = await ensureAuthorized(request, params);

  const form = await request.formData();
  const description = form.get("description");
  invariant(typeof description === "string");

  const bookingFormValues = parseBookings(form);

  const errors = validate(bookingFormValues);
  if (hasErrors(errors)) {
    return data({ success: false, errors }, { status: 400 });
  }

  const transaction = await prisma.transaction.create({
    include: { bookings: true },
    data: {
      description,
      bookings: {
        create: bookingFormValues.map((b) => ({
          date: parseISO(b.date),
          description: b.description,
          accountId: b.accountId,
          unit: b.unit as Unit,
          currency: b.currency || null,
          cryptocurrency: b.cryptocurrency || null,
          symbol: b.symbol || null,
          tradeCurrency: b.tradeCurrency || null,
          value: new Decimal(b.value),
        })),
      },
      accountBookId: link.accountBookId,
    },
  });

  await purgeCachedBalances(link.accountBookId, [], transaction.bookings);

  return data({ success: true, errors: undefined });
}
