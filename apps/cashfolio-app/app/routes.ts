import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("balance-sheet", "routes/balance-sheet.tsx"),
  route("accounts", "routes/accounts.tsx"),
  route("profit-loss-statement", "routes/profit-loss-statement.tsx"),
] satisfies RouteConfig;
