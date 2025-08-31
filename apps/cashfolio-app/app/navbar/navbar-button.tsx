import type { ElementType } from "react";
import { NavLink } from "react-router";
import { classNames } from "~/class-names";

export function NavbarButton({
  children,
  href,
  icon: Icon,
}: {
  children?: string;
  href: string;
  icon?: ElementType<{ className: string }>;
}) {
  return (
    <NavLink
      to={href}
      className={({ isActive }) =>
        classNames(
          isActive
            ? "bg-gray-50 text-indigo-600 dark:bg-white/5 dark:text-white"
            : "text-gray-700 hover:bg-gray-50 hover:text-indigo-600 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white",
          "group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold",
        )
      }
    >
      {({ isActive }) => (
        <>
          {Icon && (
            <Icon
              aria-hidden="true"
              className={classNames(
                isActive
                  ? "text-indigo-600 dark:text-white"
                  : "text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-white",
                "size-6 shrink-0",
              )}
            />
          )}
          {children}
        </>
      )}
    </NavLink>
  );
}
