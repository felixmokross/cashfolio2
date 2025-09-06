import * as Headless from "@headlessui/react";
import clsx from "clsx";
import React, { type Ref } from "react";
import { Link } from "./link";

const styles = {
  base: [
    // Base
    "relative isolate inline-flex items-baseline justify-center gap-x-2 rounded-lg border text-base/6 font-semibold",
    // Sizing
    "px-[calc(--spacing(3.5)-1px)] py-[calc(--spacing(2.5)-1px)] sm:px-[calc(--spacing(3)-1px)] sm:py-[calc(--spacing(1.5)-1px)] sm:text-sm/6",
    // Focus
    "focus:not-data-focus:outline-hidden data-focus:outline-2 data-focus:outline-offset-2 data-focus:outline-accent-neutral-500",
    // Disabled
    "data-disabled:opacity-50",
    // Icon
    "*:data-[slot=icon]:-mx-0.5 *:data-[slot=icon]:my-0.5 *:data-[slot=icon]:size-5 *:data-[slot=icon]:shrink-0 *:data-[slot=icon]:self-center *:data-[slot=icon]:text-(--btn-icon) sm:*:data-[slot=icon]:my-1 sm:*:data-[slot=icon]:size-4 forced-colors:[--btn-icon:ButtonText] forced-colors:data-hover:[--btn-icon:ButtonText]",
  ],
  primary: [
    // Optical border, implemented as the button background to avoid corner artifacts
    "border-transparent bg-(--btn-border)",
    // Dark mode: border is rendered on `after` so background is set to button background
    "dark:bg-(--btn-bg)",
    // Button background, implemented as foreground layer to stack on top of pseudo-border layer
    "before:absolute before:inset-0 before:-z-10 before:rounded-[calc(var(--radius-lg)-1px)] before:bg-(--btn-bg)",
    // Drop shadow, applied to the inset `before` layer so it blends with the border
    "before:shadow-sm",
    // Background color is moved to control and shadow is removed in dark mode so hide `before` pseudo
    "dark:before:hidden",
    // Dark mode: Subtle white outline is applied using a border
    "dark:border-white/5",
    // Shim/overlay, inset to match button foreground and used for hover state + highlight shadow
    "after:absolute after:inset-0 after:-z-10 after:rounded-[calc(var(--radius-lg)-1px)]",
    // Inner highlight shadow
    "after:shadow-[inset_0_1px_--theme(--color-white/15%)]",
    // White overlay on hover
    "data-active:after:bg-(--btn-hover-overlay) data-hover:after:bg-(--btn-hover-overlay)",
    // Dark mode: `after` layer expands to cover entire button
    "dark:after:-inset-px dark:after:rounded-lg",
    // Disabled
    "data-disabled:before:shadow-none data-disabled:after:shadow-none",
  ],
  secondary: [
    // Base
    "border-neutral-950/10 text-neutral-950 data-active:bg-neutral-950/2.5 data-hover:bg-neutral-950/2.5",
    // Dark mode
    "dark:border-white/15 dark:text-white dark:[--btn-bg:transparent] dark:data-active:bg-white/5 dark:data-hover:bg-white/5",
    // Icon
    "[--btn-icon:var(--color-neutral-500)] data-active:[--btn-icon:var(--color-neutral-700)] data-hover:[--btn-icon:var(--color-neutral-700)] dark:data-active:[--btn-icon:var(--color-neutral-400)] dark:data-hover:[--btn-icon:var(--color-neutral-400)]",
  ],
  tertiary: [
    // Base
    "border-transparent text-neutral-950 data-active:bg-neutral-950/5 data-hover:bg-neutral-950/5",
    // Dark mode
    "dark:text-white dark:data-active:bg-white/10 dark:data-hover:bg-white/10",
    // Icon
    "[--btn-icon:var(--color-neutral-500)] data-active:[--btn-icon:var(--color-neutral-700)] data-hover:[--btn-icon:var(--color-neutral-700)] dark:[--btn-icon:var(--color-neutral-500)] dark:data-active:[--btn-icon:var(--color-neutral-400)] dark:data-hover:[--btn-icon:var(--color-neutral-400)]",
  ],
  variants: {
    standard: [
      "text-white [--btn-hover-overlay:var(--color-white)]/10 [--btn-bg:var(--color-brand-500)] [--btn-border:var(--color-brand-600)]/80",
      "[--btn-icon:var(--color-white)]/60 data-active:[--btn-icon:var(--color-white)]/80 data-hover:[--btn-icon:var(--color-white)]/80",
    ],
    destructive: [
      "text-white [--btn-hover-overlay:var(--color-white)]/10 [--btn-bg:var(--color-accent-negative-600)] [--btn-border:var(--color-accent-negative-700)]/90",
      "[--btn-icon:var(--color-accent-negative-300)] data-active:[--btn-icon:var(--color-accent-negative-200)] data-hover:[--btn-icon:var(--color-accent-negative-200)]",
    ],
  },
};

type ButtonProps = (
  | {
      /**
       * The visual hierarchy of the button.
       *
       * @default primary
       */
      hierarchy?: "primary";

      /**
       * The color variant of the button. Only applicable when `hierarchy` is `primary`.
       *
       * @default standard
       */
      variant?: "standard" | "destructive";
    }
  | {
      hierarchy: "secondary" | "tertiary";
      variant?: never;
    }
) & {
  className?: string;
  children: React.ReactNode;
  ref?: Ref<HTMLButtonElement | HTMLAnchorElement>;
} & (
    | Omit<Headless.ButtonProps, "as" | "className">
    | Omit<React.ComponentPropsWithoutRef<typeof Link>, "className">
  );

export function Button({
  hierarchy,
  variant,
  className,
  children,
  ref,
  ...props
}: ButtonProps) {
  let classes = clsx(
    className,
    styles.base,
    hierarchy === "secondary"
      ? styles.secondary
      : hierarchy === "tertiary"
        ? styles.tertiary
        : clsx(styles.primary, styles.variants[variant ?? "standard"]),
  );

  return "href" in props ? (
    <Link
      {...props}
      className={classes}
      ref={ref as Ref<HTMLAnchorElement> | undefined}
    >
      <TouchTarget>{children}</TouchTarget>
    </Link>
  ) : (
    <Headless.Button
      {...props}
      className={clsx(classes, "cursor-default")}
      ref={ref}
    >
      <TouchTarget>{children}</TouchTarget>
    </Headless.Button>
  );
}

/**
 * Expand the hit area to at least 44×44px on touch devices
 */
export function TouchTarget({ children }: { children: React.ReactNode }) {
  return (
    <>
      <span
        className="absolute top-1/2 left-1/2 size-[max(100%,2.75rem)] -translate-x-1/2 -translate-y-1/2 pointer-fine:hidden"
        aria-hidden="true"
      />
      {children}
    </>
  );
}
