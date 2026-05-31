import {
  Button,
  Group,
  Modal,
  NumberInput,
  Stack,
  TextInput,
  Grid,
  Select,
  Checkbox,
  Tooltip,
} from "@mantine/core";
import { isNotEmpty, useForm } from "@mantine/form";
import { useEffect, useMemo, useReducer, useRef } from "react";
import {
  AccountType,
  EquityAccountSubtype,
  Unit,
} from "../.prisma-client/enums";
import {
  validateAccountGroupName,
  validateAccountGroupParentGroupId,
} from "../shared/account-validation";
import { useDialogSubmitState } from "../hooks/use-dialog-submit-state";
import type { ExistingNode } from "./edit-account-modal";
import { GroupTreeSelect, type GroupTreeOption } from "./group-tree-select";

type AccountGroupOption = GroupTreeOption & {
  type: string;
  equityAccountSubtype: string | null;
};

const CASH_GROUP_INHERITED_DISABLED_REASON =
  "Cash account status is inherited from the parent group.";
const CASH_GROUP_INELIGIBLE_DESCENDANTS_DISABLED_REASON =
  "Cash account groups can contain only currency asset accounts and asset sub-groups.";

type FormValues = {
  name?: string;
  typeDescriptor?: "ASSET" | "LIABILITY" | `EQUITY-${EquityAccountSubtype}`;
  parentGroupId?: string;
  sortOrder?: number;
  isCashAccount?: boolean;
};

export type AccountGroupTransformedFormValues = FormValues & {
  type: AccountType;
  equityAccountSubtype?: EquityAccountSubtype;
};

export type AccountGroupInitialValues = {
  name: string;
  type: AccountType;
  equityAccountSubtype?: EquityAccountSubtype | null;
  parentGroupId?: string | null;
  sortOrder?: number | null;
  isCashAccount?: boolean | null;
};

function toFormValues(initial: AccountGroupInitialValues): FormValues {
  const typeDescriptor: FormValues["typeDescriptor"] =
    initial.type === AccountType.EQUITY && initial.equityAccountSubtype
      ? `${AccountType.EQUITY}-${initial.equityAccountSubtype}`
      : (initial.type as "ASSET" | "LIABILITY");

  return {
    name: initial.name,
    typeDescriptor,
    parentGroupId: initial.parentGroupId ?? undefined,
    sortOrder: initial.sortOrder ?? undefined,
    isCashAccount: initial.isCashAccount ?? false,
  };
}

function transformAccountGroupValues(
  values: FormValues,
): AccountGroupTransformedFormValues {
  const [type, equityAccountSubtype] = (values.typeDescriptor?.split("-") ??
    []) as [AccountType, EquityAccountSubtype?];

  return {
    ...values,
    type,
    isCashAccount:
      type === AccountType.ASSET ? (values.isCashAccount ?? false) : false,
    ...(type === AccountType.EQUITY ? { equityAccountSubtype } : undefined),
  };
}

function getSelectedParentGroup(
  accountGroups: AccountGroupOption[],
  parentGroupId?: string | null,
) {
  return parentGroupId
    ? accountGroups.find((group) => group.value === parentGroupId)
    : undefined;
}

export function isRootCashAccountGroupEditable(args: {
  type?: AccountType;
  parentGroupId?: string | null;
}) {
  return args.type === AccountType.ASSET && !args.parentGroupId;
}

function getDescendantNodes(args: {
  groupId?: string;
  existingNodes?: ExistingNode[];
}) {
  if (!args.groupId || !args.existingNodes) return [];

  const childGroupIdsByParentId = new Map<string, string[]>();
  for (const node of args.existingNodes) {
    if (node.nodeType !== "accountGroup" || !node.parentId) continue;
    const childGroupIds = childGroupIdsByParentId.get(node.parentId) ?? [];
    childGroupIds.push(node.id);
    childGroupIdsByParentId.set(node.parentId, childGroupIds);
  }

  const descendantGroupIds = new Set<string>();
  const stack = [...(childGroupIdsByParentId.get(args.groupId) ?? [])];
  while (stack.length > 0) {
    const groupId = stack.pop();
    if (!groupId || descendantGroupIds.has(groupId)) continue;
    descendantGroupIds.add(groupId);
    stack.push(...(childGroupIdsByParentId.get(groupId) ?? []));
  }

  return args.existingNodes.filter((node) => {
    if (node.nodeType === "accountGroup") {
      return descendantGroupIds.has(node.id);
    }
    return (
      node.groupId === args.groupId ||
      descendantGroupIds.has(node.groupId ?? "")
    );
  });
}

