import Loader from "@/components/global/loader";
import React from "react";

type Props = {};

const Loading = (props: Props) => {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader className="w-96 h-96" />;
    </div>
  );
};

export default Loading;
