import * as Headless from "@headlessui/react";
import clsx from "clsx";
import { useEffect, useRef, type Ref } from "react";

export function Select({
  className,
  ref,
  ...props
}: { className?: string; ref?: Ref<HTMLSelectElement> } & Omit<
  Headless.SelectProps,
  "as" | "className"
>) {
  const internalRef = useRef<HTMLSelectElement>(null);

  // Headless.Select seems to have a bug where it doesn't set the 'data-focus' attribute upon focus
  // This effect ensures the 'data-focus' attribute is kept in sync
  useEffect(() => {
    const element = internalRef.current!;

    function handleFocus() {
      element.setAttribute("data-focus", "");
    }
    function handleBlur() {
      element.removeAttribute("data-focus");
    }

    element.addEventListener("focus", handleFocus);
    element.addEventListener("blur", handleBlur);
    return () => {
      element.removeEventListener("focus", handleFocus);
      element.removeEventListener("blur", handleBlur);
    };
  }, []);
  return (
    <span
      data-slot="control"
      className={clsx([
        className,
        // Basic layout
        "group relative block w-full",
        // Background color + shadow applied to inset pseudo element, so shadow blends with border in light mode
        "before:absolute before:inset-px before:rounded-[calc(var(--radius-lg)-1px)] before:bg-white before:shadow-sm",
        // Background color is moved to control and shadow is removed in dark mode so hide `before` pseudo
        "dark:before:hidden",
        // Focus ring
        "after:pointer-events-none after:absolute after:inset-0 after:rounded-lg after:ring-transparent after:ring-inset has-data-focus:after:ring-2 has-data-focus:after:ring-accent-neutral-500",
        // Disabled state
        "has-data-disabled:opacity-50 has-data-disabled:before:bg-neutral-950/5 has-data-disabled:before:shadow-none",
      ])}
    >
      <Headless.Select
        ref={mergeRefs(ref, internalRef)}
        {...props}
        className={clsx([
          // Basic layout
          "relative block w-full appearance-none rounded-lg py-[calc(--spacing(2.5)-1px)] sm:py-[calc(--spacing(1.5)-1px)]",
          // Horizontal padding
          "pr-[calc(--spacing(10)-1px)] pl-[calc(--spacing(3.5)-1px)] sm:pr-[calc(--spacing(9)-1px)] sm:pl-[calc(--spacing(3)-1px)]",
          // Options (multi-select)
          "[&_optgroup]:font-semibold",
          // Typography
          "text-base/6 text-neutral-950 placeholder:text-neutral-500 sm:text-sm/6 dark:text-white dark:*:text-white",
          // Border
          "border border-neutral-950/10 data-hover:border-neutral-950/20 dark:border-white/10 dark:data-hover:border-white/20",
          // Background color
          "bg-transparent dark:bg-white/5 dark:*:bg-neutral-800",
          // Hide default focus styles
          "focus:outline-hidden",
          // Invalid state
          "data-invalid:border-accent-negative-500 data-invalid:data-hover:border-accent-negative-500 dark:data-invalid:border-accent-negative-600 dark:data-invalid:data-hover:border-accent-negative-600",
          // Disabled state
          "data-disabled:border-neutral-950/20 data-disabled:opacity-100 dark:data-disabled:border-white/15 dark:data-disabled:bg-white/2.5 dark:data-hover:data-disabled:border-white/15",
        ])}
      />
      <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
        <svg
          className="size-5 stroke-neutral-500 group-has-data-disabled:stroke-neutral-600 sm:size-4 dark:stroke-neutral-400 forced-colors:stroke-[CanvasText]"
          viewBox="0 0 16 16"
          aria-hidden="true"
          fill="none"
        >
          <path
            d="M5.75 10.75L8 13L10.25 10.75"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M10.25 5.25L8 3L5.75 5.25"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </span>
  );
}

function mergeRefs<TElement>(...inputRefs: (Ref<TElement> | undefined)[]) {
  return (element: TElement) => {
    for (const ref of inputRefs) {
      if (typeof ref === "function") {
        ref(element);
      } else if (ref) {
        ref.current = element;
      }
    }
  };
}
