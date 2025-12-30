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
      <div className="flex flex-col items-center justify-center h-screen font-sans">
        <h1 className="text-red-600 mb-4">{t.accessDenied}</h1>
        <p className="text-gray-500 mb-6">{t.noPermission}</p>
        <a
          href="/"
          className="py-3 px-6 bg-gray-800 text-white rounded-lg no-underline text-base"
        >
          {t.goHome}
        </a>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen flex flex-col font-sans">
      {/* Toolbar */}
      <div className="h-12 border-b border-gray-200 flex items-center px-4 gap-3 bg-white">
        <a href="/" className="font-semibold text-base text-gray-800 no-underline">
          Flowit
        </a>
        <span className="py-1 px-2.5 bg-amber-100 text-amber-800 rounded text-xs">
          {t.admin}
        </span>
        <div className="flex-1" />
        <a
          href="/"
          className="py-1.5 px-3 bg-gray-100 border border-gray-300 rounded no-underline text-gray-800 text-sm"
        >
          {t.backToEditor}
        </a>
        <div className="w-px h-6 bg-gray-200" />
        <UserMenu />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <h1 className="mb-6">{t.adminDashboard}</h1>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
          <h2 className="m-0 mb-4 text-lg">{t.currentUser}</h2>
          <div className="grid gap-2">
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

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h2 className="m-0 mb-4 text-lg">{t.settings}</h2>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-600 mb-4">
              {error}
            </div>
          )}

          <div className="flex items-center gap-4">
            <label htmlFor="language" className="font-medium min-w-25">
              {t.language}
            </label>
            <select
              id="language"
              value={settings?.language || "en"}
              onChange={(e) => handleLanguageChange(e.target.value as Language)}
              disabled={saving || !settings}
              className={`py-2 px-3 border border-gray-300 rounded-md text-sm min-w-[150px] ${
                saving ? "cursor-wait" : "cursor-pointer"
              }`}
            >
              <option value="en">English</option>
              <option value="ja">日本語</option>
            </select>
            {saving && <span className="text-gray-500 text-sm">{t.saving}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
