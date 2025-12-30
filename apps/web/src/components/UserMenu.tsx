import { useState, useRef, useEffect, memo } from "react";
import { useAuth } from "../auth";

function UserMenuComponent() {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) return null;

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 py-1 px-2 bg-transparent border border-gray-200 rounded-full cursor-pointer text-sm"
      >
        {user.picture ? (
          <img
            src={user.picture}
            alt=""
            className="w-6 h-6 rounded-full"
          />
        ) : (
          <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs font-semibold text-gray-500">
            {user.name?.[0] || user.email[0]}
          </div>
        )}
        <span className="text-gray-800 max-w-30 overflow-hidden text-ellipsis whitespace-nowrap">
          {user.name || user.email}
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg min-w-50 z-100">
          <div className="py-3 px-4 border-b border-gray-100">
            <div className="font-medium text-gray-800">
              {user.name || "User"}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">{user.email}</div>
          </div>

          <button
            onClick={handleLogout}
            className="block w-full py-2.5 px-4 bg-transparent border-none text-left cursor-pointer text-sm text-red-600 hover:bg-red-50"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export const UserMenu = memo(UserMenuComponent);
