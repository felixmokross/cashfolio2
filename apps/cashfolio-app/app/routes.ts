import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";
import { routes as accountRoutes } from "./accounts/routes";
import { routes as accountGroupRoutes } from "./account-groups/routes";
import { routes as transactionRoutes } from "./transactions/routes";
import { routes as periodRoutes } from "./period/routes";
import { routes as authRoutes } from "./auth/routes";

export default [
  ...authRoutes,
  layout("layout/route.tsx", { id: "layout" }, [
    index("home/route.ts"),
    route("balances", "balances/route.tsx"),
    route("income", "income/route.tsx"),

    ...accountRoutes,
    ...accountGroupRoutes,
    ...transactionRoutes,
    ...periodRoutes,
  ]),
] satisfies RouteConfig;
