import type { Meta, StoryObj } from "@storybook/react-vite";

import { Description, Fieldset, Label, Legend } from "./fieldset";
import { Text } from "../text";
import { Switch, SwitchField, SwitchGroup } from "./switch";

const meta = {
  component: Switch,
  subcomponents: { SwitchGroup, SwitchField },
  parameters: { layout: "centered" },
} satisfies Meta<typeof Switch>;

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
    <SwitchField>
      <Label>Allow notifications</Label>
      <Switch {...args} />
    </SwitchField>
  ),
};

export const WithDescription: Story = {
  args: Default.args,
  render: (args) => (
    <SwitchField>
      <Label>Allow notifications</Label>
      <Description>
        Send you notifications about your account activity and new features.
      </Description>
      <Switch {...args} />
    </SwitchField>
  ),
};

export const WithDefaultCheckedValue: Story = {
  args: {
    ...Default.args,
    defaultChecked: true,
  },
};

export const MultipleSwitches: Story = {
  render: () => (
    <SwitchGroup>
      <SwitchField>
        <Label>Show on events page</Label>
        <Description>Make this event visible on your profile.</Description>
        <Switch name="show_on_events_page" defaultChecked />
      </SwitchField>
      <SwitchField>
        <Label>Allow embedding</Label>
        <Description>
          Allow others to embed your event details on their own site.
        </Description>
        <Switch name="allow_embedding" />
      </SwitchField>
    </SwitchGroup>
  ),
};

export const WithFieldset: Story = {
  render: () => (
    <Fieldset>
      <Legend>Discoverability</Legend>
      <Text>Decide where your events can be found across the web.</Text>
      <SwitchGroup>
        <SwitchField>
          <Label>Show on events page</Label>
          <Description>Make this event visible on your profile.</Description>
          <Switch
            name="discoverability"
            value="show_on_events_page"
            defaultChecked
          />
        </SwitchField>
        <SwitchField>
          <Label>Allow embedding</Label>
          <Description>
            Allow others to embed your event details on their own site.
          </Description>
          <Switch name="discoverability" value="allow_embedding" />
        </SwitchField>
      </SwitchGroup>
    </Fieldset>
  ),
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
