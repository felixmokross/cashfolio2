import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Dropdown,
  DropdownButton,
  DropdownDescription,
  DropdownDivider,
  DropdownHeader,
  DropdownHeading,
  DropdownItem,
  DropdownLabel,
  DropdownMenu,
  DropdownSection,
  DropdownShortcut,
} from "./dropdown";
import {
  ArrowRightStartOnRectangleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  Cog8ToothIcon,
  InformationCircleIcon,
  MoonIcon,
  UserIcon,
} from "~/platform/icons/standard";

const meta = {
  component: Dropdown,
  subcomponents: {
    DropdownButton,
    DropdownMenu,
    DropdownItem,
    DropdownSection,
    DropdownDivider,
    DropdownHeading,
    DropdownLabel,
    DropdownDescription,
    DropdownShortcut,
    DropdownHeader,
  },
  parameters: {
    layout: "centered",
  },
  render: (args) => (
    <Dropdown {...args}>
      <DropdownButton hierarchy="secondary">
        Options
        <ChevronDownIcon />
      </DropdownButton>
      <DropdownMenu>
        <DropdownItem href="#">View</DropdownItem>
        <DropdownItem href="#">Edit</DropdownItem>
        <DropdownItem>Delete</DropdownItem>
      </DropdownMenu>
    </Dropdown>
  ),
} satisfies Meta<typeof Dropdown>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const MenuPlacement: Story = {
  args: { ...Default.args },
  render: (args) => (
    <Dropdown {...args}>
      <DropdownButton hierarchy="secondary">
        Options
        <ChevronUpIcon />
      </DropdownButton>
      <DropdownMenu anchor="top start">
        <DropdownItem href="#">View</DropdownItem>
        <DropdownItem href="#">Edit</DropdownItem>
        <DropdownItem>Delete</DropdownItem>
      </DropdownMenu>
    </Dropdown>
  ),
};

export const WithDisabledItem: Story = {
  args: { ...Default.args },
  render: (args) => (
    <Dropdown {...args}>
      <DropdownButton hierarchy="secondary">
        Options
        <ChevronDownIcon />
      </DropdownButton>
      <DropdownMenu>
        <DropdownItem href="#">View</DropdownItem>
        <DropdownItem href="#" disabled>
          Edit
        </DropdownItem>
        <DropdownItem>Delete</DropdownItem>
      </DropdownMenu>
    </Dropdown>
  ),
};

export const WithSections: Story = {
  args: { ...Default.args },
  render: (args) => (
    <Dropdown {...args}>
      <DropdownButton hierarchy="secondary">
        Options
        <ChevronDownIcon />
      </DropdownButton>
      <DropdownMenu>
        <DropdownSection aria-label="Account">
          <DropdownItem href="/account">Account</DropdownItem>
          <DropdownItem href="/notifications">Notifications</DropdownItem>
          <DropdownItem href="/billing">Billing</DropdownItem>
        </DropdownSection>
        <DropdownDivider />
        <DropdownSection>
          <DropdownHeading>My events</DropdownHeading>
          <DropdownItem href="/upcoming-events">Upcoming events</DropdownItem>
          <DropdownItem href="/past-events">Past events</DropdownItem>
        </DropdownSection>
      </DropdownMenu>
    </Dropdown>
  ),
};

export const WithDescriptions: Story = {
  args: { ...Default.args },
  render: (args) => (
    <Dropdown {...args}>
      <DropdownButton hierarchy="secondary">
        Options
        <ChevronDownIcon />
      </DropdownButton>
      <DropdownMenu>
        <DropdownItem href="#">
          <DropdownLabel>Open</DropdownLabel>
          <DropdownDescription>Open the file in a new tab.</DropdownDescription>
        </DropdownItem>
        <DropdownItem>
          <DropdownLabel>Rename</DropdownLabel>
          <DropdownDescription>Rename the file.</DropdownDescription>
        </DropdownItem>
        <DropdownItem>
          <DropdownLabel>Delete</DropdownLabel>
          <DropdownDescription>Move the file to the trash.</DropdownDescription>
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  ),
};

export const WithIcons: Story = {
  args: { ...Default.args },
  render: (args) => (
    <Dropdown {...args}>
      <DropdownButton hierarchy="secondary">
        Options
        <ChevronDownIcon />
      </DropdownButton>
      <DropdownMenu anchor="bottom">
        <DropdownItem href="#">
          <UserIcon />
          <DropdownLabel>Account</DropdownLabel>
        </DropdownItem>
        <DropdownItem href="#">
          <Cog8ToothIcon />
          <DropdownLabel>Settings</DropdownLabel>
        </DropdownItem>
        <DropdownItem href="#">
          <InformationCircleIcon />
          <DropdownLabel>Help center</DropdownLabel>
        </DropdownItem>
        <DropdownDivider />
        <DropdownItem href="#">
          <MoonIcon />
          <DropdownLabel>Dark mode</DropdownLabel>
        </DropdownItem>
        <DropdownDivider />
        <DropdownItem href="#">
          <ArrowRightStartOnRectangleIcon />
          <DropdownLabel>Sign out</DropdownLabel>
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  ),
};

export const WithKeyboardShortcuts: Story = {
  args: { ...Default.args },
  render: (args) => (
    <Dropdown {...args}>
      <DropdownButton hierarchy="secondary">
        Options
        <ChevronDownIcon />
      </DropdownButton>
      <DropdownMenu anchor="bottom start">
        <DropdownItem href="#">
          <DropdownLabel>Open</DropdownLabel>
          <DropdownShortcut keys="⌘O" />
        </DropdownItem>
        <DropdownItem href="#">
          <DropdownLabel>Rename</DropdownLabel>
          <DropdownShortcut keys="⌘R" />
        </DropdownItem>
        <DropdownItem href="#">
          <DropdownLabel>Delete</DropdownLabel>
          <DropdownShortcut keys="⇧⌘⌫" />
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  ),
};

export const WithHeader: Story = {
  args: { ...Default.args },
  render: (args) => (
    <Dropdown>
      <DropdownButton hierarchy="secondary">
        Options
        <ChevronDownIcon />
      </DropdownButton>
      <DropdownMenu>
        <DropdownHeader>
          <div className="pr-6">
            <div className="text-xs text-neutral-500 dark:text-neutral-400">
              Signed in as Tom Cook
            </div>
            <div className="text-sm/7 font-semibold text-neutral-800 dark:text-white">
              tom@example.com
            </div>
          </div>
        </DropdownHeader>
        <DropdownDivider />
        <DropdownItem href="/my-profile">My profile</DropdownItem>
        <DropdownItem href="/notifications">Notifications</DropdownItem>
        <DropdownItem href="/security">Security</DropdownItem>
        <DropdownItem href="/billing">Billing</DropdownItem>
        <DropdownItem>Sign out</DropdownItem>
      </DropdownMenu>
    </Dropdown>
  ),
};

export const Light: Story = {
  args: Default.args,
  globals: { backgrounds: { value: "light" } },
};

export const Dark: Story = {
  args: Default.args,
  globals: { backgrounds: { value: "dark" } },
};
