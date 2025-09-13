import { Prisma } from "@prisma/client";
import { prisma } from "~/prisma.server";
import { parseBookings } from "./shared";
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
          currency: b.currency,
          value: new Prisma.Decimal(b.value),
        })),
      },
    },
  });

  return redirect(`/accounts/${returnToAccountId}`);
}
