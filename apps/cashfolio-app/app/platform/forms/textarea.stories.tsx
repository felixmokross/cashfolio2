import type { Meta, StoryObj } from "@storybook/react-vite";

import { Textarea } from "./textarea";
import { Description, Field, Label } from "./fieldset";

const meta = {
  component: Textarea,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: "Enter a description…",
  },
};

export const WithLabel: Story = {
  args: {},
  render: (args) => (
    <Field>
      <Label>Description</Label>
      <Textarea {...args} />
    </Field>
  ),
};

export const WithDescription: Story = {
  args: {},
  render: (args) => (
    <Field>
      <Label>Description</Label>
      <Description>This will be shown under the product title.</Description>
      <Textarea {...args} />
    </Field>
  ),
};

export const Disabled: Story = {
  args: { ...Default.args, disabled: true },
};

export const Invalid: Story = {
  args: { ...Default.args, invalid: true },
};

export const Light: Story = {
  args: Default.args,
  globals: { backgrounds: { value: "light" } },
};

export const Dark: Story = {
  args: Default.args,
  globals: { backgrounds: { value: "dark" } },
};
