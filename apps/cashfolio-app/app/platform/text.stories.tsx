import type { Meta, StoryObj } from "@storybook/react-vite";

import { Code, Strong, Text, TextLink } from "./text";

const meta = {
  component: Text,
  subcomponents: { Strong, TextLink, Code },
  parameters: { layout: "centered" },
} satisfies Meta<typeof Text>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: (
      <Text>
        This feature is only available to users on the{" "}
        <Strong>Business Plan</Strong>. To upgrade, visit your{" "}
        <TextLink href="#">billing settings</TextLink>. Your new API token is{" "}
        <Code>BaVrRKpRMS_ndKU</Code>. Store this token somewhere safe as it will
        only be displayed once.
      </Text>
    ),
  },
};
