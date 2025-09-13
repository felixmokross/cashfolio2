import type { Meta, StoryObj } from "@storybook/react-vite";

import { EditTransaction, useEditTransaction } from "./edit-transaction";
import { Button } from "~/platform/button";

const meta = {
  component: EditTransaction,
} satisfies Meta<typeof EditTransaction>;

export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: {},
  render() {
    const { editTransactionProps, onNewTransaction } = useEditTransaction({
      accounts: [
        { id: "1", name: "Cash", groupId: "2", path: "Assets / Cash" },
        { id: "2", name: "Bank", groupId: "3", path: "Assets / Bank" },
        {
          id: "3",
          name: "Credit Card",
          groupId: "4",
          path: "Liabilities / Credit Card",
        },
        { id: "4", name: "Savings", groupId: "5", path: "Assets / Savings" },
      ],
      returnToAccountId: "1",
    });
    return (
      <>
        <Button onClick={() => onNewTransaction()}>New Transaction</Button>
        <EditTransaction {...editTransactionProps} />
      </>
    );
  },
};
