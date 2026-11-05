"use client";

import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";

/** Mise en page commune des pages client : barre du haut, barre latérale, contenu */
export default function CadreClient({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role="CLIENT" prenom="" />
      <div className="flex">
        <Sidebar role="CLIENT" />
        <main className="flex-1 p-4 md:p-10 flex flex-col gap-6" style={{ minWidth: 0 }}>{children}</main>
      </div>
    </div>
  );
}
