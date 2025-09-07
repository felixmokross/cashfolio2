import type { Meta, StoryObj } from "@storybook/react-vite";

import { Divider } from "./divider";

const meta = {
  component: Divider,
} satisfies Meta<typeof Divider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const Soft: Story = {
  args: {
    ...Default.args,
    soft: true,
  },
};

export const FullWidth: Story = {
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story) => (
      <div className="p-5">
        <Story />
      </div>
    ),
  ],
  args: {
    ...Default.args,
    bleed: true,
    className: "[--gutter:--spacing(5)]",
  },
};
