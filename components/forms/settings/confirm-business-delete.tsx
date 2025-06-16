"use client";

import { useParams, useRouter } from "next/navigation";
import React, { useState } from "react";
import toast from "react-hot-toast";

import CustomModal from "@/components/global/custom-modal";
import { useModal } from "@/providers/modal-provider";
import { Button } from "@/components/global/button";
import { deleteBusiness } from "@/lib/queries";

type Props = {};

const ConfirmBusinessDelete = (props: Props) => {
  const params = useParams<{ business_id: string }>();
  const router = useRouter();

  const [deletingBusiness, setDeletingBusiness] = useState<boolean>(false);
  const { setClose } = useModal();

  const handleDelete = async () => {
    console.log("deleting business account...");
    setDeletingBusiness(true);
    const business = await deleteBusiness(params.business_id);
    console.log(business);

    toast("business deleted");
    setDeletingBusiness(false);

    setClose();
    router.refresh();
  };

  return (
    <CustomModal title="Delete Product?" className="max-w-96">
      <div className="flex flex-col gap-8">
        <div className="text-center">
          <p>Are you sure you want to delete your business account?.</p>
          <p>This cannot be undone.</p>
        </div>

        <div className="flex gap-4 justify-around">
          <Button
            className="w-max"
            variant="outline"
            type="button"
            onClick={() => {
              setClose();
            }}
          >
            No, cancel
          </Button>

          <Button
            className="w-max !border-error !bg-error !text-white"
            type="submit"
            isSubmitting={deletingBusiness}
            onClick={() => {
              handleDelete();
            }}
          >
            Yes, delete
          </Button>
        </div>
      </div>
    </CustomModal>
  );
};

export default ConfirmBusinessDelete;
