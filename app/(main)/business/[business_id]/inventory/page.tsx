import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { classNames } from "@/lib/helpers";
import { ArrowUp, Ellipsis, Pencil, Trash, Trash2 } from "lucide-react";
import Image from "next/image";
import React from "react";
import ProductCard from "@/components/inventory/product-card";
import { getBusinessDetails, getProducts } from "@/lib/queries";
import AddProductButton from "@/components/inventory/add-product-button";
import { Products, ProductVariations } from "@prisma/client";

type Props = { params: { business_id: string } };

const InventoryPage = async ({ params: { business_id } }: Props) => {
  const business = await getBusinessDetails(business_id);
  if (!business) return;

  const products = await getProducts(business_id);


  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end w-full">
        <AddProductButton business={business.id} />
      </div>
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
      </div>
    </div>
  );
};

export default InventoryPage;
