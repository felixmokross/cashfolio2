import type { Meta, StoryObj } from "@storybook/react-vite";

import { NavbarButtonList } from "./navbar-button-list";

const meta = {
  component: NavbarButtonList,
} satisfies Meta<typeof NavbarButtonList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {},
};
