"use client";

import React from "react";

import { useModal } from "@/providers/modal-provider";
import CustomModal from "../global/custom-modal";
import { Button } from "../global/button";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { routes } from "@/routes";
type Props = { business: string; product?: string };

const AddProductButton = ({ business, product }: Props) => {
  const router = useRouter();

  return (
    <Button
      className="w-max px-4 py-2"
      onClick={() => {
        router.push(
          routes.inventory.details
            .replace(":business_id", business)
            .replace(":product_id", product ?? "add")
        );
      }}
    >
      <Plus size={16} />
      <p className="leading-none">Add Product</p>
    </Button>
  );
};

export default AddProductButton;
