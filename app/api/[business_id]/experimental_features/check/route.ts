import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";

export const GET = async (
	req: NextRequest,
	{ params: { business_id } }: { params: { business_id: string } },
	res: NextResponse
) => {
	try {
		if (!business_id) {
			return NextResponse.json(
				{
					success: false,
					message: "Business ID not provided",
				},
				{ status: 500 }
			);
		}

		const hasExperimentalFeatures = await db.business.findFirst({
			where: { id: business_id },
			select: { experimental_features: true },
		});

		return NextResponse.json(
			{
				success: true,
				message: "Success",
				data: hasExperimentalFeatures?.experimental_features ?? false,
			},
			{ status: 200 }
		);
	} catch (error: any) {
		return NextResponse.json(
			{
				success: false,
				message: "Failed to get experimental features",
				cause: error.name,
			},
			{ status: 500 }
		);
	}
};
