import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "~/platform/button";
import {
  DeleteAccountGroup,
  useDeleteAccountGroup,
} from "./delete-account-group";

const meta = {
  component: DeleteAccountGroup,
} satisfies Meta<typeof DeleteAccountGroup>;

export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: {},
  render() {
    const { deleteAccountGroupProps, onDeleteAccountGroup } =
      useDeleteAccountGroup();
    return (
      <>
        <Button variant="destructive" onClick={() => onDeleteAccountGroup("1")}>
          Delete Account Group
        </Button>
        <DeleteAccountGroup {...deleteAccountGroupProps} />
      </>
    );
  },
};