export function canMarkAccountGroupSubtreeAsCash(args: {
  groupId?: string;
  existingNodes?: ExistingNode[];
}) {
  const descendants = getDescendantNodes(args);
  return descendants.every((node) => {
    if (node.nodeType === "accountGroup") {
      return node.type === AccountType.ASSET;
    }
    return node.type === AccountType.ASSET && node.unit === Unit.CURRENCY;
  });
}

export function getCashAccountGroupDisabledReason(args: {
  type?: AccountType;
  parentGroupId?: string | null;
  groupId?: string;
  existingNodes?: ExistingNode[];
}) {
  if (args.type !== AccountType.ASSET) return undefined;
  if (args.parentGroupId) return CASH_GROUP_INHERITED_DISABLED_REASON;
  if (
    !canMarkAccountGroupSubtreeAsCash({
      groupId: args.groupId,
      existingNodes: args.existingNodes,
    })
  ) {
    return CASH_GROUP_INELIGIBLE_DESCENDANTS_DISABLED_REASON;
  }
  return undefined;
}

export function resolveAccountGroupCashAccountFormValue(args: {
  type?: AccountType;
  parentGroupId?: string | null;
  isCashAccount?: boolean | null;
  accountGroups: AccountGroupOption[];
}) {
  const parentGroup = getSelectedParentGroup(
    args.accountGroups,
    args.parentGroupId,
  );
  if (parentGroup) {
    return parentGroup.isCashAccount ?? false;
  }

  return isRootCashAccountGroupEditable(args)
    ? (args.isCashAccount ?? false)
    : false;
}

export function applyAccountGroupParentCashInheritance(
  values: AccountGroupTransformedFormValues,
  accountGroups: AccountGroupOption[],
): AccountGroupTransformedFormValues {
  return {
    ...values,
    isCashAccount: resolveAccountGroupCashAccountFormValue({
      type: values.type,
      parentGroupId: values.parentGroupId,
      isCashAccount: values.isCashAccount,
      accountGroups,
    }),
  };
}

