import type { Meta, StoryObj } from "@storybook/react-vite";

import {
  Sidebar,
  SidebarBody,
  SidebarFooter,
  SidebarHeader,
  SidebarItem,
  SidebarLabel,
  SidebarSection,
  SidebarSpacer,
} from "./sidebar";

import { Avatar } from "./avatar";
import {
  Dropdown,
  DropdownButton,
  DropdownMenu,
  DropdownItem,
  DropdownLabel,
  DropdownDivider,
} from "./dropdown";
import { Logo } from "~/components/logo";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  Cog6ToothIcon,
  HomeIcon,
  InboxIcon,
  MagnifyingGlassIcon,
  MegaphoneIcon,
  QuestionMarkCircleIcon,
  SparklesIcon,
  Square2StackIcon,
  TicketIcon,
} from "./icons/navigation";
import {
  ArrowRightStartOnRectangleIcon,
  Cog8ToothIcon,
  LightBulbIcon,
  PlusIcon,
  ShieldCheckIcon,
  UserIcon,
} from "./icons/standard";

const meta = {
  component: Sidebar,
  decorators: [
    (Story) => (
      <div className="flex h-[calc(100vh-2rem)] items-stretch justify-center">
        <div className="w-80 h-full">
          <Story />
        </div>
      </div>
    ),
  ],
} satisfies Meta<typeof Sidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: (
      <>
        <SidebarHeader>
          <Dropdown>
            <DropdownButton as={SidebarItem} className="mb-2.5">
              <Logo />
              <SidebarLabel>Tailwind Labs</SidebarLabel>
              <ChevronDownIcon />
            </DropdownButton>
            <DropdownMenu className="min-w-64" anchor="bottom start">
              <DropdownItem href="/teams/1/settings">
                <Cog8ToothIcon />
                <DropdownLabel>Settings</DropdownLabel>
              </DropdownItem>
              <DropdownDivider />
              <DropdownItem href="/teams/1">
                <Avatar slot="icon" src="/tailwind-logo.svg" />
                <DropdownLabel>Tailwind Labs</DropdownLabel>
              </DropdownItem>
              <DropdownItem href="/teams/2">
                <Avatar
                  slot="icon"
                  initials="WC"
                  className="bg-purple-500 text-white"
                />
                <DropdownLabel>Workcation</DropdownLabel>
              </DropdownItem>
              <DropdownDivider />
              <DropdownItem href="/teams/create">
                <PlusIcon />
                <DropdownLabel>New team&hellip;</DropdownLabel>
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
          <SidebarSection>
            <SidebarItem href="/search">
              <MagnifyingGlassIcon />
              <SidebarLabel>Search</SidebarLabel>
            </SidebarItem>
            <SidebarItem href="/inbox">
              <InboxIcon />
              <SidebarLabel>Inbox</SidebarLabel>
            </SidebarItem>
          </SidebarSection>
        </SidebarHeader>
        <SidebarBody>
          <SidebarSection>
            <SidebarItem href="/home">
              <HomeIcon />
              <SidebarLabel>Home</SidebarLabel>
            </SidebarItem>
            <SidebarItem href="/events">
              <Square2StackIcon />
              <SidebarLabel>Events</SidebarLabel>
            </SidebarItem>
            <SidebarItem href="/orders">
              <TicketIcon />
              <SidebarLabel>Orders</SidebarLabel>
            </SidebarItem>
            <SidebarItem href="/broadcasts">
              <MegaphoneIcon />
              <SidebarLabel>Broadcasts</SidebarLabel>
            </SidebarItem>
            <SidebarItem href="/settings">
              <Cog6ToothIcon />
              <SidebarLabel>Settings</SidebarLabel>
            </SidebarItem>
          </SidebarSection>
          <SidebarSpacer />
          <SidebarSection>
            <SidebarItem href="/support">
              <QuestionMarkCircleIcon />
              <SidebarLabel>Support</SidebarLabel>
            </SidebarItem>
            <SidebarItem href="/changelog">
              <SparklesIcon />
              <SidebarLabel>Changelog</SidebarLabel>
            </SidebarItem>
          </SidebarSection>
        </SidebarBody>
        <SidebarFooter>
          <Dropdown>
            <DropdownButton as={SidebarItem}>
              <span className="flex min-w-0 items-center gap-3">
                <Avatar
                  src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                  className="size-10"
                  square
                  alt=""
                />
                <span className="min-w-0">
                  <span className="block truncate text-sm/5 font-medium text-neutral-950 dark:text-white">
                    Erica
                  </span>
                  <span className="block truncate text-xs/5 font-normal text-neutral-500 dark:text-neutral-400">
                    erica@example.com
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
              <DropdownItem href="/logout">
                <ArrowRightStartOnRectangleIcon />
                <DropdownLabel>Sign out</DropdownLabel>
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </SidebarFooter>
      </>
    ),
  },
};

export const Light: Story = {
  args: Default.args,
  globals: { backgrounds: { value: "light" } },
};

export const Dark: Story = {
  args: Default.args,
  globals: { backgrounds: { value: "dark" } },
};
