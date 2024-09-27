import { BankData } from "@/components/forms/payment-details/bank";
import { MomoData } from "@/components/forms/payment-details/momo";
import {
  Customer,
  OrderProduct,
  ProductOrders,
  Products,
  ProductVariations,
} from "@prisma/client";

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

export type Bucket = "business" | "product" | "media";

export type Order = Omit<ProductOrders, "updatedAt"> & {
  products: (Omit<OrderProduct, "createdAt" | "updatedAt"> & {
    product: Omit<
      Products,
      "is_deleted" | "deletedAt" | "createdAt" | "updatedAt"
    >;
    product_variation: Omit<
      ProductVariations,
      "deletedAt" | "createdAt" | "updatedAt"
    >;
  })[];
  customer: Omit<Customer, "createdAt" | "updatedAt">;
};

export type OrderSummary = {
  orders: number;
  revenue: number;
};