export function EditAccountGroupModal({
  opened,
  onClose,
  onExitTransitionEnd,
  accountGroups,
  onSubmit,
  initialValues,
  existingNodes,
  editingId,
  typeDescriptor,
}: {
  opened: boolean;
  onClose: () => void;
  onExitTransitionEnd?: () => void;
  accountGroups: AccountGroupOption[];
  onSubmit: (values: AccountGroupTransformedFormValues) => void | Promise<void>;
  initialValues?: AccountGroupInitialValues;
  existingNodes?: ExistingNode[];
  editingId?: string;
  typeDescriptor: FormValues["typeDescriptor"];
}) {
  const isEdit = !!initialValues;
  const [, forceUpdate] = useReducer((x) => x + 1, 0);
  const { isSubmitting, runSubmit } = useDialogSubmitState();
  const descendantGroupIds = useMemo(() => {
    if (!editingId || !existingNodes) return new Set<string>();

    const childGroupsByParentId = new Map<string, string[]>();
    for (const node of existingNodes) {
      if (node.nodeType !== "accountGroup" || !node.parentId) continue;
      const currentChildren = childGroupsByParentId.get(node.parentId) ?? [];
      currentChildren.push(node.id);
      childGroupsByParentId.set(node.parentId, currentChildren);
    }

    const descendants = new Set<string>();
    const stack = [...(childGroupsByParentId.get(editingId) ?? [])];
    while (stack.length > 0) {
      const groupId = stack.pop();
      if (!groupId || descendants.has(groupId)) continue;
      descendants.add(groupId);
      stack.push(...(childGroupsByParentId.get(groupId) ?? []));
    }
    return descendants;
  }, [editingId, existingNodes]);

  const form = useForm<FormValues, AccountGroupTransformedFormValues>({
    mode: "uncontrolled",
    initialValues: initialValues
      ? toFormValues(initialValues)
      : { typeDescriptor },
    validate: {
      name: (value, values) => {
        const siblingNames = existingNodes
          ?.filter(
            (n) =>
              n.nodeType === "accountGroup" &&
              n.parentId === values.parentGroupId &&
              n.id !== editingId,
          )
          .map((n) => n.name);
        return validateAccountGroupName(value, siblingNames);
      },
      typeDescriptor: isNotEmpty("Type is required"),
      parentGroupId: (value) =>
        validateAccountGroupParentGroupId(value, {
          editingId,
          descendantGroupIds,
        }),
      isCashAccount: (value, values) => {
        if (!value) return null;
        return (
          getCashAccountGroupDisabledReason({
            type: transformAccountGroupValues(values).type,
            parentGroupId: values.parentGroupId,
            groupId: editingId,
            existingNodes,
          }) ?? null
        );
      },
    },
    transformValues: transformAccountGroupValues,
    onValuesChange: (values: FormValues, previous: FormValues) => {
      if (
        values.parentGroupId !== previous.parentGroupId ||
        values.typeDescriptor !== previous.typeDescriptor
      ) {
        forceUpdate();
      }
    },
  });
  const formRef = useRef(form);
  formRef.current = form;
  const resetInitialValues = useMemo(
    () => (initialValues ? toFormValues(initialValues) : { typeDescriptor }),
    [initialValues, typeDescriptor],
  );

  useEffect(() => {
    if (opened) {
      const currentForm = formRef.current;
      currentForm.setInitialValues(resetInitialValues);
      currentForm.reset();
      forceUpdate();
    }
  }, [opened, resetInitialValues]);

  const { type, equityAccountSubtype } = transformAccountGroupValues(
    form.getValues(),
  );
  const parentGroupId = form.getValues().parentGroupId;
  const cashAccountEditable = isRootCashAccountGroupEditable({
    type,
    parentGroupId,
  });
  const cashAccountDisabledReason = getCashAccountGroupDisabledReason({
    type,
    parentGroupId,
    groupId: editingId,
    existingNodes,
  });
  const cashAccountValue = resolveAccountGroupCashAccountFormValue({
    type,
    parentGroupId,
    isCashAccount: form.getValues().isCashAccount,
    accountGroups,
  });
  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      onExitTransitionEnd={onExitTransitionEnd}
      closeOnEscape={!isSubmitting}
      closeOnClickOutside={!isSubmitting}
      withCloseButton={!isSubmitting}
      title={isEdit ? "Edit Group" : "New Group"}
      size="lg"
    >
      <form
        onSubmit={form.onSubmit((values) =>
          runSubmit(() =>
            onSubmit(
              applyAccountGroupParentCashInheritance(
                transformAccountGroupValues(values),
                accountGroups,
              ),
            ),
          ),
        )}
      >
        <Stack gap="xl">
          <Grid>
            <Grid.Col span={6}>
              <TextInput
                label="Name"
                name="name"
                withAsterisk
                placeholder="e.g. Bank Accounts"
                {...form.getInputProps("name")}
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <Select
                label="Type"
                withAsterisk
                withAlignedLabels
                allowDeselect={false}
                disabled
                data={[
                  {
                    group: "Position Accounts (Non-Equity)",
                    items: [
                      {
                        value: AccountType.ASSET,
                        label: "Asset",
                      },
                      {
                        value: AccountType.LIABILITY,
                        label: "Liability",
                      },
                    ],
                  },
                  {
                    group: "Flow Accounts (Equity)",
                    items: [
                      {
                        value: `${AccountType.EQUITY}-${EquityAccountSubtype.INCOME}`,
                        label: "Income",
                      },
                      {
                        value: `${AccountType.EQUITY}-${EquityAccountSubtype.EXPENSE}`,
                        label: "Expense",
                      },
                    ],
                  },
                  {
                    group: "System Accounts",
                    items: [
                      {
                        value: `${AccountType.EQUITY}-${EquityAccountSubtype.OPENING_BALANCES}`,
                        label: "Opening Balances",
                      },
                    ],
                  },
                ]}
                {...form.getInputProps("typeDescriptor")}
              />
            </Grid.Col>
            <Grid.Col span={9}>
              <GroupTreeSelect
                label="Parent Group"
                searchable
                clearable
                groups={accountGroups.filter(
                  (g) =>
                    g.type === type &&
                    (!equityAccountSubtype ||
                      !g.equityAccountSubtype ||
                      g.equityAccountSubtype === equityAccountSubtype) &&
                    g.value !== editingId &&
                    !descendantGroupIds.has(g.value),
                )}
                {...form.getInputProps("parentGroupId")}
              />
            </Grid.Col>
            <Grid.Col span={3}>
              <NumberInput
                label="Sort Order"
                allowDecimal={false}
                {...form.getInputProps("sortOrder")}
              />
            </Grid.Col>
            {type === AccountType.ASSET ? (
              <Grid.Col span={12}>
                <Tooltip
                  label={cashAccountDisabledReason}
                  disabled={!cashAccountDisabledReason}
                >
                  <span style={{ display: "inline-flex" }}>
                    <Checkbox
                      label="Cash account"
                      checked={cashAccountValue}
                      disabled={
                        !!cashAccountDisabledReason || !cashAccountEditable
                      }
                      onChange={(event) =>
                        form.setFieldValue(
                          "isCashAccount",
                          event.currentTarget.checked,
                        )
                      }
                    />
                  </span>
                </Tooltip>
              </Grid.Col>
            ) : null}
          </Grid>
          <Group justify="end">
            <Button
              variant="subtle"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="filled"
              type="submit"
              loading={isSubmitting}
              disabled={isSubmitting}
            >
              {isEdit ? "Save" : "Create"}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
