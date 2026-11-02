export function applyAppearance() {
  const theme = localStorage.getItem("casebook-theme") ?? "system";
  document.documentElement.dataset.theme =
    theme === "system"
      ? matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;
  document.documentElement.dataset.reading =
    localStorage.getItem("casebook-reading") ?? "default";
}
