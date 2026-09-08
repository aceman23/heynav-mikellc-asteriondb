import { notFound } from "next/navigation";
import Link from "next/link";
import { findNavItem } from "../nav";

// One placeholder per navigation target, described in the product's own terms
// and tied to the sprint where it lands. Replace each with a real page as its
// DbTwig calls come online.
export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const item = findNavItem(section);
  if (!item || item.slug === "") notFound();

  return (
    <>
      <div className="page-head">
        <div>
          <h2>{item.label}</h2>
          <p>{item.description}</p>
        </div>
      </div>

      <section className="panel empty">
        <h3>Not wired to the data layer yet</h3>
        <p>
          This function ships in build card {item.sprint ?? "TBD"}. When its DbTwig endpoints are
          enrolled, this page will call them through the same server functions the sign-in uses.
        </p>
        <Link href="/workspace" className="btn quiet">Back to home</Link>
      </section>
    </>
  );
}
