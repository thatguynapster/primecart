import { BankData } from "@/components/forms/payment-details/bank";
import { MomoData } from "@/components/forms/payment-details/momo";

export type User = {
  username: string;
  password: string | null;
  avatar: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  is_deleted: boolean;
  deletedAt: Date | null;
};
export type Business = {
  name: string;
  email: string;
  logo: string;
  phone: string;
  location: string | Location;
  country: string;
  city: string;
  state: string;
  zip_code: string;

  user: string;
};

export type Location = {
  address: string;
  country?: string;
  country_code?: string;
  city?: string;
  longitude: number;
  latitude: number;
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
