import type { User } from "~/.prisma-client/client";

export function getViewPreference(user: User, key: string) {
  const viewPreferences = user.viewPreferences as Partial<
    Record<string, string>
  >;
  return viewPreferences[key];
}
