"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import ListeReleves from "@/components/ListeReleves";

export default function ClientReleves() {
  const [prenom, setPrenom] = useState("");
  const [permissions, setPermissions] = useState<string[]>([]);
  useEffect(() => {
    fetch("/api/me").then((r) => r.json()).then((d) => { if (d.prenom) setPrenom(d.prenom); if (d.permissions) setPermissions(d.permissions); });
  }, []);
  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role="CLIENT" prenom={prenom} permissions={permissions} />
      <main className="p-4 md:p-10" style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <ListeReleves />
      </main>
    </div>
  );
}
