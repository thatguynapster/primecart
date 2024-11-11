"use client";

import {
  endOfDay,
  format,
  getTime,
  startOfDay,
  subDays,
} from "date-fns";
import { CalendarIcon } from "lucide-react";
import React, { useState } from "react";

import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import queryString from "query-string";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "../ui/dropdown-menu";
import Calendar from "./calendar";

type Props = {};

const DateRange = ({ }: Props) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const paramStartDate = searchParams.get("from_date");
  const paramEndDate = searchParams.get("to_date");

  const [open, setOpen] = useState(false)

  const [selectedDays, setSelectedDays] = useState<Date[]>([
    ((paramStartDate && new Date(parseInt(paramStartDate))) as Date) ??
    startOfDay(subDays(new Date(), 6)),

    ((paramEndDate &&
      new Date(parseInt(paramEndDate))
    ) as Date) ?? endOfDay(new Date()),
  ]);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger>
        <div className="flex items-center gap-1 border-2 rounded-lg px-4 py-2 text-sm">
          <CalendarIcon size={16} />
          <span>{format(selectedDays[0] ?? Date.now(), "MMM dd")}</span>

          {selectedDays[1] && (
            <>
              {" - "}
              <span>{format(selectedDays[1] ?? Date.now(), "MMM dd")}</span>
            </>
          )}
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-max py-4">

        <Calendar
          dates={selectedDays}
          onDateChange={(dates: Date[] | null) => {
            if (dates) {
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
            }

            setOpen(false)

          }}
        />

      </DropdownMenuContent>
    </DropdownMenu>

  );
};

export default DateRange;
