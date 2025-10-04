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
      rootNode: {
        id: "equity-root",
        name: "Income",
        slug: "income",
        type: "EQUITY",
        parentGroupId: null,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-09-01T00:00:00.000Z",
        nodeType: "accountGroup",
        children: [
          {
            id: "salary-account",
            name: "Salary",
            slug: "salary",
            type: "EQUITY",
            groupId: "equity-root",
            unit: "CURRENCY",
            currency: "CHF",
            symbol: null,
            tradeCurrency: null,
            equityAccountSubtype: null,
            cryptocurrency: null,
            createdAt: "2024-01-01T00:00:00.000Z",
            updatedAt: "2024-09-01T00:00:00.000Z",
            nodeType: "account",
            value: 5000,
          },
          {
            id: "freelance-account",
            name: "Freelance",
            slug: "freelance",
            type: "EQUITY",
            groupId: "equity-root",
            unit: "CURRENCY",
            currency: "CHF",
            symbol: null,
            tradeCurrency: null,
            equityAccountSubtype: null,
            cryptocurrency: null,
            createdAt: "2024-01-01T00:00:00.000Z",
            updatedAt: "2024-09-01T00:00:00.000Z",
            nodeType: "account",
            value: 1200,
          },
        ],
        value: 6200,
      },
    },
  },
};
