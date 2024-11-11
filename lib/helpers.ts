import { updateOrderPaymentStatus } from "@/lib/queries";
import { verifyPayment } from "@/lib/paystack";

export const _verifyPayment = async ({
  payment_id,
  reference,
}: {
  payment_id: string;
  reference: string;
}) => {
  const paymentStatus = await verifyPayment(reference);
  await updateOrderPaymentStatus(payment_id, paymentStatus.status);
};
