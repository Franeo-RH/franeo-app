"use client";

import Navbar from "@/components/Navbar";
import ListeReleves from "@/components/ListeReleves";

export default function AdminReleves() {
  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role="ADMIN" prenom="" />
      <main className="p-4 md:p-10" style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <ListeReleves admin />
      </main>
    </div>
  );
}
