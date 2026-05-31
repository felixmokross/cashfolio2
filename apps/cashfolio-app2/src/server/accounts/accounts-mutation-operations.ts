import { prisma } from "../../prisma.server";
import {
  AccountType,
  EquityAccountSubtype,
  Unit,
} from "../../.prisma-client/enums";
import { Prisma } from "../../.prisma-client/client";
import {
  validateAccountInput,
  validateAccountGroupInput,
} from "../../shared/account-validation";
import { getBookingUnitFields } from "../../shared/booking-unit-fields";
import {
  getOpeningBalancesBookingDate,
  getUtcDayRange,
} from "../../shared/date";
import { moneyIsZero } from "../../shared/money";
import {
  ensureNoGroupCycle,
  getGroupHierarchy,
  hasInactiveAncestorGroup,
} from "./accounts-helpers";
import {
  assertNoSystemManagedAccountSubtype,
  assertNoSystemManagedGroupSubtype,
} from "./accounts-system-managed-equity-guards";
import type { AccountGroupInput, AccountInput } from "./accounts-types";
import {
  accountTypeRequiresZeroBalanceForArchive,
  getAccountArchiveAvailability,
  getAccountDeleteAvailability,
  getAccountUnarchiveAvailability,
  getGroupArchiveAvailability,
  getGroupDeleteAvailability,
  getGroupUnarchiveAvailability,
} from "./account-tree-rules";

const OPENING_BALANCES_ACCOUNT_NAME = "Opening Balances";
const OPENING_BALANCE_EPSILON = 0.000001;

export type AccountMutationOperationResult<T = undefined> = {
  data: T;
  invalidatePeriodCache: boolean;
};

type AccountUpdateInput = AccountInput & {
  id: string;
};

type AccountGroupUpdateInput = AccountGroupInput & {
  id: string;
};

type AccountBookNodeIdInput = {
  id: string;
  accountBookId: string;
};

type ReorderAccountTreeItemsInput = {
  accountBookId: string;
  updates: {
    id: string;
    nodeType: "account" | "accountGroup";
    sortOrder: number;
  }[];
};

function normalizeOpeningBalanceTarget(
  openingBalance: number | null | undefined,
): number | undefined {
  if (openingBalance === undefined) {
    return undefined;
  }
  if (openingBalance === null) {
    return 0;
  }
  const value = Number(openingBalance);
  if (!Number.isFinite(value)) {
    throw new Error("Opening balance is invalid.");
  }
  return value;
}

function isUniqueConstraintError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === "P2002";
  }

  if (typeof error !== "object" || error == null) {
    return false;
  }

  const maybeCode = (error as { code?: unknown }).code;
  return maybeCode === "P2002";
}

type ExistingAccountUnitIdentity = {
  unit: AccountInput["unit"] | null;
  currency: string | null;
  cryptocurrency: string | null;
  symbol: string | null;
  tradeCurrency: string | null;
};

type ExistingAccountStatementImportConfig = {
  statementImportCsvFormat: Prisma.JsonValue | null;
};

function normalizeSubmittedUnitField(value: string | null | undefined) {
  return value ?? null;
}

function assertAccountUnitIdentityUnchanged(
  data: AccountInput,
  existing: ExistingAccountUnitIdentity,
) {
  if (data.unit !== undefined && (data.unit ?? null) !== existing.unit) {
    throw new Error("Account unit cannot be changed");
  }

  if (
    data.currency !== undefined &&
    normalizeSubmittedUnitField(data.currency) !== existing.currency
  ) {
    throw new Error("Account unit cannot be changed");
  }

  if (
    data.cryptocurrency !== undefined &&
    normalizeSubmittedUnitField(data.cryptocurrency) !== existing.cryptocurrency
  ) {
    throw new Error("Account unit cannot be changed");
  }

  if (
    data.symbol !== undefined &&
    normalizeSubmittedUnitField(data.symbol) !== existing.symbol
  ) {
    throw new Error("Account unit cannot be changed");
  }

  if (
    data.tradeCurrency !== undefined &&
    normalizeSubmittedUnitField(data.tradeCurrency) !== existing.tradeCurrency
  ) {
    throw new Error("Account unit cannot be changed");
  }
}

function mergeExistingAccountUnitIdentity<T extends AccountInput>(
  data: T,
  existing: ExistingAccountUnitIdentity,
): T {
  return {
    ...data,
    unit: existing.unit ?? undefined,
    currency: existing.currency ?? undefined,
    cryptocurrency: existing.cryptocurrency ?? undefined,
    symbol: existing.symbol ?? undefined,
    tradeCurrency: existing.tradeCurrency ?? undefined,
  };
}

