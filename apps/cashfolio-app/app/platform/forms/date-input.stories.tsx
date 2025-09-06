import type { Meta, StoryObj } from "@storybook/react-vite";
import { Calendar, DateInput } from "./date-input";

const meta: Meta<typeof DateInput> = {
  component: DateInput,
  subcomponents: { Calendar },
  parameters: { layout: "centered" },
};

export default meta;

type Story = StoryObj<typeof DateInput>;

export const Default: Story = {
  args: {
    name: "exampleDate",
    defaultValue: "2023-03-01",
  },
};

export const WithError: Story = {
  args: {
    ...Default.args,
    defaultValue: "",
    error: "This field is required",
  },
};

export const Disabled: Story = {
  args: {
    ...Default.args,
    disabled: true,
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
