import CustomModal from "@/components/global/custom-modal";
import React from "react";

type Props = { setClose: () => void };

const AddCategoryModal = ({ setClose }: Props) => {
  return (
    <CustomModal title="Add Category" className="max-w-96">
      {/* <PaymentDetails /> */}
      <div className="flex flex-col gap-4"></div>
    </CustomModal>
  );
};

export default AddCategoryModal;
