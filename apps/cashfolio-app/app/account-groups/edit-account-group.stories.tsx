import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "~/platform/button";
import { EditAccountGroup, useEditAccountGroup } from "./edit-account-group";

const meta = {
  component: EditAccountGroup,
} satisfies Meta<typeof EditAccountGroup>;

export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: {},
  render() {
    const { editAccountGroupProps, onNewAccountGroup } = useEditAccountGroup({
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
        <Button onClick={() => onNewAccountGroup()}>New Account Group</Button>
        <EditAccountGroup {...editAccountGroupProps} />
      </>
    );
  },
};
