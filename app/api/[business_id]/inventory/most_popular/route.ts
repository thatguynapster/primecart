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

    const most_popular = await db.products.findMany({
      where: {
        business_id,
        orders: {
          some: {}, // Ensures only products with at least one order are included
        },
      },
      select: {
        ...arrayToObject(["id", "name", "images"]),
        variations: {
          take: 1,
          select: arrayToObject(["id", "attributes", "quantity", "price"]),
        },
      },
      orderBy: {
        orders: {
          _count: "desc", // Sorting by the total number of orders in descending order
        },
      },
      take: 10, // Optionally limit the results to the top 10 best-selling products
    });
    console.log(most_popular);

    if (most_popular?.length === 0) {
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
        data: most_popular,
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
