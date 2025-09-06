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

export const Destructive: Story = {
  args: {
    ...Default.args,
    variant: "destructive",
  } as Story["args"],
};

export const Secondary: Story = {
  args: {
    ...Default.args,
    hierarchy: "secondary",
  } as Story["args"],
};

export const Tertiary: Story = {
  args: {
    ...Default.args,
    hierarchy: "tertiary",
  } as Story["args"],
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

export const TertiaryIconOnly: Story = {
  args: {
    hierarchy: "tertiary",
    children: (
      <>
        <Cog6ToothIcon />
      </>
    ),
  },
};

export const Disabled: Story = {
  args: {
    ...Default.args,
    disabled: true,
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
