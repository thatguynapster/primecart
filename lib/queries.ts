"use server";

import {
  Business,
  Users,
  Payment,
  Products,
  ProductVariations,
  ProductCategories,
} from "@prisma/client";
import { currentUser } from "@clerk/nextjs/server";
import { cache } from "react";
import { revalidatePath } from "next/cache";

import { db } from "./db";
import { routes } from "@/routes";

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
  const category = await db.productCategories.upsert({
    where: { unique_id: data.unique_id },
    update: data,
    create: { ...data },
  });

  return category;
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
