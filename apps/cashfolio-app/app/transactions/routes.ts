import { route } from "@react-router/dev/routes";

export const routes = [
  route("transactions/create", "transactions/actions/create.ts"),
  route("transactions/update", "transactions/actions/update.ts"),
  route("transactions/delete", "transactions/actions/delete.ts"),
];
