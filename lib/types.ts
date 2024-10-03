import { BankData } from "@/components/forms/payment-details/bank";
import { MomoData } from "@/components/forms/payment-details/momo";
import {
  Customer,
  OrderProduct,
  OrderStatus,
  Payment,
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

export type Order = Pick<
  ProductOrders,
  "amount" | "createdAt" | "id" | "location" | "orderStatus"
> & {
  products: ({
    product: Pick<Products, "images" | "name">;
    product_variation: Pick<ProductVariations, "attributes">;
  } & Pick<OrderProduct, "amount" | "quantity">)[];
  customer: Pick<Customer, "email" | "name" | "phone">;
};

export type Orders = {
  pagination: { total: number; total_pages: number };
  data: Order[];
};

export type OrderSummary = {
  orders: number;
  revenue: number;
};

export const orderStatuses: OrderStatus[] = [
  "PENDING",
  "SHIPPING",
  "DELIVERED",
  "CANCELLED",
];
