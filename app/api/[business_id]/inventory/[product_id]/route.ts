import { NextRequest, NextResponse } from "next/server";

import { arrayToObject } from "@/lib/utils";
import { db } from "@/lib/db";

export const GET = async (
  req: NextRequest,
  {
    params: { business_id, product_id },
  }: { params: { business_id: string; product_id: string } },
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

    const product = await db.products
      .findUnique({
        where: {
          business_id,
          id: product_id,
        },
        select: {
          ...arrayToObject(["description", "id", "images", "name"]),
          variations: {
            select: arrayToObject(["id", "attributes", "quantity", "price"]),
          },
        },
      })
      .catch((error) => console.error(error));
    console.log(product);

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          message: "Product not found",
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Success",
        data: product,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to get product",
        cause: error,
      },
      { status: 500 }
    );
  }
};
