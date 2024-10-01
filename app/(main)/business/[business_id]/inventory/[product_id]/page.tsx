export const dynamic = "force-dynamic";

import BackButton from "@/components/global/back-button";
import ProductDetails from "@/components/forms/product-details";
import ProductImages from "@/components/inventory/product-images";
import { classNames } from "@/lib/helpers";
import React from "react";
import { getProduct } from "@/lib/queries";
import { Products, ProductVariations } from "@prisma/client";
import { routes } from "@/routes";

type Props = { params: { business_id: string; product_id: string } };

const ProductDetailsPage = async ({
  params: { business_id, product_id },
}: Props) => {
  const product = (await getProduct(product_id, business_id)) as Products & {
    variations: ProductVariations[];
  };

  return (
    <div className="flex flex-col gap-4">
      <BackButton
        url={routes.inventory.index.replace(":business_id", business_id)}
        showText={false}
        withIcon={true}
      />

      <ProductDetails {...{ business_id }} data={product} />
    </div>
  );
};

export default ProductDetailsPage;
