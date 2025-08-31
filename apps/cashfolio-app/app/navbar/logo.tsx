import { classNames } from "~/class-names";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={classNames("flex h-16 shrink-0 items-center", className)}>
      <img
        alt="Your Company"
        src="https://tailwindcss.com/plus-assets/img/logos/mark.svg?color=indigo&shade=600"
        className="h-8 w-auto dark:hidden"
      />
      <img
        alt="Your Company"
        src="https://tailwindcss.com/plus-assets/img/logos/mark.svg?color=indigo&shade=500"
        className="h-8 w-auto not-dark:hidden"
      />
    </div>
  );
}
