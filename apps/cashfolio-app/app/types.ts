import type { Account } from "@prisma/client";

export type AccountOption = Pick<Account, "id" | "name">;
