"use server";

import {
	Business,
	Users,
	Payment,
	Products,
	ProductVariations,
	ProductCategories,
	Customer,
	ProductOrders,
	OrderProduct,
	OrderStatus,
	Prisma,
	OrderPayment,
	PaymentStatus,
	TransactionType,
	ExperimentalFeatures,
	StorefrontFeatures,
} from "@prisma/client";
import { currentUser } from "@clerk/nextjs/server";
import { cache } from "react";
import { revalidatePath } from "next/cache";

import { db } from "./db";
import { routes } from "@/routes";
import { startOfDay, startOfMonth, startOfYear, subDays } from "date-fns";
import { BestSeller, Order } from "./types";
import { parseCurrency } from "./utils";

export const initUser = async (userUpdate?: Users) => {
	try {
		const user = await currentUser();
		if (!user) return;

		const userData = await db.users.upsert({
			where: { email: user.emailAddresses[0].emailAddress },
			update: { ...userUpdate },
			create: {
				avatar: user.imageUrl,
				email: user.emailAddresses[0].emailAddress,
				first_name: user.firstName ?? "",
				last_name: user.lastName ?? "",
			},
		});

		return userData;
	} catch (error) {
		console.log(error);
		throw new Error("Failed to create user", { cause: error });
	}
};

export const getAuthUserDetails = async () => {
	try {
		const user = await currentUser();
		if (!user) return;

		const userData = await db.users.findUnique({
			where: {
				email: user.emailAddresses[0].emailAddress,
			},
			include: {
				business: true,
			},
		});

		return userData;
	} catch (error) {
		console.log(error);
		throw new Error("Failed to get user details", { cause: error });
	}
};

export const getUser = async (business_id: string) => {
	try {
		const user = await currentUser();
		if (!user) return;

		const userData = await db.users.findUnique({
			where: {
				email: user.emailAddresses[0].emailAddress,
			},
		});

		return userData;
	} catch (error) {
		console.log(error);
		throw new Error("Failed to get user", { cause: error });
	}
};

export const createBusiness = async (
	business: Omit<Business, "id" | "createdAt" | "updatedAt">
) => {
	try {
		const user = await currentUser();
		if (!user) return;

		const businessDetails = await db.business.upsert({
			where: { unique_id: business.unique_id },
			update: business,
			create: business,
		});

		// create any other needed documents here...
		updateStorefrontFeaturesFunc(businessDetails.id, {
			business_id: businessDetails.id,
			contact: {
				email: "",
				phone: "",
				socials: { facebook: "", instagram: "", twitter: "" },
			},
			support: {
				deliveryPolicy: "",
				faq: "",
				paymentPolicy: "",
				privacyPolicy: "",
				UserAgreement: "",
			},
		});

		return businessDetails;
	} catch (error) {
		console.log(error);
		throw new Error("Failed to create business", { cause: error });
	}
};

export const updateBusiness = async (id: string, data: Partial<Business>) => {
	try {
		const user = await currentUser();
		if (!user) return;

		const businessDetails = await db.business.update({
			where: { id },
			data,
		});

		return businessDetails;
	} catch (error) {
		console.log(error);
		throw new Error("Failed to create business", { cause: error });
	}
};

export const deleteBusiness = async (id: string) => {
	try {
		const user = await currentUser();
		if (!user) return;

		const business = await db.business.delete({
			where: { id },
		});

		return business;
	} catch (error) {
		console.log(error);
		throw new Error("Failed to delete product variant", { cause: error });
	}
};

export const getBusinessDetails = cache(async (id: string) => {
	try {
		const user = await currentUser();
		if (!user) return;

		const business = await db.business.findUnique({
			where: {
				id,
			},
		});

		return business;
	} catch (error) {
		console.log(error);
		throw new Error("Failed to get business details", { cause: error });
	}
});

export const getBusinessIdFromDomain = async (domain: string) => {
	try {
		const business = await db.business.findUnique({
			where: { domain },
		});

		return business?.id;
	} catch (error) {}
};

export const getBusinessIdFromSubDomain = async (subdomain: string) => {
	try {
		const business = await db.business.findUnique({
			where: { subdomain },
		});

		return business?.id;
	} catch (error) {}
};

