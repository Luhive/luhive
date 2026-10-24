import { Link } from "react-router";
import { Routes } from "~/shared/lib/routing/routes";
import luhiveMark from "~/assets/images/hub/luhive-mark.svg";

export function HubBrand() {
  return (
    <Link
      to={Routes.landing}
      prefetch="intent"
      aria-label="Luhive home"
      className="flex origin-left items-center gap-[4.71px] rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[#111]/15 md:scale-[0.8]"
    >
      <span className="relative size-[20px] shrink-0">
        <img
          src={luhiveMark}
          alt=""
          width={20.1412}
          height={20.1412}
          className="absolute left-[-0.35%] top-[-0.35%] block max-w-none"
        />
      </span>
      <span className="font-geologica text-[28.235px] font-medium leading-none tracking-[-1.1294px] text-[#141414] [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">
        Luhive
      </span>
    </Link>
  );
}
