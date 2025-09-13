import type { Meta, StoryObj } from "@storybook/react-vite";

import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "~/platform/table";
import { BalancesTableRows } from "./table-rows";

const meta = {
  component: BalancesTableRows,
  decorators: [
    (Story) => (
      <Table dense bleed striped>
        <TableHead>
          <TableRow>
            <TableHeader>Account</TableHeader>
            <TableHeader className="text-right w-32">
              <span className="sr-only">Balance in Original Currency</span>
            </TableHeader>
            <TableHeader className="text-right w-32">Balance</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          <Story />
        </TableBody>
      </Table>
    ),
  ],
} satisfies Meta<typeof BalancesTableRows>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    node: {
      id: "cmfb6zp1m000435oscptmvjkk",
      name: "Assets",
      slug: "assets",
      type: "ASSET",
      parentGroupId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      nodeType: "accountGroup",
      balance: 998020,
      children: [
        {
          id: "cmfa7oxid000135gbi0addrl2",
          name: "Cash",
          slug: "cash",
          type: "ASSET",
          parentGroupId: "cmfb6zp1m000435oscptmvjkk",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          nodeType: "accountGroup",
          balance: 998020,
          children: [
            {
              id: "cmf2x1kpe0003kdw5kzymh88n",
              name: "neon",
              slug: "neon",
              type: "ASSET",
              groupId: "cmfa7oxid000135gbi0addrl2",
              unit: "CURRENCY",
              currency: "CHF",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              nodeType: "account",
              balance: 997920,
              balanceInOriginalCurrency: 997920,
            },
            {
              id: "cmfa835a4000335gbj92m3cn8",
              name: "Revolut",
              slug: "revolut",
              type: "ASSET",
              groupId: "cmfa7oxid000135gbi0addrl2",
              unit: "CURRENCY",
              currency: "CHF",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              nodeType: "account",
              balance: 100,
              balanceInOriginalCurrency: 100,
            },
          ],
        },
      ],
    },
  },
};
