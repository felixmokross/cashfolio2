import type { Preview } from "@storybook/react-vite";
import "../app/app.css";
import { createRoutesStub } from "react-router";
import { themes } from "storybook/theming";
import { UNSAFE_PortalProvider } from "react-aria";
import { Globals } from "storybook/internal/types";

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
        light: { name: "Light", value: "var(--color-neutral-100)" },
        dark: { name: "Dark", value: "var(--color-neutral-950)" },
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
      <div data-theme={getTheme(globals)}>
        <Story />
      </div>
    ),
    (Story, { globals, id }) => {
      // Since we might have several stories with different themes on the same document
      // add the theme attribute to the react-aria portal container
      const theme = getTheme(globals);
      return (
        <UNSAFE_PortalProvider
          getContainer={() => {
            const portalId = `portal-${id}`;
            let portal = document.getElementById(portalId);
            if (!portal) {
              portal = document.createElement("div");
              portal.id = portalId;
              document.body.appendChild(portal);
            }

            portal.setAttribute("data-theme", theme);
            return portal;
          }}
        >
          <Story />
        </UNSAFE_PortalProvider>
      );
    },
  ],
  tags: ["autodocs"],
};

function getTheme(globals: Globals): "light" | "dark" {
  return globals.backgrounds?.value === "dark" ? "dark" : "light";
}

export default preview;

function getPreferredColorScheme() {
  if (!window || !window.matchMedia) return "light";

  const isDarkThemePreferred = window.matchMedia(
    "(prefers-color-scheme: dark)",
  ).matches;
  if (isDarkThemePreferred) return "dark";

  return "light";
}
