import { redirect, type ActionFunctionArgs } from "react-router";
import { prisma } from "~/prisma.server";
import slugify from "slugify";
import type { AccountType } from "@prisma/client";

export async function action({ request }: ActionFunctionArgs) {
  switch (request.method) {
    case "POST":
      return createAccountGroup({ request });
    case "PUT":
      return updateAccountGroup({ request });
    case "DELETE":
      return deleteAccountGroup({ request });
    default:
      return new Response(null, { status: 405 });
  }
}

async function createAccountGroup({ request }: { request: Request }) {
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

async function updateAccountGroup({ request }: { request: Request }) {
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

async function deleteAccountGroup({ request }: { request: Request }) {
  const form = await request.formData();

  const id = form.get("id");
  if (typeof id !== "string") {
    return new Response(null, { status: 400 });
  }

  await prisma.accountGroup.delete({ where: { id } });

  return redirect("/accounts");
}
