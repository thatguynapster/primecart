"use server";

import { ReactNode } from "react";
import { CreateEmailOptions, Resend } from "resend";

type EmailProps = {
	from: string;
	to: string | string[];
	subject: string;
	body: string | ReactNode;
};

export const sendEmail = async ({ body, from, subject, to }: EmailProps) => {
	const resend = new Resend(process.env.RESEND_API_KEY);

	try {
		let sendOptions: CreateEmailOptions;
		if (typeof body == "string") {
			sendOptions = {
				from,
				to,
				subject,
				text: body
			};
		} else {
			sendOptions = {
				from,
				to,
				subject,
				react: body
			};
		}

		await resend.emails.send(sendOptions).catch((err) => {
			const error = new Error(`Failed to send email to ${to}`);
			error.name = "EmailSendFailure";
			error.cause = err;
			throw error;
		});

		return {
			message: "SEND_EMAIL_SUCCESS",
			success: true
		};
	} catch (error: any) {
		console.log("SEND_EMAIL_ERROR:", error);
		return {
			message: "SEND_EMAIL_ERROR",
			success: false
		};
	}
};

export const sendBulkEmail = async (emails: EmailProps[]) => {
	const resend = new Resend(process.env.RESEND_API_KEY);
	try {
		const sendEmailOptions = emails.map(
			async ({ body, from, subject, to }) => {
				let sendOptions: CreateEmailOptions;
				if (typeof body == "string") {
					sendOptions = {
						from,
						to,
						subject,
						text: body
					};
				} else {
					sendOptions = {
						from,
						to,
						subject,
						react: body
					};
				}

				return sendOptions;
			}
		);

		await resend.batch.send(await Promise.all(sendEmailOptions));

		return {
			message: "SEND_EMAIL_SUCCESS",
			success: true
		};
	} catch (error: any) {
		console.log("SEND_EMAIL_ERROR:", error);
		return {
			message: "SEND_EMAIL_ERROR",
			success: false
		};
	}
};
