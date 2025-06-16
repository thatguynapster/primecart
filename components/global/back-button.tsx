"use client";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import React from "react";

import { Button } from "./button";


type Props = { url: string; showText?: boolean; withIcon?: boolean };

const BackButton = ({ url, showText = true, withIcon }: Props) => {
  const router = useRouter();
  return (
    <Button
      aria-label="go back"
      variant="outline"
      className="w-max"
      onClick={() => router.push(url)}
    >
      {withIcon && <ChevronLeft size={16} />}
      {showText && <p className="">Back</p>}
    </Button>
  );
};

export default BackButton;
