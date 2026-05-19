import type { AdminUserListItem } from "@/server/admin-users";

export function getIdentityStatusLabel(
  status: AdminUserListItem["identityStatus"],
) {
  if (status === "missing") return "Missing identity";
  if (status === "unavailable") return "Identity unavailable";
  return null;
}

export function getDeleteConfirmationTarget(user: AdminUserListItem): string {
  return user.email ?? user.externalId;
}

export function isDeleteUserConfirmationMatch(args: {
  confirmation: string;
  user: AdminUserListItem;
}): boolean {
  return args.confirmation.trim() === getDeleteConfirmationTarget(args.user);
}
