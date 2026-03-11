import React, { useMemo } from "react";
import { Transaction, Category } from "../types";
import { format, parseISO, startOfMonth } from "date-fns";
import { ChevronRight, Calendar, ArrowRight } from "lucide-react";
import { Dashboard } from "./Dashboard";
import { motion, AnimatePresence } from "motion/react";

interface HistoryViewProps {
  transactions: Transaction[];
  categories: Category[];
  selectedMonth: string | null;
  onSelectMonth: (month: string | null) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ 
  transactions, 
  categories,
  selectedMonth, 
  onSelectMonth 
}) => {
  const months = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    
    transactions.forEach(t => {
      const monthKey = format(parseISO(t.date), "yyyy-MM");
      if (!groups[monthKey]) groups[monthKey] = [];
      groups[monthKey].push(t);
    });

    return Object.entries(groups)
      .map(([key, data]) => ({
        key,
        label: format(parseISO(`${key}-01`), "yyyy-MM-dd"),
        count: data.length,
        total: data.reduce((sum, t) => sum + (t.amount * (t.multiplier || 1)), 0),
        transactions: data
      }))
      .sort((a, b) => b.key.localeCompare(a.key));
  }, [transactions]);

  if (selectedMonth) {
    const monthData = months.find(m => m.key === selectedMonth);
    if (!monthData) return null;

    return (
      <div className="space-y-6">
        <button 
          onClick={() => onSelectMonth(null)}
          className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
        >
          <ArrowRight size={16} className="rotate-180" />
          Back to History List
        </button>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-zinc-900">{monthData.label} Analysis</h2>
          <div className="px-3 py-1 bg-zinc-100 rounded-full text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Archived Data
          </div>
        </div>
        <Dashboard 
          transactions={transactions} 
          categories={categories}
          baseDate={parseISO(`${selectedMonth}-01`)} 
        />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {months.map((month) => (
        <motion.button
          key={month.key}
          whileHover={{ y: -4 }}
          onClick={() => onSelectMonth(month.key)}
          className="bg-white p-6 rounded-2xl shadow-sm border border-black/5 text-left group transition-all hover:shadow-md"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-zinc-50 text-zinc-400 rounded-lg group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
              <Calendar size={20} />
            </div>
            <ChevronRight size={18} className="text-zinc-300 group-hover:text-blue-600 transition-colors" />
          </div>
          <h3 className="text-lg font-bold text-zinc-900 mb-1">{month.label}</h3>
          <div className="flex items-center gap-3 text-sm text-zinc-500">
            <span>{month.count} transactions</span>
            <span className="w-1 h-1 bg-zinc-300 rounded-full" />
            <span className="font-semibold text-zinc-900">£{month.total.toLocaleString()}</span>
          </div>
        </motion.button>
      ))}
      {months.length === 0 && (
        <div className="col-span-full py-20 text-center">
          <div className="inline-flex p-4 bg-zinc-100 rounded-full text-zinc-400 mb-4">
            <Calendar size={32} />
          </div>
          <p className="text-zinc-500 font-medium">No historical data found yet.</p>
        </div>
      )}
    </div>
  );
};
