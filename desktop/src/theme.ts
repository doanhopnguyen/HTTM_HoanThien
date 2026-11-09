import { theme, radius } from "@pool-safety/shared";
const kebab = (key: string) =>
  key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
/** Publishes the shared brand theme as CSS custom properties (e.g. theme.criticalSoft → --critical-soft). */
export function applyTheme(root: HTMLElement = document.documentElement) {
  for (const [key, value] of Object.entries(theme))
    root.style.setProperty(`--${kebab(key)}`, value);
  for (const [key, value] of Object.entries(radius))
    root.style.setProperty(`--radius-${key}`, `${value}px`);
}
