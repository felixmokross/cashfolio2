import { AccountType, AccountUnit } from "@prisma/client";
import { redirect } from "react-router";
import slugify from "slugify";
import { prisma } from "~/prisma.server";

export async function action({ request }: { request: Request }) {
  const form = await request.formData();
  const name = form.get("name");
  if (typeof name !== "string") {
    return new Response(null, { status: 400 });
  }
  const type = form.get("type");
  if (typeof type !== "string") {
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
  const unit = form.get("unit") as AccountUnit;
  if (typeof unit !== "string") {
    return new Response(null, { status: 400 });
  }
  const currency = form.get("currency");
  if (currency && typeof currency !== "string") {
    return new Response(null, { status: 400 });
  }

  await prisma.account.create({
    data: {
      name,
      slug: slugify(name, { lower: true }),
      groupId,
      type: type as AccountType,
      unit,
      currency: unit === AccountUnit.CURRENCY ? currency : null,
    },
  });

  return redirect("/accounts");
}
