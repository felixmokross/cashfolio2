import clsx from "clsx";

export function Logo({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 98 98"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Cashfolio Logo"
      role="img"
      className={clsx("stroke-brand-500", className)}
      {...props}
    >
      <path d="M10 75L35.7476 39.6667L59.9806 57.3333L88 22" strokeWidth="12" />
    </svg>
  );
}
