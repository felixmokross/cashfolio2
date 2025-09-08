import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "~/platform/button";
import { EditAccount, useEditAccount } from "./edit-account";

const meta = {
  component: EditAccount,
} satisfies Meta<typeof EditAccount>;

export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: {},
  render() {
    const { editAccountProps, onNewAccount } = useEditAccount({
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
          parentGroupId: "4",
          path: "Liabilities / Credit Card",
        },
      ],
    });
    return (
      <>
        <Button onClick={() => onNewAccount()}>New Account</Button>
        <EditAccount {...editAccountProps} />
      </>
    );
  },
};
