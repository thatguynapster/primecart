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
	customer: Pick<Customer, "email" | "name" | "phone">;
	location: Location;
	products: OrderProduct[];
};

export const POST = async (req: NextRequest, res: NextResponse) => {
	try {
		const reqBody: OrderDetails = await req.json();
		console.log(reqBody);

		const customer = await upsertCustomer({
			...reqBody.customer,
			business_id: reqBody.business_id,
			location: reqBody.location,
		});

		//get order amount from product variation prices
		let amount = 0;
		await Promise.all(
			reqBody.products.map(async (product) => {
				return await db.productVariations
					.findUniqueOrThrow({
						where: {
							id: product.product_variation_id,
							product_id: product.product_id,
						},
					})
					.then((resp) => (amount += resp.price * product.quantity));
			})
		);

		const order = await createProductOrder({
			unique_id: v4(),
			amount,
			customer_id: customer?.id!,
			// payment_id: null,
			location: reqBody.location,
			business_id: reqBody.business_id,
		});

		const initPayment = await initializePayment({
			amount: (amount * 100).toFixed(2), // amount should be sent in country's lowest currency (hence *100)
			email: customer.email,
			order_id: order.id,
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
				const productCost =
					await db.productVariations.findUniqueOrThrow({
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

		// create email to notify shop owner

		// create email to notify super admin

		return NextResponse.json(
			{
				success: true,
				message: "Order created successfully",
				sale: {
					...order,
					products: productsWithAmount,
					payment: { checkout_url: payment.checkout_url },
				},
			},
			{ status: 200 }
		);
	} catch (error: any) {
		// throw new Error("Failed to create order", { cause: error });

		return NextResponse.json(
			{
				success: false,
				message: "Failed to create order",
				cause: error.name,
			},
			{ status: 500 }
		);
	}
};

export const OPTIONS = async () => {
	return new NextResponse("", { status: 200 });
};
