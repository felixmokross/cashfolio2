import type { Meta, StoryObj } from "@storybook/react-vite";

import {
  Description,
  ErrorMessage,
  Field,
  FieldGroup,
  Fieldset,
  Label,
  Legend,
} from "./fieldset";
import { Textarea } from "./textarea";
import { Input } from "./input";
import { Select } from "./select";
import { Text } from "../text";

const meta = {
  component: Fieldset,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Fieldset>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: (
      <>
        <Legend>Shipping details</Legend>
        <Text>Without this your odds of getting your order are low.</Text>
        <FieldGroup>
          <Field>
            <Label>Street address</Label>
            <Input name="street_address" />
          </Field>
          <Field>
            <Label>Country</Label>
            <Select name="country">
              <option>Canada</option>
              <option>Mexico</option>
              <option>United States</option>
            </Select>
            <Description>We currently only ship to North America.</Description>
          </Field>
          <Field>
            <Label>Delivery notes</Label>
            <Textarea name="notes" />
            <Description>
              If you have a tiger, we'd like to know about it.
            </Description>
          </Field>
        </FieldGroup>
      </>
    ),
  },
};

export const DisabledField: Story = {
  args: {
    children: (
      <>
        <Field disabled>
          <Label>Street address</Label>
          <Input name="street_address" />
        </Field>
      </>
    ),
  },
};

export const InvalidField: Story = {
  args: {
    children: (
      <>
        <Field>
          <Label>Street address</Label>
          <Input name="street_address" invalid />
          <ErrorMessage>This field is required.</ErrorMessage>
        </Field>
      </>
    ),
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
