"use client";

import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import ListeQuestionsRH from "@/components/ListeQuestionsRH";

export default function PageQuestionsRH() {
  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role="ADMIN" prenom="" />
      <div className="flex">
        <Sidebar role="ADMIN" />
        <main className="flex-1 p-6 md:p-10" style={{ minWidth: 0 }}>
          <ListeQuestionsRH admin />
        </main>
      </div>
    </div>
  );
}
