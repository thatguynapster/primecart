"use server";

import { Business, Users, Payment } from "@prisma/client";
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

export const createBusiness = async (business: Omit<Business, "id">) => {
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
  data: Omit<Payment, "id">
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
