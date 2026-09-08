import Link from "next/link";

export function Wordmark({ dark = false, href = "/" }: { dark?: boolean; href?: string }) {
  return (
    <Link href={href} className={`wordmark${dark ? " on-dark" : ""}`} aria-label="Hey Nav by MIKE LLC">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/mike-llc-logo.png" alt="" width={38} height={32} />
      <span>
        <span className="wm-t">Hey <span>Nav</span></span>
        <span className="wm-s">by MIKE LLC</span>
      </span>
    </Link>
  );
}
