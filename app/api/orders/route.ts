import { db } from "@/lib/db";
import { sendBulkEmail, sendEmail } from "@/lib/email";
import { initializePayment } from "@/lib/paystack";
import {
	createOrderPayment,
	createOrderProducts,
	createProductOrder,
	getBusinessDetails,
	getBusinessDetailsFromID,
	upsertCustomer
} from "@/lib/queries";
import OrderInvoice from "@/components/emails/product-order-invoice";
import {
	Customer,
	Location,
	OrderProduct,
	ProductOrders
} from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { v4 } from "uuid";
import { format } from "date-fns";

type OrderDetails = {
	business_id: string;
	customer: Pick<Customer, "email" | "name" | "phone">;
	location: Location;
	products: OrderProduct[];
};

export const POST = async (req: NextRequest, res: NextResponse) => {
	try {
		const reqBody: OrderDetails = await req.json();
		console.log("request_body:", reqBody);

		const customer = await upsertCustomer({
			...reqBody.customer,
			business_id: reqBody.business_id,
			location: reqBody.location
		});

		//get order amount from product variation prices
		let amount = 0;
		await Promise.all(
			reqBody.products.map(async (product) => {
				return await db.productVariations
					.findUniqueOrThrow({
						where: {
							id: product.product_variation_id,
							product_id: product.product_id
						}
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
			business_id: reqBody.business_id
		});

		const initPayment = await initializePayment({
			amount: (amount * 100).toFixed(2), // amount should be sent in country's lowest currency (hence *100)
			email: customer.email,
			order_id: order.id,
			business_id: reqBody.business_id
		});

		const payment = await createOrderPayment({
			provider: "PAYSTACK",
			checkout_url: initPayment.data.authorization_url,
			access_code: initPayment.data.access_code,
			reference: initPayment.data.reference,
			order_id: order.id
		});

		const productsWithAmount = await Promise.all(
			reqBody.products.map(async (product) => {
				const productCost =
					await db.productVariations.findUniqueOrThrow({
						where: { id: product.product_variation_id }
					});

				return {
					...product,
					amount: productCost.price * product.quantity,
					order_id: order?.id!
				};
			})
		);

		await createOrderProducts(productsWithAmount);

		// reduce product variant quantity
		await Promise.all(
			reqBody.products.map(async ({ product_variation_id, quantity }) => {
				return await db.productVariations.update({
					where: { id: product_variation_id },
					data: { quantity: { decrement: quantity } }
				});
			})
		);

		// create email to notify shop owner
		const business = await getBusinessDetailsFromID(reqBody.business_id);
		if (!business) throw new Error("Business not found");

		// get product name
		const productsDetails = await Promise.all(
			productsWithAmount.map(async (product) => {
				const productName = await db.products.findUnique({
					where: { id: product.product_id }
				});

				return {
					...product,
					name: productName?.name as string
				};
			})
		);
		console.log(productsDetails);

		// send email to customer and business owner
		await sendBulkEmail([
			// email to customer
			{
				body: OrderInvoice({
					business: business,
					order: {
						invoiceId: `INV-${order.id.toString().slice(-6).toUpperCase()}`,
						order,
						products: productsDetails
					},
					user: customer
				}),
				from: "no-reply@primecart.app",
				subject: `Order Confirmation| ${business.name}`,
				to: reqBody.customer.email
			},
			// email to business owner
			{
				body: `You have a new order from ${customer.name}.\n Check your <a href=${process.env.NEXT_PUBLIC_BASE_URL} target="_blank">admin panel</a> for more details.`,
				from: "info@primecart.app",
				subject: `New Order from ${customer.name}`,
				to: business.email
			}
		]);

		return NextResponse.json(
			{
				success: true,
				message: "Order created successfully",
				sale: {
					...order,
					products: productsWithAmount,
					payment: { checkout_url: payment.checkout_url }
				}
			},
			{ status: 200 }
		);
	} catch (error: any) {
		return NextResponse.json(
			{
				success: false,
				message: error.message ?? "Failed to create order",
				cause: error.name
			},
			{ status: 500 }
		);
	}
};

export const OPTIONS = async () => {
	return new NextResponse("", { status: 200 });
};
