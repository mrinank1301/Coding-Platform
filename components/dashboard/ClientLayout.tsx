"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { 
  LayoutDashboard, 
  Code2, 
  Trophy, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  User
} from "lucide-react";
import { cn } from "@/lib/utils";
import LogoutButton from "@/components/LogoutButton";

interface ClientLayoutProps {
  children: React.ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const sidebarLinks = [
    { name: "Problems", href: "/client", icon: Code2 },
    { name: "My Submissions", href: "/client/submissions", icon: LayoutDashboard },
    { name: "Leaderboard", href: "/client/leaderboard", icon: Trophy },
    { name: "Settings", href: "/client/settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#030712] text-white flex">
      {/* Sidebar */}
      <motion.aside
        initial={{ width: 280 }}
        animate={{ width: isSidebarOpen ? 280 : 80 }}
        className="fixed left-0 top-0 h-full border-r border-white/10 bg-[#030712] z-40 hidden md:flex flex-col"
      >
        <div className="p-6 flex items-center gap-3 h-20 border-b border-white/10">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
            <Code2 className="w-5 h-5 text-white" />
          </div>
          {isSidebarOpen && (
            <span className="font-bold text-xl bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              Platform
            </span>
          )}
        </div>

        <div className="flex-1 py-6 px-4 space-y-2">
          {sidebarLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden",
                  isActive 
                    ? "bg-indigo-600 text-white" 
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                )}
              >
                <link.icon className={cn("w-5 h-5 shrink-0", isActive ? "text-white" : "text-gray-400 group-hover:text-white")} />
                {isSidebarOpen && (
                  <span className="font-medium truncate">{link.name}</span>
                )}
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
                )}
              </Link>
            );
          })}
        </div>

        <div className="p-4 border-t border-white/10">
          <div className={cn("flex items-center gap-3", !isSidebarOpen && "justify-center")}>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-600 flex items-center justify-center shrink-0">
              <User className="w-5 h-5 text-white" />
            </div>
            {isSidebarOpen && (
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium text-white truncate">User</p>
                <p className="text-xs text-gray-400 truncate">user@example.com</p>
              </div>
            )}
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className={cn("flex-1 flex flex-col min-h-screen transition-all duration-300", isSidebarOpen ? "md:ml-[280px]" : "md:ml-[80px]")}>
        {/* Topbar */}
        <header className="h-20 border-b border-white/10 bg-[#030712]/80 backdrop-blur-xl sticky top-0 z-30 px-6 flex items-center justify-between">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors hidden md:block"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          {/* Mobile Menu Toggle */}
          <button className="md:hidden p-2 text-white">
            <Menu className="w-6 h-6" />
          </button>

          <div className="flex items-center gap-4">
            <LogoutButton />
          </div>
        </header>

        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
