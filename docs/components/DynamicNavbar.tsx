"use client";

import { Navbar } from "nextra-theme-docs";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

interface DynamicNavbarProps {
  logo: ReactNode;
  projectLink: string;
}

export function DynamicNavbar({ logo, projectLink }: DynamicNavbarProps) {
  const pathname = usePathname();
  const isHomePage = pathname === "/";

  return (
    <Navbar
      logo={logo}
      projectLink={projectLink}
      className={
        isHomePage
          ? "bg-transparent border-none shadow-none bg-opacity-0!"
          : "bg-white dark:bg-slate-900 opacity-95"
      }
    />
  );
}
