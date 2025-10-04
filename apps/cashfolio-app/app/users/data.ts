import type { LogtoContext } from "@logto/remix";
import invariant from "tiny-invariant";
import { ensureAuthenticated } from "~/auth/functions.server";
import { prisma } from "~/prisma.server";

export async function getOrCreateUser(userContext: LogtoContext) {
  invariant(userContext.claims, "No user claims");

  let user = await prisma.user.findUnique({
    where: { externalId: userContext.claims.sub },
  });
  if (!user) {
    user = await prisma.user.create({
      data: { externalId: userContext.claims.sub },
    });
  }

  return user;
}

export async function getUserOrThrow(userContext: LogtoContext) {
  invariant(userContext.claims, "No user claims");

  return await prisma.user.findUniqueOrThrow({
    where: { externalId: userContext.claims.sub },
  });
}

export async function ensureUser(request: Request) {
  const userContext = await ensureAuthenticated(request);
  const user = await getUserOrThrow(userContext);
  return user;
}
