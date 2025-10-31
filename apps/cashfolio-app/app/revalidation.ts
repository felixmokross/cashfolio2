import type { ShouldRevalidateFunctionArgs } from "react-router";

export function defaultShouldRevalidate({
  actionResult,
}: ShouldRevalidateFunctionArgs): boolean {
  if (actionResult?.skipRevalidation) {
    return false;
  }

  return true;
}
