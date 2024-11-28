import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { translatePaystackStatus } from "@/lib/paystack";
import { PaymentTransaction } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { routes } from "@/routes";

export const POST = async (req: NextRequest, res: NextResponse) => {
  const reqBody = await req.json();
  const secret = process.env.PAYSTACK_SECRET_KEY!;

  //validate event
  const hash = crypto
    .createHmac("sha512", secret)
    .update(JSON.stringify(reqBody))
    .digest("hex");

  if (hash == req.headers.get("x-paystack-signature")) {
    // Retrieve the request's body
    console.log(reqBody);

    const {
      metadata: { order_id, business_id },
      status,
      amount,
      reference,
    } = reqBody.data;

    // find payment with reference and update it's status
    await db.orderPayment.update({
      where: {
        order_id,
      },
      data: { status: await translatePaystackStatus(status) },
    });

    // add transactions if payment was successful
    if (status === "success") {
      const order_amount = amount / 100;
      const transactionData: Omit<
        PaymentTransaction,
        "id" | "meta_data" | "createdAt" | "updatedAt"
      >[] = [
        {
          amount: order_amount,
          description: `Payment received for order #${order_id.substring(
            order_id.length - 7
          )}`,
          payment_reference: reference,
          reference_id: `ODR_${order_id}`,
          status: "PAID",
          type: "CREDIT",
          business_id,
        },
        {
          amount: order_amount * 0.05, // user is charged 5% of order amount
          description: `Service charge for order #${order_id.substring(
            order_id.length - 7
          )}`,
          payment_reference: reference,
          reference_id: `ODR_${order_id}`,
          status: "PAID",
          type: "DEBIT",
          business_id,
        },
      ];
      await db.paymentTransaction.createMany({ data: transactionData });
    }

    // revalidate orders path
    revalidatePath(routes.orders.index, "page");

    return new NextResponse("", { status: 200 });
  } else {
    throw new Error("Failed to validate origin");
  }
};
