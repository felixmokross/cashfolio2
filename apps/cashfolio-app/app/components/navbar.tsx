import { Link } from "~/platform/link";
import {
  NavSidebarItem,
  Sidebar,
  SidebarBody,
  SidebarDivider,
  SidebarFooter,
  SidebarHeading,
  SidebarItem,
  SidebarLabel,
  SidebarSection,
} from "~/platform/sidebar";
import { Logo } from "./logo";
import { Avatar } from "~/platform/avatar";
import {
  Dropdown,
  DropdownButton,
  DropdownDivider,
  DropdownItem,
  DropdownLabel,
  DropdownMenu,
} from "~/platform/dropdown";
import {
  ArrowRightStartOnRectangleIcon,
  ChevronUpIcon,
  Cog8ToothIcon,
  LightBulbIcon,
  ShieldCheckIcon,
  UserIcon,
} from "~/platform/icons/standard";
import {
  ArrowTrendingUpIcon,
  ScaleIcon,
  WalletIcon,
} from "~/platform/icons/navigation";
import { PeriodSelector } from "~/period/period-selector";
import { useRouteLoaderData } from "react-router";
import { type loader as layoutLoader } from "../layout/route";

export function Navbar() {
  const layoutLoaderData = useRouteLoaderData<typeof layoutLoader>("layout");
  if (!layoutLoaderData) {
    throw new Error("No layout loader data");
  }
  const { user } = layoutLoaderData;

  return (
    <Sidebar>
      <SidebarBody>
        <Link
          className="mb-2 flex items-center gap-4"
          href="/"
          aria-label="Home"
        >
          <Logo />
          <SidebarLabel className="text-sm font-semibold uppercase tracking-widest">
            Cashfolio
          </SidebarLabel>
        </Link>
        <SidebarSection>
          <NavSidebarItem href="/balances">
            <ScaleIcon />
            <SidebarLabel>Balances</SidebarLabel>
          </NavSidebarItem>
          <NavSidebarItem href="/income">
            <ArrowTrendingUpIcon />
            <SidebarLabel>Income</SidebarLabel>
          </NavSidebarItem>
          <NavSidebarItem href="/accounts">
            <WalletIcon />
            <SidebarLabel>Accounts</SidebarLabel>
          </NavSidebarItem>
        </SidebarSection>
        <SidebarDivider />
        <SidebarSection>
          <SidebarHeading>Period</SidebarHeading>
          <PeriodSelector />
        </SidebarSection>
      </SidebarBody>
      <SidebarFooter>
        <Dropdown>
          <DropdownButton as={SidebarItem}>
            <span className="flex min-w-0 items-center gap-3">
              <Avatar src={user.picture} className="size-10" square alt="" />
              <span className="min-w-0">
                <span className="block truncate text-sm/5 font-medium text-neutral-950 dark:text-white">
                  {user.name}
                </span>
                <span className="block truncate text-xs/5 font-normal text-neutral-500 dark:text-neutral-400">
                  {user.email}
                </span>
              </span>
            </span>
            <ChevronUpIcon />
          </DropdownButton>
          <DropdownMenu className="min-w-64" anchor="top start">
            <DropdownItem href="/my-profile">
              <UserIcon />
              <DropdownLabel>My profile</DropdownLabel>
            </DropdownItem>
            <DropdownItem href="/settings">
              <Cog8ToothIcon />
              <DropdownLabel>Settings</DropdownLabel>
            </DropdownItem>
            <DropdownDivider />
            <DropdownItem href="/privacy-policy">
              <ShieldCheckIcon />
              <DropdownLabel>Privacy policy</DropdownLabel>
            </DropdownItem>
            <DropdownItem href="/share-feedback">
              <LightBulbIcon />
              <DropdownLabel>Share feedback</DropdownLabel>
            </DropdownItem>
            <DropdownDivider />
            <DropdownItem href="/api/logto/sign-out">
              <ArrowRightStartOnRectangleIcon />
              <DropdownLabel>Sign out</DropdownLabel>
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </SidebarFooter>
    </Sidebar>
  );
}
