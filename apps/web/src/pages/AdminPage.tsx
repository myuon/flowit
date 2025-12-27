import { useEffect, useState } from "react";
import type { Language, AppSettings } from "@flowit/shared";
import { useAuth } from "../auth";
import { useI18n } from "../i18n";
import { UserMenu } from "../components/UserMenu";
import { getAppSettings, updateAppSettings } from "../api/client";

export function AdminPage() {
  const { user, isAdmin } = useAuth();
  const { t, refresh: refreshI18n } = useI18n();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAppSettings()
      .then(setSettings)
      .catch((err) => setError(err.message));
  }, []);

  const handleLanguageChange = async (language: Language) => {
    setSaving(true);
    setError(null);
    try {
      const updated = await updateAppSettings({ language });
      setSettings(updated);
      await refreshI18n();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <h1 style={{ color: "#dc2626", marginBottom: 16 }}>{t.accessDenied}</h1>
        <p style={{ color: "#666", marginBottom: 24 }}>{t.noPermission}</p>
        <a
          href="/"
          style={{
            padding: "12px 24px",
            background: "#333",
            color: "white",
            border: "none",
            borderRadius: 8,
            textDecoration: "none",
            fontSize: 16,
          }}
        >
          {t.goHome}
        </a>
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          height: 48,
          borderBottom: "1px solid #e0e0e0",
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          gap: 12,
          background: "white",
        }}
      >
        <a
          href="/"
          style={{
            fontWeight: 600,
            fontSize: 16,
            color: "#333",
            textDecoration: "none",
          }}
        >
          Flowit
        </a>
        <span
          style={{
            padding: "4px 10px",
            background: "#fef3c7",
            color: "#92400e",
            borderRadius: 4,
            fontSize: 12,
          }}
        >
          {t.admin}
        </span>
        <div style={{ flex: 1 }} />
        <a
          href="/"
          style={{
            padding: "6px 12px",
            background: "#f0f0f0",
            border: "1px solid #ddd",
            borderRadius: 4,
            textDecoration: "none",
            color: "#333",
            fontSize: 14,
          }}
        >
          {t.backToEditor}
        </a>
        <div style={{ width: 1, height: 24, background: "#e0e0e0" }} />
        <UserMenu />
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
        <h1 style={{ margin: "0 0 24px 0" }}>{t.adminDashboard}</h1>

        <div
          style={{
            background: "#f9fafb",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            padding: 24,
            marginBottom: 24,
          }}
        >
          <h2 style={{ margin: "0 0 16px 0", fontSize: 18 }}>{t.currentUser}</h2>
          <div style={{ display: "grid", gap: 8 }}>
            <div>
              <strong>{t.userId}:</strong> {user?.sub}
            </div>
            <div>
              <strong>{t.email}:</strong> {user?.email}
            </div>
            <div>
              <strong>{t.name}:</strong> {user?.name || "N/A"}
            </div>
          </div>
        </div>

        <div
          style={{
            background: "#f9fafb",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            padding: 24,
          }}
        >
          <h2 style={{ margin: "0 0 16px 0", fontSize: 18 }}>{t.settings}</h2>

          {error && (
            <div
              style={{
                padding: 12,
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: 6,
                color: "#dc2626",
                marginBottom: 16,
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <label
              htmlFor="language"
              style={{ fontWeight: 500, minWidth: 100 }}
            >
              {t.language}
            </label>
            <select
              id="language"
              value={settings?.language || "en"}
              onChange={(e) => handleLanguageChange(e.target.value as Language)}
              disabled={saving || !settings}
              style={{
                padding: "8px 12px",
                border: "1px solid #d1d5db",
                borderRadius: 6,
                fontSize: 14,
                minWidth: 150,
                cursor: saving ? "wait" : "pointer",
              }}
            >
              <option value="en">English</option>
              <option value="ja">日本語</option>
            </select>
            {saving && (
              <span style={{ color: "#666", fontSize: 14 }}>{t.saving}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
