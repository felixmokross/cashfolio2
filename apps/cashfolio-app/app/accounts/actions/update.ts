import { Unit } from "@prisma/client";
import { redirect } from "react-router";
import slugify from "slugify";
import { prisma } from "~/prisma.server";

export async function action({ request }: { request: Request }) {
  const form = await request.formData();
  const id = form.get("id");
  if (typeof id !== "string") {
    return new Response(null, { status: 400 });
  }
  const name = form.get("name");
  if (typeof name !== "string") {
    return new Response(null, { status: 400 });
  }
  const groupId = form.get("groupId");
  if (typeof groupId !== "string") {
    return new Response(null, { status: 400 });
  }
  const openingBalance = form.get("openingBalance");
  if (openingBalance && typeof openingBalance !== "string") {
    return new Response(null, { status: 400 });
  }
  const unit = form.get("unit") as Unit;
  if (typeof unit !== "string") {
    return new Response(null, { status: 400 });
  }
  const currency = form.get("currency");
  if (currency && typeof currency !== "string") {
    return new Response(null, { status: 400 });
  }
  const cryptocurrency = form.get("cryptocurrency");
  if (cryptocurrency && typeof cryptocurrency !== "string") {
    return new Response(null, { status: 400 });
  }
  const symbol = form.get("symbol");
  if (symbol && typeof symbol !== "string") {
    return new Response(null, { status: 400 });
  }

  await prisma.account.update({
    where: { id },
    data: {
      name,
      slug: slugify(name, { lower: true }),
      groupId,
      unit,
      currency: unit === Unit.CURRENCY ? currency : null,
      cryptocurrency: unit === Unit.CRYPTOCURRENCY ? cryptocurrency : null,
      symbol: unit === Unit.SECURITY ? symbol : null,
    },
  });

  return redirect("/accounts");
}
