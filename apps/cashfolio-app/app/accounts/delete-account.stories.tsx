import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "~/platform/button";
import { DeleteAccount, useDeleteAccount } from "./delete-account";

const meta = {
  component: DeleteAccount,
} satisfies Meta<typeof DeleteAccount>;

export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: {},
  render() {
    const { deleteAccountProps, onDeleteAccount } = useDeleteAccount();
    return (
      <>
        <Button variant="destructive" onClick={() => onDeleteAccount("1")}>
          Delete Account
        </Button>
        <DeleteAccount {...deleteAccountProps} />
      </>
    );
  },
};
