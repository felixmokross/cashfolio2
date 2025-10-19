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
        groupPath: "Assets",
        unit: "CURRENCY",
        currency: "USD",
        cryptocurrency: null,
        symbol: "₣",
        isActive: true,
      },
      {
        id: "2",
        name: "Bank",
        groupId: "3",
        groupPath: "Assets",
        unit: "CURRENCY",
        currency: "USD",
        cryptocurrency: null,
        symbol: "₣",
        isActive: true,
      },
      {
        id: "3",
        name: "Credit Card",
        groupId: "4",
        groupPath: "Liabilities",
        unit: "CURRENCY",
        currency: "USD",
        cryptocurrency: null,
        symbol: "₣",
        isActive: true,
      },
      {
        id: "4",
        name: "Savings",
        groupId: "5",
        groupPath: "Assets",
        unit: "CURRENCY",
        currency: "USD",
        cryptocurrency: null,
        symbol: "₣",
        isActive: true,
      },
      {
        id: "5",
        name: "Cryptocurrency",
        groupId: "5",
        groupPath: "Assets",
        unit: "CRYPTOCURRENCY",
        currency: null,
        cryptocurrency: "BTC",
        symbol: "₣",
        isActive: true,
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
