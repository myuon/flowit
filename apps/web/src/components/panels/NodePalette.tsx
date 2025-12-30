import { useState } from "react";
import { getGroupedCatalog, type NodeCatalogItem } from "@flowit/sdk";
import {
  useI18n,
  getCategoryName,
  getNodeDisplayName,
  getNodeDescription,
} from "../../i18n";
import { Panel } from "../ui/Panel";

interface NodePaletteProps {
  onAddNode: (nodeType: string) => void;
}

export const NodePalette = ({ onAddNode }: NodePaletteProps) => {
  const { t, language } = useI18n();
  const [searchTerm, setSearchTerm] = useState("");
  const groupedCatalog = getGroupedCatalog();

  const filteredGroups = Object.entries(groupedCatalog).reduce(
    (acc, [category, nodes]) => {
      const filtered = nodes.filter((node) => {
        const displayName = getNodeDisplayName(
          node.id,
          language,
          node.displayName
        );
        const description = getNodeDescription(
          node.id,
          language,
          node.description
        );
        const searchLower = searchTerm.toLowerCase();
        return (
          displayName.toLowerCase().includes(searchLower) ||
          node.id.toLowerCase().includes(searchLower) ||
          description.toLowerCase().includes(searchLower)
        );
      });
      if (filtered.length > 0) {
        acc[category] = filtered;
      }
      return acc;
    },
    {} as Record<string, NodeCatalogItem[]>
  );

  return (
    <div className="w-60 border-r border-gray-200 bg-gray-50 h-full overflow-auto">
      <Panel header={t.nodes}>
        {/* Search */}
        <div className="mb-2 -mt-1">
          <input
            type="text"
            placeholder={t.searchNodes}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded text-sm"
          />
        </div>

        {/* Node List */}
        {Object.entries(filteredGroups).map(([category, nodes]) => (
          <div key={category} className="mb-4">
            <div className="text-xs font-semibold text-gray-500 uppercase mb-2">
              {getCategoryName(category, language)}
            </div>
            {nodes.map((node) => {
              const displayName = getNodeDisplayName(
                node.id,
                language,
                node.displayName
              );
              const description = getNodeDescription(
                node.id,
                language,
                node.description
              );
              return (
                <div
                  key={node.id}
                  onClick={() => onAddNode(node.id)}
                  className="py-2 px-2.5 mb-1 bg-white border border-gray-200 rounded cursor-pointer flex items-center gap-2 hover:bg-gray-100"
                >
                  <span>{node.icon || "📦"}</span>
                  <div>
                    <div className="text-sm font-medium">{displayName}</div>
                    {description && (
                      <div className="text-xs text-gray-500 mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis max-w-40">
                        {description}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </Panel>
    </div>
  );
};
