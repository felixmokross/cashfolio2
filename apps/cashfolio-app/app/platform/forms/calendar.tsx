import type { CalendarDate } from "@internationalized/date";
import {
  isToday,
  createCalendar,
  getWeeksInMonth,
} from "@internationalized/date";
import { useRef, type ComponentPropsWithoutRef } from "react";
import type { AriaButtonProps, CalendarProps, DateValue } from "react-aria";
import {
  useButton,
  useCalendar,
  useCalendarCell,
  useCalendarGrid,
  useLocale,
} from "react-aria";
import type { CalendarState } from "react-stately";
import { useCalendarState } from "react-stately";
import { ArrowLeftIcon, ArrowRightIcon } from "@heroicons/react/20/solid";
import clsx from "clsx";
import { Button } from "../button";
import { Divider } from "../divider";

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
        "bg-white/75 backdrop-blur-xl dark:bg-zinc-800/75",
        // Shadows
        "shadow-lg ring-1 ring-zinc-950/10 dark:ring-white/10 dark:ring-inset",
        // Typography
        "text-base text-zinc-950 sm:text-sm dark:text-white forced-colors:text-[CanvasText]",
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
            className="dark:text-zinc-400 text-zinc-500 text-center text-xs font-normal"
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
          ? "text-zinc-600"
          : isUnavailable || isDisabled
            ? "bg-zinc-900"
            : "hover:bg-blue-500",
      )}
    >
      <div
        className={
          isSelected
            ? "rounded-full size-7 flex justify-center items-center bg-white text-zinc-950"
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
    //       ? "cursor-default bg-zinc-700 text-gray-400"
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
