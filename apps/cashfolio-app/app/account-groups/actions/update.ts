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

  const parentGroupId = form.get("parentGroupId");
  if (parentGroupId && typeof parentGroupId !== "string") {
    return new Response(null, { status: 400 });
  }

  await prisma.accountGroup.update({
    where: { id },
    data: {
      name,
      slug: slugify(name, { lower: true }),
      parentGroupId: parentGroupId || null,
    },
  });

  return redirect("/accounts");
}
