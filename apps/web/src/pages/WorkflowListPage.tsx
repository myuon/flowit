import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../auth";
import { useI18n } from "../i18n";
import { UserMenu } from "../components/UserMenu";
import { client } from "../api/client";

interface WorkflowListItem {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}
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
      const res = await client.api.workflows.$get();
      if (!res.ok) {
        throw new Error(`Failed to load workflows: ${res.statusText}`);
      }
      const result = await res.json();
      setWorkflows(result.workflows as WorkflowListItem[]);
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
      const res = await client.api.workflows.$post({
        json: { name: template.name, dsl: template.dsl },
      });
      if (!res.ok) {
        throw new Error(`Failed to create workflow: ${res.statusText}`);
      }
      const result = await res.json();
      // Navigate to the new workflow
      window.location.href = `/workflows/${result.workflow.id}`;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create workflow"
      );
      setCreating(false);
    }
  };

  const handleStartBlank = async () => {
    setCreating(true);
    setShowTemplateSelector(false);
    try {
      const res = await client.api.workflows.$post({
        json: { name: t.untitledWorkflow },
      });
      if (!res.ok) {
        throw new Error(`Failed to create workflow: ${res.statusText}`);
      }
      const result = await res.json();
      // Navigate to the new workflow
      window.location.href = `/workflows/${result.workflow.id}`;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create workflow"
      );
      setCreating(false);
    }
  };

  const handleDeleteWorkflow = async (id: string, name: string) => {
    if (!confirm(t.confirmDelete.replace("{name}", name))) {
      return;
    }
    try {
      const res = await client.api.workflows[":id"].$delete({ param: { id } });
      if (!res.ok) {
        throw new Error(`Failed to delete workflow: ${res.statusText}`);
      }
      setWorkflows((prev) => prev.filter((w) => w.id !== id));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete workflow"
      );
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
    <div className="w-screen h-screen flex flex-col font-sans">
      {/* Toolbar */}
      <div className="h-12 border-b border-gray-200 flex items-center px-4 gap-3 bg-white">
        <span className="font-semibold text-base text-gray-800">
          {t.appName}
        </span>
        <div className="flex-1" />
        {isAdmin && (
          <a
            href="/admin"
            className="py-1.5 px-3 bg-amber-100 border border-amber-300 rounded no-underline text-amber-800 text-sm"
          >
            {t.admin}
          </a>
        )}
        <div className="w-px h-6 bg-gray-200" />
        <UserMenu />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="m-0">{t.workflows}</h1>
          <button
            onClick={handleCreateWorkflow}
            disabled={creating}
            className={`py-2.5 px-5 bg-gray-800 text-white border-none rounded-md text-sm font-medium ${
              creating ? "cursor-wait opacity-70" : "cursor-pointer"
            }`}
          >
            {creating ? t.loading : t.newWorkflow}
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-600 mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12 text-gray-500">
            {t.loading}
          </div>
        ) : workflows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="mb-4 text-base">{t.noWorkflows}</p>
            <button
              onClick={handleCreateWorkflow}
              disabled={creating}
              className={`py-2.5 px-5 bg-gray-800 text-white border-none rounded-md text-sm font-medium ${
                creating ? "cursor-wait" : "cursor-pointer"
              }`}
            >
              {t.createFirstWorkflow}
            </button>
          </div>
        ) : (
          <div className="grid gap-3">
            {workflows.map((workflow) => (
              <a
                key={workflow.id}
                href={`/workflows/${workflow.id}`}
                className="flex items-center p-4 bg-white border border-gray-200 rounded-lg no-underline text-inherit transition-all hover:border-gray-400 hover:shadow-md"
              >
                <div className="flex-1">
                  <div className="font-medium text-base mb-1">
                    {workflow.name || t.untitledWorkflow}
                  </div>
                  {workflow.description && (
                    <div className="text-gray-500 text-sm mb-1">
                      {workflow.description}
                    </div>
                  )}
                  <div className="text-gray-400 text-xs">
                    {t.lastUpdated}: {formatDate(workflow.updatedAt)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDeleteWorkflow(workflow.id, workflow.name);
                    }}
                    className="py-1.5 px-2.5 bg-transparent border border-gray-200 rounded text-red-600 cursor-pointer text-xs hover:bg-red-50"
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
