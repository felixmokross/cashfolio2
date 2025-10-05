import { index, type RouteConfig } from "@react-router/dev/routes";
import { routes as authRoutes } from "./auth/routes";
import { routes as accountBookRoutes } from "./account-books/routes";
import { routes as viewPreferencesRoutes } from "./view-preferences/routes";
import { routes as adminRoutes } from "./admin/routes";

export default [
  index("home/route.tsx"),
  ...authRoutes,
  ...accountBookRoutes,
  ...viewPreferencesRoutes,
  ...adminRoutes,
] satisfies RouteConfig;
