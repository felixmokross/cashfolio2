import type { Meta, StoryObj } from "@storybook/react-vite";

import { ProfileButton } from "./profile-button";
import { HomeIcon } from "@heroicons/react/24/outline";

const meta = {
  component: ProfileButton,
} satisfies Meta<typeof ProfileButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {},
};
