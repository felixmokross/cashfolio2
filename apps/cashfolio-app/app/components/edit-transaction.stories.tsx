import type { Meta, StoryObj } from "@storybook/react-vite";

import { EditTransaction } from "./edit-transaction";

const meta = {
  component: EditTransaction,
} satisfies Meta<typeof EditTransaction>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
    accounts: [
      { id: "1", name: "Cash" },
      { id: "2", name: "Bank" },
      { id: "3", name: "Credit Card" },
      { id: "4", name: "Savings" },
    ],
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
