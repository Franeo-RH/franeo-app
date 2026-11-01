import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import EnregistrerSW from "@/components/EnregistrerSW";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Franeo",
  description: "ERP RH et Paie",
  applicationName: "Franeo",
  // iPhone : ouverture en plein écran depuis l'écran d'accueil
  appleWebApp: { capable: true, title: "Franeo", statusBarStyle: "black" },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Thème sombre / clair appliqué avant l'affichage (pas de flash blanc) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("franeo-theme");if(t==="dark")document.documentElement.dataset.theme="dark";}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <EnregistrerSW />
      </body>
    </html>
  );
}