import {
  getBusinessIdFromDomain,
  getBusinessIdFromSubDomain,
} from "@/lib/queries";
import { NextRequest, NextResponse } from "next/server";

export const GET = async (
  req: NextRequest,
  // { params: { sub_or_domain } }: { params: { sub_or_domain: string } },
  res: NextResponse
) => {
  try {
    const subdomain = req.nextUrl.searchParams.get("subdomain");
    const domain = req.nextUrl.searchParams.get("domain");
    console.log("domain: ", domain, "subdomain: ", subdomain);

    if (!domain && !subdomain) {
      return NextResponse.json(
        {
          success: false,
          message: "Business name not provided",
        },
        { status: 500 }
      );
    }

    let business;
    if (domain) {
      business = await getBusinessIdFromDomain(domain);
    }

    if (subdomain) {
      business = await getBusinessIdFromSubDomain(subdomain);
    }

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
