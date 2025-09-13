import type { Meta, StoryObj } from "@storybook/react-vite";

import { AccountGroupCombobox } from "./account-group-combobox";

const meta = {
  component: AccountGroupCombobox,
} satisfies Meta<typeof AccountGroupCombobox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    accountGroups: [
      {
        id: "1",
        name: "Assets",
        type: "ASSET",
        path: "Assets",
        parentGroupId: null,
      },
      {
        id: "2",
        name: "Cash",
        type: "ASSET",
        path: "Assets / Cash",
        parentGroupId: "1",
      },
      {
        id: "3",
        name: "Bank",
        type: "ASSET",
        path: "Assets / Bank",
        parentGroupId: "1",
      },
      {
        id: "4",
        name: "Liabilities",
        type: "LIABILITY",
        path: "Liabilities",
        parentGroupId: null,
      },
      {
        id: "5",
        name: "Credit Card",
        type: "LIABILITY",
        path: "Liabilities / Credit Card",
        parentGroupId: "4",
      },
      {
        id: "6",
        name: "Savings",
        type: "ASSET",
        path: "Assets / Savings",
        parentGroupId: "1",
      },
    ],
  },
};
