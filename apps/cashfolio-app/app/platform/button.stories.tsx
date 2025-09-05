import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "./button";
import { Cog6ToothIcon } from "@heroicons/react/20/solid";
const meta = {
  component: Button,
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    children: (
      <>
        <Cog6ToothIcon />
        Click Me
      </>
    ),
  },
};

export const IconOnly: Story = {
  args: {
    plain: true,
    children: (
      <>
        <Cog6ToothIcon />
      </>
    ),
  },
};
