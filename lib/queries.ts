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
} from "@prisma/client";
import { currentUser } from "@clerk/nextjs/server";
import { cache } from "react";
import { revalidatePath } from "next/cache";

import { db } from "./db";
import { routes } from "@/routes";
import { startOfDay, subDays } from "date-fns";
import { BestSeller, Order } from "./types";

export const initUser = async (userUpdate?: Users) => {
  const user = await currentUser();
  if (!user) return;

  try {
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
  const user = await currentUser();
  if (!user) return;

  try {
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

export const createBusiness = async (
  business: Omit<Business, "id" | "createdAt" | "updatedAt">
) => {
  try {
    const businessDetails = await db.business.create({
      data: {
        ...business,
      },
    });

    return businessDetails;
  } catch (error) {
    console.log(error);
    throw new Error("Failed to create business", { cause: error });
  }
};

export const getBusinessDetails = cache(async (id: string) => {
  const user = await currentUser();
  if (!user) return;

  try {
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

export const upsertPaymentDetails = async (
  business: string,
  data: Omit<Payment, "id" | "createdAt" | "updatedAt">
) => {
  const user = await currentUser();
  if (!user) return;

  try {
    const paymentDetails = await db.payment.upsert({
      where: {
        business_id: business,
      },
      update: { ...data },
      create: { ...data },
    });

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

    return paymentDetails ?? { bank: null, momo: null };
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
  const user = await currentUser();
  if (!user) return;

  try {
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
  const user = await currentUser();
  if (!user) return;

  try {
    const variationDetails = await db.productVariations.delete({
      where: { unique_id },
    });

    return variationDetails;
  } catch (error) {
    console.log(error);
    throw new Error("Failed to delete product variant", { cause: error });
  }
};

export const getProducts = async (business_id: string) => {
  const user = await currentUser();
  if (!user) return;

  try {
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
  const user = await currentUser();
  if (!user) return;

  try {
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
  const user = await currentUser();
  if (!user) return;

  try {
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
  const user = await currentUser();
  if (!user) return;

  try {
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
  const user = currentUser();
  if (!user) return;

  try {
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
  // const user = await currentUser();
  // if (!user) return;

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
  data: Omit<ProductOrders, "id" | "createdAt" | "updatedAt">
) => {
  // const user = await currentUser();
  // if (!user) return;

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
  // const user = await currentUser();
  // if (!user) return;

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
  const user = await currentUser();
  if (!user) return;

  if (isNaN(from_date))
    from_date = startOfDay(subDays(Date.now(), 7)).valueOf();

  if (isNaN(to_date)) to_date = new Date().valueOf();

  try {
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
                  images: true,
                  name: true,
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
  const user = await currentUser();
  if (!user) return null;

  if (isNaN(from_date))
    from_date = startOfDay(subDays(Date.now(), 7)).valueOf();

  if (isNaN(to_date)) to_date = new Date().valueOf();

  try {
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
    const revenue = orders_in_period.reduce((a, b) => a + (b?.amount ?? 0), 0);

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
  const user = await currentUser();
  if (!user) return;

  try {
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
  const user = await currentUser();
  if (!user) return;

  try {
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
    throw new Error("Failed to update order status", { cause: error });
  }
};

export const getBestSellers = async ({
  business_id,
}: {
  business_id: string;
}): Promise<BestSeller[] | void> => {
  const user = await currentUser();
  if (!user) return;

  try {
    const query: Prisma.ProductOrdersFindManyArgs = {
      where: {
        business_id,
        createdAt: {
          gte: startOfDay(subDays(Date.now(), 7)).toISOString(),
          lte: new Date().toISOString(),
        },
      },
    };

    const bestSellingProducts = await db.products.findMany({
      where: {
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
        const uniqueOrders = product.orders.reduce((acc: any, currentOrder) => {
          if (
            !acc.find(
              (order: any) => order.product_id === currentOrder.product_id
            )
          ) {
            acc.push(currentOrder);
          }
          return acc;
        }, []);

        return {
          id: product.id,
          name: product.name,
          description: product.description,
          images: product.images,
          totalUnitsSold,
          lastOrderDate:
            uniqueOrders.length > 0 ? uniqueOrders[0].createdAt : null, // Most recent order date
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
  const user = await currentUser();
  if (!user) return;

  try {
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
        payment: {
          select: {
            provider: true,
            status: true,
          },
        },
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
  const user = await currentUser();
  if (!user) return;

  console.log(business_id);

  try {
    // const customers = await db.customer.findMany({
    //   where: { business_id },
    //   select: {
    //     id: true,
    //     name: true,
    //     email: true,
    //     phone: true,
    //     orders: {
    //       orderBy: {
    //         createdAt: "desc", // Sort orders by the most recent
    //       },
    //       take: 1, // Only fetch the most recent order
    //       select: {
    //         createdAt: true,
    //         location: true,
    //       },
    //     },
    //   },
    // });

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
    console.log(customers[0].orders);

    return {
      pagination: { total: count, total_pages: Math.ceil(count / limit) },
      data: customers,
    };
  } catch (error) {
    console.log(error);
    throw new Error("Failed to get customers", { cause: error });
  }
};
