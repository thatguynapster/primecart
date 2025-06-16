import { Client, Storage, Databases } from "appwrite";

const client = new Client()
  .setEndpoint(String(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT))
  .setProject(String(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID));

export const storage = new Storage(client);
export const db = new Databases(client);
export { ID } from "appwrite";
