"use client";

import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import ListeReleves from "@/components/ListeReleves";

export default function AdminReleves() {
  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role="ADMIN" prenom="" />
      <div className="flex">
        <Sidebar role="ADMIN" />
        <main className="flex-1 p-4 md:p-10" style={{ minWidth: 0 }}>
          <ListeReleves admin />
        </main>
      </div>
    </div>
  );
}
