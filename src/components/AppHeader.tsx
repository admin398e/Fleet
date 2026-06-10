import Link from "next/link";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white/80 px-4 py-3 backdrop-blur dark:border-gray-800 dark:bg-black/70">
      <Link href="/" className="text-lg font-extrabold tracking-tight">
        DoorPin
      </Link>
      <nav className="flex items-center gap-4">
        <Link
          href="/settings/integrations"
          className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
        >
          Integrations
        </Link>
        <form action="/auth/signout" method="post">
          <button type="submit" className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-gray-100">
            Sign out
          </button>
        </form>
      </nav>
    </header>
  );
}
