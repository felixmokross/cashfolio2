import { type RouteConfig } from "@react-router/dev/routes";
import { routes as authRoutes } from "./auth/routes";
import { routes as accountBookRoutes } from "./account-books/routes";

export default [...authRoutes, ...accountBookRoutes] satisfies RouteConfig;
