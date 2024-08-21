import { Button } from "@/components/global/button";
import GlobeIcon from "@/components/global/icons/globe";
import MoneyIconCircle from "@/components/global/icons/money";
import ShieldIcon from "@/components/global/icons/shield";
import ToolsIcon from "@/components/global/icons/tools";
import TrendingUpIcon from "@/components/global/icons/trend-up";
import { classNames } from "@/lib/helpers";
import { Montserrat } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

const font = Montserrat({ subsets: ["latin"] });

export default function Home() {
  return (
    <main className="flex min-h-[calc(100vh-84px)] flex-col items-center gap-16 px-4 py-12">
      <div className="flex flex-col gap-6 w-full max-w-[960px] items-center">
        <h1 className="text-6xl lg:text-[5rem] font-medium text-center bg-gradient-to-br from-dark dark:from-[#9A9C9C] to-[#9A9C9C] dark:to-dark text-transparent bg-clip-text">
          Build & Grow Your Online Store with Ease
        </h1>

        <p className="text-lg text-center max-w-xl mx-auto">
          PrimeCart makes it simple to create, manage, and scale your e-commerce
          business—all in one place.
        </p>

        <Link
          href={"/business"}
          className={classNames(
            "!rounded-full !btn-outline",
            "bg-light text-dark border-dark",
            "dark:bg-dark dark:text-light dark:border-light",
            "rounded-lg border-2",
            "py-2 px-4",
            "w-max"
          )}
        >
          Sign up
        </Link>
      </div>

      <div className="relative w-full max-w-[960px] h-[187px] lg:h-[472px]">
        <Image
          src={"/screenshots/dashboard.jpg"}
          alt={"PrimeCart"}
          fill
          sizes="(max-width: 1200px) 100vw, (max-width: 768px) 50vw, 33vw"
          className="border-2 border-dark dark:border-light rounded-lg lg:rounded-3xl"
        />
      </div>

      <div className="flex flex-col gap-6 max-w-[640px]">
        <h2 className="text-5xl font-medium text-center">
          Features that work for your future
        </h2>

        <p className="text-lg text-center">
          Check out our amazing features and experience the power of PrimeCart
          for yourself.
        </p>
      </div>

      <div className="flex flex-wrap gap-6 justify-center max-w-[1200px]">
        {features.map(({ description, icon, title }) => (
          <div
            key={title}
            className="flex flex-col gap-4 p-14 border-2 border-dark dark:border-light rounded-2xl max-w-[488px]"
          >
            <div className="p-2.5 bg-dark dark:bg-light rounded-lg w-max">
              {icon}
            </div>
            <h3 className="text-3xl font-medium capitalize">{title}</h3>
            <p className="text-sm">{description}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-6 rounded-2xl border-2 border-dark p-8 lg:p-16 w-full max-w-[1200px] items-center">
        <h2 className="text-5xl font-bold text-center">
          Ready to launch your store?
        </h2>

        <p className="text-lg text-center">Start for free today!</p>

        <Link
          href={"/business"}
          className={classNames(
            "!rounded-full !btn-outline",
            "bg-light text-dark border-dark",
            "dark:bg-dark dark:text-light dark:border-light",
            "rounded-lg border-2",
            "py-2 px-4",
            "w-max"
          )}
        >
          Sign up
        </Link>
      </div>
    </main>
  );
}

const features = [
  {
    icon: (
      <ToolsIcon
        size={32}
        className="text-white dark:text-dark"
        color="white"
      />
    ),
    title: "User-Friendly & robust tools",
    description:
      "The platform combines an intuitive drag-and-drop store builder with mobile optimization, advanced inventory management, sales analytics, and marketing tools, enabling users to easily create, manage, and grow their online stores.",
  },
  {
    icon: (
      <GlobeIcon
        size={32}
        className="text-white dark:text-dark"
        color="white"
      />
    ),
    title: "Localization",
    description:
      "PrimeCart enhances accessibility by supporting multiple languages, allowing transactions in local currencies, and integrating with popular local payment gateways, making it easier for businesses to connect with their local audience.",
  },
  {
    icon: (
      <MoneyIconCircle
        size={32}
        className="text-white dark:text-dark"
        color="white"
      />
    ),
    title: "Affordable Pricing Models",
    description:
      "PrimeCart offers a freemium tier to help new businesses start without cost, alongside affordable tiered subscription plans that provide advanced features and services, catering to businesses of various sizes.",
  },
  {
    icon: (
      <TrendingUpIcon
        size={32}
        className="text-white dark:text-dark"
        color="white"
      />
    ),
    title: "Scalability",
    description:
      "PrimeCart's flexible infrastructure and customizable features ensure that businesses can scale efficiently, accommodating growth and adapting to changing needs without compromising performance.",
  },
  {
    icon: (
      <ShieldIcon
        size={32}
        className="text-white dark:text-dark"
        color="white"
      />
    ),
    title: "Customer Support",
    description:
      "PrimeCart provides 24/7 support through various channels and offers a comprehensive resource centre with tutorials, and webinars, ensuring users have the help they need to succeed.",
  },
];
