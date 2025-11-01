import type { Params } from "react-router";
import invariant from "tiny-invariant";
import type { User } from "~/.prisma-client/client";
import { prisma } from "~/prisma.server";
import { ensureUser } from "~/users/functions.server";

export async function getFirstBookingDate(accountBookId: string) {
  return (
    await prisma.booking.findFirst({
      where: { accountBookId },
      orderBy: { date: "asc" },
    })
  )?.date;
}

export async function ensureAuthorized(
  request: Request,
  params: Params<string>,
) {
  const user = await ensureUser(request);
  invariant(params.accountBookId, "accountBookId not found");

  const link = await ensureAuthorizedForUserAndAccountBookId(
    user,
    params.accountBookId,
  );
  return link;
}

export async function ensureAuthorizedForUserAndAccountBookId(
  user: User,
  accountBookId: string,
) {
  const link = await prisma.userAccountBookLink.findUnique({
    where: { userId_accountBookId: { userId: user.id, accountBookId } },
  });

  if (!link) {
    throw new Response(null, { status: 404 });
  }

  return link;
}
