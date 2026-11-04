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
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute(
      "content",
      document.documentElement.dataset.theme === "dark" ? "#17191F" : "#F8F9FE",
    );
}
