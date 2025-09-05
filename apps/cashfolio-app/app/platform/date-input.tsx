import type { ReactNode } from "react";
import { useId, useRef } from "react";
import type {
  AriaButtonProps,
  AriaDatePickerProps,
  AriaDialogProps,
  AriaPopoverProps,
  DateValue,
} from "react-aria";
import {
  useButton,
  DismissButton,
  useDialog,
  Overlay,
  useDateField,
  useDateSegment,
  usePopover,
  useLocale,
  useDatePicker,
} from "react-aria";
import type {
  DateFieldState,
  DateSegment,
  OverlayTriggerState,
} from "react-stately";
import { useDateFieldState, useDatePickerState } from "react-stately";
import { createCalendar, parseDate } from "@internationalized/date";
import { CalendarDaysIcon } from "@heroicons/react/20/solid";
import { ClientOnly } from "./client-only";
import { Calendar } from "./calendar";
import clsx from "clsx";

type DateInputProps = {
  name?: string;
  defaultValue?: string;
  groupClassName?: string;
  className?: string;
  error?: string;
  disabled?: boolean;
};

export function DateInput({
  name,
  defaultValue,
  groupClassName,
  className,
  error,
  disabled = false,
}: DateInputProps) {
  const props = {
    defaultValue: defaultValue ? parseDate(defaultValue) : undefined,
    isDisabled: disabled,
  };

  const state = useDatePickerState(props);
  const ref = useRef(null);
  const {
    groupProps,
    labelProps,
    fieldProps,
    buttonProps,
    dialogProps,
    calendarProps,
  } = useDatePicker(props, state, ref);

  const errorId = `datepicker-error-${useId()}`;

  return (
    <div className={groupClassName}>
      {/* {label && <Label {...labelProps}>{label}</Label>} */}
      <div
        {...groupProps}
        ref={ref}
        className={clsx(
          "flex w-full gap-2 justify-between border px-3 py-2 sm:text-sm min-w-44",
          "rounded-md border-zinc-600 shadow-sm dark:border-white/10 dark:hover:border-white/20",
          "bg-transparent dark:bg-white/5",
          disabled && "cursor-not-allowed bg-gray-50 opacity-50",
          className,
        )}
      >
        <input
          type="hidden"
          name={name}
          value={state.value?.toString() || ""}
        />
        <DateField {...fieldProps} />
        <DatePickerButton {...buttonProps} isDisabled={disabled}>
          <CalendarDaysIcon className="h-5 w-5 text-gray-400" />
        </DatePickerButton>
      </div>
      {/* <ErrorMessage error={error} errorId={errorId} /> */}
      {state.isOpen && (
        <Popover state={state} triggerRef={ref} placement="bottom start">
          <Dialog {...dialogProps}>
            <Calendar {...calendarProps} />
          </Dialog>
        </Popover>
      )}
    </div>
  );
}

type DateFieldProps = AriaDatePickerProps<DateValue>;

function DateField(props: DateFieldProps) {
  const { locale } = useLocale();
  const state = useDateFieldState({
    ...props,
    locale,
    createCalendar,
  });

  const ref = useRef(null);
  const { labelProps, fieldProps } = useDateField(props, state, ref);

  return (
    <div>
      <span {...labelProps}>{props.label}</span>
      <div {...fieldProps} ref={ref} className="flex gap-1">
        {state.segments.map((segment, i) => (
          <DateFieldSegment key={i} segment={segment} state={state} />
        ))}
        {state.isInvalid && <span aria-hidden="true">🚫</span>}
      </div>
    </div>
  );
}

type DateFieldSegmentProps = {
  segment: DateSegment;
  state: DateFieldState;
};

function DateFieldSegment({ segment, state }: DateFieldSegmentProps) {
  const ref = useRef(null);
  const { segmentProps } = useDateSegment(segment, state, ref);

  return (
    <div
      {...segmentProps}
      ref={ref}
      className={clsx("rounded-sm focus:outline-none focus:bg-blue-500 p-0.5", {
        "text-zinc-500": segment.isPlaceholder || segment.type === "literal",
      })}
    >
      <ClientOnly fallback="">{segment.text}</ClientOnly>
    </div>
  );
}

interface PopoverProps extends Omit<AriaPopoverProps, "popoverRef"> {
  children: ReactNode;
  state: OverlayTriggerState;
}

function Popover({ children, state, offset = 8, ...props }: PopoverProps) {
  const popoverRef = useRef(null);
  const { popoverProps, underlayProps } = usePopover(
    {
      ...props,
      offset,
      popoverRef,
    },
    state,
  );

  return (
    <Overlay>
      <div {...underlayProps} />
      <div {...popoverProps} ref={popoverRef}>
        <DismissButton onDismiss={state.close} />
        {children}
        <DismissButton onDismiss={state.close} />
      </div>
    </Overlay>
  );
}

interface DialogProps extends AriaDialogProps {
  title?: React.ReactNode;
  children: React.ReactNode;
}

function Dialog({ title, children, ...props }: DialogProps) {
  const ref = useRef(null);
  const { dialogProps, titleProps } = useDialog(props, ref);

  return (
    <div {...dialogProps} ref={ref} className="">
      {title && <h3 {...titleProps}>{title}</h3>}
      {children}
    </div>
  );
}

type DatePickerButtonProps = AriaButtonProps<"button"> & {
  className?: string;
};

function DatePickerButton(props: DatePickerButtonProps) {
  const ref = useRef(null);
  const { buttonProps } = useButton(props, ref);
  const { children } = props;

  return (
    <button
      {...buttonProps}
      ref={ref}
      className="rounded-sm text-gray-500 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}
