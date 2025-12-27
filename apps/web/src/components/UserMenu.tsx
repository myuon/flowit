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
    <div ref={menuRef} style={{ position: "relative" }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "4px 8px",
          background: "transparent",
          border: "1px solid #e0e0e0",
          borderRadius: 20,
          cursor: "pointer",
          fontSize: 13,
        }}
      >
        {user.picture ? (
          <img
            src={user.picture}
            alt=""
            style={{
              width: 24,
              height: 24,
              borderRadius: "50%",
            }}
          />
        ) : (
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: "50%",
              background: "#ddd",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 600,
              color: "#666",
            }}
          >
            {user.name?.[0] || user.email[0]}
          </div>
        )}
        <span style={{ color: "#333", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {user.name || user.email}
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          style={{
            transform: isOpen ? "rotate(180deg)" : "none",
            transition: "transform 0.2s",
          }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            marginTop: 8,
            background: "white",
            border: "1px solid #e0e0e0",
            borderRadius: 8,
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            minWidth: 200,
            zIndex: 100,
          }}
        >
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid #eee",
            }}
          >
            <div style={{ fontWeight: 500, color: "#333" }}>
              {user.name || "User"}
            </div>
            <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
              {user.email}
            </div>
          </div>

          <button
            onClick={handleLogout}
            style={{
              display: "block",
              width: "100%",
              padding: "10px 16px",
              background: "transparent",
              border: "none",
              textAlign: "left",
              cursor: "pointer",
              fontSize: 14,
              color: "#dc2626",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#fef2f2";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export const UserMenu = memo(UserMenuComponent);