export const upsertPaymentDetails = async (
	business: string,
	data: Omit<Payment, "id" | "createdAt" | "updatedAt">
) => {
	try {
		const user = await currentUser();
		if (!user) return;

		const paymentDetails = await db.payment.upsert({
			where: {
				business_id: business,
			},
			update: { ...data },
			create: { ...data },
		});

		// // create paystack transfer recipient
		// const myHeaders = new Headers();
		// myHeaders.append("Content-Type", "application/json");
		// myHeaders.append(
		//   "Authorization",
		//   `Bearer ${process.env["PAYSTACK_SECRET_KEY"]}`
		// );

		// const requestOptions = {
		//   method: "POST",
		//   headers: myHeaders,
		//   body: JSON.stringify({
		//     type: "nuban",
		//     name: "Tolu Robert",
		//     account_number: "01000000010",
		//     bank_code: "058",
		//     currency: "NGN",
		//   }),
		// };

		// if (paymentDetails.recipient_id) {
		//   await fetch(
		//     `https://api.paystack.co/transferrecipient/${paymentDetails.recipient_id}`,
		//     requestOptions
		//   ).then((response) => response.json());
		// } else {
		// }

		return paymentDetails;
	} catch (error) {
		console.log(error);
		throw new Error("Failed to add payment details", { cause: error });
	}
};

export const getPaymentDetails = async (id: string) => {
	try {
		const paymentDetails = await db.payment.findUnique({
			where: {
				business_id: id,
			},
		});

		return paymentDetails;
	} catch (error) {
		console.log(error);
		throw new Error("Failed to get payment details", { cause: error });
	}
};

export const upsertProduct = async ({
	product,
	variations,
}: {
	product: Omit<
		Products,
		"id" | "createdAt" | "updatedAt" | "is_deleted" | "deletedAt"
	>;
	variations: (Pick<
		ProductVariations,
		"unique_id" | "price" | "quantity" | "attributes"
	> & { attributes: any })[];
}) => {
	try {
		const user = await currentUser();
		if (!user) return;

		// update/create product
		const productDetails = await db.products.upsert({
			where: { unique_id: product.unique_id },
			update: product,
			create: { ...product },
		});

		// update/create product variation
		await Promise.all(
			variations.map(async (variant) => {
				return await db.productVariations.upsert({
					where: { unique_id: variant.unique_id },
					update: variant,
					create: { ...variant, product_id: productDetails.id },
				});
			})
		);

		revalidatePath(routes.inventory.index, "page");

		return productDetails;
	} catch (error) {
		console.log(error);
		throw new Error("Failed to save product details", { cause: error });
	}
};

export const deleteVariation = async (unique_id: string) => {
	try {
		const user = await currentUser();
		if (!user) return;

		const variationDetails = await db.productVariations.delete({
			where: { unique_id },
		});

		revalidatePath(routes.inventory.details, "page");

		return variationDetails;
	} catch (error) {
		console.log(error);
		throw new Error("Failed to delete product variant", { cause: error });
	}
};

export const getProducts = async (business_id: string) => {
	try {
		const user = await currentUser();
		if (!user) return;

		const products = await db.products.findMany({
			where: { business_id },
			orderBy: { createdAt: "desc" },
			include: {
				variations: {
					select: { price: true, quantity: true },
				},
				// category: true,
				_count: { select: { orders: true } },
			},
		});

		return products;
	} catch (error) {
		console.log(error);
		throw new Error("Failed to get products", { cause: error });
	}
};

export const getProduct = async (product_id: string, business_id: string) => {
	try {
		const user = await currentUser();
		if (!user) return;

		const product = await db.products.findUnique({
			where: { id: product_id, business_id },
			include: { variations: true },
		});
		if (product) return product;

		return null;
	} catch (error) {
		console.log(error);
		throw new Error("Failed to get product details", { cause: error });
	}
};

export const deleteProduct = async (id: string) => {
	try {
		const user = await currentUser();
		if (!user) return;

		// delete product variations
		const variations = await db.productVariations.deleteMany({
			where: { product_id: id },
		});

		const productDetails = await db.products.delete({ where: { id } });
		revalidatePath(routes.inventory.index, "page");

		return productDetails;
	} catch (error) {
		console.log(error);
		throw new Error("Failed to delete product", { cause: error });
	}
};

