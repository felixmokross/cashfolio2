import type { Preview } from "@storybook/react-vite";
import "../app/app.css";
import { createRoutesStub } from "react-router";
import { themes } from "storybook/theming";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    docs: {
      // Docs theme does not adapt to system theme out-of-the-box
      // see https://github.com/storybookjs/storybook/issues/28664#issuecomment-2241393451
      theme: themes[getPreferredColorScheme()],
    },

    backgrounds: {
      options: {
        dark: { name: "Dark", value: "var(--color-neutral-950)" },
        light: { name: "Light", value: "var(--color-neutral-100)" },
      },
    },
  },
  initialGlobals: {
    backgrounds: { value: "light" },
  },
  decorators: [
    (Story) => {
      const Stub = createRoutesStub([
        {
          path: "*",
          Component: Story,
        },
      ]);

      return <Stub initialEntries={["/"]} />;
    },
    (Story, { globals }) => (
      <div
        data-theme={globals.backgrounds.value === "dark" ? "dark" : undefined}
      >
        <Story />
      </div>
    ),
  ],
  tags: ["autodocs"],
};

export default preview;

function getPreferredColorScheme() {
  if (!window || !window.matchMedia) return "light";

  const isDarkThemePreferred = window.matchMedia(
    "(prefers-color-scheme: dark)",
  ).matches;
  if (isDarkThemePreferred) return "dark";

  return "light";
}
