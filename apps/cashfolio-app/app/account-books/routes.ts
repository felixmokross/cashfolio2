import { index, route } from "@react-router/dev/routes";

export const routes = [
  index("account-books/no-account-book/route.tsx"),
  route("account-books/create", "account-books/actions/create.ts"),
];
