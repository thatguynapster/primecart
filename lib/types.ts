import { BankData } from "@/components/forms/payment-details/bank";
import { MomoData } from "@/components/forms/payment-details/momo";

export type Location = {
  address: string;
  country: string;
  country_code: string;
  city: string;
  longitude: number;
  latitude: number;
  region: string;
};

export type sidebarOption = {
  name: string;
  icon: string;
  link?: string;
  subOptions?: {
    name: string;
    icon: string;
    link: string;
  }[];
};

export type PaymentData = {
  business: string;
  payment_type: "momo" | "bank";
  momo?: MomoData;
  bank?: BankData;
};
