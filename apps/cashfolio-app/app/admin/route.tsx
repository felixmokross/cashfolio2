import { Outlet } from "react-router";
import { Logo } from "~/components/logo";
import { Badge } from "~/platform/badge";
import { BookOpenIcon, UsersIcon } from "~/platform/icons/navigation";
import { Link } from "~/platform/link";
import {
  NavSidebarItem,
  Sidebar,
  SidebarBody,
  SidebarHeader,
  SidebarLabel,
  SidebarSection,
} from "~/platform/sidebar";
import { SidebarLayout } from "~/platform/sidebar-layout";

export default function Route() {
  return (
    <SidebarLayout navbar={null} sidebar={<AdminSidebar />}>
      <Outlet />
    </SidebarLayout>
  );
}

function AdminSidebar() {
  return (
    <Sidebar>
      <SidebarHeader>
        <Link
          className="mt-1 flex items-center gap-4"
          href="/admin"
          aria-label="Home"
        >
          <Logo className="w-8" />
          <SidebarLabel className="text-sm font-semibold uppercase tracking-widest">
            Cashfolio
          </SidebarLabel>
          <Badge>Admin</Badge>
        </Link>
      </SidebarHeader>
      <SidebarBody>
        <SidebarSection>
          <NavSidebarItem href="/admin/account-books">
            <BookOpenIcon />
            <SidebarLabel>Account Books</SidebarLabel>
          </NavSidebarItem>
          <NavSidebarItem href="/admin/users">
            <UsersIcon />
            <SidebarLabel>Users</SidebarLabel>
          </NavSidebarItem>
        </SidebarSection>
      </SidebarBody>
    </Sidebar>
  );
}
