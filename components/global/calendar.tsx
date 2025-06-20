"use client";

import {
  add,
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYesterday,
  format,
  getDay,
  isAfter,
  isEqual,
  isSameMonth,
  isToday,
  isWithinInterval,
  parse,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYesterday,
  subDays,
  subMonths,
} from "date-fns";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/20/solid";
import { useState } from "react";

import { classNames } from "@/lib/utils";
import { Button } from "./button";

type Props = {
  dates?: Date[];
  onDateChange: (dates: Date[] | null) => void;
};

const Calendar = ({ dates, onDateChange }: Props) => {

  const today = startOfDay(new Date());
  const [selectedDays, setSelectedDays] = useState<Date[]>(dates ?? []);
  const [currentMonth, setCurrentMonth] = useState(format(today, "MMM-yyyy"));
  let firstDayOfCurrentMonth = parse(currentMonth, "MMM-yyyy", today);

  const days = eachDayOfInterval({
    start: startOfWeek(firstDayOfCurrentMonth),
    end: endOfWeek(endOfMonth(firstDayOfCurrentMonth)),
  });

  const NextMonth = () => {
    let firstDayOfNextMonth = add(firstDayOfCurrentMonth, { months: 1 });

    setCurrentMonth(format(firstDayOfNextMonth, "MMM-yyyy"));
  };

  const prevMonth = () => {
    let firstDayOfNextMonth = add(firstDayOfCurrentMonth, { months: -1 });

    setCurrentMonth(format(firstDayOfNextMonth, "MMM-yyyy"));
  };

  return (
    <div className="w-full flex divide-x">
      <div className="px-4 flex flex-col gap-2">
        <Button
          variant="outline"
          onClick={() => {
            setSelectedDays([today, endOfDay(today)]);
            onDateChange([today, endOfDay(today)]);
          }}
        >
          Today
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setSelectedDays([startOfYesterday(), endOfYesterday()]);
            onDateChange([startOfYesterday(), endOfYesterday()]);
          }}
        >
          Yesterday
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setSelectedDays([subDays(today, 6), endOfDay(today)]);
            onDateChange([subDays(today, 6), endOfDay(today)])
          }}
        >
          Last 7 days
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setSelectedDays([startOfMonth(today), endOfDay(today)]);
            onDateChange([startOfMonth(today), endOfDay(today)])
          }}
        >
          This Month
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setSelectedDays([
              startOfMonth(subMonths(today, 1)),
              endOfMonth(subMonths(today, 1)),
            ]);
            onDateChange([
              startOfMonth(subMonths(today, 1)),
              endOfMonth(subMonths(today, 1)),
            ])
          }}
        >
          Last Month
        </Button>
      </div>

      <div className="px-4">
        <div className="flex items-center">
          <h2 className="flex-auto text-sm font-semibold text-gray-900">
            {format(firstDayOfCurrentMonth, "MMM yyyy")}
          </h2>
          <button
            type="button"
            className="-my-1.5 flex flex-none items-center justify-center p-1.5 text-gray-400 hover:text-gray-500"
            onClick={prevMonth}
          >
            <span className="sr-only">Previous month</span>
            <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="-my-1.5 -mr-1.5 ml-2 flex flex-none items-center justify-center p-1.5 text-gray-400 hover:text-gray-500"
            onClick={NextMonth}
          >
            <span className="sr-only">Next month</span>
            <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-7 text-center text-xs leading-6 text-gray-500">
          <div>S</div>
          <div>M</div>
          <div>T</div>
          <div>W</div>
          <div>T</div>
          <div>F</div>
          <div>S</div>
        </div>

        <div className="mt-2 grid grid-cols-7  text-sm">
          {days.map((day, dayIdx) => {
            return (
              <div
                key={day.toString()}
                className={classNames(
                  dayIdx === 0 && colStartClasses[getDay(day)],
                  "py-2"
                )}
              >
                <button
                  type="button"
                  className={classNames(
                    !isEqual(day, selectedDays[0] || selectedDays[1]) &&
                    isToday(day) &&
                    "!text-red-500",

                    !isEqual(day, selectedDays[0] || selectedDays[1]) &&
                    !isToday(day) &&
                    !isSameMonth(day, firstDayOfCurrentMonth) &&
                    "text-gray",
                    (isEqual(day, selectedDays[0]) ||
                      isEqual(day, selectedDays[1])) &&
                    "bg-dark text-light dark:bg-light dark:text-dark",
                    !(
                      isEqual(day, selectedDays[0]) ||
                      isEqual(day, selectedDays[1])
                    ) && "hover:bg-gray",
                    (isEqual(day, selectedDays[0] || selectedDays[1]) ||
                      isToday(day)) &&
                    "font-semibold",
                    isWithinInterval(day, {
                      start: selectedDays[0],
                      end: selectedDays[1],
                    }) && "bg-dark dark:bg-light text-light dark:text-dark",
                    "mx-auto flex h-8 w-8 items-center justify-center rounded-full disabled:hover:bg-inherit",
                    isAfter(day, today) && 'text-gray dark:text-dark-muted'
                  )}
                  disabled={isAfter(day, today)}
                  onClick={() => {
                    if (selectedDays.length == 1) {
                      return setSelectedDays((prev) => {
                        let days = [...prev, day].sort(
                          (a, b) =>
                            new Date(a).getTime() - new Date(b).getTime()
                        );
                        days[1] = endOfDay(days[1]);
                        return days;
                      });
                    }

                    setSelectedDays([day]);
                  }}
                >
                  <time dateTime={format(day, "yyyy-MM-dd")}>
                    {format(day, "d")}
                  </time>
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              onDateChange(null)
            }}
          >
            Cancel
          </Button>
          <Button
            className="w-full"
            onClick={() => {
              onDateChange(selectedDays)
            }}
          >
            Apply
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Calendar;

const colStartClasses = [
  "",
  "col-start-2",
  "col-start-3",
  "col-start-4",
  "col-start-5",
  "col-start-6",
  "col-start-7",
];
