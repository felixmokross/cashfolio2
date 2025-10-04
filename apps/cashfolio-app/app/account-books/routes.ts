import { index, route } from "@react-router/dev/routes";
import { routes as accountRoutes } from "../accounts/routes";
import { routes as accountGroupRoutes } from "../account-groups/routes";
import { routes as transactionRoutes } from "../transactions/routes";
import { routes as periodRoutes } from "../period/routes";

export const routes = [
  route("account-books/create", "account-books/actions/create.ts"),
  route("account-books/update", "account-books/actions/update.ts"),
  route("account-books/delete", "account-books/actions/delete.ts"),

  route(":accountBookId", "account-books/route.tsx", [
    index("account-books/home/route.ts"),
    route("settings", "account-books/settings/route.tsx"),
    route("balances", "balances/route.tsx"),
    route("income", "income/route.tsx"),

    ...accountRoutes,
    ...accountGroupRoutes,
    ...transactionRoutes,
    ...periodRoutes,
  ]),
];
