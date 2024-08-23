import Image from "next/image";
import Link from "next/link";
import React from "react";

type Props = { size: number };

const Logo = ({ size }: Props) => {
  return (
    <Link href={"/site"}>
      <div className="relative" style={{ width: size, height: size }}>
        {/* light mode logo */}
        <Image
          src={"/img/logo.png"}
          alt={"PrimeCart"}
          fill
          sizes="(max-width: 1200px) 100vw, (max-width: 768px) 50vw, 33vw"
          className="dark:hidden"
        />
        {/* dark mode logo */}
        <Image
          src={"/img/logo-white.png"}
          alt={"PrimeCart"}
          fill
          sizes="(max-width: 1200px) 100vw, (max-width: 768px) 50vw, 33vw"
          className="hidden dark:block"
        />
      </div>
    </Link>
  );
};

export default Logo;
