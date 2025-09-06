import type { Meta, StoryObj } from "@storybook/react-vite";

import { Combobox, ComboboxOption } from "./combobox";

type Option = { id: string; name: string };

const meta = {
  component: Combobox<Option>,
  subcomponents: { ComboboxOption },
  parameters: { layout: "centered" },
} satisfies Meta<typeof Combobox<Option>>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: "Select an option…",
    options: [
      { id: "1", name: "Option 1" },
      { id: "2", name: "Option 2" },
      { id: "3", name: "Option 3" },
    ],
    displayValue: (option) => option?.name ?? "",
    children: (option) => (
      <ComboboxOption value={option}>{option.name}</ComboboxOption>
    ),
  },
};

export const WithDefaultValue: Story = {
  args: {
    ...Default.args,
    defaultValue: { id: "2", name: "Option 2" },
  },
};

export const Disabled: Story = {
  args: {
    ...Default.args,
    disabled: true,
  },
};

export const Invalid: Story = {
  args: {
    ...Default.args,
    invalid: true,
  },
};

export const Immediate: Story = {
  args: {
    ...Default.args,
    immediate: true,
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
