import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/env";
import { AppHeader } from "@/components/AppHeader";
import { PropertyForm } from "@/components/property/PropertyForm";

export const metadata = { title: "Add property" };

export default function NewPropertyPage() {
  if (!isSupabaseConfigured()) redirect("/try");
  return (
    <>
      <AppHeader />
      <main className="flex flex-1 flex-col gap-4 p-4">
        <h1 className="text-xl font-bold">Add a property</h1>
        <p className="text-sm text-gray-500">
          Create the address first, then drop the front-door and parking pins on
          its page.
        </p>
        <PropertyForm />
      </main>
    </>
  );
}
