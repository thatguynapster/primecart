import React from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import Image from "next/image";

type Props = {
  dataLength: number;
  index: number;
  image: string;
  name: string;
  quantity: number;
  product_variation: any;
};

const OrderTableProduct = ({
  dataLength,
  index,
  image,
  name,
  quantity,
  product_variation,
}: Props) => {
  return (
    <>
      {index < 3 ? (
        <Tooltip>
          <TooltipTrigger>
            <Image
              src={image}
              alt={`${name} - (${quantity})`}
              width={30}
              height={30}
              className="rounded-full"
            />
          </TooltipTrigger>
          <TooltipContent>
            {/* {`${name} - (${quantity})`} */}
            <div className="flex flex-col">
              <p>{name}</p>
              <p>
                Variant:{" "}
                {Object.values(product_variation.attributes!)
                  .map((attr, i) => attr)
                  .join(" / ")}
              </p>
              <p>Qty: {quantity}</p>
            </div>
          </TooltipContent>
        </Tooltip>
      ) : (
        <div className="w-[30px] h-[30px] rounded-full flex items-center justify-center bg-muted">
          +{dataLength - 3}
        </div>
      )}
    </>
  );
};

export default OrderTableProduct;
