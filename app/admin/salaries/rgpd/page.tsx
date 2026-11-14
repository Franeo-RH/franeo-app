"use client";

import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import RgpdAdmin from "@/components/RgpdAdmin";

/** Admin : RGPD et sécurité (journal d'audit, salariés à anonymiser, purge) */
export default function AdminRgpd() {
  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role="ADMIN" prenom="" />
      <div className="flex">
        <Sidebar role="ADMIN" />
        <main className="flex-1 p-4 md:p-10 flex flex-col gap-6" style={{ minWidth: 0 }}>
          <div className="bg-white rounded-xl shadow p-6">
            <h1 className="text-3xl font-bold">🔐 RGPD & sécurité</h1>
            <p className="text-gray-500 mt-1">Connexions, exports et suppressions de tous les clients, salariés sortis à anonymiser et durées de conservation.</p>
          </div>
          <RgpdAdmin />
        </main>
      </div>
    </div>
  );
}
