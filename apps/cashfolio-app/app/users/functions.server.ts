import type { LogtoContext } from "@logto/remix";
import invariant from "tiny-invariant";
import type { UserRole } from "~/.prisma-client/enums";
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

export async function ensureUserHasRole(request: Request, role: UserRole) {
  const user = await ensureUser(request);

  if (!user.roles.includes(role)) {
    throw new Response("Forbidden", { status: 403 });
  }

  return user;
}
