import type { Meta, StoryObj } from "@storybook/react-vite";

import { NavbarButton } from "./navbar-button";
import { HomeIcon } from "@heroicons/react/24/outline";

const meta = {
  component: NavbarButton,
} satisfies Meta<typeof NavbarButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    children: "Button",
    icon: HomeIcon,
    href: "#",
  },
};
