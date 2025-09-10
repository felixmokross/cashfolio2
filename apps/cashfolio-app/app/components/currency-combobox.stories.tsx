import type { Meta, StoryObj } from "@storybook/react-vite";

import { CurrencyCombobox } from "./currency-combobox";

const meta = {
  component: CurrencyCombobox,
} satisfies Meta<typeof CurrencyCombobox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
