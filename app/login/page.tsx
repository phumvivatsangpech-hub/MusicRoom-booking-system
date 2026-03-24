"use client"

import { signIn } from "next-auth/react"
import { useState } from "react"

export default function LoginPage() {
  const [email, setEmail] = useState("test@go.buu.ac.th");
  const [role, setRole] = useState("USER");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    signIn("credentials", {
      email,
      role,
      callbackUrl: "/dashboard",
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">

        {/* Logo / Icon */}
        <div className="text-6xl mb-4">🎵</div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-800 mb-1">
          ระบบจองห้องซ้อมดนตรี
        </h1>
        <h1 className="text-2xl font-bold text-gray-800 mb-1">
          (ทดสอบ)
        </h1>
        <p className="text-gray-500 text-sm mb-2">
          Bypass Google OAuth
        </p>
        <div className="border-t border-gray-200 my-6"></div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="text-left">
            <label className="block text-sm font-bold text-gray-700 mb-1">อีเมลจำลอง (Email)</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded-xl p-3 bg-gray-50 text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
          <div className="text-left">
            <label className="block text-sm font-bold text-gray-700 mb-1">สิทธิ์การใช้งาน (Role)</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full border rounded-xl p-3 bg-gray-50 text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="USER">ผู้ใช้งานทั่วไป (USER)</option>
              <option value="ADMIN">ผู้ดูแลระบบ (ADMIN)</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
          >
            เข้าสู่ระบบ
          </button>
        </form>

      </div>
    </div>
  )
}