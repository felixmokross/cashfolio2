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
      periodSpecifier: "mtd",
      period: {
        granularity: "month",
        year: 2024,
        month: 5,
      },
      minBookingDate: "2024-01-01",
      rootNode: {
        id: "equity-root",
        name: "Income",
        type: "EQUITY",
        parentGroupId: null,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-09-01T00:00:00.000Z",
        nodeType: "accountGroup",
        accountBookId: "cmf2w6x7e0000kdw5g4qv3y3v",
        isActive: true,
        sortOrder: 1,
        children: [
          {
            id: "salary-account",
            name: "Salary",
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
            accountBookId: "cmf2w6x7e0000kdw5g4qv3y3v",
            isActive: true,
          },
          {
            id: "freelance-account",
            name: "Freelance",
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
            accountBookId: "cmf2w6x7e0000kdw5g4qv3y3v",
            isActive: true,
          },
        ],
        value: 6200,
      },
    },
  },
};
