import type { Meta, StoryObj } from "@storybook/react-vite";

import { AccountCombobox } from "./account-combobox";

const meta = {
  component: AccountCombobox,
} satisfies Meta<typeof AccountCombobox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    accounts: [
      { id: "1", name: "Cash" },
      { id: "2", name: "Bank" },
      { id: "3", name: "Credit Card" },
      { id: "4", name: "Savings" },
    ],
  },
};
