export default function OfflinePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <h1 className="text-2xl font-bold">You&apos;re offline</h1>
      <p className="text-gray-600 dark:text-gray-400">
        DoorPin needs a connection to load delivery pins. Saved pins will appear
        again once you&apos;re back online.
      </p>
    </main>
  );
}
