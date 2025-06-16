"use server";

import { PaymentStatus } from "@prisma/client";

export type PaystackResponse = {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
};

export const initializePayment = async ({
  email,
  amount,
  order_id,
  business_id,
}: {
  email: string;
  amount: number | string;
  order_id: string;
  business_id: string;
}): Promise<PaystackResponse> => {
  const myHeaders = new Headers();
  myHeaders.append("Content-Type", "application/json");
  myHeaders.append(
    "Authorization",
    `Bearer ${process.env["PAYSTACK_SECRET_KEY"]}`
  );

  const requestOptions = {
    method: "POST",
    headers: myHeaders,
    body: JSON.stringify({
      amount,
      email,
      metadata: {
        order_id,
        business_id,
      },
    }),
  };

  const payment = await fetch(
    "https://api.paystack.co/transaction/initialize",
    requestOptions
  ).then((response) => response.json());

  return payment;
};

export const verifyPayment = async (
  reference: string
): Promise<{ status: PaymentStatus }> => {
  // Ensure the secret key is available
  const secretKey = process.env["PAYSTACK_SECRET_KEY"];
  if (!secretKey) {
    throw new Error("Paystack key is missing.");
  }

  // Configure headers
  const myHeaders = new Headers({
    "Content-Type": "application/json",
    Authorization: `Bearer ${secretKey}`,
  });

  // Request options
  const requestOptions = {
    method: "GET",
    headers: myHeaders,
  };

  try {
    // Fetch payment status from Paystack
    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      requestOptions
    );

    if (!response.ok) {
      throw new Error(`Failed to verify payment: ${response.statusText}`);
    }

    const resp = await response.json();

    // Translate Paystack status
    const status: PaymentStatus = await translatePaystackStatus(
      resp.data?.status
    );

    return { status };
  } catch (error) {
    console.error("Error verifying payment:", error);
    return { status: "FAILED" };
  }
};

export const translatePaystackStatus = (
  status: string | undefined
): PaymentStatus => {
  let newStatus: PaymentStatus = "FAILED";

  switch (status) {
    case "abandoned":
      newStatus = "ABANDONED";
      break;
    case "failed":
    case "reversed":
      newStatus = "FAILED";
      break;
    case "ongoing":
    case "pending":
    case "processing":
    case "queued":
      newStatus = "PROCESSING";
      break;
    case "success":
      newStatus = "PAID";
      break;
  }

  return newStatus;
};