export const upsertCategory = async (
	data: Omit<ProductCategories, "id" | "createdAt" | "updatedAt">
) => {
	try {
		const user = await currentUser();
		if (!user) return;

		const category = await db.productCategories.upsert({
			where: { unique_id: data.unique_id },
			update: data,
			create: data,
		});

		return category;
	} catch (error) {
		console.log(error);
		throw new Error("Failed to create product category", { cause: error });
	}
};

export const getCategories = async (business_id: string) => {
	try {
		const user = currentUser();
		if (!user) return;

		const categories = await db.productCategories.findMany({
			where: { business_id },
		});

		return categories;
	} catch (error) {
		console.log(error);
		throw new Error("Failed to get categories", { cause: error });
	}
};

export const upsertCustomer = async (data: Customer) => {
	try {
		const customer = await db.customer.upsert({
			where: {
				phone: data.phone,
			},
			update: data,
			create: data,
		});

		return customer;
	} catch (error) {
		console.log(error);
		throw new Error("Failed to upsert customer details", { cause: error });
	}
};

export const createProductOrder = async (
	data: Omit<
		ProductOrders,
		"id" | "payment_id" | "orderStatus" | "createdAt" | "updatedAt"
	>
) => {
	try {
		const order = await db.productOrders.create({ data });

		return order;
	} catch (error) {
		console.log(error);
		throw new Error("Failed to create order", { cause: error });
	}
};

export const createOrderProducts = async (
	data: Omit<OrderProduct, "id" | "createdAt" | "updatedAt">[]
) => {
	try {
		const orderProduct = await db.orderProduct.createMany({ data });

		return orderProduct;
	} catch (error) {
		console.log(error);
		throw new Error("Failed to create order products", { cause: error });
	}
};

export const getOrders = async ({
	business_id,
	from_date = startOfDay(subDays(Date.now(), 7)).valueOf(),
	to_date = new Date().valueOf(),
	page = 1,
	limit = 10,
}: {
	business_id: string;
	from_date?: number;
	to_date?: number;
	page?: number;
	limit?: number;
}) => {
	if (isNaN(from_date))
		from_date = startOfDay(subDays(Date.now(), 7)).valueOf();

	if (isNaN(to_date)) to_date = new Date().valueOf();

	try {
		const user = await currentUser();
		if (!user) return;

		const query: Prisma.ProductOrdersFindManyArgs = {
			where: {
				business_id,
				createdAt: {
					gte: new Date(from_date).toISOString(),
					lte: new Date(to_date).toISOString(),
				},
			},
			orderBy: {
				createdAt: "desc",
			},
		};

		const [orders, count] = await db.$transaction([
			db.productOrders.findMany({
				...query,
				skip: (page - 1) * limit,
				take: limit,
				include: {
					customer: {
						select: {
							email: true,
							name: true,
							phone: true,
						},
					},
					payment: true,
					products: {
						select: {
							product: {
								select: {
									name: true,
									description: true,
									images: true,
								},
							},
							product_variation: { select: { attributes: true } },
							quantity: true,
							amount: true,
						},
					},
				},
			}),
			db.productOrders.count({ where: query.where }),
		]);

		return {
			pagination: { total: count, total_pages: Math.ceil(count / limit) },
			data: orders,
		};
	} catch (error) {
		console.log(error);
		throw new Error("Failed to get orders", { cause: error });
	}
};

export const getOrderSummary = async ({
	business_id,
	from_date = startOfDay(subDays(Date.now(), 7)).valueOf(),
	to_date = Date.now().valueOf(),
}: {
	business_id: string;
	from_date?: number;
	to_date?: number;
}): Promise<any> => {
	if (isNaN(from_date))
		from_date = startOfDay(subDays(Date.now(), 7)).valueOf();

	if (isNaN(to_date)) to_date = new Date().valueOf();

	try {
		const user = await currentUser();
		if (!user) return null;

		const orders_in_period = await db.productOrders.findMany({
			where: {
				business_id,
				createdAt: {
					gte: new Date(from_date).toISOString(),
					lte: new Date(to_date).toISOString(),
				},
			},
			select: { amount: true, createdAt: true },
		});

		const orders = orders_in_period.length;
		const revenue = orders_in_period.reduce(
			(a, b) => a + (b?.amount ?? 0),
			0
		);

		return { orders, revenue };
	} catch (error) {
		console.log(error);
		throw new Error("Failed to get orders summary", { cause: error });
	}
};

