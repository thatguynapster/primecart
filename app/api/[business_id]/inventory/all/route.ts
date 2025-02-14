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
    const category = req.nextUrl.searchParams.get("category");
    console.log("category:", category);

    if (!business_id) {
      return NextResponse.json(
        {
          success: false,
          message: "Business ID not provided",
        },
        { status: 500 }
      );
    }

    let filterQuery = {};

    if (category) {
      console.log("category in filter:", category);
      filterQuery = { category_id: category };
    }

    const all_products = await db.products
      .findMany({
        where: {
          business_id,
          ...filterQuery,
        },
        select: {
          ...arrayToObject(["id", "name", "images"]),
          variations: {
            select: arrayToObject(["id", "attributes", "quantity", "price"]),
          },
        },
      })
      .catch((error) => console.error(error));
    console.log(all_products);

    if (all_products?.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "No products found",
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Success",
        data: all_products,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to get products",
        cause: error,
      },
      { status: 500 }
    );
  }
};
