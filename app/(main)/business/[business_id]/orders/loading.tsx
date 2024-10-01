import Loader from "@/components/global/loader";
import React from "react";

type Props = {};

const Loading = (props: Props) => {
  return (
    <div className="flex flex-1 items-center justify-center min-h-[calc(100vh-112px)]">
      <Loader className="w-96 h-96" />;
    </div>
  );
};

export default Loading;
