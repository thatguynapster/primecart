import { db } from "@/lib/db";
import { getBestSellers } from "@/lib/queries";
import { arrayToObject } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";

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

    const recent_products = await db.products.findMany({
      where: {
        business_id,
      },
      select: {
        ...arrayToObject(["id", "name", "images"]),
        variations: {
          select: arrayToObject(["id", "attributes", "quantity", "price"]),
        },
      },
      take: 10, // Limit the results to the top 10 best-selling products
    });
    console.log(recent_products);

    if (recent_products?.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "No sales made to generate most popular products",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Success",
        data: recent_products,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to get categories",
        cause: error.name,
      },
      { status: 500 }
    );
  }
};
