import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "./button";
import { Cog6ToothIcon } from "@heroicons/react/20/solid";
const meta = {
  component: Button,
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: <>Click Me</>,
  },
};

export const ColorAccentNegative: Story = {
  args: {
    color: "accent-negative",
    children: <>Click Me</>,
  },
};

export const Outline: Story = {
  args: {
    outline: true,
    children: <>Click Me</>,
  },
};

export const Plain: Story = {
  args: {
    plain: true,
    children: <>Click Me</>,
  },
};

export const WithIcon: Story = {
  args: {
    children: (
      <>
        <Cog6ToothIcon />
        Click Me
      </>
    ),
  },
};

export const PlainIconOnly: Story = {
  args: {
    plain: true,
    children: (
      <>
        <Cog6ToothIcon />
      </>
    ),
  },
};
