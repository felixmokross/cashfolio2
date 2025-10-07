import type { Meta, StoryObj } from "@storybook/react-vite";

import { AccountsNodeChildrenTableRows } from "./table-rows";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/platform/table";

const meta = {
  component: AccountsNodeChildrenTableRows<{ additionalField: number }>,
  decorators: [
    (Story) => (
      <Table dense bleed striped>
        <TableHead>
          <TableRow>
            <TableHeader>Account</TableHeader>
            <TableHeader>Additional Field</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          <Story />
        </TableBody>
      </Table>
    ),
  ],
} satisfies Meta<
  typeof AccountsNodeChildrenTableRows<{ additionalField: number }>
>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    viewPrefix: "accountGroups",
    node: {
      id: "cmfb6zp1m000435oscptmvjkk",
      name: "Assets",
      type: "ASSET",
      parentGroupId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      nodeType: "accountGroup",
      additionalField: 1,
      accountBookId: "cmf2w6x7e0000kdw5g4qv3y3v",
      isActive: true,
      sortOrder: 1,
      children: [
        {
          id: "cmfa7oxid000135gbi0addrl2",
          name: "Cash",
          type: "ASSET",
          parentGroupId: "cmfb6zp1m000435oscptmvjkk",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          nodeType: "accountGroup",
          additionalField: 2,
          accountBookId: "cmf2w6x7e0000kdw5g4qv3y3v",
          isActive: true,
          sortOrder: 1,
          children: [
            {
              id: "cmf2x1kpe0003kdw5kzymh88n",
              name: "neon",
              type: "ASSET",
              groupId: "cmfa7oxid000135gbi0addrl2",
              unit: "CURRENCY",
              currency: "CHF",
              cryptocurrency: null,
              symbol: null,
              tradeCurrency: null,
              equityAccountSubtype: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              nodeType: "account",
              additionalField: 3,
              accountBookId: "cmf2w6x7e0000kdw5g4qv3y3v",
              isActive: true,
            },
            {
              id: "cmfa835a4000335gbj92m3cn8",
              name: "Revolut",
              type: "ASSET",
              groupId: "cmfa7oxid000135gbi0addrl2",
              unit: "CURRENCY",
              currency: "CHF",
              cryptocurrency: null,
              symbol: null,
              tradeCurrency: null,
              equityAccountSubtype: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              nodeType: "account",
              additionalField: 4,
              accountBookId: "cmf2w6x7e0000kdw5g4qv3y3v",
              isActive: true,
            },
          ],
        },
      ],
    },
    children: (node) => <TableCell>{node.additionalField}</TableCell>,
  },
};
