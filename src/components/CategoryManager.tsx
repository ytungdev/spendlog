import React, { useState, useMemo } from "react";
import { Category, SubCategory } from "../types";
import { Tag, Palette, Plus, Trash2, Check, X, Edit2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface CategoryManagerProps {
  categories: Category[];
  subCategories: SubCategory[];
  onUpdateCategoryColor: (name: string, color: string) => void;
  onAddSubCategory: (name: string, categoryName: string) => void;
}

export const CategoryManager: React.FC<CategoryManagerProps> = ({
  categories,
  subCategories,
  onUpdateCategoryColor,
  onAddSubCategory,
}) => {
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [tempColor, setTempColor] = useState("");
  const [newSubName, setNewSubName] = useState("");
  const [newSubCategoryName, setNewSubCategoryName] = useState("");

  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => a.name.localeCompare(b.name));
  }, [categories]);

  const sortedSubCategories = useMemo(() => {
    return [...subCategories].sort((a, b) => {
      const catCompare = a.categoryName.localeCompare(b.categoryName);
      if (catCompare !== 0) return catCompare;
      return a.name.localeCompare(b.name);
    });
  }, [subCategories]);

  const handleStartEditCategory = (cat: Category) => {
    setEditingCategory(cat.name);
    setTempColor(cat.color);
  };

  const handleSaveCategory = () => {
    if (editingCategory) {
      onUpdateCategoryColor(editingCategory, tempColor);
      setEditingCategory(null);
    }
  };

  const handleAddSub = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSubName && newSubCategoryName) {
      onAddSubCategory(newSubName, newSubCategoryName);
      setNewSubName("");
      setNewSubCategoryName("");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Categories & Colors</h2>
          <p className="text-zinc-500 text-sm">Manage your budget categories and their visual identity.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Categories Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
          <div className="px-6 py-4 border-b border-black/5 bg-zinc-50/50">
            <h3 className="font-semibold text-zinc-900 flex items-center gap-2">
              <Palette size={18} className="text-blue-600" />
              Category Colors
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50/50 border-b border-black/5">
                  <th className="px-6 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Category Name</th>
                  <th className="px-6 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Color</th>
                  <th className="px-6 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {sortedCategories.map((cat) => (
                  <tr key={cat.name} className="hover:bg-zinc-50/50 transition-colors group">
                    <td className="px-6 py-4 text-sm font-medium text-zinc-900">
                      <div className="flex items-center gap-3">
                        <span 
                          className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold"
                          style={{ 
                            backgroundColor: `${cat.color}15`, 
                            color: cat.color,
                            border: `1px solid ${cat.color}30`
                          }}
                        >
                          {cat.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {editingCategory === cat.name ? (
                        <div className="flex items-center gap-2">
                          <input 
                            type="color" 
                            value={tempColor}
                            onChange={(e) => setTempColor(e.target.value)}
                            className="w-8 h-8 rounded cursor-pointer border-none bg-transparent"
                          />
                          <input 
                            type="text" 
                            value={tempColor}
                            onChange={(e) => setTempColor(e.target.value)}
                            className="w-20 px-2 py-1 text-xs font-mono border border-black/10 rounded uppercase"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-6 h-6 rounded-full border border-black/10 shadow-sm"
                            style={{ backgroundColor: cat.color }}
                          />
                          <code className="text-xs text-zinc-500 font-mono uppercase">{cat.color}</code>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingCategory === cat.name ? (
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={handleSaveCategory}
                            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                          >
                            <Check size={16} />
                          </button>
                          <button 
                            onClick={() => setEditingCategory(null)}
                            className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => handleStartEditCategory(cat)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-blue-600 hover:bg-blue-50 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Edit2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sub-categories Table */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
            <div className="px-6 py-4 border-b border-black/5 bg-zinc-50/50">
              <h3 className="font-semibold text-zinc-900 flex items-center gap-2">
                <Plus size={18} className="text-blue-600" />
                Add New Sub-category
              </h3>
            </div>
            <div className="p-6">
              <form onSubmit={handleAddSub} className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Groceries"
                    value={newSubName}
                    onChange={(e) => setNewSubName(e.target.value)}
                    className="w-full px-4 py-2 bg-zinc-50 border border-black/5 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    required
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Category</label>
                  <select
                    value={newSubCategoryName}
                    onChange={(e) => setNewSubCategoryName(e.target.value)}
                    className="w-full px-4 py-2 bg-zinc-50 border border-black/5 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    required
                  >
                    <option value="">Select Category</option>
                    {sortedCategories.map(cat => (
                      <option key={cat.name} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all disabled:opacity-50 disabled:shadow-none"
                    disabled={!newSubName || !newSubCategoryName}
                  >
                    Add
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
            <div className="px-6 py-4 border-b border-black/5 bg-zinc-50/50">
              <h3 className="font-semibold text-zinc-900 flex items-center gap-2">
                <Tag size={18} className="text-blue-600" />
                Sub-categories
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50/50 border-b border-black/5">
                    <th className="px-6 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Sub-category</th>
                    <th className="px-6 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Parent Category</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {sortedSubCategories.map((sub) => (
                    <tr key={sub.name} className="hover:bg-zinc-50/50 transition-colors group">
                      <td className="px-6 py-4 text-sm font-medium text-zinc-900">
                        <span 
                          className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold"
                          style={{ 
                            backgroundColor: `${sub.categoryColor}15`, 
                            color: sub.categoryColor,
                            border: `1px solid ${sub.categoryColor}30`
                          }}
                        >
                          {sub.name}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-500">
                        {sub.categoryName}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
