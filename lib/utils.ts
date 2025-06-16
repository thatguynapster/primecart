import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseCurrency(amount: number) {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
  }).format(amount);
}

export const classNames = (...classes: any) => {
  return classes.filter(Boolean).join(" ");
};

export const phoneNumberFormat = (phone: string, reverse?: boolean) => {
  if (reverse) {
    return phone?.startsWith("+") ? phone : `+${phone}`;
  } else {
    return phone?.startsWith("+") ? phone.replace("+", "") : phone;
  }
};

export const arrayToObject = <T extends string>(arr: T[]): Record<T, true> =>
  Object.fromEntries(arr.map((key) => [key, true])) as Record<T, true>;
