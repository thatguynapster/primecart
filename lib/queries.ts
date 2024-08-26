"use server";

import { clerkClient, currentUser } from "@clerk/nextjs/server";
import { ID, db, storage } from "./appwrite";
import { Business, PaymentData, User } from "./types";
import { Query } from "appwrite";
import { cache } from "react";

type Collections = "business" | "notifications" | "users" | "payment";

const collection_id = (collection: Collections) => {
  switch (collection) {
    case "business":
      return process.env["APPWRITE_BUSINESS_COLLECTION"]!;

    case "notifications":
      return process.env["APPWRITE_NOTIFICAITONS_COLLECTION"]!;

    case "users":
      return process.env["APPWRITE_USERS_COLLECTION"]!;

    case "payment":
      return process.env["APPWRITE_PAYMENT_COLLECTION"]!;
  }
};

export const createUser = async (data: User) => {
  try {
    const user = await db
      .createDocument(
        process.env["APPWRITE_DATABASE_ID"]!,
        collection_id("users"),
        ID.unique(),
        data
      )
      .then(
        (response) => response,
        (error) => {
          throw new Error(error);
        }
      );

    return user;
  } catch (error) {
    console.log(error);
    throw new Error("Failed to create user", { cause: error });
  }
};

export const getAuthUserDetails = async () => {
  const user = await currentUser();
  if (!user) return;

  try {
    const userData = await db.listDocuments(
      process.env["APPWRITE_DATABASE_ID"]!,
      collection_id("users"),
      [Query.equal("email", user.emailAddresses[0].emailAddress)]
    );

    return userData.documents?.[0];
  } catch (error) {
    console.log(error);
    throw new Error("Failed to get user details", { cause: error });
  }
};

export const createBusiness = async (data: Business) => {
  try {
    const business = await db
      .createDocument(
        process.env["APPWRITE_DATABASE_ID"]!,
        collection_id("business"),
        ID.unique(),
        data
      )
      .then(
        (response) => response,
        (error) => {
          throw new Error(error);
        }
      );

    return business;
  } catch (error) {
    console.log(error);
    throw new Error("Failed to create business", { cause: error });
  }
};

export const getBusinessDetails = cache(async (id: string) => {
  const user = await currentUser();
  if (!user) return;

  try {
    const businessData = await db.listDocuments(
      process.env["APPWRITE_DATABASE_ID"]!,
      collection_id("business"),
      [Query.equal("$id", id)]
    );
    return businessData.documents[0];
  } catch (error) {
    console.log(error);
    throw new Error("Failed to get business details", { cause: error });
  }
});

export const upsertPaymentDetails = async (
  business: string,
  data: PaymentData
) => {
  const user = await currentUser();
  if (!user) return;

  try {
    const paymentExists = await db.listDocuments(
      process.env["APPWRITE_DATABASE_ID"]!,
      collection_id("payment"),
      [Query.equal("business", business)]
    );

    // payment details exist. update data
    if (paymentExists.total > 0) {
      const paymentUpdate = await db.updateDocument(
        process.env["APPWRITE_DATABASE_ID"]!,
        collection_id("payment"),
        paymentExists.documents[0].$id,
        {
          ...data,
          ...(data.payment_type === "momo"
            ? { momo: JSON.stringify(data.momo) }
            : { bank: JSON.stringify(data.bank) }),
        }
      );

      return paymentUpdate;
    }

    // create payment details
    const paymentDetails = await db
      .createDocument(
        process.env["APPWRITE_DATABASE_ID"]!,
        collection_id("payment"),
        ID.unique(),
        {
          ...data,
          ...(data.payment_type === "momo"
            ? { momo: JSON.stringify(data.momo) }
            : { bank: JSON.stringify(data.bank) }),
        }
      )
      .then(
        (response) => response,
        (error) => {
          throw new Error(error);
        }
      );

    return paymentDetails;
  } catch (error) {
    console.log(error);
    throw new Error("Failed to add payment details", { cause: error });
  }
};

export const getPaymentDetails = async (business: string) => {
  try {
    const paymentDetails = await db.listDocuments(
      process.env["APPWRITE_DATABASE_ID"]!,
      collection_id("payment"),
      [Query.equal("business", business)]
    );

    return paymentDetails.documents[0];
  } catch (error) {
    console.log(error);
    throw new Error("Failed to get payment details", { cause: error });
  }
};
