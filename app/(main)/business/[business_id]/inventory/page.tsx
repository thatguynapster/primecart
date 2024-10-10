import React from "react";

import AddProductButton from "@/components/inventory/add-product-button";
import { getBusinessDetails, getProducts } from "@/lib/queries";
import ProductCard from "@/components/inventory/product-card";
import { classNames } from "@/lib/helpers";
import NoProduct_2 from "@/components/global/icons/no_product_2";
1;

type Props = { params: { business_id: string } };

const InventoryPage = async ({ params: { business_id } }: Props) => {
  const business = await getBusinessDetails(business_id);
  if (!business) return;

  const products = await getProducts(business_id);

  return (
    <div className="flex flex-col gap-4">
      {products!?.length > 0 && (
        <div className="flex justify-end w-full">
          <AddProductButton business={business.id} />
        </div>
      )}
      <div
        className={classNames(
          "grid",
          "grid-cols-1 lg:grid-cols-3 2xl:grid-cols-4",
          "gap-4",
          "overflow-auto"
        )}
      >
        {products?.map((product) => (
          <ProductCard key={product.id} business={business.id} data={product} />
        ))}

        {!products?.length && (
          <div className="col-span-1 lg:col-span-3 2xl:col-span-4  min-h-[calc(100vh-7rem)] items-center justify-center flex flex-col gap-4">
            <div className="w-1/2 lg:w-1/3 mx-auto">
              <NoProduct_2 />
            </div>
            <p>No products found</p>

            <AddProductButton business={business.id} />
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryPage;
