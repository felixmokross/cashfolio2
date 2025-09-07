import type { Meta, StoryObj } from "@storybook/react-vite";
import { FormattedNumberInput } from "./formatted-number-input";

const meta: Meta<typeof FormattedNumberInput> = {
  component: FormattedNumberInput,
  parameters: { layout: "centered" },
  render: (args, context) => (
    <FormattedNumberInput {...args} locale={context.globals.locale} />
  ),
};

export default meta;

type Story = StoryObj<typeof FormattedNumberInput>;

export const Default: Story = {
  args: {
    name: "my-formatted-number-input",
    value: "1234.56",
  },
};

export const Light: Story = {
  args: Default.args,
  globals: { backgrounds: { value: "light" } },
};

export const Dark: Story = {
  args: Default.args,
  globals: { backgrounds: { value: "dark" } },
};
