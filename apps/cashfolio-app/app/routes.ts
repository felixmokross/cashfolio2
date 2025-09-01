import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("balance-sheet", "routes/balance-sheet.tsx"),
  route("accounts", "routes/accounts.tsx"),
  route("accounts/:accountId", "routes/account-ledger.tsx"),
  route("account-groups", "routes/account-groups.tsx"),
  route("profit-loss-statement", "routes/profit-loss-statement.tsx"),
] satisfies RouteConfig;
