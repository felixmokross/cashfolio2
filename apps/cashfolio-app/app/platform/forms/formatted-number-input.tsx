import type { NumericFormatProps } from "react-number-format";
import { NumericFormat } from "react-number-format";
import { Input } from "./input";
import { useMemo, useState, type ComponentPropsWithoutRef } from "react";
import invariant from "tiny-invariant";

export type FormattedNumberInputProps = NumericFormatProps<
  ComponentPropsWithoutRef<typeof Input>
> & {
  locale?: string;
};

export function FormattedNumberInput({
  name,
  defaultValue,
  locale = "en-US",
  ...props
}: FormattedNumberInputProps) {
  const [value, setValue] = useState<number | undefined>(
    defaultValue != null ? Number(defaultValue) : undefined,
  );

  const { thousandSeparator, decimalSeparator } = useMemo(
    () => getNumberFormatSymbols(locale),
    [locale],
  );

  return (
    <>
      <NumericFormat
        {...props}
        valueIsNumericString={true}
        defaultValue={defaultValue}
        onValueChange={(values, sourceInfo) => {
          setValue(values.floatValue);
          props.onValueChange?.(values, sourceInfo);
        }}
        thousandSeparator={thousandSeparator}
        decimalSeparator={decimalSeparator}
        customInput={Input}
        inputMode="decimal"
      />
      <input name={name} value={value != null ? value : ""} type="hidden" />
    </>
  );
}

function getNumberFormatSymbols(locale: string) {
  const numberFormat = new Intl.NumberFormat(locale);

  const thousandSeparator = numberFormat
    .formatToParts(10_000)
    .find((x) => x.type === "group")?.value;
  const decimalSeparator = numberFormat
    .formatToParts(1.1)
    .find((x) => x.type === "decimal")?.value;

  invariant(
    decimalSeparator,
    `decimalSeparator not found for locale ${locale}`,
  );

  return { thousandSeparator, decimalSeparator };
}
