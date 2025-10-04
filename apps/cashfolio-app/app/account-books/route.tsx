import { Outlet, type LoaderFunctionArgs } from "react-router";
import invariant from "tiny-invariant";
import { ensureAuthenticated } from "~/auth/functions.server";
import { Navbar } from "~/components/navbar";
import { getPeriod } from "~/period/functions";
import { SidebarLayout } from "~/platform/sidebar-layout";
import { prisma } from "~/prisma.server";
import { getUserOrThrow } from "~/users/data";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const userContext = await ensureAuthenticated(request);
  const user = await getUserOrThrow(userContext);
  invariant(params.accountBookId, "accountBookId is required");

  const userAccountBookLink = await prisma.userAccountBookLink.findUnique({
    where: {
      userId_accountBookId: {
        userId: user.id,
        accountBookId: params.accountBookId,
      },
    },
  });

  if (!userAccountBookLink) {
    throw new Response(null, { status: 404 });
  }

  const accountBook = await prisma.accountBook.findUnique({
    where: { id: userAccountBookLink.accountBookId },
  });
  if (!accountBook) {
    throw new Response("Not Found", { status: 404 });
  }
  if (!userContext.claims) {
    throw new Response("No user claims", { status: 500 });
  }
  return {
    accountBook,
    userClaims: userContext.claims,
    period: await getPeriod(request),
  };
}

export default function Route() {
  return (
    <SidebarLayout sidebar={<Navbar />} navbar={null}>
      <Outlet />
    </SidebarLayout>
  );
}
