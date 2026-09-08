"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MarkingBar } from "../components/MarkingBar";
import { Wordmark } from "../components/Wordmark";
import { ProfileMenu } from "./ProfileMenu";
import { Icon } from "./Icon";
import { NAV, SETTINGS, findNavItem } from "./nav";
import type { SessionSummaryT } from "@/utils/serverFunctions";

const BASE = "/workspace";

export function AppShell({
  session,
  dataLayer,
  children,
}: {
  session: SessionSummaryT;
  dataLayer: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);

  const currentSlug = pathname.replace(/^\/workspace\/?/, "").split("/")[0] ?? "";
  const current = findNavItem(currentSlug);

  // Close the drawer on navigation (mobile).
  useEffect(() => setNavOpen(false), [pathname]);

  function href(slug: string) {
    return slug ? `${BASE}/${slug}` : BASE;
  }
  function isActive(slug: string) {
    return slug === currentSlug;
  }

  return (
    <div className="app">
      <MarkingBar items={["CUI-aware by design", "Perimeter: customer-controlled", "Session active"]} />

      <div className={`app-body${navOpen ? " nav-open" : ""}`}>
        <aside className="side" aria-label="Primary">
          <div className="side-top">
            <Wordmark dark href={BASE} />
          </div>

          <nav className="side-nav">
            {NAV.map((group) => (
              <div className="nav-group" key={group.label}>
                <p className="nav-group-label">{group.label}</p>
                {group.items.map((item) => (
                  <Link
                    key={item.slug}
                    href={href(item.slug)}
                    className={`nav-item${isActive(item.slug) ? " active" : ""}`}
                    aria-current={isActive(item.slug) ? "page" : undefined}
                  >
                    <Icon name={item.icon} />
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
            ))}
          </nav>

          <div className="side-bottom">
            <Link
              href={href(SETTINGS.slug)}
              className={`nav-item${isActive(SETTINGS.slug) ? " active" : ""}`}
              aria-current={isActive(SETTINGS.slug) ? "page" : undefined}
            >
              <Icon name="settings" />
              <span>Settings</span>
            </Link>
            <dl className="side-ledger" aria-label="Connection">
              <div><dt>Data layer</dt><dd>{dataLayer}</dd></div>
              <div><dt>Session</dt><dd><span className="status ok">checked per call</span></dd></div>
            </dl>
          </div>
        </aside>

        <button className="scrim" aria-label="Close navigation" onClick={() => setNavOpen(false)} tabIndex={navOpen ? 0 : -1} />

        <div className="main">
          <header className="topbar">
            <div className="topbar-left">
              <button className="icon-btn nav-toggle" aria-label="Open navigation" aria-expanded={navOpen} onClick={() => setNavOpen(true)}>
                <Icon name="menu" size={18} />
              </button>
              <h1 className="page-title">{current?.label ?? "Hey Nav"}</h1>
            </div>
            <ProfileMenu session={session} />
          </header>

          <main className="content">{children}</main>
        </div>
      </div>
    </div>
  );
}
