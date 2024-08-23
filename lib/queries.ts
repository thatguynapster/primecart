"use server";

import { clerkClient, currentUser } from "@clerk/nextjs/server";
import { ID, db, storage } from "./appwrite";
import { Business, User } from "./types";
import { Query } from "appwrite";

type Collections = "business" | "notifications" | "users";

const collection_id = (collection: Collections) => {
  switch (collection) {
    case "business":
      return process.env["APPWRITE_BUSINESS_COLLECTION"]!;

    case "notifications":
      return process.env["APPWRITE_NOTIFICAITONS_COLLECTION"]!;

    case "users":
      return process.env["APPWRITE_USERS_COLLECTION"]!;
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

  const userData = await db.listDocuments(
    process.env["APPWRITE_DATABASE_ID"]!,
    collection_id("users"),
    [Query.equal("email", user.emailAddresses[0].emailAddress)]
  );

  return userData.documents?.[0];
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
