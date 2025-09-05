import type { Meta, StoryObj } from "@storybook/react-vite";
import { Calendar } from "./calendar";
import { CalendarDate } from "@internationalized/date";

const meta: Meta<typeof Calendar> = {
  title: "base/forms/Calendar",
  component: Calendar,
  parameters: { layout: "centered" },
};

export default meta;

type Story = StoryObj<typeof Calendar>;

export const Default: Story = {
  args: {
    value: new CalendarDate(2023, 3, 1),
  },
};
