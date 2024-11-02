import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export const POST = async (req: NextRequest, res: NextResponse) => {
  const reqBody = await req.json();
  const secret = process.env.SECRET_KEY!;

  //validate event
  const hash = crypto
    .createHmac("sha512", secret)
    .update(JSON.stringify(reqBody))
    .digest("hex");
  if (hash == req.headers.get("x-paystack-signature")) {
    // Retrieve the request's body
    console.log(reqBody);

    // Do something with event
  } else {
    throw new Error("Failed to validate origin");
  }

  return new NextResponse("", { status: 200 });
};
