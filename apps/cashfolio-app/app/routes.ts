import { type RouteConfig, index, route } from "@react-router/dev/routes";
import { routes as accountRoutes } from "./accounts/routes";
import { routes as accountGroupRoutes } from "./account-groups/routes";
import { routes as transactionRoutes } from "./transactions/routes";

export default [
  index("home/route.ts"),
  route("balances", "balances/route.tsx"),
  route("income", "income/route.tsx"),

  ...accountRoutes,
  ...accountGroupRoutes,
  ...transactionRoutes,
] satisfies RouteConfig;
