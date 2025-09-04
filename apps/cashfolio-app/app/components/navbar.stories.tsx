import type { Meta, StoryObj } from "@storybook/react-vite";

import { Navbar } from "./navbar";

const meta = {
  component: Navbar,
  decorators: [
    (Story) => (
      <div className="flex h-[calc(100vh-2rem)] items-stretch justify-center">
        <div className="w-80 h-full">
          <Story />
        </div>
      </div>
    ),
  ],
} satisfies Meta<typeof Navbar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {},
};
