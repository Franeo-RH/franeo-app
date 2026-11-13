"use client";

import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import JournalPointages from "@/components/JournalPointages";

/** Admin : journal des pointages de tous les clients */
export default function AdminPointages() {
  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role="ADMIN" prenom="" />
      <div className="flex">
        <Sidebar role="ADMIN" />
        <main className="flex-1 p-4 md:p-10 flex flex-col gap-6" style={{ minWidth: 0 }}>
          <div className="bg-white rounded-xl shadow p-6">
            <h1 className="text-3xl font-bold">📍 Journal des pointages</h1>
            <p className="text-gray-500 mt-1">Chaque arrivée, pause, reprise et départ badgés par les salariés de tous les clients, avec l&apos;adresse de chaque pointage.</p>
          </div>
          <JournalPointages admin />
        </main>
      </div>
    </div>
  );
}
