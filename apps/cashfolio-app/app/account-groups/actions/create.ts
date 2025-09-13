import type { AccountType } from "@prisma/client";
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

  const parentGroupId = form.get("parentGroupId");
  if (parentGroupId && typeof parentGroupId !== "string") {
    return new Response(null, { status: 400 });
  }

  await prisma.accountGroup.create({
    data: {
      name,
      slug: slugify(name, { lower: true }),
      type: type as AccountType,
      parentGroupId: parentGroupId || null,
    },
  });

  return redirect("/accounts");
}
