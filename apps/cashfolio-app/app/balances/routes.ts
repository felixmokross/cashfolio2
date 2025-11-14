import { index, route } from "@react-router/dev/routes";

export const routes = [
  route("balances/:nodeId?", "balances/route.tsx", [
    index("balances/index/route.tsx"),
    route("breakdown/:dateOrDateOption?", "balances/breakdown/route.tsx", [
      index("balances/breakdown/index/route.tsx"),
      route("table", "balances/breakdown/table/route.tsx"),
      route("chart/:chartType?", "balances/breakdown/chart/route.tsx"),
    ]),
    route("timeline/:range?", "balances/timeline/route.tsx"),
  ]),
];
