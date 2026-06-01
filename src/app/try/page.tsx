import type { Metadata } from "next";
import { NavScreen } from "@/components/nav/NavScreen";

export const metadata: Metadata = {
  title: "Navigation",
};

// Always render dynamically; this page must not be statically cached.
export const dynamic = "force-dynamic";

export default function TryPage() {
  return <NavScreen />;
}
