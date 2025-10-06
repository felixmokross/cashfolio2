import { type ActionFunctionArgs } from "react-router";
import invariant from "tiny-invariant";
import { prisma } from "~/prisma.server";
import { ensureUser } from "~/users/data";

export async function action({ request }: ActionFunctionArgs) {
  const user = await ensureUser(request);

  const formData = await request.formData();
  const key = formData.get("key");
  const value = formData.get("value");
  invariant(typeof key === "string", "value is required");
  invariant(typeof value === "string", "value is required");

  await prisma.user.update({
    where: { id: user.id },
    data: {
      viewPreferences: {
        ...(user.viewPreferences as Record<string, string> | null),
        [key]: value,
      },
    },
  });

  return { success: true };
}
