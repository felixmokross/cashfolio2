import { expect, test } from "vitest";
import { getAccountsTree } from "./accounts-tree";
import { buildAccount, buildAccountGroup } from "~/builders";
import { AccountType } from "~/.prisma-client/client";

test("builds the accounts tree", () => {
  const result = getAccountsTree(
    [
      buildAccount({
        id: "a1",
        name: "Account 1",
        type: AccountType.ASSET,
        groupId: "ag1",
      }),
      buildAccount({
        id: "a2",
        name: "Account 2",
        type: AccountType.ASSET,
        groupId: "ag1",
      }),
      buildAccount({
        id: "a3",
        name: "Account 3",
        type: AccountType.LIABILITY,
        groupId: "ag2",
      }),
      buildAccount({
        id: "a4",
        name: "Account 4",
        type: AccountType.LIABILITY,
        groupId: "ag3",
      }),
    ],
    [
      buildAccountGroup({
        id: "ag1",
        name: "Account Group 1",
        type: AccountType.ASSET,
      }),
      buildAccountGroup({
        id: "ag2",
        name: "Account Group 2",
        type: AccountType.LIABILITY,
      }),
      buildAccountGroup({
        id: "ag3",
        name: "Account Group 3",
        type: AccountType.LIABILITY,
        parentGroupId: "ag2",
      }),
    ],
  );

  expect(result).toEqual({
    ASSET: expect.objectContaining({
      nodeType: "accountGroup",
      id: "ag1",
      children: [
        expect.objectContaining({ nodeType: "account", id: "a1" }),
        expect.objectContaining({ nodeType: "account", id: "a2" }),
      ],
    }),
    LIABILITY: expect.objectContaining({
      nodeType: "accountGroup",
      id: "ag2",
      children: [
        expect.objectContaining({
          nodeType: "accountGroup",
          id: "ag3",
          children: [
            expect.objectContaining({ nodeType: "account", id: "a4" }),
          ],
        }),
        expect.objectContaining({ nodeType: "account", id: "a3" }),
      ],
    }),
  });
});
