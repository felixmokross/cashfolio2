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
                  cryptocurrency: null,
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
                  cryptocurrency: null,
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
        liabilities: {
          id: "cmfb7hap6000635osgi0adakp",
          name: "Liabilities",
          slug: "liabilities",
          type: "LIABILITY",
          parentGroupId: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          nodeType: "accountGroup",
          balance: -1500,
          children: [
            {
              id: "cmfb90ahg000835osu85kwtgf",
              name: "Credit Card",
              slug: "credit-card",
              type: "LIABILITY",
              groupId: "cmfb7hap6000635osgi0adakp",
              unit: "CURRENCY",
              currency: "CHF",
              cryptocurrency: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              nodeType: "account",
              balance: -1500,
              balanceInOriginalCurrency: -1500,
            },
          ],
        },
        equity: 996520,
      },
    },
  },
};
