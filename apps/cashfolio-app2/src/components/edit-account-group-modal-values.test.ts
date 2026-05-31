import { describe, expect, test } from "vitest";
import { AccountType } from "../.prisma-client/enums";
import {
  applyAccountGroupParentCashInheritance,
  isRootCashAccountGroupEditable,
  resolveAccountGroupCashAccountFormValue,
} from "./edit-account-group-modal";

const accountGroups = [
  {
    value: "cash-parent",
    label: "Cash",
    type: AccountType.ASSET,
    equityAccountSubtype: null,
    isCashAccount: true,
  },
  {
    value: "asset-parent",
    label: "Assets",
    type: AccountType.ASSET,
    equityAccountSubtype: null,
    isCashAccount: false,
  },
];

describe("account group cash helpers", () => {
  test("allows editing only for root asset groups", () => {
    expect(
      isRootCashAccountGroupEditable({
        type: AccountType.ASSET,
        parentGroupId: undefined,
      }),
    ).toBe(true);
    expect(
      isRootCashAccountGroupEditable({
        type: AccountType.ASSET,
        parentGroupId: "parent",
      }),
    ).toBe(false);
    expect(
      isRootCashAccountGroupEditable({
        type: AccountType.LIABILITY,
        parentGroupId: undefined,
      }),
    ).toBe(false);
  });

  test("inherits cash status from selected parent group", () => {
    expect(
      resolveAccountGroupCashAccountFormValue({
        type: AccountType.ASSET,
        parentGroupId: "cash-parent",
        isCashAccount: false,
        accountGroups,
      }),
    ).toBe(true);
    expect(
      resolveAccountGroupCashAccountFormValue({
        type: AccountType.ASSET,
        parentGroupId: "asset-parent",
        isCashAccount: true,
        accountGroups,
      }),
    ).toBe(false);
  });

  test("applies inherited cash status before submit", () => {
    expect(
      applyAccountGroupParentCashInheritance(
        {
          name: "Wallets",
          typeDescriptor: AccountType.ASSET,
          type: AccountType.ASSET,
          parentGroupId: "cash-parent",
          isCashAccount: false,
        },
        accountGroups,
      ),
    ).toMatchObject({ isCashAccount: true });
  });
});
