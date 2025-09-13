import { route } from "@react-router/dev/routes";

export const routes = [
  route("accounts", "accounts/list/route.tsx"),
  route("accounts/:accountId", "routes/account-ledger.tsx"),
  route("accounts/create", "accounts/actions/create.ts"),
  route("accounts/update", "accounts/actions/update.ts"),
  route("accounts/delete", "accounts/actions/delete.ts"),
];
