import { BankData } from "@/components/forms/payment-details/bank";
import { MomoData } from "@/components/forms/payment-details/momo";
import {
  Customer,
  OrderPayment,
  OrderProduct,
  OrderStatus,
  Payment,
  ProductOrders,
  Products,
  ProductVariations,
} from "@prisma/client";
import { JsonValue } from "@prisma/client/runtime/library";

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
  payment: OrderPayment | null;
  products: ({
    product: Pick<Products, "name" | "description" | "images">;
    product_variation: Pick<ProductVariations, "attributes">;
  } & Pick<OrderProduct, "amount" | "quantity">)[];
  customer: Pick<Customer, "email" | "name" | "phone">;
};

export type Orders = {
  pagination?: { total: number; total_pages: number };
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

export type BestSeller = {
  id: Products["id"];
  name: string;
  description: string;
  images: string[];
  totalUnitsSold: number;
  lastOrderDate: Date;
};

export type BusinessCustomer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  orders: {
    createdAt: Date;
    location: Location;
  }[];
};

export type Customers = {
  pagination: { total: number; total_pages: number };
  data: BusinessCustomer[];
};
