import type { Meta, StoryObj } from "@storybook/react-vite";

import { Radio, RadioField, RadioGroup } from "./radio";
import { Description, Fieldset, Label, Legend } from "./fieldset";
import { Text } from "../text";

const meta = {
  component: Radio,
  subcomponents: { RadioGroup, RadioField },
  parameters: { layout: "centered" },
} satisfies Meta<typeof Radio>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    value: "permit",
  },
  render: (args) => (
    <RadioGroup
      name="resale"
      defaultValue="permit"
      aria-label="Resale and transfers"
    >
      <RadioField>
        <Radio {...args} />
        <Label>Allow tickets to be resold</Label>
      </RadioField>
      <RadioField>
        <Radio value="forbid" />
        <Label>Don’t allow tickets to be resold</Label>
      </RadioField>
    </RadioGroup>
  ),
};

export const WithDescription: Story = {
  args: Default.args,
  render: (args) => (
    <RadioGroup>
      <RadioField>
        <Radio {...args} />
        <Label>Allow notifications</Label>
        <Description>
          Send you notifications about your account activity and new features.
        </Description>
      </RadioField>
    </RadioGroup>
  ),
};

export const WithFieldset: Story = {
  args: {
    value: "permit",
  },
  render: (args) => (
    <Fieldset>
      <Legend>Resale and transfers</Legend>
      <Text>Decide if people buy tickets from you or from scalpers.</Text>
      <RadioGroup name="resale" defaultValue="permit">
        <RadioField>
          <Radio {...args} />
          <Label>Allow tickets to be resold</Label>
          <Description>
            Customers can resell or transfer their tickets if they can’t make it
            to the event.
          </Description>
        </RadioField>
        <RadioField>
          <Radio value="forbid" />
          <Label>Don’t allow tickets to be resold</Label>
          <Description>
            Tickets cannot be resold or transferred to another person.
          </Description>
        </RadioField>
      </RadioGroup>
    </Fieldset>
  ),
};

export const Disabled: Story = {
  args: {
    ...Default.args,
    disabled: true,
  },
  render: Default.render,
};

export const Destructive: Story = {
  args: {
    ...Default.args,
    variant: "destructive",
  },
  render: Default.render,
};

export const Light: Story = {
  args: Default.args,
  render: Default.render,
  globals: { backgrounds: { value: "light" } },
};

export const Dark: Story = {
  args: Default.args,
  render: Default.render,
  globals: { backgrounds: { value: "dark" } },
};
