import BackButton from "@/components/global/back-button";
import ProductDetails from "@/components/forms/product-details";
import React from "react";

type Props = {};

const AddProductPage = (props: Props) => {
  return (
    <div className="flex flex-col gap-4">
      <BackButton showText={false} withIcon={true} />

      <ProductDetails />
    </div>
  );
};

export default AddProductPage;
