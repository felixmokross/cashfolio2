import type { Meta, StoryObj } from "@storybook/react-vite";

import { Badge, BadgeButton } from "./badge";

const meta = {
  component: Badge,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "Badge",
  },
};

export const AccentNegative: Story = {
  args: {
    ...Default.args,
    color: "accent-negative",
  },
};

export const AccentNeutral: Story = {
  args: {
    ...Default.args,
    color: "accent-neutral",
  },
};

export const AccentPositive: Story = {
  args: {
    ...Default.args,
    color: "accent-positive",
  },
};

export const Brand: Story = {
  args: {
    ...Default.args,
    color: "brand",
  },
};

export const Button: Story = {
  args: {
    ...Default.args,
  },
  render: (args) => <BadgeButton {...args} />,
};

export const Light: Story = {
  args: Default.args,
  globals: { backgrounds: { value: "light" } },
};

export const Dark: Story = {
  args: Default.args,
  globals: { backgrounds: { value: "dark" } },
};
