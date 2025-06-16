import BackButton from "@/components/global/back-button";
import ProductDetails from "@/components/forms/product-details";
import React from "react";
import { routes } from "@/routes";

type Props = { params: { business_id: string } };

const AddProductPage = ({ params: { business_id } }: Props) => {
  return (
    <div className="flex flex-col gap-4">
      <BackButton
        url={routes.inventory.index.replace(":business_id", business_id)}
        showText={false}
        withIcon={true}
      />

      <ProductDetails {...{ business_id }} />
    </div>
  );
};

export default AddProductPage;
