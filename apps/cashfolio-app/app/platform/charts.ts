import type { AgChartOptions, AgChartTheme } from "ag-charts-community";
import { getTheme } from "~/theme";

export const defaultChartTheme: AgChartTheme = {
  params: {
    fontFamily:
      '"Inter", ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji",  "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
    fontSize: 14,
    textColor:
      getTheme() === "dark" ? "oklch(98.5% 0 0)" : "oklch(14.1% 0.005 285.823)",
  },
  overrides: {
    bar: {
      title: { fontWeight: 600, fontSize: 20 },
    },
  },
};

export const defaultChartOptions: AgChartOptions = {
  background: { visible: false },
  theme: defaultChartTheme,
};