function normalizeEquityAccountUnitIdentity<T extends AccountInput>(
  data: T,
): T {
  if (data.type !== AccountType.EQUITY) {
    return data;
  }

  return {
    ...data,
    unit: undefined,
    currency: undefined,
    cryptocurrency: undefined,
    symbol: undefined,
    tradeCurrency: undefined,
  };
}

function toStatementImportCsvFormatJsonInput(
  format: AccountInput["statementImportCsvFormat"],
) {
  return format == null ? Prisma.DbNull : (format as Prisma.InputJsonValue);
}

function getStatementImportCsvFormatUpdateInput(
  data: AccountInput,
  existing: ExistingAccountStatementImportConfig,
) {
  return data.statementImportCsvFormat === undefined
    ? (existing.statementImportCsvFormat as AccountInput["statementImportCsvFormat"])
    : data.statementImportCsvFormat;
}

function normalizeMissingCashAccountFlag<T extends AccountInput>(data: T): T {
  return {
    ...data,
    isCashAccount: data.isCashAccount ?? false,
  };
}

function normalizeMissingGroupCashAccountFlag<T extends AccountGroupInput>(
  data: T,
): T {
  return {
    ...data,
    isCashAccount: data.isCashAccount ?? false,
  };
}

function canBeCashAccount(account: { type: AccountType; unit?: Unit | null }) {
  return account.type === AccountType.ASSET && account.unit === Unit.CURRENCY;
}

function canBeCashGroup(group: { type: AccountType }) {
  return group.type === AccountType.ASSET;
}

async function getParentGroupCashFlag(args: {
  accountBookId: string;
  parentGroupId?: string | null;
}) {
  if (!args.parentGroupId) return undefined;

  const parentGroup = await prisma.accountGroup.findUniqueOrThrow({
    where: {
      id_accountBookId: {
        id: args.parentGroupId,
        accountBookId: args.accountBookId,
      },
    },
    select: { isCashAccount: true },
  });

  return parentGroup.isCashAccount;
}

async function resolveAccountCashFlag<T extends AccountInput>(
  data: T,
): Promise<T> {
  const parentCashFlag = await getParentGroupCashFlag({
    accountBookId: data.accountBookId,
    parentGroupId: data.groupId,
  });
  const isCashAccount = parentCashFlag ?? data.isCashAccount ?? false;

  if (isCashAccount && !canBeCashAccount(data)) {
    throw new Error("Cash accounts must be currency asset accounts");
  }

  return {
    ...data,
    isCashAccount,
  };
}

async function resolveAccountGroupCashFlag<T extends AccountGroupInput>(
  data: T,
): Promise<T> {
  const parentCashFlag = await getParentGroupCashFlag({
    accountBookId: data.accountBookId,
    parentGroupId: data.parentGroupId,
  });
  const isCashAccount = parentCashFlag ?? data.isCashAccount ?? false;

  if (isCashAccount && !canBeCashGroup(data)) {
    throw new Error("Cash account groups must be asset groups");
  }

  return {
    ...data,
    isCashAccount,
  };
}

async function getDescendantGroupIds(args: {
  tx: Prisma.TransactionClient;
  accountBookId: string;
  groupId: string;
}) {
  const groups = await args.tx.accountGroup.findMany({
    where: { accountBookId: args.accountBookId },
    select: { id: true, parentGroupId: true },
  });
  const childrenByParentGroupId = new Map<string, string[]>();
  for (const group of groups) {
    if (!group.parentGroupId) continue;
    const children = childrenByParentGroupId.get(group.parentGroupId) ?? [];
    children.push(group.id);
    childrenByParentGroupId.set(group.parentGroupId, children);
  }

  const groupIds = new Set<string>();
  const stack = [args.groupId];
  while (stack.length > 0) {
    const groupId = stack.pop();
    if (!groupId || groupIds.has(groupId)) continue;
    groupIds.add(groupId);
    stack.push(...(childrenByParentGroupId.get(groupId) ?? []));
  }

  return [...groupIds];
}

