import { index, route } from "@react-router/dev/routes";

export const routes = [
  route("admin", "admin/route.tsx", [
    index("admin/home/route.ts"),
    route("users", "admin/users/route.tsx"),
    route("account-books", "admin/account-books/route.tsx"),
  ]),
];
