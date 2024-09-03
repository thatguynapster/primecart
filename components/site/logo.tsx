import { classNames } from "@/lib/helpers";
import Image from "next/image";
import React from "react";

type Props = {
  size: number;
  className?: string;
  imgSrc?: { light: string; dark: string };
};

const ThemedImage = ({
  className,
  size,
  imgSrc = { light: "/img/logo.png", dark: "/img/logo-white.png" },
}: Props) => {
  return (
    <div
      className={classNames("relative", className)}
      style={{ width: size, height: size }}
    >
      {/* light mode logo */}
      <Image
        src={imgSrc.light}
        alt={"PrimeCart"}
        priority
        fill
        sizes="(max-width: 1200px) 100vw, (max-width: 768px) 50vw, 33vw"
        className="dark:hidden"
      />
      {/* dark mode logo */}
      <Image
        src={imgSrc.dark}
        alt={"PrimeCart"}
        priority
        fill
        sizes="(max-width: 1200px) 100vw, (max-width: 768px) 50vw, 33vw"
        className="hidden dark:block"
      />
    </div>
  );
};

export default ThemedImage;
