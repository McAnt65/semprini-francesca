import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Il Registro di Francesca",
  description: "Insegnare è toccare una vita per sempre",
  applicationName: "Il Registro di Francesca",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Il Registro",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#663139",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-[#f4eddf]">{children}</body>
    </html>
  );
}
