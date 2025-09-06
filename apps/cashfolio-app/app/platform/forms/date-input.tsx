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
import { ClientOnly } from "../client-only";
import clsx from "clsx";
import type { CalendarDate } from "@internationalized/date";
import { isToday, getWeeksInMonth } from "@internationalized/date";
import { type ComponentPropsWithoutRef } from "react";
import type { CalendarProps } from "react-aria";
import { useCalendar, useCalendarCell, useCalendarGrid } from "react-aria";
import type { CalendarState } from "react-stately";
import { useCalendarState } from "react-stately";
import { ArrowLeftIcon, ArrowRightIcon } from "@heroicons/react/20/solid";
import { Button } from "../button";
import { Divider } from "../divider";

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
          "rounded-md border-neutral-600 shadow-sm dark:border-white/10 dark:hover:border-white/20",
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
      className={clsx(
        "rounded-sm focus:outline-none focus:bg-accent-neutral-500 p-0.5",
        {
          "text-neutral-500":
            segment.isPlaceholder || segment.type === "literal",
        },
      )}
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

export function Calendar(props: CalendarProps<DateValue>) {
  const { locale } = useLocale();
  const state = useCalendarState({
    ...props,
    locale,
    createCalendar,
  });

  const { calendarProps, prevButtonProps, nextButtonProps, title } =
    useCalendar(props, state);

  return (
    <div
      {...calendarProps}
      className={clsx(
        // Base styles,
        "isolate min-w-[calc(var(--input-width)+8px)] scroll-py-1 rounded-xl p-1 select-none empty:invisible",
        // Invisible border that is only visible in `forced-colors` mode for accessibility purposes
        "outline outline-transparent focus:outline-hidden",
        // Popover background
        "bg-white/75 backdrop-blur-xl dark:bg-neutral-800/75",
        // Shadows
        "shadow-lg ring-1 ring-neutral-950/10 dark:ring-white/10 dark:ring-inset",
        // Typography
        "text-base text-neutral-950 sm:text-sm dark:text-white forced-colors:text-[CanvasText]",
      )}
    >
      <div className="flex items-center justify-between">
        <CalendarButton {...prevButtonProps}>
          <span className="sr-only">Previous month</span>
          <ArrowLeftIcon />
        </CalendarButton>
        <div>{title}</div>
        <CalendarButton {...nextButtonProps}>
          <ArrowRightIcon />
        </CalendarButton>
      </div>
      <CalendarGrid state={state} />
    </div>
  );
}

type CalendarGridProps = { state: CalendarState };

function CalendarGrid({ state }: CalendarGridProps) {
  const { locale } = useLocale();
  const { gridProps, headerProps, weekDays } = useCalendarGrid({}, state);

  // Get the number of weeks in the month so we can render the proper number of rows.
  const weeksInMonth = getWeeksInMonth(state.visibleRange.start, locale);

  return (
    <div {...gridProps} className="mt-2 w-full grid-cols-7">
      <div {...headerProps} className="grid grid-cols-7">
        {weekDays.map((day, index) => (
          <div
            key={index}
            className="dark:text-neutral-400 text-neutral-500 text-center text-xs font-normal"
          >
            {day}
          </div>
        ))}
      </div>
      <Divider className="mt-2" />
      <div className="mt-2 grid grid-cols-7 gap-px rounded-lg overflow-hidden">
        {[...new Array(Math.max(weeksInMonth, 6)).keys()].map((weekIndex) => (
          <div key={weekIndex} className="contents ring-1 ring-gray-200">
            {state
              .getDatesInWeek(weekIndex)
              .map((date, i) =>
                date ? (
                  <CalendarCell
                    key={i}
                    state={state}
                    date={date}
                    className={clsx(
                      weekIndex === 0 && i === 0 && "rounded-tl-lg",
                      weekIndex === 0 && i === 6 && "rounded-tr-lg",
                      weekIndex === 5 && i === 0 && "rounded-bl-lg",
                      weekIndex === 5 && i === 6 && "rounded-br-lg",
                    )}
                  />
                ) : (
                  <td key={i} />
                ),
              )}
          </div>
        ))}
      </div>
    </div>
  );
}

type CalendarCellProps = {
  state: CalendarState;
  date: CalendarDate;
  className?: string;
};

function CalendarCell({ state, date, className }: CalendarCellProps) {
  const ref = useRef(null);
  const {
    cellProps,
    buttonProps,
    isSelected,
    isOutsideVisibleRange,
    isDisabled,
    isUnavailable,
    formattedDate,
  } = useCalendarCell({ date }, state, ref);

  return (
    <button
      {...cellProps}
      {...buttonProps}
      ref={ref}
      className={clsx(
        "size-10 flex items-center justify-center rounded-lg",
        isOutsideVisibleRange
          ? "text-neutral-600"
          : isUnavailable || isDisabled
            ? "bg-neutral-900"
            : "hover:bg-accent-neutral-500",
      )}
    >
      <div
        className={
          isSelected
            ? "rounded-full size-7 flex justify-center items-center bg-white text-neutral-950"
            : "contents"
        }
      >
        {formattedDate}
      </div>
    </button>
    // <div
    //   {...cellProps}
    //   {...buttonProps}
    //   ref={ref}
    //   className={clsx(
    //     className,
    //     "h-10 w-10 px-2.5 py-2.5 text-center text-sm focus:z-20 focus:rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500",
    //     isOutsideVisibleRange || isUnavailable || isDisabled
    //       ? "cursor-default bg-neutral-700 text-gray-400"
    //       : clsx(
    //           "bg-white hover:bg-gray-100",
    //           isToday(date, state.timeZone)
    //             ? "font-semibold text-brand-600"
    //             : "text-gray-900",
    //         ),
    //   )}
    // >
    //   <div
    //     className={clsx(
    //       isSelected
    //         ? "-m-1 rounded-full bg-gray-900 p-1 font-semibold text-white"
    //         : clsx("contents"),
    //     )}
    //   >
    //     {formattedDate}
    //   </div>
    // </div>
  );
}

type CalendarButtonProps = AriaButtonProps<"button"> & {
  className?: string;
};

function CalendarButton({ className, ...props }: CalendarButtonProps) {
  const ref = useRef(null);
  const { buttonProps } = useButton(props, ref);
  const { children } = props;

  return (
    <Button
      {...(buttonProps as ComponentPropsWithoutRef<typeof Button> & {
        hierarchy: "tertiary";
      })}
      ref={ref}
      hierarchy="tertiary"
    >
      {children}
    </Button>
  );
}
