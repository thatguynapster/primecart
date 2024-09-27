"use client";

import {
  constructNow,
  format,
  formatISO,
  isToday,
  startOfDay,
  subDays,
} from "date-fns";
import { CalendarIcon } from "lucide-react";
import React, { useState } from "react";

import Dropdown from "./Dropdown";
import Calendar from "./calendar";
import { useSearchParams } from "next/navigation";

type Props = { onUpdate: (dates: Date[]) => void };

const DateRange = ({ onUpdate }: Props) => {
  const searchParams = useSearchParams();

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

            onUpdate(dates);
          }}
        />
      </Dropdown.Menu>
    </Dropdown>
  );
};

export default DateRange;
