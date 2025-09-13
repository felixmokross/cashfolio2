import { type RouteConfig, index, route } from "@react-router/dev/routes";
import { routes as accountRoutes } from "./accounts/routes";

export default [
  index("routes/home.tsx"),
  route("balances", "balances/route.tsx"),
  route("income", "income/route.tsx"),

  ...accountRoutes,

  route("account-groups", "routes/account-groups.tsx"),
  route("transactions", "routes/transactions.tsx"),
] satisfies RouteConfig;
