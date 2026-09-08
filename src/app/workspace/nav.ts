// Navigation structure grounded in the Hey Nav product: pursuit workspaces,
// the seven functions, and the governance tier. Sprint refs come from the
// sequenced build schedule so placeholder pages say something true.

export type NavItemT = {
  slug: string;        // "" = dashboard
  label: string;
  icon: string;        // key into Icon component
  description: string;
  sprint?: string;     // build-schedule reference
};

export type NavGroupT = { label: string; items: NavItemT[] };

export const NAV: NavGroupT[] = [
  {
    label: "Pursuits",
    items: [
      { slug: "", label: "Home", icon: "home", description: "Your pursuits, recent activity, and session." },
      { slug: "workspaces", label: "Workspaces", icon: "folder", description: "One workspace per pursuit, each with its ten governed object types.", sprint: "C-1 / C-2 · Sprints 1–2" },
      { slug: "library", label: "Library", icon: "book", description: "Past performance, rates, win themes, certifications, and teaming documents.", sprint: "C-6 · Sprints 1–2" },
    ],
  },
  {
    label: "Functions",
    items: [
      { slug: "ask", label: "Ask", icon: "ask", description: "Plain-language questions answered only from workspace and vault objects, with citations.", sprint: "C-8 · Sprints 1–2" },
      { slug: "shred", label: "Shred", icon: "shred", description: "Decompose a solicitation into requirements, evaluation criteria, deadlines, risks, and a bid/no-bid read.", sprint: "D-1 · Sprints 3–4" },
      { slug: "comply", label: "Comply", icon: "comply", description: "Live compliance matrix generated from the shred, kept current as amendments land.", sprint: "D-2 / D-3 · Sprints 3–4" },
      { slug: "draft", label: "Draft", icon: "draft", description: "First-draft sections grounded only on the governed library, with a source tag on every claim.", sprint: "D-4 / D-5 · Sprints 3–4" },
      { slug: "red-team", label: "Red-team", icon: "redteam", description: "Score a draft against the shredded requirements for coverage, unsupported claims, and clarity.", sprint: "E-1 · Sprints 5–6" },
    ],
  },
  {
    label: "Governance",
    items: [
      { slug: "share", label: "Share", icon: "share", description: "Invite a teaming partner into one pursuit with a defined scope — never the corporate library.", sprint: "E-2 · Sprints 5–6" },
      { slug: "vault", label: "Vault", icon: "vault", description: "All CUI at rest, organized by contract and category, with retention and legal hold.", sprint: "V-1 – V-5 · Sprint 9" },
      { slug: "evidence", label: "Evidence", icon: "evidence", description: "Dated evidence pack and Customer Responsibility Matrix mapped to NIST SP 800-171.", sprint: "G-2 · Sprints 7–8" },
      { slug: "audit", label: "Audit", icon: "audit", description: "Who accessed which object, when — from the database-tier audit stream.", sprint: "E-5 · Sprints 5–6" },
    ],
  },
];

export const SETTINGS: NavItemT = { slug: "settings", label: "Settings", icon: "settings", description: "Roles, identity provider, retention defaults, and inference endpoint.", sprint: "E-3 / E-4 · Sprints 5–6" };

export function findNavItem(slug: string): NavItemT | undefined {
  if (slug === SETTINGS.slug) return SETTINGS;
  for (const g of NAV) for (const i of g.items) if (i.slug === slug) return i;
  return undefined;
}
