import type { Meta, StoryObj } from "@storybook/react-vite";

import { Checkbox, CheckboxField, CheckboxGroup } from "./checkbox";
import { Description, Fieldset, Label, Legend } from "./fieldset";
import { Text } from "../text";
import { useState } from "react";

const meta = {
  component: Checkbox,
  subcomponents: { CheckboxGroup, CheckboxField },
  parameters: { layout: "centered" },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    name: "allowNotifications",
    "aria-label": "Allow notifications",
  },
};

export const WithLabel: Story = {
  args: Default.args,
  render: (args) => (
    <CheckboxField>
      <Checkbox {...args} />
      <Label>Allow notifications</Label>
    </CheckboxField>
  ),
};

export const WithDescription: Story = {
  args: Default.args,
  render: (args) => (
    <CheckboxField>
      <Checkbox {...args} />
      <Label>Allow notifications</Label>
      <Description>
        Send you notifications about your account activity and new features.
      </Description>
    </CheckboxField>
  ),
};

export const WithDefaultCheckedValue: Story = {
  args: {
    ...Default.args,
    defaultChecked: true,
  },
};

export const Indeterminate: Story = {
  render: () => {
    const options = ["Show on events page", "Allow embedding"];
    const [selected, setSelected] = useState(["Show on events page"]);

    return (
      <CheckboxGroup role="group" aria-label="Discoverability">
        <CheckboxField>
          <Checkbox
            checked={selected.length > 0}
            indeterminate={selected.length !== options.length}
            onChange={(checked) => setSelected(checked ? options : [])}
          />
          <Label>Select all</Label>
        </CheckboxField>

        {options.map((option) => (
          <CheckboxField key={option}>
            <Checkbox
              name={option}
              checked={selected.includes(option)}
              onChange={(checked) => {
                return setSelected((pending) => {
                  return checked
                    ? [...pending, option]
                    : pending.filter((item) => item !== option);
                });
              }}
            />
            <Label>{option}</Label>
          </CheckboxField>
        ))}
      </CheckboxGroup>
    );
  },
};

export const MultipleCheckboxes: Story = {
  render: () => (
    <CheckboxGroup>
      <CheckboxField>
        <Checkbox name="show_on_events_page" defaultChecked />
        <Label>Show on events page</Label>
        <Description>Make this event visible on your profile.</Description>
      </CheckboxField>
      <CheckboxField>
        <Checkbox name="allow_embedding" />
        <Label>Allow embedding</Label>
        <Description>
          Allow others to embed your event details on their own site.
        </Description>
      </CheckboxField>
    </CheckboxGroup>
  ),
};

export const WithFieldset: Story = {
  render: () => (
    <Fieldset>
      <Legend>Discoverability</Legend>
      <Text>Decide where your events can be found across the web.</Text>
      <CheckboxGroup>
        <CheckboxField>
          <Checkbox
            name="discoverability"
            value="show_on_events_page"
            defaultChecked
          />
          <Label>Show on events page</Label>
          <Description>Make this event visible on your profile.</Description>
        </CheckboxField>
        <CheckboxField>
          <Checkbox name="discoverability" value="allow_embedding" />
          <Label>Allow embedding</Label>
          <Description>
            Allow others to embed your event details on their own site.
          </Description>
        </CheckboxField>
      </CheckboxGroup>
    </Fieldset>
  ),
};

export const Disabled: Story = {
  args: {
    ...Default.args,
    disabled: true,
  },
};

export const Destructive: Story = {
  args: {
    ...WithDefaultCheckedValue.args,
    variant: "destructive",
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
