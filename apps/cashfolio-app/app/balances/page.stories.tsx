import type { Meta, StoryObj } from "@storybook/react-vite";

import { Page } from "./page";

const meta = {
  component: Page,
} satisfies Meta<typeof Page>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    loaderData: {
      balanceSheet: {
        assets: {
          id: "cmfb6zp1m000435oscptmvjkk",
          name: "Assets",
          type: "ASSET",
          parentGroupId: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          nodeType: "accountGroup",
          balance: 998020,
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
              balance: 998020,
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
                  balance: 997920,
                  balanceInOriginalCurrency: 997920,
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
                  balance: 100,
                  balanceInOriginalCurrency: 100,
                  accountBookId: "cmf2w6x7e0000kdw5g4qv3y3v",
                  isActive: true,
                },
              ],
            },
          ],
        },
        liabilities: {
          id: "cmfb7hap6000635osgi0adakp",
          name: "Liabilities",
          type: "LIABILITY",
          parentGroupId: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          nodeType: "accountGroup",
          balance: -1500,
          accountBookId: "cmf2w6x7e0000kdw5g4qv3y3v",
          children: [
            {
              id: "cmfb90ahg000835osu85kwtgf",
              name: "Credit Card",
              type: "LIABILITY",
              groupId: "cmfb7hap6000635osgi0adakp",
              unit: "CURRENCY",
              currency: "CHF",
              symbol: null,
              tradeCurrency: null,
              equityAccountSubtype: null,
              cryptocurrency: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              nodeType: "account",
              balance: -1500,
              balanceInOriginalCurrency: -1500,
              accountBookId: "cmf2w6x7e0000kdw5g4qv3y3v",
              isActive: true,
            },
          ],
        },
        equity: 996520,
      },
    },
  },
};
