"use client";

import {
  constructNow,
  format,
  formatISO,
  getTime,
  isToday,
  startOfDay,
  subDays,
} from "date-fns";
import { CalendarIcon } from "lucide-react";
import React, { useState } from "react";

import Dropdown from "./Dropdown";
import Calendar from "./calendar";
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { routes } from "@/routes";
import queryString from "query-string";

type Props = {};

const DateRange = ({}: Props) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { business_id } = useParams();
  const paramStartDate = searchParams.get("from_date");
  const paramEndDate = searchParams.get("to_date");

  const [selectedDays, setSelectedDays] = useState<Date[]>([
    ((paramStartDate && new Date(parseInt(paramStartDate!))) as Date) ??
      startOfDay(subDays(new Date(), 6)),
    ((paramEndDate &&
      (isToday(parseInt(paramEndDate))
        ? Date.now()
        : new Date(parseInt(paramEndDate!)))) as Date) ?? new Date(),
  ]);

  return (
    <Dropdown>
      <Dropdown.Toggle
        type="button"
        className="flex items-center gap-1 border-2 rounded-lg px-4 py-2 text-sm"
      >
        <CalendarIcon size={16} />
        <span>{format(selectedDays[0] ?? Date.now(), "MMM dd")}</span>

        {selectedDays[1] && (
          <>
            {" - "}
            <span>{format(selectedDays[1] ?? Date.now(), "MMM dd")}</span>
          </>
        )}
      </Dropdown.Toggle>
      <Dropdown.Menu placement="bottom-start" className="w-max py-4">
        <Calendar
          dates={selectedDays}
          onDateChange={(dates: Date[]) => {
            setSelectedDays(dates);

            router.replace(
              `${pathname}?${queryString.stringify({
                from_date: getTime(dates[0]),
                to_date: !isNaN(getTime(dates[1])) ? getTime(dates[1]) : "",
              })}`
            );
            setTimeout(() => {
              router.refresh();
            });
          }}
        />
      </Dropdown.Menu>
    </Dropdown>
  );
};

export default DateRange;
