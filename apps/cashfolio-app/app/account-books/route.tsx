import { Outlet, type LoaderFunctionArgs } from "react-router";
import { ensureAuthenticated } from "~/auth/functions.server";
import { Navbar } from "~/components/navbar";
import { getPeriod } from "~/period/functions";
import { SidebarLayout } from "~/platform/sidebar-layout";
import { prisma } from "~/prisma.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const context = await ensureAuthenticated(request, true);
  if (!context.userInfo) {
    throw new Error("No user info");
  }
  if (!params.accountBookId) {
    throw new Response("No account book ID specified", { status: 400 });
  }
  const accountBook = await prisma.accountBook.findUnique({
    where: { id: params.accountBookId },
  });
  if (!accountBook) {
    throw new Response("Not Found", { status: 404 });
  }
  return {
    accountBook,
    user: context.userInfo,
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
