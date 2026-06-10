import type { Metadata, Viewport } from "next";
import "@/styles/globals.css";
import { PwaRegister } from "@/components/PwaRegister";

const APP_NAME = "DoorPin";
const APP_DESCRIPTION =
  "Shared front-door and parking pins for multi-drop delivery drivers.";

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: APP_DESCRIPTION,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: APP_NAME,
  },
  formatDetection: { telephone: false },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b6b3a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-full bg-gray-50 text-gray-900 antialiased dark:bg-black dark:text-gray-100">
        <PwaRegister />
        <div className="mx-auto flex min-h-screen max-w-screen-sm flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
