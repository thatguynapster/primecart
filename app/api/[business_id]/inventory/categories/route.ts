import { db } from "@/lib/db";
import { getCategories } from "@/lib/queries";
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

    const categories = await db.productCategories.findMany({
      where: { business_id },
      select: arrayToObject(["id", "name", "previewImage"]),
    });

    if (categories?.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "No categories found",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Success",
        data: categories,
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
