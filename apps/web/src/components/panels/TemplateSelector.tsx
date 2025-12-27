import { memo, useState } from "react";
import {
  workflowTemplates,
  getTemplatesByCategory,
  type WorkflowTemplate,
} from "../../data/templates";

interface TemplateSelectorProps {
  onSelectTemplate: (template: WorkflowTemplate) => void;
  onStartBlank: () => void;
}

function TemplateSelectorComponent({
  onSelectTemplate,
  onStartBlank,
}: TemplateSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const categories = getTemplatesByCategory();
  const categoryNames = Object.keys(categories);

  const displayedTemplates = selectedCategory
    ? categories[selectedCategory]
    : workflowTemplates;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: 12,
          maxWidth: 800,
          width: "90%",
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "24px 24px 16px",
            borderBottom: "1px solid #eee",
          }}
        >
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>
            Create New Workflow
          </h2>
          <p style={{ margin: "8px 0 0", color: "#666", fontSize: 14 }}>
            Start from a template or create a blank workflow
          </p>
        </div>

        {/* Category Filter */}
        <div
          style={{
            padding: "12px 24px",
            borderBottom: "1px solid #eee",
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={() => setSelectedCategory(null)}
            style={{
              padding: "6px 12px",
              borderRadius: 16,
              border: "1px solid #ddd",
              background: selectedCategory === null ? "#333" : "white",
              color: selectedCategory === null ? "white" : "#333",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            All
          </button>
          {categoryNames.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              style={{
                padding: "6px 12px",
                borderRadius: 16,
                border: "1px solid #ddd",
                background: selectedCategory === category ? "#333" : "white",
                color: selectedCategory === category ? "white" : "#333",
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Template Grid */}
        <div
          style={{
            flex: 1,
            overflow: "auto",
            padding: 24,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 16,
            }}
          >
            {/* Blank Template Card */}
            <div
              onClick={onStartBlank}
              style={{
                padding: 20,
                border: "2px dashed #ddd",
                borderRadius: 8,
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 140,
                transition: "border-color 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#999";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#ddd";
              }}
            >
              <span style={{ fontSize: 32, marginBottom: 12 }}>+</span>
              <span style={{ fontWeight: 500, color: "#333" }}>
                Blank Workflow
              </span>
              <span
                style={{ fontSize: 12, color: "#888", marginTop: 4 }}
              >
                Start from scratch
              </span>
            </div>

            {/* Template Cards */}
            {displayedTemplates.map((template) => (
              <div
                key={template.id}
                onClick={() => onSelectTemplate(template)}
                style={{
                  padding: 20,
                  border: "1px solid #e0e0e0",
                  borderRadius: 8,
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  minHeight: 140,
                  transition: "box-shadow 0.2s, border-color 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow =
                    "0 4px 12px rgba(0,0,0,0.1)";
                  e.currentTarget.style.borderColor = "#ccc";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.borderColor = "#e0e0e0";
                }}
              >
                <span style={{ fontSize: 28, marginBottom: 12 }}>
                  {template.icon}
                </span>
                <span style={{ fontWeight: 500, color: "#333" }}>
                  {template.name}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    color: "#888",
                    marginTop: 4,
                    flex: 1,
                  }}
                >
                  {template.description}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: "#aaa",
                    marginTop: 8,
                    padding: "2px 8px",
                    background: "#f5f5f5",
                    borderRadius: 4,
                    alignSelf: "flex-start",
                  }}
                >
                  {template.category}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid #eee",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={onStartBlank}
            style={{
              padding: "8px 16px",
              background: "#f0f0f0",
              border: "1px solid #ddd",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            Skip and start blank
          </button>
        </div>
      </div>
    </div>
  );
}

export const TemplateSelector = memo(TemplateSelectorComponent);
