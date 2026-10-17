import type { ReactNode } from "react";

type HubEmptyMessageProps = {
  children: ReactNode;
};

export function HubEmptyMessage({ children }: HubEmptyMessageProps) {
  return (
    <p className="animate-hub-rise w-full rounded-[24px] bg-[#f6f6f6] px-6 py-10 text-center text-[15px] leading-[1.44] text-[#8c8e9a]">
      {children}
    </p>
  );
}
