import type { Meta, StoryObj } from "@storybook/react-vite";

import { ProfitLossStatementPage } from "./profit-loss-statement-page";

const meta = {
  component: ProfitLossStatementPage,
} satisfies Meta<typeof ProfitLossStatementPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    loaderData: {
      items: [
        { id: "1", name: "Groceries", value: -13000 },
        { id: "2", name: "Rent", value: -23000 },
        { id: "3", name: "Salary", value: 60000 },
        { id: "4", name: "FX Conversion Gain/Loss", value: 30 },
        { id: "5", name: "FX Holding Gain/Loss (unrealized)", value: 2000 },
      ],
      total: 36000,
    },
  },
};
