import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="flex flex-1 flex-col justify-center gap-8 p-6">
      <header className="text-center">
        <h1 className="text-3xl font-extrabold tracking-tight">DoorPin</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Shared front-door &amp; parking pins for delivery drivers.
        </p>
      </header>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
