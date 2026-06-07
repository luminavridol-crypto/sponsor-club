"use client";

import Link from "next/link";
import type { Route } from "next";
import { MouseEvent, ReactNode } from "react";

const FEED_SCROLL_KEY = "tg-content-scroll-y";

function storeFeedScrollPosition() {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.setItem(FEED_SCROLL_KEY, String(window.scrollY));
}

export function PostNavLink({
  href,
  className,
  children
}: {
  href: Route;
  className?: string;
  children: ReactNode;
}) {
  function handleClick() {
    storeFeedScrollPosition();
  }

  function handleAuxClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button === 1) {
      storeFeedScrollPosition();
    }
  }

  return (
    <Link href={href} className={className} onClick={handleClick} onAuxClick={handleAuxClick}>
      {children}
    </Link>
  );
}
