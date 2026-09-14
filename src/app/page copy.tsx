import { redirect } from "next/navigation";

// Middleware already routes "/" by session state; this is the fallback.
export default function Home() {
  redirect("/login");
}
