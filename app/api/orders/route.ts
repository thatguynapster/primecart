import { db } from "@/lib/db";
import { initializePayment } from "@/lib/paystack";
import {
  createOrderPayment,
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
  business_id: string;
  customer: Customer;
  location: Location;
  products: OrderProduct[];
};

export const POST = async (req: NextRequest, res: NextResponse) => {
  const reqBody: OrderDetails = await req.json();

  const customer = await upsertCustomer(reqBody.customer);

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

  const initPayment = await initializePayment({
    amount: amount.toFixed(2),
    email: customer.email,
  });
  console.log("payment:", initPayment);

  const order = await createProductOrder({
    unique_id: v4(),
    amount,
    customer_id: customer?.id!,
    payment_id: null,
    location: reqBody.location,
    business_id: reqBody.business_id,
  });

  const payment = await createOrderPayment({
    provider: "PAYSTACK",
    checkout_url: initPayment.data.authorization_url,
    access_code: initPayment.data.access_code,
    reference: initPayment.data.reference,
    order_id: order.id,
  });

  const productsWithAmount = await Promise.all(
    reqBody.products.map(async (product) => {
      const productCost = await db.productVariations.findUniqueOrThrow({
        where: { id: product.product_variation_id },
      });

      return {
        ...product,
        amount: productCost.price * product.quantity,
        order_id: order?.id!,
      };
    })
  );

  await createOrderProducts(productsWithAmount);

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
      sale: {
        ...order,
        products: productsWithAmount,
        payment_id: payment.id,
        payment: { checkout_url: payment.checkout_url },
      },
    },
    { status: 200 }
  );
};

export const OPTIONS = async () => {
  return new NextResponse("", { status: 200 });
};