export const updateOrderStatus = async (
	business_id: string,
	order_id: string,
	orderStatus: OrderStatus
) => {
	try {
		const user = await currentUser();
		if (!user) return;

		const updatedORder = await db.productOrders.update({
			where: {
				id: order_id,
			},
			data: { orderStatus },
		});

		revalidatePath(routes.orders.index, "page");

		return updatedORder;
	} catch (error) {
		console.log(error);
		throw new Error("Failed to update order status", { cause: error });
	}
};

export const getSingleOrder = async (business_id: string, order_id: string) => {
	try {
		const user = await currentUser();
		if (!user) return;

		const order = await db.productOrders.findUnique({
			where: { id: order_id, business_id },
			include: {
				customer: {
					select: {
						email: true,
						name: true,
						phone: true,
					},
				},
				payment: true,
				products: {
					select: {
						product: {
							select: {
								images: true,
								description: true,
								name: true,
							},
						},
						product_variation: { select: { attributes: true } },
						quantity: true,
						amount: true,
					},
				},
			},
		});

		return order;
	} catch (error) {
		console.log(error);
		throw new Error("Failed to get order", { cause: error });
	}
};

export const getBestSellers = async ({
	business_id,
}: {
	business_id: string;
}): Promise<BestSeller[] | void> => {
	try {
		const user = await currentUser();
		if (!user) return;

		const bestSellingProducts = await db.products.findMany({
			where: {
				business_id,
				orders: {
					some: {}, // Ensures only products with at least one order are included
				},
			},
			include: {
				_count: {
					select: {
						orders: true, // Counting the number of orders for each product
					},
				},
				orders: {
					select: {
						product_id: true, // Fetching the product ID for order filtering
						quantity: true,
						createdAt: true, // Fetching the createdAt date for orders
					},
					orderBy: {
						createdAt: "desc", // Ordering by the latest order date
					},
				},
			},
			orderBy: {
				orders: {
					_count: "desc", // Sorting by the total number of orders in descending order
				},
			},
			take: 10, // Optionally limit the results to the top 10 best-selling products
		});

		// Calculate the total units sold for each product and filter out duplicates
		const formattedProducts = bestSellingProducts
			.map((product) => {
				// Sum the total quantity sold for the product
				const totalUnitsSold = product.orders.reduce((total, order) => {
					return total + order.quantity;
				}, 0);

				// Filter orders by removing duplicates (based on product_id)
				const uniqueOrders = product.orders.reduce(
					(acc: any, currentOrder) => {
						if (
							!acc.find(
								(order: any) =>
									order.product_id === currentOrder.product_id
							)
						) {
							acc.push(currentOrder);
						}
						return acc;
					},
					[]
				);

				return {
					id: product.id,
					name: product.name,
					description: product.description,
					images: product.images,
					totalUnitsSold,
					lastOrderDate:
						uniqueOrders.length > 0
							? uniqueOrders[0].createdAt
							: null, // Most recent order date
				};
			})
			.filter((product) => product.totalUnitsSold > 0) // Exclude products with no units sold
			.sort((a, b) => b.totalUnitsSold - a.totalUnitsSold); // Sort by total units sold

		return formattedProducts;
	} catch (error) {
		console.log(error);
		throw new Error("Failed to get best sellers", { cause: error });
	}
};

export const getLatestOrders = async (business_id: string) => {
	try {
		const user = await currentUser();
		if (!user) return;

		const recentOrders = await db.productOrders.findMany({
			where: {
				business_id,
				NOT: {
					orderStatus: {
						in: ["CANCELLED", "DELIVERED"], // Exclude CANCELLED and DELIVERED orders
					},
				},
			},
			orderBy: {
				createdAt: "desc", // Sort by the most recent order date
			},
			take: 10, // Limit to 10 most recent orders
			include: {
				customer: {
					select: {
						name: true,
						email: true,
						phone: true,
					},
				},
				products: {
					select: {
						product: {
							select: {
								name: true,
								description: true,
								images: true,
							},
						},
						product_variation: { select: { attributes: true } },
						quantity: true,
						amount: true,
					},
				},
				payment: true,
			},
		});

		return recentOrders;
	} catch (error) {
		console.log(error);
		throw new Error("Failed to get latest orders", { cause: error });
	}
};

