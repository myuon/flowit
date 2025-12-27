import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../auth";
import { useI18n } from "../i18n";
import { UserMenu } from "../components/UserMenu";
import { listWorkflows, createWorkflow, deleteWorkflow, type WorkflowListItem } from "../api/client";
import { TemplateSelector } from "../components/panels/TemplateSelector";
import type { WorkflowTemplate } from "../data/templates";

export function WorkflowListPage() {
  const { isAdmin } = useAuth();
  const { t } = useI18n();
  const [workflows, setWorkflows] = useState<WorkflowListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);

  const loadWorkflows = useCallback(async () => {
    try {
      setError(null);
      const result = await listWorkflows();
      setWorkflows(result.workflows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load workflows");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWorkflows();
  }, [loadWorkflows]);

  const handleCreateWorkflow = () => {
    setShowTemplateSelector(true);
  };

  const handleSelectTemplate = async (template: WorkflowTemplate) => {
    setCreating(true);
    setShowTemplateSelector(false);
    try {
      const result = await createWorkflow({
        name: template.name,
        dsl: template.dsl,
      });
      // Navigate to the new workflow
      window.location.href = `/workflows/${result.workflow.id}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create workflow");
      setCreating(false);
    }
  };

  const handleStartBlank = async () => {
    setCreating(true);
    setShowTemplateSelector(false);
    try {
      const result = await createWorkflow({ name: t.untitledWorkflow });
      // Navigate to the new workflow
      window.location.href = `/workflows/${result.workflow.id}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create workflow");
      setCreating(false);
    }
  };

  const handleDeleteWorkflow = async (id: string, name: string) => {
    if (!confirm(t.confirmDelete.replace("{name}", name))) {
      return;
    }
    try {
      await deleteWorkflow(id);
      setWorkflows((prev) => prev.filter((w) => w.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete workflow");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

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
        <span
          style={{
            fontWeight: 600,
            fontSize: 16,
            color: "#333",
          }}
        >
          {t.appName}
        </span>
        <div style={{ flex: 1 }} />
        {isAdmin && (
          <a
            href="/admin"
            style={{
              padding: "6px 12px",
              background: "#fef3c7",
              border: "1px solid #fcd34d",
              borderRadius: 4,
              textDecoration: "none",
              color: "#92400e",
              fontSize: 14,
            }}
          >
            {t.admin}
          </a>
        )}
        <div style={{ width: 1, height: 24, background: "#e0e0e0" }} />
        <UserMenu />
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <h1 style={{ margin: 0 }}>{t.workflows}</h1>
          <button
            onClick={handleCreateWorkflow}
            disabled={creating}
            style={{
              padding: "10px 20px",
              background: "#333",
              color: "white",
              border: "none",
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 500,
              cursor: creating ? "wait" : "pointer",
              opacity: creating ? 0.7 : 1,
            }}
          >
            {creating ? t.loading : t.newWorkflow}
          </button>
        </div>

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

        {loading ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              padding: 48,
              color: "#666",
            }}
          >
            {t.loading}
          </div>
        ) : workflows.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: 48,
              color: "#666",
              background: "#f9fafb",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
            }}
          >
            <p style={{ marginBottom: 16, fontSize: 16 }}>{t.noWorkflows}</p>
            <button
              onClick={handleCreateWorkflow}
              disabled={creating}
              style={{
                padding: "10px 20px",
                background: "#333",
                color: "white",
                border: "none",
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 500,
                cursor: creating ? "wait" : "pointer",
              }}
            >
              {t.createFirstWorkflow}
            </button>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 12,
            }}
          >
            {workflows.map((workflow) => (
              <a
                key={workflow.id}
                href={`/workflows/${workflow.id}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: 16,
                  background: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  textDecoration: "none",
                  color: "inherit",
                  transition: "border-color 0.15s, box-shadow 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#9ca3af";
                  e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#e5e7eb";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontWeight: 500,
                      fontSize: 16,
                      marginBottom: 4,
                    }}
                  >
                    {workflow.name || t.untitledWorkflow}
                  </div>
                  {workflow.description && (
                    <div
                      style={{
                        color: "#666",
                        fontSize: 14,
                        marginBottom: 4,
                      }}
                    >
                      {workflow.description}
                    </div>
                  )}
                  <div
                    style={{
                      color: "#999",
                      fontSize: 12,
                    }}
                  >
                    {t.lastUpdated}: {formatDate(workflow.updatedAt)}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      padding: "4px 8px",
                      background: workflow.currentVersionId ? "#dcfce7" : "#fef3c7",
                      color: workflow.currentVersionId ? "#166534" : "#92400e",
                      borderRadius: 4,
                      fontSize: 12,
                    }}
                  >
                    {workflow.currentVersionId ? t.published : t.draft}
                  </span>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDeleteWorkflow(workflow.id, workflow.name);
                    }}
                    style={{
                      padding: "6px 10px",
                      background: "transparent",
                      border: "1px solid #e5e7eb",
                      borderRadius: 4,
                      color: "#dc2626",
                      cursor: "pointer",
                      fontSize: 12,
                    }}
                  >
                    {t.delete}
                  </button>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Template Selector Modal */}
      {showTemplateSelector && (
        <TemplateSelector
          onSelectTemplate={handleSelectTemplate}
          onStartBlank={handleStartBlank}
        />
      )}
    </div>
  );
}
