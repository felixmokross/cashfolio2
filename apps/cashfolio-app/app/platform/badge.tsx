import * as Headless from "@headlessui/react";
import clsx from "clsx";
import React, { type Ref } from "react";
import { TouchTarget } from "./button";
import { Link } from "./link";

const styles = {
  colors: {
    "accent-negative":
      "bg-accent-negative-500/15 text-accent-negative-700 group-data-hover:bg-accent-negative-500/25 dark:bg-accent-negative-500/10 dark:text-accent-negative-400 dark:group-data-hover:bg-accent-negative-500/20",
    brand:
      "bg-brand-500/15 text-brand-700 group-data-hover:bg-brand-500/25 dark:bg-brand-500/10 dark:text-brand-300 dark:group-data-hover:bg-brand-500/20",
    "accent-neutral":
      "bg-accent-neutral-500/15 text-accent-neutral-700 group-data-hover:bg-accent-neutral-500/25 dark:text-accent-neutral-400 dark:group-data-hover:bg-accent-neutral-500/25",
    "accent-positive":
      "bg-accent-positive-500/15 text-accent-positive-700 group-data-hover:bg-accent-positive-500/25 dark:bg-accent-positive-500/10 dark:text-accent-positive-400 dark:group-data-hover:bg-accent-positive-500/20",
    neutral:
      "bg-neutral-600/10 text-neutral-700 group-data-hover:bg-neutral-600/20 dark:bg-white/5 dark:text-neutral-400 dark:group-data-hover:bg-white/10",
  },
};

type BadgeProps = { color?: keyof typeof styles.colors };

export function Badge({
  color = "neutral",
  className,
  ...props
}: BadgeProps & React.ComponentPropsWithoutRef<"span">) {
  return (
    <span
      {...props}
      className={clsx(
        className,
        "inline-flex items-center gap-x-1.5 rounded-md px-1.5 py-0.5 text-sm/5 font-medium sm:text-xs/5 forced-colors:outline",
        styles.colors[color],
      )}
    />
  );
}

export function BadgeButton({
  color: color = "neutral",
  className,
  children,
  ref,
  ...props
}: BadgeProps & {
  className?: string;
  children?: React.ReactNode;
  ref?: Ref<HTMLElement>;
} & (
    | Omit<Headless.ButtonProps, "as" | "className">
    | Omit<React.ComponentPropsWithoutRef<typeof Link>, "className">
  )) {
  const classes = clsx(
    className,
    "group relative inline-flex rounded-md focus:not-data-focus:outline-hidden data-focus:outline-2 data-focus:outline-offset-2 data-focus:outline-accent-neutral-500",
  );

  return "href" in props ? (
    <Link
      {...props}
      className={classes}
      ref={ref as React.ForwardedRef<HTMLAnchorElement>}
    >
      <TouchTarget>
        <Badge color={color}>{children}</Badge>
      </TouchTarget>
    </Link>
  ) : (
    <Headless.Button {...props} className={classes} ref={ref}>
      <TouchTarget>
        <Badge color={color}>{children}</Badge>
      </TouchTarget>
    </Headless.Button>
  );
}
