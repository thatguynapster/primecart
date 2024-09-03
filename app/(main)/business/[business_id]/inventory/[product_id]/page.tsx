import BackButton from "@/components/global/back-button";
import ProductDetails from "@/components/forms/product-details";
import ProductImages from "@/components/inventory/product-images";
import { classNames } from "@/lib/helpers";
import React from "react";

type Props = { params: { business_id: string; product_id: string } };

const ProductDetailsPage = ({ params: { business_id, product_id } }: Props) => {
  return (
    <div className="flex flex-col gap-4">
      <BackButton showText={false} withIcon={true} />

      <ProductDetails {...{ business_id }} />
    </div>
  );
};

export default ProductDetailsPage;
