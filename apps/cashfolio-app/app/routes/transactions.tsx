import { Prisma } from "@prisma/client";
import { redirect, type ActionFunctionArgs } from "react-router";
import { prisma } from "~/prisma.server";

export async function action({ request }: ActionFunctionArgs) {
  switch (request.method) {
    case "POST":
      return createTransaction({ request });
    // case "PUT":
    //   return updateAccountGroup({ request });
    case "DELETE":
      return deleteTransaction({ request });
    default:
      return new Response(null, { status: 405 });
  }
}

async function createTransaction({ request }: { request: Request }) {
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
          value: new Prisma.Decimal(b.value),
        })),
      },
    },
  });

  return redirect(`/accounts/${returnToAccountId}`);
}

async function deleteTransaction({ request }: { request: Request }) {
  const form = await request.formData();
  const transactionId = form.get("transactionId");
  if (typeof transactionId !== "string") {
    return new Response("Bad Request", { status: 400 });
  }
  const returnToAccountId = form.get("returnToAccountId");
  if (typeof returnToAccountId !== "string") {
    return new Response("Bad Request", { status: 400 });
  }

  await prisma.transaction.delete({
    where: { id: transactionId },
  });

  return redirect(`/accounts/${returnToAccountId}`);
}

function parseBookings(formData: FormData) {
  const out: Record<string, any>[] = [];

  for (const [key, value] of formData.entries()) {
    const m = key.match(/^bookings\[(\d+)\]\[(.+)\]$/);
    if (!m) continue;
    const [, idxStr, prop] = m;
    const idx = Number(idxStr);
    if (!out[idx]) out[idx] = {};
    out[idx][prop] = value;
  }

  return out.map((b) => ({
    date: String(b.date ?? ""),
    accountId: String(b.accountId ?? ""),
    description: String(b.description ?? ""),
    value: String(b.value ?? ""),
  }));
}
