import { redirect, type ActionFunctionArgs } from "react-router";
import { prisma } from "~/prisma.server";
import slugify from "slugify";

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return new Response(null, { status: 405 });
  }

  const form = await request.formData();

  const name = form.get("name");
  if (typeof name !== "string") {
    return new Response(null, { status: 400 });
  }

  const parentGroupId = form.get("parentGroupId");
  if (typeof parentGroupId !== "string") {
    return new Response(null, { status: 400 });
  }

  const { type } = await prisma.accountGroup.findFirstOrThrow({
    where: { id: parentGroupId },
    select: { type: true },
  });

  await prisma.accountGroup.create({
    data: {
      name,
      slug: slugify(name, { lower: true }),
      type,
      parentGroupId,
    },
  });

  return redirect("/accounts");
}
