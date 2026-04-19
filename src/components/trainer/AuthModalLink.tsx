"use client";

import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
};

export function AuthModalLink({ children, className }: Props) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        window.dispatchEvent(new CustomEvent("uisamurai:open-auth-modal"));
      }}
    >
      {children}
    </button>
  );
}
