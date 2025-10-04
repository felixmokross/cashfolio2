import { Outlet, type LoaderFunctionArgs } from "react-router";
import invariant from "tiny-invariant";
import { ensureAuthenticated } from "~/auth/functions.server";
import { Navbar } from "~/components/navbar";
import { getPeriod } from "~/period/functions";
import { SidebarLayout } from "~/platform/sidebar-layout";
import { prisma } from "~/prisma.server";
import { serialize } from "~/serialization";
import { getUserOrThrow } from "~/users/data";
import {
  ensureAuthorizedForUserAndAccountBookId,
  getFirstBookingDate,
} from "./functions.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const userContext = await ensureAuthenticated(request);
  const user = await getUserOrThrow(userContext);
  invariant(params.accountBookId, "accountBookId is required");

  const link = await ensureAuthorizedForUserAndAccountBookId(
    user,
    params.accountBookId,
  );

  const accountBook = await prisma.accountBook.findUnique({
    where: { id: link.accountBookId },
  });
  if (!accountBook) {
    throw new Response("Not Found", { status: 404 });
  }
  if (!userContext.claims) {
    throw new Response("No user claims", { status: 500 });
  }
  return serialize({
    accountBook,
    userClaims: userContext.claims,
    period: await getPeriod(request),
    firstBookingDate: await getFirstBookingDate(accountBook.id),
  });
}

export default function Route() {
  return (
    <SidebarLayout sidebar={<Navbar />} navbar={null}>
      <Outlet />
    </SidebarLayout>
  );
}