export const getCustomers = async ({
	business_id,
	limit = 10,
	page = 1,
}: {
	business_id: string;
	limit?: number;
	page?: number;
}) => {
	try {
		const user = await currentUser();
		if (!user) return;

		const query = { where: { business_id } };

		const [customers, count] = await db.$transaction([
			db.customer.findMany({
				...query,
				skip: (page - 1) * limit,
				take: limit,
				select: {
					id: true,
					name: true,
					email: true,
					phone: true,
					orders: {
						orderBy: {
							createdAt: "desc", // Sort orders by the most recent
						},
						take: 1, // Only fetch the most recent order
						select: {
							createdAt: true,
							location: true,
						},
					},
				},
			}),
			db.customer.count({ where: query.where }),
		]);

		return {
			pagination: { total: count, total_pages: Math.ceil(count / limit) },
			data: customers,
		};
	} catch (error) {
		console.log(error);
		throw new Error("Failed to get customers", { cause: error });
	}
};

export const getSingleCustomer = async (
	business_id: string,
	customer_id: string
) => {
	try {
		const user = await currentUser();
		if (!user) return;

		let customer: {
			id: string;
			name: string;
			email: string;
			phone: string;
			location: {
				address: string;
				city: string;
			};
			orders?: {
				id: string;
				createdAt: Date;
			}[];
			firstOrder?: { id: string; createdAt: Date } | null;
			lastOrder?: { id: string; createdAt: Date } | null;
		} | null = await db.customer.findUnique({
			where: { id: customer_id, business_id },
			select: {
				id: true,
				name: true,
				email: true,
				phone: true,
				location: {
					select: {
						address: true,
						city: true,
					},
				},
				orders: {
					orderBy: {
						createdAt: "asc", // Sort orders by the oldest
					},
					select: {
						id: true,
						createdAt: true,
					},
				},
			},
		});

		if (!customer) {
			throw new Error("Customer not found");
		}

		if (customer.orders) {
			const firstOrder =
				customer.orders?.length > 0 ? customer?.orders?.[0] : null;
			const lastOrder =
				customer?.orders.length > 1
					? customer?.orders[customer?.orders.length - 1]
					: firstOrder;

			delete customer.orders;

			customer = {
				...customer,
				firstOrder,
				lastOrder,
			};
		}

		return customer;
	} catch (error) {
		console.log(error);
		throw new Error("Failed to get customer", { cause: error });
	}
};

export const getCustomerOrders = async ({
	business_id,
	customer_id,
	page = 1,
	limit = 10,
}: {
	business_id: string;
	customer_id: string;
	page?: number;
	limit?: number;
}) => {
	try {
		const user = await currentUser();
		if (!user) return;

		const query: Prisma.ProductOrdersFindManyArgs = {
			where: {
				business_id,
				customer_id,
			},
			orderBy: {
				createdAt: "desc",
			},
		};

		const [orders, count] = await db.$transaction([
			db.productOrders.findMany({
				...query,
				skip: (page - 1) * limit,
				take: limit,
				include: {
					customer: {
						select: {
							email: true,
							name: true,
							phone: true,
						},
					},
					payment: true,
					products: {
						select: {
							product: {
								select: {
									name: true,
									description: true,
									images: true,
								},
							},
							product_variation: { select: { attributes: true } },
							quantity: true,
							amount: true,
						},
					},
				},
			}),
			db.productOrders.count({ where: query.where }),
		]);

		return {
			pagination: { total: count, total_pages: Math.ceil(count / limit) },
			data: orders,
		};
	} catch (error) {
		console.log(error);
		throw new Error("Failed to get orders", { cause: error });
	}
};

export const createOrderPayment = async (
	data: Omit<OrderPayment, "id" | "status" | "createdAt" | "updatedAt">
) => {
	try {
		console.log(data);
		const orderPayment = await db.orderPayment.create({ data });

		// update order with payment id
		await db.productOrders.update({
			where: {
				id: data.order_id!,
			},
			data: {
				payment_id: orderPayment.id,
			},
		});

		return orderPayment;
	} catch (error) {
		console.log(error);
		throw new Error("Failed to create order products", { cause: error });
	}
};

export const updateOrderPaymentStatus = async (
	payment_id: string,
	paymentStatus: PaymentStatus
) => {
	try {
		const user = await currentUser();
		if (!user) return;

		const updatedOrder = await db.orderPayment.update({
			where: {
				id: payment_id,
			},
			data: { status: paymentStatus },
		});

		revalidatePath(routes.orders.index, "page");

		return updatedOrder;
	} catch (error) {
		console.log(error);
		throw new Error("Failed to update order status", { cause: error });
	}
};

