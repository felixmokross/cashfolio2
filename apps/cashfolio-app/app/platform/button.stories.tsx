import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "./button";
const meta = {
  component: Button,
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    children: "Click Me",
  },
};