async function assertCashableGroupSubtree(args: {
  tx: Prisma.TransactionClient;
  accountBookId: string;
  groupId: string;
}) {
  const groupIds = await getDescendantGroupIds(args);
  const [groups, accounts] = await Promise.all([
    args.tx.accountGroup.findMany({
      where: {
        accountBookId: args.accountBookId,
        id: { in: groupIds },
      },
      select: { type: true },
    }),
    args.tx.account.findMany({
      where: {
        accountBookId: args.accountBookId,
        groupId: { in: groupIds },
      },
      select: { type: true, unit: true },
    }),
  ]);

  if (groups.some((group) => !canBeCashGroup(group))) {
    throw new Error("Cash account groups must contain only asset groups");
  }
  if (accounts.some((account) => !canBeCashAccount(account))) {
    throw new Error(
      "Cash account groups must contain only currency asset accounts",
    );
  }
}

async function applyGroupCashFlagToSubtree(args: {
  tx: Prisma.TransactionClient;
  accountBookId: string;
  groupId: string;
  isCashAccount: boolean;
}) {
  const groupIds = await getDescendantGroupIds(args);

  await args.tx.accountGroup.updateMany({
    where: {
      accountBookId: args.accountBookId,
      id: { in: groupIds },
    },
    data: { isCashAccount: args.isCashAccount },
  });
  await args.tx.account.updateMany({
    where: {
      accountBookId: args.accountBookId,
      groupId: { in: groupIds },
    },
    data: { isCashAccount: args.isCashAccount },
  });
}

async function getOrCreateOpeningBalancesAccountId(
  tx: Prisma.TransactionClient,
  accountBookId: string,
): Promise<string> {
  const existing = await tx.account.findFirst({
    where: {
      accountBookId,
      type: AccountType.EQUITY,
      equityAccountSubtype: EquityAccountSubtype.OPENING_BALANCES,
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true },
  });
  if (existing) {
    return existing.id;
  }

  try {
    const created = await tx.account.create({
      data: {
        name: OPENING_BALANCES_ACCOUNT_NAME,
        type: AccountType.EQUITY,
        equityAccountSubtype: EquityAccountSubtype.OPENING_BALANCES,
        accountBookId,
      },
      select: { id: true },
    });
    return created.id;
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      const concurrentlyCreated = await tx.account.findFirst({
        where: {
          accountBookId,
          type: AccountType.EQUITY,
          equityAccountSubtype: EquityAccountSubtype.OPENING_BALANCES,
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: { id: true },
      });
      if (concurrentlyCreated) {
        return concurrentlyCreated.id;
      }
    }

    throw error;
  }
}

