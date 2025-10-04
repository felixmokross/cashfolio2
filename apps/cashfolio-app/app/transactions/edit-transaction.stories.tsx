import type { Meta, StoryObj } from "@storybook/react-vite";

import { EditTransaction, useEditTransaction } from "./edit-transaction";
import { Button } from "~/platform/button";
import type { ComponentProps } from "react";

const meta = {
  component: EditTransaction,
} satisfies Meta<typeof EditTransaction>;

export default meta;
type Story = StoryObj<ComponentProps<typeof EditTransaction>>;

export const Default: Story = {
  args: {
    accounts: [
      {
        id: "1",
        name: "Cash",
        groupId: "2",
        path: "Assets / Cash",
        unit: "CURRENCY",
        currency: "USD",
        cryptocurrency: null,
      },
      {
        id: "2",
        name: "Bank",
        groupId: "3",
        path: "Assets / Bank",
        unit: "CURRENCY",
        currency: "USD",
        cryptocurrency: null,
      },
      {
        id: "3",
        name: "Credit Card",
        groupId: "4",
        path: "Liabilities / Credit Card",
        unit: "CURRENCY",
        currency: "USD",
        cryptocurrency: null,
      },
      {
        id: "4",
        name: "Savings",
        groupId: "5",
        path: "Assets / Savings",
        unit: "CURRENCY",
        currency: "USD",
        cryptocurrency: null,
      },
      {
        id: "5",
        name: "Cryptocurrency",
        groupId: "5",
        path: "Assets / Cryptocurrency",
        unit: "CRYPTOCURRENCY",
        currency: null,
        cryptocurrency: "BTC",
      },
    ],
  },
  render(args) {
    const { editTransactionProps, onNewTransaction } = useEditTransaction();
    return (
      <>
        <Button onClick={() => onNewTransaction()}>New Transaction</Button>
        <EditTransaction {...editTransactionProps} {...args} />
      </>
    );
  },
};
