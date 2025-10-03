import { Outlet, type LoaderFunctionArgs } from "react-router";
import { ensureAuthenticated } from "../auth/functions.server";
import { getPeriod } from "../period/functions";
import { SidebarLayout } from "~/platform/sidebar-layout";
import { Navbar } from "~/components/navbar";

export async function loader({ request }: LoaderFunctionArgs) {
  const context = await ensureAuthenticated(request, true);
  if (!context.userInfo) {
    throw new Error("No user info");
  }
  return {
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
