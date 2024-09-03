"use server";

import {
  Business,
  Users,
  Payment,
  Products,
  ProductVariations,
} from "@prisma/client";
import { currentUser } from "@clerk/nextjs/server";
import { cache } from "react";

import { db } from "./db";

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

export const createProduct = async (
  product: Omit<
    Products,
    "id" | "createdAt" | "updatedAt" | "is_deleted" | "deletedAt"
  >,
  variations: Pick<ProductVariations, "price" | "quantity" | "attributes">[]
) => {
  try {
    console.log("product:", product);
    console.log("variations:", variations);
    // create product
    const productDetails = await db.products.create({
      data: product,
    });

    console.log(productDetails);

    const variationData = variations.map((variant) => {
      return {
        ...variant,
        attributes: variant.attributes!,
        product_id: productDetails.id,
      };
    });

    // create variation using product id
    const variationDetails = await db.productVariations.createMany({
      data: variationData,
    });
  } catch (error) {
    console.log(error);
    throw new Error("Failed to create product", { cause: error });
  }
};