export const getPayments = async ({ business_id }: { business_id: string }) => {
	try {
		const user = await currentUser();
		if (!user) return;

		const payments = await db.payment.findUnique({
			where: { business_id },
		});

		return payments;
	} catch (error) {
		console.log(error);
		throw new Error("Failed to get payments", { cause: error });
	}
};

export const getTransactions = async ({
	business_id,
	page = 1,
	limit = 10,
}: {
	business_id: string;
	page?: number;
	limit?: number;
}) => {
	try {
		const user = await currentUser();
		if (!user) return;

		const query = { where: { business_id } };

		const [transactions, count] = await db.$transaction([
			db.paymentTransaction.findMany({
				...query,
				skip: (page - 1) * limit,
				take: limit,
			}),
			db.paymentTransaction.count({ where: query.where }),
		]);

		return {
			pagination: { total: count, total_pages: Math.ceil(count / limit) },
			data: transactions,
		};
	} catch (error) {
		console.log(error);
		throw new Error("Failed to get transactions", { cause: error });
	}
};

// Function to calculate balances
const calculateBalance = (
	transactions: Array<{
		type: string;
		amount: number;
		status: PaymentStatus;
	}>,
	excludeWithdrawals = false
): number =>
	transactions.reduce((acc, transaction) => {
		// if (transaction.status === "PAID") {
		switch (transaction.type) {
			case "CREDIT":
				return acc + transaction.amount;
			case "DEBIT":
				return acc - transaction.amount;
			case "WITHDRAWAL":
				return excludeWithdrawals ? acc : acc - transaction.amount;
			default:
				return acc;
		}
		// }

		// return 0;
	}, 0);

export const getWalletBalance = async ({
	business_id,
}: {
	business_id: string;
}): Promise<{
	total: number;
	lifetime: number;
	this_month: number;
	this_year: number;
} | void> => {
	try {
		const user = await currentUser();
		if (!user) return;

		let query = {
			where: { business_id },
		};

		const [transactions, thisMonth, thisYear] = await db.$transaction([
			db.paymentTransaction.findMany({ ...query }),
			db.paymentTransaction.findMany({
				where: {
					...query.where,
					createdAt: {
						gte: startOfMonth(new Date()).toISOString(),
						lte: new Date().toISOString(),
					},
				},
			}),
			db.paymentTransaction.findMany({
				where: {
					...query.where,
					createdAt: {
						gte: startOfYear(new Date()).toISOString(),
						lte: new Date().toISOString(),
					},
				},
			}),
		]);

		const total = calculateBalance(transactions); // Includes withdrawals

		// Excludes withdrawals
		const lifetime = calculateBalance(transactions, true);
		const this_month = calculateBalance(thisMonth, true);
		const this_year = calculateBalance(thisYear, true);

		return {
			total,
			lifetime,
			this_month,
			this_year,
		};
	} catch (error) {
		console.log(error);
		throw new Error("Failed to get wallet balance", { cause: error });
	}
};

export const initiateWithdrawal = async ({
	business_id,
	amount,
	meta_data,
}: {
	business_id: string;
	amount: number;
	meta_data: Record<string, string>;
}) => {
	try {
		const user = await currentUser();
		if (!user) return;

		const transactions = await db.paymentTransaction.findMany({
			where: { business_id },
		});

		const balance = calculateBalance(transactions);

		if (amount > balance) {
			throw new Error("Withdrawal amount exceeds your wallet amount.");
		}

		await db.paymentTransaction.create({
			data: {
				amount,
				description: `Withdrawal of ${parseCurrency(
					amount
				)} from wallet`,
				status: "PROCESSING",
				type: "WITHDRAWAL",
				payment_date: new Date(),
				business_id,
				meta_data,
			},
		});

		revalidatePath(routes.finance.overview, "page");
		revalidatePath(routes.finance.payout, "page");
	} catch (error: any) {
		console.log(error);
		throw new Error(`Failed to withdraw funds: ${error.message}`);
	}
};

