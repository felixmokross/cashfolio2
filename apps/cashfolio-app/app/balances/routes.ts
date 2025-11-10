import { index, route } from "@react-router/dev/routes";

export const routes = [
  route("balances", "balances/route.tsx", [
    index("balances/index/route.tsx"),
    route("breakdown/:dateOrDateOption?", "balances/breakdown/route.tsx"),
    route("timeline/:range?", "balances/timeline/route.tsx"),
  ]),
];