async function applyOpeningBalanceTarget(args: {
  tx: Prisma.TransactionClient;
  accountBookId: string;
  account: {
    id: string;
    name: string;
    type: AccountType;
    unit: Parameters<typeof getBookingUnitFields>[0]["unit"];
    currency: Parameters<typeof getBookingUnitFields>[0]["currency"];
    cryptocurrency: Parameters<
      typeof getBookingUnitFields
    >[0]["cryptocurrency"];
    symbol: Parameters<typeof getBookingUnitFields>[0]["symbol"];
    tradeCurrency: Parameters<typeof getBookingUnitFields>[0]["tradeCurrency"];
  };
  openingBalance: number | null | undefined;
}) {
  const normalizedOpeningBalance = normalizeOpeningBalanceTarget(
    args.openingBalance,
  );
  if (normalizedOpeningBalance === undefined) {
    return;
  }
  if (
    args.account.type !== AccountType.ASSET &&
    args.account.type !== AccountType.LIABILITY
  ) {
    return;
  }

  const accountBook = await args.tx.accountBook.findUniqueOrThrow({
    where: { id: args.accountBookId },
    select: { startDate: true },
  });
  const openingBalancesBookingDate = getOpeningBalancesBookingDate(
    accountBook.startDate,
  );
  const openingBalanceDateRange = getUtcDayRange(openingBalancesBookingDate);

  const existingOpeningBalanceTransactions = await args.tx.transaction.findMany(
    {
      where: {
        accountBookId: args.accountBookId,
        AND: [
          {
            bookings: {
              some: {
                accountId: args.account.id,
                date: {
                  gte: openingBalanceDateRange.start,
                  lt: openingBalanceDateRange.endExclusive,
                },
              },
            },
          },
          {
            bookings: {
              some: {
                date: {
                  gte: openingBalanceDateRange.start,
                  lt: openingBalanceDateRange.endExclusive,
                },
                account: {
                  type: AccountType.EQUITY,
                  equityAccountSubtype: EquityAccountSubtype.OPENING_BALANCES,
                },
              },
            },
          },
        ],
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: {
        id: true,
        bookings: {
          where: {
            date: {
              gte: openingBalanceDateRange.start,
              lt: openingBalanceDateRange.endExclusive,
            },
          },
          select: {
            id: true,
            accountId: true,
            account: {
              select: {
                id: true,
                type: true,
                equityAccountSubtype: true,
              },
            },
          },
        },
      },
    },
  );
  const targetRawOpeningBalance =
    args.account.type === AccountType.ASSET
      ? normalizedOpeningBalance
      : -normalizedOpeningBalance;
  const hasTargetOpeningBalance =
    Math.abs(targetRawOpeningBalance) > OPENING_BALANCE_EPSILON;

  const bookingUnitFields = getBookingUnitFields(
    args.account,
    "account opening balance",
  );
  const description = `Opening balance adjustment: ${args.account.name}`;

  if (existingOpeningBalanceTransactions.length === 0) {
    if (!hasTargetOpeningBalance) {
      return;
    }

    const openingBalancesAccountId = await getOrCreateOpeningBalancesAccountId(
      args.tx,
      args.accountBookId,
    );
    await args.tx.transaction.create({
      data: {
        description,
        accountBookId: args.accountBookId,
        bookings: {
          create: [
            {
              date: openingBalancesBookingDate,
              description: "",
              account: {
                connect: {
                  id_accountBookId: {
                    id: args.account.id,
                    accountBookId: args.accountBookId,
                  },
                },
              },
              ...bookingUnitFields,
              value: targetRawOpeningBalance,
              sortOrder: 0,
              accountBook: {
                connect: { id: args.accountBookId },
              },
            },
            {
              date: openingBalancesBookingDate,
              description: "",
              account: {
                connect: {
                  id_accountBookId: {
                    id: openingBalancesAccountId,
                    accountBookId: args.accountBookId,
                  },
                },
              },
              ...bookingUnitFields,
              value: -targetRawOpeningBalance,
              sortOrder: 1,
              accountBook: {
                connect: { id: args.accountBookId },
              },
            },
          ],
        },
      },
    });
    return;
  }

  const canonicalTransaction = existingOpeningBalanceTransactions[0]!;
  const accountBooking = canonicalTransaction.bookings.find(
    (booking) => booking.accountId === args.account.id,
  );
  const openingBalancesBooking = canonicalTransaction.bookings.find(
    (booking) =>
      booking.account.type === AccountType.EQUITY &&
      booking.account.equityAccountSubtype ===
        EquityAccountSubtype.OPENING_BALANCES,
  );
  const transactionsToDelete = existingOpeningBalanceTransactions
    .slice(1)
    .map((transaction) => transaction.id);

  if (!accountBooking || !openingBalancesBooking) {
    await args.tx.transaction.deleteMany({
      where: {
        accountBookId: args.accountBookId,
        id: {
          in: existingOpeningBalanceTransactions.map(
            (transaction) => transaction.id,
          ),
        },
      },
    });

    if (!hasTargetOpeningBalance) {
      return;
    }

    const openingBalancesAccountId = await getOrCreateOpeningBalancesAccountId(
      args.tx,
      args.accountBookId,
    );
    await args.tx.transaction.create({
      data: {
        description,
        accountBookId: args.accountBookId,
        bookings: {
          create: [
            {
              date: openingBalancesBookingDate,
              description: "",
              account: {
                connect: {
                  id_accountBookId: {
                    id: args.account.id,
                    accountBookId: args.accountBookId,
                  },
                },
              },
              ...bookingUnitFields,
              value: targetRawOpeningBalance,
              sortOrder: 0,
              accountBook: {
                connect: { id: args.accountBookId },
              },
            },
            {
              date: openingBalancesBookingDate,
              description: "",
              account: {
                connect: {
                  id_accountBookId: {
                    id: openingBalancesAccountId,
                    accountBookId: args.accountBookId,
                  },
                },
              },
              ...bookingUnitFields,
              value: -targetRawOpeningBalance,
              sortOrder: 1,
              accountBook: {
                connect: { id: args.accountBookId },
              },
            },
          ],
        },
      },
    });
    return;
  }

  if (!hasTargetOpeningBalance) {
    await args.tx.transaction.deleteMany({
      where: {
        accountBookId: args.accountBookId,
        id: {
          in: existingOpeningBalanceTransactions.map(
            (transaction) => transaction.id,
          ),
        },
      },
    });
    return;
  }

  const extraBookingIdsOnCanonical = canonicalTransaction.bookings
    .filter(
      (booking) =>
        booking.id !== accountBooking.id &&
        booking.id !== openingBalancesBooking.id,
    )
    .map((booking) => booking.id);

  await args.tx.transaction.update({
    where: {
      id_accountBookId: {
        id: canonicalTransaction.id,
        accountBookId: args.accountBookId,
      },
    },
    data: {
      description,
      bookings: {
        update: [
          {
            where: {
              id_accountBookId: {
                id: accountBooking.id,
                accountBookId: args.accountBookId,
              },
            },
            data: {
              date: openingBalancesBookingDate,
              description: "",
              ...bookingUnitFields,
              value: targetRawOpeningBalance,
              sortOrder: 0,
              account: {
                connect: {
                  id_accountBookId: {
                    id: args.account.id,
                    accountBookId: args.accountBookId,
                  },
                },
              },
            },
          },
          {
            where: {
              id_accountBookId: {
                id: openingBalancesBooking.id,
                accountBookId: args.accountBookId,
              },
            },
            data: {
              date: openingBalancesBookingDate,
              description: "",
              ...bookingUnitFields,
              value: -targetRawOpeningBalance,
              sortOrder: 1,
            },
          },
        ],
      },
    },
  });

  if (extraBookingIdsOnCanonical.length > 0) {
    await args.tx.booking.deleteMany({
      where: {
        accountBookId: args.accountBookId,
        transactionId: canonicalTransaction.id,
        id: { in: extraBookingIdsOnCanonical },
      },
    });
  }

  if (transactionsToDelete.length > 0) {
    await args.tx.transaction.deleteMany({
      where: {
        accountBookId: args.accountBookId,
        id: { in: transactionsToDelete },
      },
    });
  }
}

export async function createAccountOperation(data: AccountInput) {
  const normalizedData = await resolveAccountCashFlag(
    normalizeMissingCashAccountFlag(normalizeEquityAccountUnitIdentity(data)),
  );
  assertNoSystemManagedAccountSubtype(normalizedData);
  const siblingNames = (
    await prisma.account.findMany({
      where: {
        groupId: normalizedData.groupId ?? null,
        accountBookId: normalizedData.accountBookId,
      },
      select: { name: true },
    })
  ).map((a) => a.name);
  validateAccountInput(normalizedData, siblingNames);
  const account = await prisma.$transaction(async (tx) => {
    const createdAccount = await tx.account.create({
      data: {
        name: normalizedData.name,
        type: normalizedData.type,
        equityAccountSubtype: normalizedData.equityAccountSubtype,
        groupId: normalizedData.groupId ?? null,
        sortOrder:
          typeof normalizedData.sortOrder === "number"
            ? normalizedData.sortOrder
            : null,
        unit: normalizedData.unit,
        currency: normalizedData.currency,
        cryptocurrency: normalizedData.cryptocurrency,
        symbol: normalizedData.symbol,
        tradeCurrency: normalizedData.tradeCurrency,
        statementImportCsvFormat: toStatementImportCsvFormatJsonInput(
          normalizedData.statementImportCsvFormat,
        ),
        isCashAccount: normalizedData.isCashAccount ?? false,
        accountBookId: normalizedData.accountBookId,
      },
    });

    await applyOpeningBalanceTarget({
      tx,
      accountBookId: normalizedData.accountBookId,
      account: {
        id: createdAccount.id,
        name: createdAccount.name,
        type: createdAccount.type,
        unit: createdAccount.unit,
        currency: createdAccount.currency,
        cryptocurrency: createdAccount.cryptocurrency,
        symbol: createdAccount.symbol,
        tradeCurrency: createdAccount.tradeCurrency,
      },
      openingBalance: normalizedData.openingBalance,
    });

    return createdAccount;
  });
  return { data: account, invalidatePeriodCache: true };
}

export async function updateAccountOperation(data: AccountUpdateInput) {
  const submittedData = normalizeMissingCashAccountFlag(
    normalizeEquityAccountUnitIdentity(data),
  );
  const existing = await prisma.account.findUniqueOrThrow({
    where: {
      id_accountBookId: {
        id: submittedData.id,
        accountBookId: submittedData.accountBookId,
      },
    },
    select: {
      type: true,
      equityAccountSubtype: true,
      unit: true,
      currency: true,
      cryptocurrency: true,
      symbol: true,
      tradeCurrency: true,
      statementImportCsvFormat: true,
      isCashAccount: true,
    },
  });
  assertNoSystemManagedAccountSubtype(existing);
  if (
    submittedData.type !== existing.type ||
    submittedData.equityAccountSubtype !==
      (existing.equityAccountSubtype ?? undefined)
  ) {
    throw new Error("Account type cannot be changed");
  }
  assertAccountUnitIdentityUnchanged(submittedData, existing);
  const normalizedData = await resolveAccountCashFlag(
    mergeExistingAccountUnitIdentity(submittedData, existing),
  );
  const dataWithExistingUnitIdentity = mergeExistingAccountUnitIdentity(
    normalizedData,
    existing,
  );

  const siblingNames = (
    await prisma.account.findMany({
      where: {
        groupId: normalizedData.groupId ?? null,
        accountBookId: normalizedData.accountBookId,
        id: { not: normalizedData.id },
      },
      select: { name: true },
    })
  ).map((a) => a.name);
  validateAccountInput(dataWithExistingUnitIdentity, siblingNames);
  const account = await prisma.$transaction(async (tx) => {
    const updatedAccount = await tx.account.update({
      where: {
        id_accountBookId: {
          id: normalizedData.id,
          accountBookId: normalizedData.accountBookId,
        },
      },
      data: {
        name: normalizedData.name,
        groupId: normalizedData.groupId ?? null,
        sortOrder:
          typeof normalizedData.sortOrder === "number"
            ? normalizedData.sortOrder
            : null,
        statementImportCsvFormat: toStatementImportCsvFormatJsonInput(
          getStatementImportCsvFormatUpdateInput(normalizedData, existing),
        ),
        isCashAccount: normalizedData.isCashAccount ?? false,
      },
    });

    await applyOpeningBalanceTarget({
      tx,
      accountBookId: normalizedData.accountBookId,
      account: {
        id: updatedAccount.id,
        name: updatedAccount.name,
        type: updatedAccount.type,
        unit: updatedAccount.unit,
        currency: updatedAccount.currency,
        cryptocurrency: updatedAccount.cryptocurrency,
        symbol: updatedAccount.symbol,
        tradeCurrency: updatedAccount.tradeCurrency,
      },
      openingBalance: normalizedData.openingBalance,
    });

    return updatedAccount;
  });
  return { data: account, invalidatePeriodCache: true };
}

export async function createAccountGroupOperation(data: AccountGroupInput) {
  const normalizedData = await resolveAccountGroupCashFlag(
    normalizeMissingGroupCashAccountFlag(data),
  );
  assertNoSystemManagedGroupSubtype(normalizedData);
  const siblingNames = (
    await prisma.accountGroup.findMany({
      where: {
        parentGroupId: normalizedData.parentGroupId ?? null,
        accountBookId: normalizedData.accountBookId,
      },
      select: { name: true },
    })
  ).map((g) => g.name);
  validateAccountGroupInput(normalizedData, siblingNames);
  const group = await prisma.accountGroup.create({
    data: {
      name: normalizedData.name,
      type: normalizedData.type,
      equityAccountSubtype: normalizedData.equityAccountSubtype,
      isActive: normalizedData.isActive ?? true,
      parentGroupId: normalizedData.parentGroupId,
      sortOrder:
        typeof normalizedData.sortOrder === "number"
          ? normalizedData.sortOrder
          : null,
      isCashAccount: normalizedData.isCashAccount ?? false,
      accountBookId: normalizedData.accountBookId,
    },
  });
  return { data: group, invalidatePeriodCache: true };
}

export async function updateAccountGroupOperation(
  data: AccountGroupUpdateInput,
) {
  const submittedData = normalizeMissingGroupCashAccountFlag(data);
  const existing = await prisma.accountGroup.findUniqueOrThrow({
    where: {
      id_accountBookId: {
        id: submittedData.id,
        accountBookId: submittedData.accountBookId,
      },
    },
    select: { type: true, equityAccountSubtype: true },
  });
  assertNoSystemManagedGroupSubtype(existing);
  if (
    submittedData.type !== existing.type ||
    submittedData.equityAccountSubtype !==
      (existing.equityAccountSubtype ?? undefined)
  ) {
    throw new Error("Group type cannot be changed");
  }
  const normalizedData = await resolveAccountGroupCashFlag(submittedData);

  const [siblingGroups, groupById] = await Promise.all([
    prisma.accountGroup.findMany({
      where: {
        parentGroupId: normalizedData.parentGroupId ?? null,
        accountBookId: normalizedData.accountBookId,
        id: { not: normalizedData.id },
      },
      select: { name: true },
    }),
    getGroupHierarchy(normalizedData.accountBookId),
  ]);
  const siblingNames = siblingGroups.map((g) => g.name);
  validateAccountGroupInput(normalizedData, siblingNames);
  ensureNoGroupCycle({
    groupId: normalizedData.id,
    parentGroupId: normalizedData.parentGroupId,
    groupById,
  });
  const group = await prisma.$transaction(async (tx) => {
    if (normalizedData.isCashAccount) {
      await assertCashableGroupSubtree({
        tx,
        accountBookId: normalizedData.accountBookId,
        groupId: normalizedData.id,
      });
    }

    const updatedGroup = await tx.accountGroup.update({
      where: {
        id_accountBookId: {
          id: normalizedData.id,
          accountBookId: normalizedData.accountBookId,
        },
      },
      data: {
        name: normalizedData.name,
        parentGroupId: normalizedData.parentGroupId,
        sortOrder:
          typeof normalizedData.sortOrder === "number"
            ? normalizedData.sortOrder
            : null,
      },
    });

    await applyGroupCashFlagToSubtree({
      tx,
      accountBookId: normalizedData.accountBookId,
      groupId: normalizedData.id,
      isCashAccount: normalizedData.isCashAccount ?? false,
    });

    return updatedGroup;
  });
  return { data: group, invalidatePeriodCache: true };
}

export async function deleteAccountOperation(data: AccountBookNodeIdInput) {
  const [account, bookingCount] = await Promise.all([
    prisma.account.findUniqueOrThrow({
      where: {
        id_accountBookId: { id: data.id, accountBookId: data.accountBookId },
      },
      select: { type: true, equityAccountSubtype: true },
    }),
    prisma.booking.count({
      where: { accountId: data.id, accountBookId: data.accountBookId },
    }),
  ]);
  assertNoSystemManagedAccountSubtype(account);
  const deleteAvailability = getAccountDeleteAvailability(bookingCount > 0);
  if (!deleteAvailability.enabled) {
    throw new Error(deleteAvailability.disabledReason);
  }
  await prisma.account.delete({
    where: {
      id_accountBookId: { id: data.id, accountBookId: data.accountBookId },
    },
  });
  return { data: undefined, invalidatePeriodCache: true };
}

export async function deleteAccountGroupOperation(
  data: AccountBookNodeIdInput,
) {
  const [group, childAccounts, childGroups] = await Promise.all([
    prisma.accountGroup.findUniqueOrThrow({
      where: {
        id_accountBookId: { id: data.id, accountBookId: data.accountBookId },
      },
      select: {
        type: true,
        equityAccountSubtype: true,
      },
    }),
    prisma.account.count({
      where: { groupId: data.id, accountBookId: data.accountBookId },
    }),
    prisma.accountGroup.count({
      where: { parentGroupId: data.id, accountBookId: data.accountBookId },
    }),
  ]);
  assertNoSystemManagedGroupSubtype(group);
  const deleteAvailability = getGroupDeleteAvailability({
    hasChildAccounts: childAccounts > 0,
    hasChildGroups: childGroups > 0,
  });
  if (!deleteAvailability.enabled) {
    throw new Error(deleteAvailability.disabledReason);
  }
  await prisma.accountGroup.delete({
    where: {
      id_accountBookId: { id: data.id, accountBookId: data.accountBookId },
    },
  });
  return { data: undefined, invalidatePeriodCache: true };
}

export async function archiveAccountOperation(data: AccountBookNodeIdInput) {
  const account = await prisma.account.findUniqueOrThrow({
    where: {
      id_accountBookId: { id: data.id, accountBookId: data.accountBookId },
    },
    select: { type: true, equityAccountSubtype: true, isActive: true },
  });
  assertNoSystemManagedAccountSubtype(account);

  if (!account.isActive) {
    return { data: undefined, invalidatePeriodCache: false };
  }

  let hasZeroBalance = true;
  if (accountTypeRequiresZeroBalanceForArchive(account.type)) {
    const balance = await prisma.booking.aggregate({
      where: { accountId: data.id, accountBookId: data.accountBookId },
      _sum: { value: true },
    });
    hasZeroBalance = moneyIsZero(balance._sum.value ?? 0);
  }
  const archiveAvailability = getAccountArchiveAvailability({
    isActive: account.isActive,
    hasZeroBalance,
  });
  if (!archiveAvailability.enabled) {
    throw new Error(archiveAvailability.disabledReason);
  }

  await prisma.account.update({
    where: {
      id_accountBookId: { id: data.id, accountBookId: data.accountBookId },
    },
    data: { isActive: false },
  });
  return { data: undefined, invalidatePeriodCache: true };
}

export async function archiveAccountGroupOperation(
  data: AccountBookNodeIdInput,
) {
  const group = await prisma.accountGroup.findUniqueOrThrow({
    where: {
      id_accountBookId: { id: data.id, accountBookId: data.accountBookId },
    },
    select: { isActive: true, type: true, equityAccountSubtype: true },
  });
  assertNoSystemManagedGroupSubtype(group);

  if (!group.isActive) {
    return { data: undefined, invalidatePeriodCache: false };
  }

  const [activeChildAccounts, activeChildGroups] = await Promise.all([
    prisma.account.count({
      where: {
        groupId: data.id,
        accountBookId: data.accountBookId,
        isActive: true,
      },
    }),
    prisma.accountGroup.count({
      where: {
        parentGroupId: data.id,
        accountBookId: data.accountBookId,
        isActive: true,
      },
    }),
  ]);

  const archiveAvailability = getGroupArchiveAvailability({
    isActive: group.isActive,
    hasActiveChildAccounts: activeChildAccounts > 0,
    hasActiveChildGroups: activeChildGroups > 0,
  });
  if (!archiveAvailability.enabled) {
    throw new Error(archiveAvailability.disabledReason);
  }

  await prisma.accountGroup.update({
    where: {
      id_accountBookId: { id: data.id, accountBookId: data.accountBookId },
    },
    data: { isActive: false },
  });
  return { data: undefined, invalidatePeriodCache: true };
}

export async function unarchiveAccountOperation(data: AccountBookNodeIdInput) {
  const account = await prisma.account.findUniqueOrThrow({
    where: {
      id_accountBookId: { id: data.id, accountBookId: data.accountBookId },
    },
    select: {
      isActive: true,
      groupId: true,
      type: true,
      equityAccountSubtype: true,
    },
  });
  assertNoSystemManagedAccountSubtype(account);

  if (account.isActive) {
    return { data: undefined, invalidatePeriodCache: false };
  }

  const groupById = await getGroupHierarchy(data.accountBookId);
  const unarchiveAvailability = getAccountUnarchiveAvailability({
    isActive: account.isActive,
    hasInactiveAncestor: hasInactiveAncestorGroup(account.groupId, groupById),
  });
  if (!unarchiveAvailability.enabled) {
    throw new Error(unarchiveAvailability.disabledReason);
  }

  await prisma.account.update({
    where: {
      id_accountBookId: { id: data.id, accountBookId: data.accountBookId },
    },
    data: { isActive: true },
  });
  return { data: undefined, invalidatePeriodCache: true };
}

export async function unarchiveAccountGroupOperation(
  data: AccountBookNodeIdInput,
) {
  const group = await prisma.accountGroup.findUniqueOrThrow({
    where: {
      id_accountBookId: { id: data.id, accountBookId: data.accountBookId },
    },
    select: {
      isActive: true,
      parentGroupId: true,
      type: true,
      equityAccountSubtype: true,
    },
  });
  assertNoSystemManagedGroupSubtype(group);

  if (group.isActive) {
    return { data: undefined, invalidatePeriodCache: false };
  }

  const groupById = await getGroupHierarchy(data.accountBookId);
  const unarchiveAvailability = getGroupUnarchiveAvailability({
    isActive: group.isActive,
    hasInactiveAncestor: hasInactiveAncestorGroup(
      group.parentGroupId,
      groupById,
    ),
  });
  if (!unarchiveAvailability.enabled) {
    throw new Error(unarchiveAvailability.disabledReason);
  }

  await prisma.accountGroup.update({
    where: {
      id_accountBookId: { id: data.id, accountBookId: data.accountBookId },
    },
    data: { isActive: true },
  });
  return { data: undefined, invalidatePeriodCache: true };
}

export async function reorderAccountTreeItemsOperation(
  data: ReorderAccountTreeItemsInput,
) {
  await prisma.$transaction(
    data.updates.map((u) =>
      u.nodeType === "account"
        ? prisma.account.update({
            where: {
              id_accountBookId: {
                id: u.id,
                accountBookId: data.accountBookId,
              },
            },
            data: { sortOrder: u.sortOrder },
          })
        : prisma.accountGroup.update({
            where: {
              id_accountBookId: {
                id: u.id,
                accountBookId: data.accountBookId,
              },
            },
            data: { sortOrder: u.sortOrder },
          }),
    ),
  );
  return { data: undefined, invalidatePeriodCache: true };
}
