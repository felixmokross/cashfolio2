import type { Meta, StoryObj } from "@storybook/react-vite";

import { AccountCombobox } from "./account-combobox";

const meta = {
  component: AccountCombobox,
} satisfies Meta<typeof AccountCombobox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    accounts: [
      { id: "1", name: "Cash", groupId: "1", path: "Assets / Cash" },
      { id: "2", name: "Bank", groupId: "2", path: "Assets / Bank" },
      {
        id: "3",
        name: "Credit Card",
        groupId: "3",
        path: "Liabilities / Credit Card",
      },
      { id: "4", name: "Savings", groupId: "4", path: "Assets / Savings" },
    ],
  },
};