export const getPayouts = async ({
	business_id,
	page = 1,
	limit = 10,
}: {
	business_id: string;
	page?: number;
	limit?: number;
}) => {
	try {
		const user = await currentUser();
		if (!user) return;

		const query = {
			where: {
				business_id,
				type: "WITHDRAWAL" as TransactionType,
				// status: "PAID" as PaymentStatus, //TODO: uncomment this line when done
			},
		};

		const [transactions, count] = await db.$transaction([
			db.paymentTransaction.findMany({
				...query,
				skip: (page - 1) * limit,
				take: limit,
			}),
			db.paymentTransaction.count({ where: query.where }),
		]);

		return {
			pagination: { total: count, total_pages: Math.ceil(count / limit) },
			payments: transactions,
		};
	} catch (error: any) {
		console.log(error);
		throw new Error(`Failed to get payouts: ${error.message}`);
	}
};

const updateExperimentalFeaturesFunc = async (
	id: string,
	features: Omit<ExperimentalFeatures, "id">
) => {
	// check if experimental features document exists for business or create one
	const experimentalFeatures = await db.experimentalFeatures.upsert({
		where: {
			business_id: id,
		},
		update: features,
		create: features,
	});

	return experimentalFeatures;
};

export const toggleExperimentalFeatures = async (
	id: string,
	toggle: Pick<Business, "experimental_features">
) => {
	try {
		const user = await currentUser();
		if (!user) return;

		const businessDetails = await db.business.update({
			where: { id },
			data: toggle,
		});

		if (businessDetails.experimental_features) {
			updateExperimentalFeaturesFunc(id, {
				business_id: id,
				// contact: {
				// 	email: "",
				// 	phone: "",
				// 	socials: { facebook: "", instagram: "", twitter: "" },
				// },
				heroSection: {
					backgroundImage: "",
					cta: { link: "", text: "" },
					subText: "",
					title: "",
				},
				// support: {
				// 	deliveryPolicy: "",
				// 	faq: "",
				// 	paymentPolicy: "",
				// 	privacyPolicy: "",
				// 	UserAgreement: "",
				// },
			});
		}

		return;
	} catch (error) {
		console.log(error);
		throw new Error("Failed to create business", { cause: error });
	}
};

export const updateExperimentalFeatures = async (
	id: string,
	data: Omit<ExperimentalFeatures, "id">
) => {
	try {
		const user = await currentUser();
		if (!user) return;

		const updatedFeatures = await updateExperimentalFeaturesFunc(id, data);

		return updatedFeatures;
	} catch (error) {
		console.log(error);
		throw new Error("Failed to create business", { cause: error });
	}
};

export const getExperimentalFeatures = async (id: string) => {
	try {
		const user = await currentUser();
		if (!user) return;

		const features = await db.experimentalFeatures.findFirst({
			where: {
				business_id: id,
			},
		});
		console.log("experimental features:", features);

		return features;
	} catch (error) {
		console.log(error);
		throw new Error("Failed to get experimental features", {
			cause: error,
		});
	}
};

const updateStorefrontFeaturesFunc = async (
	id: string,
	features: Omit<StorefrontFeatures, "id">
) => {
	// check if experimental features document exists for business or create one
	const experimentalFeatures = await db.storefrontFeatures.upsert({
		where: {
			business_id: id,
		},
		update: features,
		create: features,
	});

	return experimentalFeatures;
};

export const updateStorefrontFeatures = async (
	id: string,
	data: Omit<StorefrontFeatures, "id">
) => {
	try {
		const user = await currentUser();
		if (!user) return;

		const updatedFeatures = await updateStorefrontFeaturesFunc(id, data);

		return updatedFeatures;
	} catch (error) {
		console.log(error);
		throw new Error("Failed to create business", { cause: error });
	}
};

export const getStorefrontFeatures = async (id: string) => {
	try {
		const user = await currentUser();
		if (!user) return;

		const features = await db.storefrontFeatures.findFirst({
			where: {
				business_id: id,
			},
		});
		console.log("storefront features:", features);

		return features;
	} catch (error) {
		console.log(error);
		throw new Error("Failed to get storefront features", {
			cause: error,
		});
	}
};

export const createExperimentalFeature = async (
	id: string,
	feature: ExperimentalFeatures
) => {
	try {
		const user = await currentUser();
		if (!user) return;

		const features = await db.experimentalFeatures.upsert({
			where: { id },
			update: { ...feature },
			create: { ...feature },
		});

		return features;
	} catch (error) {
		console.log(error);
		throw new Error("Failed to create experimental feature", {
			cause: error,
		});
	}
};
