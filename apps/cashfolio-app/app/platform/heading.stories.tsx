import type { Meta, StoryObj } from "@storybook/react-vite";

import { Heading, Subheading } from "./heading";

const meta = {
  component: Heading,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Heading>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "This is a Heading",
  },
};

export const SubheadingDefault: Story = {
  args: {
    children: "This is a Subheading",
  },
  render: (args) => <Subheading {...args} />,
};

export const Light: Story = {
  args: Default.args,
  globals: { backgrounds: { value: "light" } },
};

export const Dark: Story = {
  args: Default.args,
  globals: { backgrounds: { value: "dark" } },
};
