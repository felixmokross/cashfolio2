import type { Meta, StoryObj } from "@storybook/react-vite";

import { Listbox, ListboxLabel, ListboxOption } from "./listbox";
import {
  Bars3BottomLeftIcon,
  Bars3BottomRightIcon,
  Bars3Icon,
} from "~/platform/icons/standard";

const meta = {
  component: Listbox,
  subcomponents: { ListboxOption },
  parameters: { layout: "centered" },
} satisfies Meta<typeof Listbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: "Select an option…",
    children: (
      <>
        <ListboxOption value="active">
          <ListboxLabel>Active</ListboxLabel>
        </ListboxOption>
        <ListboxOption value="paused">
          <ListboxLabel>Paused</ListboxLabel>
        </ListboxOption>
        <ListboxOption value="delayed">
          <ListboxLabel>Delayed</ListboxLabel>
        </ListboxOption>
        <ListboxOption value="canceled">
          <ListboxLabel>Canceled</ListboxLabel>
        </ListboxOption>
      </>
    ),
  },
};

export const WithDefaultValue: Story = {
  args: {
    ...Default.args,
    defaultValue: "delayed",
  },
};

export const WithIcons: Story = {
  args: {
    placeholder: "Select alignment…",
    children: (
      <>
        <ListboxOption value="left">
          <Bars3BottomLeftIcon />
          <ListboxLabel>Left</ListboxLabel>
        </ListboxOption>
        <ListboxOption value="right">
          <Bars3BottomRightIcon />
          <ListboxLabel>Right</ListboxLabel>
        </ListboxOption>
        <ListboxOption value="justified">
          <Bars3Icon />
          <ListboxLabel>Justified</ListboxLabel>
        </ListboxOption>
      </>
    ),
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

export const Light: Story = {
  args: Default.args,
  globals: { backgrounds: { value: "light" } },
};

export const Dark: Story = {
  args: Default.args,
  globals: { backgrounds: { value: "dark" } },
};
