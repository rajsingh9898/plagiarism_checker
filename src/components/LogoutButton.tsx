"use client";

import { signOut } from "next-auth/react";

export default function LogoutButton() {
  const handleLogout = async () => {
    await signOut({ redirect: false });
    window.location.href = "/auth/login";
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="w-full text-left px-3 py-2 mt-4 rounded-md text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
    >
      Sign Out
    </button>
  );
}
