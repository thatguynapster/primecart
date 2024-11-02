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
}: {
  email: string;
  amount: number | string;
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
  const myHeaders = new Headers();
  myHeaders.append("Content-Type", "application/json");
  myHeaders.append(
    "Authorization",
    `Bearer ${process.env["PAYSTACK_SECRET_KEY"]}`
  );

  const requestOptions = {
    method: "GET",
    headers: myHeaders,
  };

  const payment = await fetch(
    `https://api.paystack.co/transaction/verify/${reference}`,
    requestOptions
  )
    .then((response) => response.json())
    .then((resp) => {
      let status: PaymentStatus = "FAILED";

      switch (resp.data.status) {
        case "abandoned":
          status = "ABANDONED";
          break;
        case "failed":
        case "reversed":
          status = "FAILED";
          break;
        case "ongoing":
        case "pending":
        case "processing":
        case "queued":
          status = "PROCESSING";
          break;
        case "success":
          status = "PAID";
          break;
      }
      return { status };
    });

  return payment;
};
