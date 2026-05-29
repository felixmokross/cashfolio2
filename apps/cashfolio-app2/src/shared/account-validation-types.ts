import type {
  AccountType,
  EquityAccountSubtype,
  Unit,
} from "../.prisma-client/enums";
import type { StatementImportCsvFormat } from "./statement-import-csv-format";

export type AccountInput = {
  accountBookId: string;
  name: string;
  type: AccountType;
  equityAccountSubtype?: EquityAccountSubtype;
  groupId?: string;
  sortOrder?: number;
  unit?: Unit;
  currency?: string;
  cryptocurrency?: string;
  symbol?: string;
  tradeCurrency?: string;
  statementImportCsvFormat?: StatementImportCsvFormat | null;
  openingBalance?: number | null;
};

export type AccountGroupInput = {
  accountBookId: string;
  name: string;
  type: AccountType;
  equityAccountSubtype?: EquityAccountSubtype;
  parentGroupId?: string;
  sortOrder?: number;
  isActive?: boolean;
};
