"use server";

import { clerkClient, currentUser } from "@clerk/nextjs/server";
import { ID, db, storage } from "./appwrite";
import { Business, User } from "./types";

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
  console.log(collection_id("users"));
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
          console.log(error);
          throw new Error(error);
        }
      );
    console.log(user);
    return user;
  } catch (error) {
    console.log(error);
    throw new Error("Failed to create user", { cause: error });
  }
};

export const createBusiness = async (data: Business) => {
  console.log(collection_id("business"));

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
          console.log(error);
          throw new Error(error);
        }
      );
    console.log(business);
    return business;
  } catch (error) {
    console.log(error);
    throw new Error("Failed to create business", { cause: error });
  }
};
