import { Prisma } from "@prisma/client";
import { redirect, type ActionFunctionArgs } from "react-router";
import { prisma } from "~/prisma.server";

export async function action({ request }: ActionFunctionArgs) {
  switch (request.method) {
    case "POST":
      return createTransaction({ request });
    // case "PUT":
    //   return updateAccountGroup({ request });
    // case "DELETE":
    //   return deleteAccountGroup({ request });
    default:
      return new Response(null, { status: 405 });
  }
}

async function createTransaction({ request }: { request: Request }) {
  const form = await request.formData();
  const sourceAccountId = form.get("sourceAccountId");
  if (typeof sourceAccountId !== "string") {
    return new Response("Bad Request", { status: 400 });
  }

  const date = form.get("date");
  if (typeof date !== "string") {
    return new Response("Bad Request", { status: 400 });
  }

  const description = form.get("description");
  if (typeof description !== "string") {
    return new Response("Bad Request", { status: 400 });
  }

  const targetAccountId = form.get("targetAccountId[value]");
  if (typeof targetAccountId !== "string") {
    return new Response("Bad Request", { status: 400 });
  }

  const value = form.get("value");
  if (typeof value !== "string") {
    return new Response("Bad Request", { status: 400 });
  }
  console.log(value);

  await prisma.transaction.create({
    data: {
      description,
      bookings: {
        create: [
          {
            date,
            account: { connect: { id: sourceAccountId } },
            value: new Prisma.Decimal(value).negated(),
            description: "",
          },
          {
            date,
            account: { connect: { id: targetAccountId } },
            value: new Prisma.Decimal(value),
            description: "",
          },
        ],
      },
    },
  });

  return redirect(`/accounts/${sourceAccountId}`);
}
