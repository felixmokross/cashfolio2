import { index, route } from "@react-router/dev/routes";

export const routes = [
  route("income", "income/route.tsx", [
    index("income/index/route.tsx"),
    route("table", "income/table/route.tsx"),
    route("chart/:nodeId?", "income/chart/route.tsx"),
    route("average/:nodeId?", "income/average/route.tsx"),
  ]),
];
