"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();

  const navLinks = [
    { name: "โปรไฟล์ของฉัน", href: "/dashboard/profile", emoji: "👤" },
    { name: "จองห้องซ้อม", href: "/dashboard", emoji: "🎸" },
    { name: "แจ้งปัญหา", href: "/dashboard/complaints", emoji: "📢" },
    { name: "ชุมชน", href: "/dashboard/community", emoji: "🎵" },
  ];

  if ((session?.user as any)?.role === "ADMIN") {
    navLinks.push({ name: "จัดการระบบ", href: "/dashboard/admin", emoji: "⚙️" });
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar Desktop / Navbar Mobile */}
      <nav className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-gray-200 shadow-sm z-10 flex-shrink-0 flex scrollbar-hide md:flex-col justify-between overflow-x-auto">
        <div className="p-4 flex md:flex-col gap-2 md:gap-4 md:pt-8 min-w-max md:min-w-0">
          <div className="hidden md:block px-4 mb-4">
            <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Buu Music</h1>
            <p className="text-xs text-gray-400">Chanthaburi Campus</p>
          </div>

          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link 
                key={link.href} 
                href={link.href}
                className={`flex justify-center md:justify-start items-center gap-3 px-4 py-3 rounded-xl transition-all whitespace-nowrap ${isActive ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <span className="text-lg">{link.emoji}</span> 
                <span>{link.name}</span>
              </Link>
            )
          })}
        </div>

        <div className="p-4 mt-auto md:border-t flex-shrink-0">
          <button 
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-full text-left px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors font-medium flex items-center gap-2 whitespace-nowrap"
          >
            <span>🚪</span> <span>ออกจากระบบ</span>
          </button>
        </div>
      </nav>

      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
