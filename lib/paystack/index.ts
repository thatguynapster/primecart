"use server";

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

  console.log("order amount:", amount);

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
