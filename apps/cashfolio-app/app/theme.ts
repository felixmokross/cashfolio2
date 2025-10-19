export function getTheme() {
  return typeof document !== "undefined" &&
    document.documentElement.getAttribute("data-theme") === "dark"
    ? "dark"
    : "light";
}
