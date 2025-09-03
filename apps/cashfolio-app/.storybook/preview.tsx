import type { Preview } from "@storybook/react-vite";
import "../app/app.css";
import { createRoutesStub } from "react-router";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  decorators: [
    (Story) => {
      const Stub = createRoutesStub([
        {
          path: "*",
          Component: Story,
        },
      ]);

      return (
        <div className="flex h-[calc(100vh-2rem)] items-stretch justify-center">
          <div className="w-80 h-full">
            <Stub initialEntries={["/"]} />
          </div>
        </div>
      );
    },
  ],
};

export default preview;
