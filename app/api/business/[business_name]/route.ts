import { getBusinessIdFromName } from "@/lib/queries";
import { NextRequest, NextResponse } from "next/server";

export const GET = async (
  req: NextRequest,
  { params: { business_name } }: { params: { business_name: string } },
  res: NextResponse
) => {
  try {
    console.log(business_name);

    if (!business_name) {
      return NextResponse.json(
        {
          success: false,
          message: "Business name not provided",
        },
        { status: 500 }
      );
    }

    const business = await getBusinessIdFromName(business_name);

    if (!business) {
      return NextResponse.json(
        {
          success: false,
          message: "Failed to find business details",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Success",
        data: business,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to get business details",
        cause: error.name,
      },
      { status: 500 }
    );
  }
};
