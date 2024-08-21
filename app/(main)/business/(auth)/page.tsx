import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import React from "react";

type Props = {};

const Page = async (props: Props) => {
  const authUser = await currentUser();
  if (!authUser) return redirect("/sign-in");

  return <div>Page</div>;
};

export default Page;
