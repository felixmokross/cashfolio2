import { index, type RouteConfig } from "@react-router/dev/routes";
import { routes as authRoutes } from "./auth/routes";
import { routes as accountBookRoutes } from "./account-books/routes";

export default [
  index("home/route.tsx"),
  ...authRoutes,
  ...accountBookRoutes,
] satisfies RouteConfig;
