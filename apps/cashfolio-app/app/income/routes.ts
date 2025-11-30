import { route } from "@react-router/dev/routes";

export const routes = [
  route("income/:nodeId?/:range?/:view?", "income/route.tsx"),
];
