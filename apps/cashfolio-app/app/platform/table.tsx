import clsx from "clsx";
import type React from "react";
import { createContext, useContext, useState } from "react";
import { Link } from "./link";
import * as Headless from "@headlessui/react";

const TableContext = createContext<{
  bleed: boolean;
  dense: boolean;
  grid: boolean;
  striped: boolean;
}>({
  bleed: false,
  dense: false,
  grid: false,
  striped: false,
});

export function Table({
  bleed = false,
  dense = false,
  grid = false,
  striped = false,
  className,
  children,
  fixedLayout = false,
  ...props
}: {
  bleed?: boolean;
  dense?: boolean;
  grid?: boolean;
  striped?: boolean;
  fixedLayout?: boolean;
} & React.ComponentPropsWithoutRef<"div">) {
  return (
    <TableContext.Provider
      value={
        { bleed, dense, grid, striped } as React.ContextType<
          typeof TableContext
        >
      }
    >
      <div className="flow-root">
        <div
          {...props}
          className={clsx(
            className,
            "-mx-(--gutter) overflow-x-auto whitespace-nowrap",
          )}
        >
          <div
            className={clsx(
              "inline-block min-w-full align-middle",
              !bleed && "sm:px-(--gutter)",
            )}
          >
            <table
              className={clsx(
                "w-full min-w-full text-left text-sm/6 text-neutral-950 dark:text-white",
                fixedLayout && "table-fixed",
              )}
            >
              {children}
            </table>
          </div>
        </div>
      </div>
    </TableContext.Provider>
  );
}

export function TableHead({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"thead">) {
  return (
    <thead
      {...props}
      className={clsx(className, "text-neutral-500 dark:text-neutral-400")}
    />
  );
}

export function TableBody(props: React.ComponentPropsWithoutRef<"tbody">) {
  return <tbody {...props} />;
}

const TableRowContext = createContext<{
  href?: string;
  onClick?: (e: React.MouseEvent) => void;
  target?: string;
  title?: string;
}>({
  href: undefined,
  onClick: undefined,
  target: undefined,
  title: undefined,
});

export function TableRow({
  href,
  onClick,
  target,
  title,
  className,
  ...props
}: {
  href?: string;
  onClick?: (e: React.MouseEvent) => void;
  target?: string;
  title?: string;
} & React.ComponentPropsWithoutRef<"tr">) {
  let { striped } = useContext(TableContext);

  return (
    <TableRowContext.Provider
      value={
        { href, onClick, target, title } as React.ContextType<
          typeof TableRowContext
        >
      }
    >
      <tr
        {...props}
        className={clsx(
          className,
          (href || onClick) &&
            "has-[[data-row-link][data-focus]]:outline-2 has-[[data-row-link][data-focus]]:-outline-offset-2 has-[[data-row-link][data-focus]]:outline-accent-neutral-500 dark:focus-within:bg-white/2.5",
          striped && "even:bg-neutral-950/2.5 dark:even:bg-white/2.5",
          (href || onClick) &&
            striped &&
            "hover:bg-neutral-950/5 dark:hover:bg-white/5",
          (href || onClick) &&
            !striped &&
            "hover:bg-neutral-950/2.5 dark:hover:bg-white/2.5",
        )}
      />
    </TableRowContext.Provider>
  );
}

export function TableHeader({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"th">) {
  let { bleed, grid } = useContext(TableContext);

  return (
    <th
      {...props}
      className={clsx(
        className,
        "border-b border-b-neutral-950/10 px-4 py-2 font-medium first:pl-(--gutter,--spacing(2)) last:pr-(--gutter,--spacing(2)) dark:border-b-white/10",
        grid &&
          "border-l border-l-neutral-950/5 first:border-l-0 dark:border-l-white/5",
        !bleed && "sm:first:pl-1 sm:last:pr-1",
      )}
    />
  );
}

export function TableCell({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<"td">) {
  let { bleed, dense, grid, striped } = useContext(TableContext);
  let { href, onClick, target, title } = useContext(TableRowContext);
  let [cellRef, setCellRef] = useState<HTMLElement | null>(null);

  const linkOrButtonTabIndex =
    cellRef?.previousElementSibling === null ? 0 : -1;
  return (
    <td
      ref={href || onClick ? setCellRef : undefined}
      {...props}
      className={clsx(
        className,
        "relative px-4 first:pl-(--gutter,--spacing(2)) last:pr-(--gutter,--spacing(2))",
        !striped && "border-b border-neutral-950/5 dark:border-white/5",
        grid &&
          "border-l border-l-neutral-950/5 first:border-l-0 dark:border-l-white/5",
        dense ? "py-2.5" : "py-4",
        !bleed && "sm:first:pl-1 sm:last:pr-1",
      )}
    >
      {href && (
        <Link
          data-row-link
          href={href}
          target={target}
          aria-label={title}
          tabIndex={linkOrButtonTabIndex}
          className="absolute inset-0 focus:outline-hidden"
        />
      )}
      {onClick && (
        <Headless.DataInteractive>
          <button
            data-row-link
            onClick={onClick}
            aria-label={title}
            tabIndex={linkOrButtonTabIndex}
            className="absolute inset-0 focus:outline-hidden"
          />
        </Headless.DataInteractive>
      )}
      {children}
    </td>
  );
}
