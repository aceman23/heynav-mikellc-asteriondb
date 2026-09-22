"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "./Icon";
import type { SessionSummaryT } from "@/utils/serverFunctions";

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";
}

export function ProfileMenu({ session }: { session: SessionSummaryT }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function signOut() {
    console.log("[profile] sign out → /logout");
    setOpen(false);
    router.push("/logout");
  }

  return (
    <div className="profile" ref={ref}>
      <button
        type="button"
        className="profile-btn"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="avatar" aria-hidden="true">{initials(session.displayName)}</span>
        <span className="profile-name">{session.displayName}</span>
        <Icon name="chevron" size={14} />
      </button>

      {open && (
        <div className="menu" role="menu">
          <div className="menu-head">
            <strong>{session.displayName}</strong>
            <span>{session.emailAddress ?? "No email on record"}</span>
            <span className="mono">Session opened {new Date(session.signedInAt).toLocaleString()}</span>
          </div>
          <Link href="/workspace/profile/naics" role="menuitem" className="menu-item" onClick={() => setOpen(false)}>
            <Icon name="settings" />
            My NAICS codes
          </Link>
          <button type="button" role="menuitem" className="menu-item" onClick={signOut}>
            <Icon name="signout" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
