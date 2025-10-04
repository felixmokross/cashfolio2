import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "~/platform/button";
import { DeleteTransaction, useDeleteTransaction } from "./delete-transaction";

const meta = {
  component: DeleteTransaction,
} satisfies Meta<typeof DeleteTransaction>;

export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: {},
  render() {
    const { deleteTransactionProps, onDeleteTransaction } =
      useDeleteTransaction();
    return (
      <>
        <Button variant="destructive" onClick={() => onDeleteTransaction("1")}>
          Delete Transaction
        </Button>
        <DeleteTransaction {...deleteTransactionProps} />
      </>
    );
  },
};
