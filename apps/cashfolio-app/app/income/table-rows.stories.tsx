import type { Meta, StoryObj } from "@storybook/react-vite";

import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "~/platform/table";
import { IncomeTableRows } from "./table-rows";

const meta = {
  component: IncomeTableRows,
  decorators: [
    (Story) => (
      <Table dense bleed striped>
        <TableHead>
          <TableRow>
            <TableHeader>Account</TableHeader>
            <TableHeader className="text-right w-32">Value</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          <Story />
        </TableBody>
      </Table>
    ),
  ],
} satisfies Meta<typeof IncomeTableRows>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    node: {
      id: "cmfb6zp1m000435oscptmvjkk",
      name: "Assets",
      type: "ASSET",
      parentGroupId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      nodeType: "accountGroup",
      value: 1000,
      accountBookId: "cmf2w6x7e0000kdw5g4qv3y3v",
      children: [
        {
          id: "cmfa7oxid000135gbi0addrl2",
          name: "Cash",
          type: "ASSET",
          parentGroupId: "cmfb6zp1m000435oscptmvjkk",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          nodeType: "accountGroup",
          value: 1000,
          accountBookId: "cmf2w6x7e0000kdw5g4qv3y3v",
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
              value: 1200,
              accountBookId: "cmf2w6x7e0000kdw5g4qv3y3v",
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
              value: -200,
              accountBookId: "cmf2w6x7e0000kdw5g4qv3y3v",
            },
          ],
        },
      ],
    },
  },
};
