import type { Meta, StoryObj } from "@storybook/react-vite";

import { Input, InputGroup } from "./input";
import { MagnifyingGlassIcon } from "@heroicons/react/16/solid";

const meta = {
  component: Input,
  subcomponents: { InputGroup },
  parameters: { layout: "centered" },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: "Enter your name…",
  },
};

export const WithDefaultValue: Story = {
  args: {
    ...Default.args,
    defaultValue: "John Smith",
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

export const WithIcon: Story = {
  args: Default.args,
  render: (args) => (
    <InputGroup>
      <MagnifyingGlassIcon />
      <Input {...args} />
    </InputGroup>
  ),
};

export const Light: Story = {
  args: Default.args,
  globals: { backgrounds: { value: "light" } },
};

export const Dark: Story = {
  args: Default.args,
  globals: { backgrounds: { value: "dark" } },
};
