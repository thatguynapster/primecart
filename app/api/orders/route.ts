import { db } from "@/lib/db";
import {
  createOrderProducts,
  createProductOrder,
  upsertCustomer,
} from "@/lib/queries";
import {
  Customer,
  Location,
  OrderProduct,
  ProductOrders,
} from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { v4 } from "uuid";

type OrderDetails = {
  unique_id: string;
  customer: Customer;
  location: Location;
  amount: number;
  products: OrderProduct[];
};

export const POST = async (req: NextRequest, res: NextResponse) => {
  const reqBody: OrderDetails = await req.json();
  console.log("req body:", reqBody);

  const customer = await upsertCustomer(reqBody.customer);
  console.log("customer:", customer);

  //get order amount from product variation prices
  let amount = 0;
  await Promise.all(
    reqBody.products.map(async (product) => {
      return await db.productVariations
        .findUniqueOrThrow({
          where: { id: product.product_variation_id },
        })
        .then((resp) => (amount += resp.price * product.quantity));
    })
  );
  console.log("amount:", amount);

  const order = await createProductOrder({
    unique_id: v4(),
    amount,
    customer_id: customer?.id!,
    payment_id: v4(), // TODO: generate payment from paystack
    orderStatus: "PENDING",
    location: reqBody.location,
    business_id: "66cf2d87647481db2eecdc5c",
  });
  console.log("order", order);

  const orderProducts = await createOrderProducts(
    reqBody.products.map((product) => ({
      ...product,
      order_id: order?.id!,
    }))
  );
  console.log("order products:", orderProducts);

  // reduce product variant quantity
  await Promise.all(
    reqBody.products.map(async ({ product_variation_id, quantity }) => {
      return await db.productVariations.update({
        where: { id: product_variation_id },
        data: { quantity: { decrement: quantity } },
      });
    })
  );

  return NextResponse.json(
    {
      success: true,
      message: "Order created successfully",
      sale: { ...order, products: reqBody.products },
    },
    { status: 200 }
  );
};

export const OPTIONS = async () => {
  return new NextResponse("", { status: 200 });
};
