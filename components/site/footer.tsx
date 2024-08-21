import Image from "next/image";
import Link from "next/link";
import React from "react";

type Props = {};

const Footer = (props: Props) => {
  return (
    <div className="bg-dark text-light py-16 px-5 dark:border-t-2 dark:border-light">
      <div className="flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto">
        <div className="flex flex-col gap-10 w-full">
          <div className="flex flex-col gap-4">
            <h1 className="text-2xl font-medium">Contact</h1>
            <div className="flex flex-col gap-2">
              <p className="text-lg font-light">
                Enquiries:{" "}
                <Link href="mailto:primecart@thatguynapster.com">
                  primecart@thatguynapster.com
                </Link>
              </p>
              <p className="text-lg font-light">
                Support:{" "}
                <Link href="mailto:primecart-support@thatguynapster.com">
                  primecart-support@thatguynapster.com
                </Link>
              </p>
              <p className="text-lg font-light">
                Phone: <Link href="tel:+233275246704">+233 27 524 6704</Link>
              </p>
            </div>
          </div>

          <p className="text-gray font-light capitalize">
            &copy; 2024 PrimeCart. all rights reserved
          </p>
        </div>

        <div className="flex flex-col gap-10 w-full">
          <div className="flex flex-col gap-4">
            <h1 className="text-2xl font-medium">Address</h1>
            <div className="flex flex-col">
              <p className="text-lg font-light">Somewhere in Accra,</p>
              <p className="text-lg font-light">Ghana</p>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <h1 className="text-2xl font-medium">Social</h1>
            <div className="flex flex-col">
              <p className="text-lg font-light">
                {/* <Link href="https://x.com/primecart"> */}
                <Link href="#">Twitter</Link>
              </p>

              <p className="text-lg font-light">
                {/* <Link href="https://www.instagram.com/primecart"> */}
                <Link href="#">Instagram</Link>
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end items-end w-full lg:max-w-44">
          <Image
            src={"/img/logo-white.png"}
            alt={"PrimeCart"}
            width={48}
            height={48}
            sizes="(max-width: 1200px) 100vw, (max-width: 768px) 50vw, 33vw"
          />
        </div>
      </div>
    </div>
  );
};

export default Footer;
