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

export function debounce<F extends (...args: any[]) => any>(
	func: F,
	delay: number
): (this: ThisParameterType<F>, ...args: Parameters<F>) => void {
	let timeoutId: ReturnType<typeof setTimeout> | undefined;

	return function (this: ThisParameterType<F>, ...args: Parameters<F>) {
		clearTimeout(timeoutId);
		timeoutId = setTimeout(() => {
			func.apply(this, args);
		}, delay);
	};
}