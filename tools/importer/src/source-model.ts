import { Decimal128, ObjectId } from "mongodb";

export enum AccountCategoryType {
  ASSET = "ASSET",
  LIABILITY = "LIABILITY",
}

export interface AccountCategory {
  _id?: ObjectId;
  name: string;
  type: AccountCategoryType;
  order: number;
  currentBalance: Decimal128;
}

export enum AccountType {
  TRACKED = "TRACKED",
  VALUATED = "VALUATED",
}

export enum AccountUnitKind {
  CURRENCY = "CURRENCY",
  STOCK = "STOCK",
}

export interface Account {
  _id?: ObjectId;
  name: string;
  type: AccountType;
  unit: AccountUnit;
  valueTypeId?: ObjectId;
  valueSubtypeId?: ObjectId;
  categoryId: ObjectId;
  categoryType: AccountCategoryType;
  groupId?: ObjectId;
  openingBalance?: Decimal128 | null;
  openingDate?: Date | null;
  closingDate?: Date | null;
  isActive: boolean;
  currentBalance: {
    valueInAccountUnit: Decimal128;
    valueInReferenceCurrency: Decimal128;
  };
}

export type AccountUnit = CurrencyAccountUnit | StockAccountUnit;

export interface CurrencyAccountUnit {
  kind: AccountUnitKind.CURRENCY;
  currency: string;
}

export interface StockAccountUnit {
  kind: AccountUnitKind.STOCK;
  stockId: ObjectId;
}

export interface Transaction {
  _id?: ObjectId;
  date: Date;
  note?: string;
  bookings: readonly Booking[];
}

export type Booking =
  | Charge
  | Deposit
  | Income
  | Expense
  | Appreciation
  | Depreciation;

interface CommonBooking {
  type: BookingType;
}

export interface Charge extends CommonBooking {
  type: BookingType.CHARGE;
  note?: string;
  accountId: ObjectId;
  unit: AccountUnit; // TODO is the unit required on the booking? on client side we now cope without it
  amount: Decimal128;
}

export interface Deposit extends CommonBooking {
  type: BookingType.DEPOSIT;
  note?: string;
  accountId: ObjectId;
  unit: AccountUnit; // TODO is the unit required on the booking? on client side we now cope without it
  amount: Decimal128;
}

export interface Income extends CommonBooking {
  type: BookingType.INCOME;
  note?: string;
  incomeCategoryId: ObjectId;
  currency: string;
  amount: Decimal128;
}
export enum BookingType {
  DEPOSIT = "DEPOSIT",
  CHARGE = "CHARGE",
  INCOME = "INCOME",
  EXPENSE = "EXPENSE",
  APPRECIATION = "APPRECIATION",
  DEPRECIATION = "DEPRECIATION",
}

export interface Expense extends CommonBooking {
  type: BookingType.EXPENSE;
  note?: string;
  expenseCategoryId: ObjectId;
  currency: string;
  amount: Decimal128;
}

export interface Appreciation extends CommonBooking {
  type: BookingType.APPRECIATION;
  amount: Decimal128;
}

export interface Depreciation extends CommonBooking {
  type: BookingType.DEPRECIATION;
  amount: Decimal128;
}

export interface ExpenseCategory {
  _id?: ObjectId;
  name: string;
}

export interface IncomeCategory {
  _id?: ObjectId;
  name: string;
}
