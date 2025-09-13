import { route } from "@react-router/dev/routes";

export const routes = [
  route("account-groups/create", "account-groups/actions/create.ts"),
  route("account-groups/update", "account-groups/actions/update.ts"),
  route("account-groups/delete", "account-groups/actions/delete.ts"),
];
