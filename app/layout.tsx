import { scriptPontPortail } from "@/lib/pont-portail";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
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

// Police du portail admin FRANEO (pages affichées dans le portail)
const policePortail = Plus_Jakarta_Sans({ variable: "--font-portail", subsets: ["latin"], display: "swap" });

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
      className={`${geistSans.variable} ${geistMono.variable} ${policePortail.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Thème sombre / clair appliqué avant l'affichage (pas de flash blanc) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `var h=document.documentElement;try{if(window.top!==window.self)h.classList.add("fr-integre");}catch(e){h.classList.add("fr-integre");}try{var t=localStorage.getItem("franeo-theme");if(t==="dark"&&!h.classList.contains("fr-integre")&&location.pathname.indexOf("/admin")!==0)h.dataset.theme="dark";}catch(e){}`,
          }}
        />
        {/* Affichée dans le portail admin : thème et navigation pilotés par le portail */}
        <script dangerouslySetInnerHTML={{ __html: scriptPontPortail("fr-nuit") }} />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <EnregistrerSW />
      </body>
    </html>
  );
}