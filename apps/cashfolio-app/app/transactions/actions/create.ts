import { Prisma, Unit } from "@prisma/client";
import { prisma } from "~/prisma.server";
import { parseBookings, purgeCachedBalances } from "./shared";
import { redirect } from "react-router";

export async function action({ request }: { request: Request }) {
  const form = await request.formData();
  const description = form.get("description");
  if (typeof description !== "string") {
    return new Response("Bad Request", { status: 400 });
  }
  const returnToAccountId = form.get("returnToAccountId");
  if (typeof returnToAccountId !== "string") {
    return new Response("Bad Request", { status: 400 });
  }

  const bookings = parseBookings(form);

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
  return redirect(`/accounts/${returnToAccountId}`);
}
