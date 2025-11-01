import { index, route } from "@react-router/dev/routes";

export const routes = [
  route("income", "income/route.tsx", [
    index("income/index/route.tsx"),
    route("breakdown", "income/breakdown/route.tsx", [
      index("income/breakdown/index/route.tsx"),
      route("table", "income/breakdown/table/route.tsx"),
      route("chart/:nodeId?", "income/breakdown/chart/route.tsx"),
    ]),
    route("timeline/:nodeId?", "income/timeline/route.tsx"),
  ]),
];
