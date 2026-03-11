import React, { useState, useEffect, useRef, useMemo } from "react";
import { Transaction, SubCategory, Category } from "../types";
import { ExpressionInput } from "./ExpressionInput";
import { Trash2, Plus, Search, ChevronLeft, ChevronRight, Calendar, Tag } from "lucide-react";
import { format, isSameMonth, parseISO, eachMonthOfInterval, startOfYear, endOfYear, addYears, subYears } from "date-fns";
import { motion, AnimatePresence } from "motion/react";

interface TransactionGridProps {
  transactions: Transaction[];
  categories: Category[];
  subCategories: SubCategory[];
  vendors: string[];
  onAdd: (transaction: Omit<Transaction, "id">) => void;
  onDelete: (id: number) => void;
}

export const TransactionGrid: React.FC<TransactionGridProps> = ({
  transactions,
  categories,
  subCategories,
  vendors,
  onAdd,
  onDelete,
}) => {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth()); // 0-indexed

  const [newRow, setNewRow] = useState<Omit<Transaction, "id">>({
    date: format(now, "yyyy-MM-dd"),
    category: "",
    subCategory: "",
    vendor: "",
    description: "",
    amount: 0,
    multiplier: 1,
  });

  // Split date into Y, M, D for the inputs
  const [dateParts, setDateParts] = useState({
    year: now.getFullYear().toString(),
    month: (now.getMonth() + 1).toString().padStart(2, '0'),
    day: now.getDate().toString().padStart(2, '0')
  });

  const [showSubCategoryDropdown, setShowSubCategoryDropdown] = useState(false);
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterSubCategory, setFilterSubCategory] = useState("All");

  const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const availableSubCategories = useMemo(() => {
    if (filterCategory === "All") return subCategories.map(sc => sc.name);
    return subCategories
      .filter(sc => sc.categoryName === filterCategory)
      .map(sc => sc.name)
      .sort();
  }, [subCategories, filterCategory]);

  // Update dateParts when selected tab changes
  useEffect(() => {
    setDateParts(prev => ({
      ...prev,
      year: selectedYear.toString(),
      month: (selectedMonth + 1).toString().padStart(2, '0')
    }));
  }, [selectedYear, selectedMonth]);

  // Sync newRow.date with dateParts
  useEffect(() => {
    const { year, month, day } = dateParts;
    if (year && month && day) {
      const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      setNewRow(prev => ({ ...prev, date: formattedDate }));
    }
  }, [dateParts]);

  const handleSubmit = (overrides?: Partial<Omit<Transaction, "id">>) => {
    const data = { ...newRow, ...overrides };
    
    // Canonicalize subCategory if possible
    const match = subCategories.find(sc => sc.name.toLowerCase() === (data.subCategory || "").toLowerCase());
    if (match) {
      data.subCategory = match.name;
      data.category = match.categoryName;
    }

    // Make description null if empty
    if (data.description === "") {
      data.description = undefined;
    }

    if (data.subCategory && data.amount > 0) {
      onAdd(data);
      // Reset amount and description but keep date parts
      setNewRow(prev => ({
        ...prev,
        category: "",
        subCategory: "",
        vendor: "",
        description: "",
        amount: 0,
        multiplier: 1,
      }));
      inputRefs.current["new-day"]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, field: string, index: number | "new") => {
    if (e.key === "Enter") {
      if (index === "new") {
        if (field === "amount") {
          setTimeout(() => handleSubmit(), 0);
        } else {
          handleSubmit();
        }
      } else {
        const nextIndex = typeof index === "number" ? index + 1 : 0;
        inputRefs.current[`${nextIndex}-${field}`]?.focus();
      }
    } else if (e.key === "ArrowDown") {
      const nextIndex = index === "new" ? 0 : (index as number) + 1;
      inputRefs.current[`${nextIndex}-${field}`]?.focus();
    } else if (e.key === "ArrowUp") {
      const prevIndex = index === "new" ? monthTransactions.length - 1 : (index as number) - 1;
      if (prevIndex >= 0 || index === 0) {
        inputRefs.current[`${prevIndex === -1 ? "new" : prevIndex}-${field}`]?.focus();
      }
    }
  };

  const filteredSubCategories = useMemo(() => {
    return subCategories
      .filter(sc => sc.name.toLowerCase().includes((newRow.subCategory || "").toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [subCategories, newRow.subCategory]);

  const filteredVendors = vendors.filter(v => 
    v.toLowerCase().includes(newRow.vendor.toLowerCase())
  );

  const monthTransactions = useMemo(() => {
    return transactions.filter(t => {
      const d = parseISO(t.date);
      const matchesMonth = d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
      const matchesCategory = filterCategory === "All" || t.category === filterCategory;
      const matchesSubCategory = filterSubCategory === "All" || t.subCategory === filterSubCategory;
      const matchesSearch = (t.description?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
                          (t.vendor?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
                          (t.subCategory?.toLowerCase() || "").includes(searchQuery.toLowerCase());
      return matchesMonth && matchesCategory && matchesSubCategory && matchesSearch;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, selectedYear, selectedMonth, searchQuery, filterCategory, filterSubCategory]);

  const months = useMemo(() => {
    return eachMonthOfInterval({
      start: startOfYear(new Date(selectedYear, 0, 1)),
      end: endOfYear(new Date(selectedYear, 0, 1))
    });
  }, [selectedYear]);

  return (
    <div className="space-y-6">
      {/* Year & Month Tabs */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-black/5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSelectedYear(prev => prev - 1)}
              className="p-2 hover:bg-zinc-100 rounded-lg transition-colors text-zinc-400 hover:text-zinc-900"
            >
              <ChevronLeft size={24} />
            </button>
            <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">{selectedYear}</h2>
            <button 
              onClick={() => setSelectedYear(prev => prev + 1)}
              className="p-2 hover:bg-zinc-100 rounded-lg transition-colors text-zinc-400 hover:text-zinc-900"
            >
              <ChevronRight size={24} />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 border border-black/5 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>

            <select
              value={filterCategory}
              onChange={(e) => {
                setFilterCategory(e.target.value);
                setFilterSubCategory("All");
              }}
              className="bg-zinc-50 border border-black/5 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
            >
              <option value="All">All Categories</option>
              {[...categories].sort((a, b) => a.name.localeCompare(b.name)).map(cat => (
                <option key={cat.name} value={cat.name}>{cat.name}</option>
              ))}
            </select>

            {filterCategory !== "All" && availableSubCategories.length > 0 && (
              <select
                value={filterSubCategory}
                onChange={(e) => setFilterSubCategory(e.target.value)}
                className="bg-zinc-50 border border-black/5 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
              >
                <option value="All">All Sub-categories</option>
                {availableSubCategories.map(sub => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {months.map((m, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedMonth(idx)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                selectedMonth === idx 
                  ? "bg-blue-600 text-white shadow-md shadow-blue-200" 
                  : "bg-zinc-50 text-zinc-500 hover:bg-zinc-100"
              }`}
            >
              {format(m, "MMMM")}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
        <div className="overflow-x-auto pb-48">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-zinc-50 border-b border-black/5">
                <th className="px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider w-48">Date (Y-M-D)</th>
                <th className="px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider w-40">Category</th>
                <th className="px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider w-40">Sub-cat</th>
                <th className="px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider w-40">Vendor</th>
                <th className="px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Description</th>
                <th className="px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider w-24 text-right">Mult.</th>
                <th className="px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider w-32 text-right">Amount</th>
                <th className="px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {/* New Row Entry */}
              <tr className="bg-blue-50/30 group">
                <td className="px-4 py-2">
                  <div className="flex items-center gap-1">
                    <input
                      ref={el => { inputRefs.current["new-year"] = el; }}
                      type="text"
                      placeholder="YYYY"
                      value={dateParts.year}
                      onChange={e => setDateParts({ ...dateParts, year: e.target.value })}
                      onKeyDown={e => handleKeyDown(e, "year", "new")}
                      className="w-14 bg-transparent border-none focus:ring-2 focus:ring-blue-500 rounded outline-none px-1 py-1 text-sm text-center"
                    />
                    <span className="text-zinc-300">-</span>
                    <input
                      ref={el => { inputRefs.current["new-month"] = el; }}
                      type="text"
                      placeholder="MM"
                      value={dateParts.month}
                      onChange={e => setDateParts({ ...dateParts, month: e.target.value })}
                      onKeyDown={e => handleKeyDown(e, "month", "new")}
                      className="w-10 bg-transparent border-none focus:ring-2 focus:ring-blue-500 rounded outline-none px-1 py-1 text-sm text-center"
                    />
                    <span className="text-zinc-300">-</span>
                    <input
                      ref={el => { inputRefs.current["new-day"] = el; }}
                      type="text"
                      placeholder="DD"
                      value={dateParts.day}
                      onChange={e => setDateParts({ ...dateParts, day: e.target.value })}
                      onKeyDown={e => handleKeyDown(e, "day", "new")}
                      className="w-10 bg-transparent border-none focus:ring-2 focus:ring-blue-500 rounded outline-none px-1 py-1 text-sm text-center"
                    />
                  </div>
                </td>
                <td className="px-4 py-2 relative">
                  <div className="w-full px-2 py-1 text-sm text-zinc-400 font-medium">
                    {newRow.category || <span className="italic opacity-50">Auto-lookup</span>}
                  </div>
                </td>
                <td className="px-4 py-2 relative">
                  <input
                    ref={el => { inputRefs.current["new-subCategory"] = el; }}
                    type="text"
                    placeholder="Sub-cat..."
                    value={newRow.subCategory || ""}
                    onChange={e => {
                      const val = e.target.value;
                      const match = subCategories.find(sc => sc.name.toLowerCase() === val.toLowerCase());
                      setNewRow({ 
                        ...newRow, 
                        subCategory: val,
                        category: match ? match.categoryName : ""
                      });
                      setShowSubCategoryDropdown(true);
                    }}
                    onFocus={() => setShowSubCategoryDropdown(true)}
                    onBlur={() => setTimeout(() => setShowSubCategoryDropdown(false), 200)}
                    onKeyDown={e => handleKeyDown(e, "subCategory", "new")}
                    className="w-full bg-transparent border-none focus:ring-2 focus:ring-blue-500 rounded outline-none px-2 py-1 text-sm"
                  />
                  <AnimatePresence>
                    {showSubCategoryDropdown && filteredSubCategories.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute z-50 left-0 right-0 mt-1 bg-white border border-black/10 rounded-lg shadow-xl max-h-48 overflow-y-auto"
                      >
                        {filteredSubCategories.map(sc => (
                          <button
                            key={sc.name}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setNewRow({ 
                                ...newRow, 
                                subCategory: sc.name,
                                category: sc.categoryName
                              });
                              setShowSubCategoryDropdown(false);
                            }}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-zinc-50 transition-colors flex justify-between items-center"
                          >
                            <span>{sc.name}</span>
                            <span className="text-[10px] text-zinc-400 uppercase tracking-wider">{sc.categoryName}</span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </td>
                <td className="px-4 py-2 relative">
                  <input
                    ref={el => { inputRefs.current["new-vendor"] = el; }}
                    type="text"
                    placeholder="Vendor..."
                    value={newRow.vendor}
                    onChange={e => {
                      setNewRow({ ...newRow, vendor: e.target.value });
                      setShowVendorDropdown(true);
                    }}
                    onFocus={() => setShowVendorDropdown(true)}
                    onBlur={() => setTimeout(() => setShowVendorDropdown(false), 200)}
                    onKeyDown={e => handleKeyDown(e, "vendor", "new")}
                    className="w-full bg-transparent border-none focus:ring-2 focus:ring-blue-500 rounded outline-none px-2 py-1 text-sm"
                  />
                  <AnimatePresence>
                    {showVendorDropdown && filteredVendors.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute z-50 left-0 right-0 mt-1 bg-white border border-black/10 rounded-lg shadow-xl max-h-48 overflow-y-auto"
                      >
                        {filteredVendors.map(v => (
                          <button
                            key={v}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setNewRow({ ...newRow, vendor: v });
                              setShowVendorDropdown(false);
                            }}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-zinc-50 transition-colors"
                          >
                            {v}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </td>
                <td className="px-4 py-2">
                  <input
                    ref={el => { inputRefs.current["new-description"] = el; }}
                    type="text"
                    placeholder="What did you buy?"
                    value={newRow.description}
                    onChange={e => setNewRow({ ...newRow, description: e.target.value })}
                    onKeyDown={e => handleKeyDown(e, "description", "new")}
                    className="w-full bg-transparent border-none focus:ring-2 focus:ring-blue-500 rounded outline-none px-2 py-1 text-sm"
                  />
                </td>
                <td className="px-4 py-2 text-right">
                  <input
                    ref={el => { inputRefs.current["new-multiplier"] = el; }}
                    type="number"
                    step="0.0001"
                    value={newRow.multiplier}
                    onChange={e => setNewRow({ ...newRow, multiplier: parseFloat(e.target.value) || 1 })}
                    onKeyDown={e => handleKeyDown(e, "multiplier", "new")}
                    className="w-full bg-transparent border-none focus:ring-2 focus:ring-blue-500 rounded outline-none px-2 py-1 text-sm text-right"
                  />
                </td>
                <td className="px-4 py-2 text-right">
                  <ExpressionInput
                    inputRef={el => { inputRefs.current["new-amount"] = el; }}
                    value={newRow.amount}
                    onValueChange={val => setNewRow({ ...newRow, amount: val })}
                    onKeyDown={e => handleKeyDown(e, "amount", "new")}
                    className="text-right text-sm"
                  />
                </td>
                <td className="px-4 py-2">
                  <button
                    onClick={() => handleSubmit()}
                    className="p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                  >
                    <Plus size={16} />
                  </button>
                </td>
              </tr>

              {/* Existing Rows */}
              <AnimatePresence mode="popLayout">
                {monthTransactions.map((t, idx) => (
                  <motion.tr
                    key={t.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="hover:bg-zinc-50/80 group transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-zinc-600 font-mono">
                      {t.date}
                    </td>
                    <td className="px-4 py-3">
                      <span 
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{ 
                          backgroundColor: `${t.categoryColor}15`, 
                          color: t.categoryColor,
                          border: `1px solid ${t.categoryColor}30`
                        }}
                      >
                        {t.category}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {t.subCategory && (
                        <span 
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium"
                          style={{ 
                            backgroundColor: `${t.categoryColor}10`, 
                            color: t.categoryColor,
                            border: `1px solid ${t.categoryColor}20`
                          }}
                        >
                          {t.subCategory}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-900">
                      {t.vendor || <span className="text-zinc-400 italic">No vendor</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-900">
                      {t.description || <span className="text-zinc-400 italic">No description</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-zinc-500">
                      {t.multiplier !== 1 ? `x${t.multiplier}` : ""}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-zinc-900">
                      £{(t.amount * t.multiplier).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      {t.multiplier !== 1 && (
                        <div className="text-[10px] text-zinc-400 font-normal">
                          Base: £{t.amount.toLocaleString()}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => onDelete(t.id)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
          {monthTransactions.length === 0 && (
            <div className="py-12 text-center text-zinc-400">
              <p className="text-sm">No transactions for this month yet. Start logging above!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
