import { memo, useState } from "react";
import { getGroupedCatalog, type NodeCatalogItem } from "@flowit/sdk";

interface NodePaletteProps {
  onAddNode: (nodeType: string) => void;
}

function NodePaletteComponent({ onAddNode }: NodePaletteProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const groupedCatalog = getGroupedCatalog();

  const filteredGroups = Object.entries(groupedCatalog).reduce(
    (acc, [category, nodes]) => {
      const filtered = nodes.filter(
        (node) =>
          node.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          node.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          node.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      if (filtered.length > 0) {
        acc[category] = filtered;
      }
      return acc;
    },
    {} as Record<string, NodeCatalogItem[]>
  );

  return (
    <div
      style={{
        width: 240,
        borderRight: "1px solid #e0e0e0",
        background: "#fafafa",
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "12px",
          borderBottom: "1px solid #e0e0e0",
          fontWeight: 600,
          fontSize: 14,
        }}
      >
        Nodes
      </div>

      {/* Search */}
      <div style={{ padding: "8px 12px" }}>
        <input
          type="text"
          placeholder="Search nodes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: "100%",
            padding: "8px",
            border: "1px solid #ddd",
            borderRadius: 4,
            fontSize: 13,
          }}
        />
      </div>

      {/* Node List */}
      <div style={{ flex: 1, overflow: "auto", padding: "0 12px 12px" }}>
        {Object.entries(filteredGroups).map(([category, nodes]) => (
          <div key={category} style={{ marginBottom: 16 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#666",
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              {category}
            </div>
            {nodes.map((node) => (
              <div
                key={node.id}
                onClick={() => onAddNode(node.id)}
                style={{
                  padding: "8px 10px",
                  marginBottom: 4,
                  background: "white",
                  border: "1px solid #e0e0e0",
                  borderRadius: 4,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#f0f0f0";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "white";
                }}
              >
                <span>{node.icon || "📦"}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>
                    {node.displayName}
                  </div>
                  {node.description && (
                    <div
                      style={{
                        fontSize: 11,
                        color: "#888",
                        marginTop: 2,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        maxWidth: 160,
                      }}
                    >
                      {node.description}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export const NodePalette = memo(NodePaletteComponent);
