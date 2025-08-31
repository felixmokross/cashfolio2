import * as Headless from "@headlessui/react";
import type { Ref } from "react";
import type { LinkProps as ReactRouterLinkProps } from "react-router";
import { Link as ReactRouterLink } from "react-router";

export function Link({
  href,
  ref,
  ...props
}: { href: ReactRouterLinkProps["to"]; ref?: Ref<HTMLAnchorElement> } & Omit<
  ReactRouterLinkProps,
  "to"
>) {
  return (
    <Headless.DataInteractive>
      <ReactRouterLink {...props} to={href} ref={ref} />
    </Headless.DataInteractive>
  );
}
