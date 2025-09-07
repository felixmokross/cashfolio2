import clsx from "clsx";

export function Divider({
  soft = false,
  bleed = false,
  className,
  ...props
}: { soft?: boolean; bleed?: boolean } & React.ComponentPropsWithoutRef<"hr">) {
  return (
    <hr
      role="presentation"
      {...props}
      className={clsx(
        className,
        "border-t",
        bleed
          ? "-mx-(--gutter) w-[calc(100%)_+_(var(--gutter)_*_2)]"
          : "w-full",
        soft && "border-neutral-950/5 dark:border-white/5",
        !soft && "border-neutral-950/10 dark:border-white/10",
      )}
    />
  );
}
