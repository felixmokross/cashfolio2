import type { Meta, StoryObj } from "@storybook/react-vite";

import { CryptocurrencyCombobox } from "./cryptocurrency-combobox";

const meta = {
  component: CryptocurrencyCombobox,
} satisfies Meta<typeof CryptocurrencyCombobox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
