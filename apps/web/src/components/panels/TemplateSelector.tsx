import { useState } from "react";
import {
  workflowTemplates,
  getTemplatesByCategory,
  type WorkflowTemplate,
} from "../../data/templates";
import { useI18n } from "../../i18n";

interface TemplateSelectorProps {
  onSelectTemplate: (template: WorkflowTemplate) => void;
  onStartBlank: () => void;
}

export const TemplateSelector = ({
  onSelectTemplate,
  onStartBlank,
}: TemplateSelectorProps) => {
  const { t } = useI18n();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const categories = getTemplatesByCategory();
  const categoryNames = Object.keys(categories);

  const displayedTemplates = selectedCategory
    ? categories[selectedCategory]
    : workflowTemplates;

  return (
    <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-1000">
      <div className="bg-white rounded-xl max-w-[800px] w-[90%] max-h-[80vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <h2 className="m-0 text-2xl font-semibold">{t.createNewWorkflow}</h2>
          <p className="mt-2 mb-0 text-gray-500 text-sm">
            {t.templateDescription}
          </p>
        </div>

        {/* Category Filter */}
        <div className="px-6 py-3 border-b border-gray-100 flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1.5 rounded-full border cursor-pointer text-sm ${
              selectedCategory === null
                ? "bg-gray-800 text-white border-gray-800"
                : "bg-white text-gray-800 border-gray-300"
            }`}
          >
            {t.all}
          </button>
          {categoryNames.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1.5 rounded-full border cursor-pointer text-sm ${
                selectedCategory === category
                  ? "bg-gray-800 text-white border-gray-800"
                  : "bg-white text-gray-800 border-gray-300"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Template Grid */}
        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
            {/* Blank Template Card */}
            <div
              onClick={onStartBlank}
              className="p-5 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer flex flex-col items-center justify-center min-h-[140px] transition-colors hover:border-gray-500"
            >
              <span className="text-3xl mb-3">+</span>
              <span className="font-medium text-gray-800">
                {t.blankWorkflow}
              </span>
              <span className="text-xs text-gray-500 mt-1">
                {t.startFromScratch}
              </span>
            </div>

            {/* Template Cards */}
            {displayedTemplates.map((template) => (
              <div
                key={template.id}
                onClick={() => onSelectTemplate(template)}
                className="p-5 border border-gray-200 rounded-lg cursor-pointer flex flex-col min-h-[140px] transition-all hover:shadow-lg hover:border-gray-400"
              >
                <span className="text-3xl mb-3">{template.icon}</span>
                <span className="font-medium text-gray-800">
                  {template.name}
                </span>
                <span className="text-xs text-gray-500 mt-1 flex-1">
                  {template.description}
                </span>
                <span className="text-xs text-gray-400 mt-2 px-2 py-0.5 bg-gray-100 rounded self-start">
                  {template.category}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
          <button
            onClick={onStartBlank}
            className="px-4 py-2 bg-gray-100 border border-gray-300 rounded-md cursor-pointer text-sm"
          >
            {t.skipAndStartBlank}
          </button>
        </div>
      </div>
    </div>
  );
};
