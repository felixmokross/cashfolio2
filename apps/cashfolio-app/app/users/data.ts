import type { LogtoContext } from "@logto/remix";
import invariant from "tiny-invariant";
import { ensureAuthenticated } from "~/auth/functions.server";
import { prisma } from "~/prisma.server";

export async function getOrCreateUser(userContext: LogtoContext) {
  invariant(userContext.claims, "No user claims");

  const user = await prisma.user.upsert({
    where: { externalId: userContext.claims.sub },
    create: { externalId: userContext.claims.sub },
    update: {},
  });

  return user;
}

export async function ensureUser(request: Request) {
  const userContext = await ensureAuthenticated(request);
  const user = await getOrCreateUser(userContext);
  return user;
}
