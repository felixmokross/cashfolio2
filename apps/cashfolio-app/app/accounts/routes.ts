import { route } from "@react-router/dev/routes";

export const routes = [
  route("accounts", "accounts/list/route.tsx"),
  route("accounts/inactive", "accounts/inactive-list/route.tsx"),
  route("accounts/:accountId", "accounts/detail/route.tsx"),
  route("accounts/create", "accounts/actions/create.ts"),
  route("accounts/update", "accounts/actions/update.ts"),
  route("accounts/delete", "accounts/actions/delete.ts"),
];
