"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import React, { Dispatch, ReactNode, SetStateAction, useState } from "react";
import clsx from "clsx";
import { useWidth } from "@/hooks/useWidth";

interface PaginationButtonProps {
  children?: ReactNode;
  currentPage: number;
  page: number;
  setCurrentPage: Dispatch<SetStateAction<number>>;
}

const PaginationButton: React.FC<PaginationButtonProps> = ({
  children,
  currentPage,
  page,
  setCurrentPage,
}) => {
  const handleClick = () => {
    if (typeof page === "number") {
      setCurrentPage(page);
    }
  };

  return (
    <button
      type="button"
      className={clsx(
        "flex items-center justify-center",
        "rounded-lg",
        "bg-light dark:bg-dark",
        "border-2 border-dark dark:border-light",
        "min-w-10 h-10",
        "px-2 py-1.5",
        "font-medium",
        {
          "!bg-dark text-light dark:!bg-light dark:text-dark":
            (currentPage ?? 1) === page,
        }
      )}
      onClick={handleClick}
    >
      {children || page}
    </button>
  );
};

interface PaginationProps {
  page?: number;
  pages: number;
}

export const Pagination: React.FC<PaginationProps> = ({ page, pages }) => {
  const [currentPage, setCurrentPage] = useState(page ?? 1);

  const width = useWidth();

  const base = (width as number) <= 320;
  const xs = (width as number) <= 425;
  const sm = (width as number) <= 768;

  const paginationButtonOffset = base ? 0 : xs ? 1 : sm ? 2 : 3;

  const updateFilters = (page: number) => {
    setCurrentPage(page);
  };

  const displayPageButtons = () => {
    const displayedPages: (number | string)[] = [];

    if (pages <= paginationButtonOffset) {
      // If the total number of pages is less than or equal to paginationButtonOffset + 1
      // Display all pages
      for (let i = 1; i <= pages; i++) {
        displayedPages.push(i);
      }
    } else if (currentPage <= paginationButtonOffset) {
      // If the current page is within the range to show the first few pages
      for (let i = 1; i <= paginationButtonOffset; i++) {
        displayedPages.push(i);
      }
      displayedPages.push("...");
      displayedPages.push(pages);
    } else if (currentPage >= pages - paginationButtonOffset) {
      // If the current page is within the range to show the last few pages
      displayedPages.push(1);
      displayedPages.push("...");
      for (let i = pages - paginationButtonOffset; i <= pages; i++) {
        displayedPages.push(i);
      }
    } else {
      // Otherwise, display pages around the current page
      displayedPages.push(1);
      displayedPages.push("...");
      for (
        let i = currentPage - paginationButtonOffset;
        i <= currentPage;
        i++
      ) {
        displayedPages.push(i);
      }
      displayedPages.push("...");
      displayedPages.push(pages);
    }

    return displayedPages;
  };

  const handleNextPage = () => {
    if (currentPage < pages) {
      updateFilters(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      updateFilters(currentPage - 1);
    }
  };

  return (
    <div className="flex justify-between md:justify-start gap-2.5">
      <button
        type="button"
        onClick={handlePrevPage}
        disabled={currentPage === 1}
        aria-label="Previous Page"
        className={clsx(
          "flex gap-2 items-center justify-center",
          "rounded-lg",
          "bg-light dark:bg-dark",
          "border-2 border-dark dark:border-light",
          "min-w-10 h-10",
          "px-4 py-2"
        )}
      >
        <ChevronLeftIcon className="w-5 h-5" />
        <span className="hidden md:block">Prev</span>
      </button>

      {displayPageButtons().map((page, index) =>
        typeof page === "number" ? (
          <PaginationButton
            key={index}
            page={page}
            {...{ currentPage }}
            setCurrentPage={(page) => {
              console.log(page);
              updateFilters(page as number);
            }}
          />
        ) : (
          <div key={index} className="text-3xl font-medium">
            ...
          </div>
        )
      )}

      <button
        type="button"
        onClick={handleNextPage}
        disabled={currentPage === pages}
        aria-label="Next Page"
        className={clsx(
          "flex gap-2 items-center justify-center",
          "rounded-lg",
          "bg-light dark:bg-dark",
          "border-2 border-dark dark:border-light",
          "min-w-10 h-10",
          "px-4 py-2"
        )}
      >
        <span className="hidden md:block">Next</span>
        <ChevronRightIcon className="w-5 h-5" />
      </button>
    </div>
  );
};
