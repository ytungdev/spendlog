import React, { useState, useEffect, useMemo } from "react";
import { Transaction, TransactionAction, SubCategory, Category } from "./types";
import { TransactionGrid } from "./components/TransactionGrid";
import { Dashboard } from "./components/Dashboard";
import { CategoryManager } from "./components/CategoryManager";
import { LayoutDashboard, List, Wallet, Users, History as HistoryIcon, Settings } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";

import { HistoryView } from "./components/HistoryView";

function Navigation() {
  const location = useLocation();
  const activePath = location.pathname;

  return (
    <div className="flex items-center gap-2 bg-zinc-100 p-1 rounded-xl">
      <Link
        to="/"
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
          activePath === "/" 
            ? "bg-white text-blue-600 shadow-sm" 
            : "text-zinc-500 hover:text-zinc-900"
        }`}
      >
        <LayoutDashboard size={18} />
        Dashboard
      </Link>
      <Link
        to="/transactions"
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
          activePath.startsWith("/transactions")
            ? "bg-white text-blue-600 shadow-sm" 
            : "text-zinc-500 hover:text-zinc-900"
        }`}
      >
        <List size={18} />
        Transactions
      </Link>
      <Link
        to="/history"
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
          activePath === "/history" 
            ? "bg-white text-blue-600 shadow-sm" 
            : "text-zinc-500 hover:text-zinc-900"
        }`}
      >
        <HistoryIcon size={18} />
        History
      </Link>
      <Link
        to="/categories"
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
          activePath === "/categories" 
            ? "bg-white text-blue-600 shadow-sm" 
            : "text-zinc-500 hover:text-zinc-900"
        }`}
      >
        <Settings size={18} />
        Categories
      </Link>
    </div>
  );
}

export default function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategoriesList, setSubCategoriesList] = useState<SubCategory[]>([]);
  const [selectedHistoryMonth, setSelectedHistoryMonth] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const updateCategoryColor = async (name: string, color: string) => {
    try {
      await fetch(`/api/categories/${encodeURIComponent(name)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ color }),
      });
    } catch (err) {
      console.error("Failed to update category color:", err);
    }
  };

  const addSubCategory = async (name: string, categoryName: string) => {
    try {
      await fetch("/api/sub-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, categoryName }),
      });
    } catch (err) {
      console.error("Failed to add sub-category:", err);
    }
  };

  // Current month transactions for the main dashboard
  const currentMonthTransactions = useMemo(() => {
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    return transactions.filter(t => 
      isWithinInterval(new Date(t.date), { start, end })
    );
  }, [transactions]);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tRes, cRes, scRes] = await Promise.all([
          fetch("/api/transactions"),
          fetch("/api/categories"),
          fetch("/api/sub-categories")
        ]);
        
        if (!tRes.ok || !cRes.ok || !scRes.ok) {
          throw new Error("Server error");
        }

        const tData = await tRes.json();
        const cData = await cRes.json();
        const scData = await scRes.json();
        
        setTransactions(Array.isArray(tData) ? tData : []);
        setCategories(Array.isArray(cData) ? cData : []);
        setSubCategoriesList(Array.isArray(scData) ? scData : []);
      } catch (error) {
        console.error("Failed to fetch data", error);
        setTransactions([]);
        setCategories([]);
        setSubCategoriesList([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // WebSocket for real-time sync
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}`);

    ws.onmessage = (event) => {
      const action: TransactionAction = JSON.parse(event.data);
      if (action.type === "TRANSACTION_ADDED") {
        setTransactions(prev => [action.payload, ...prev]);
      } else if (action.type === "TRANSACTION_DELETED") {
        setTransactions(prev => prev.filter(t => t.id !== action.payload));
      } else if (action.type === "CATEGORY_UPDATED") {
        setCategories(prev => prev.map(c => c.name === action.payload.name ? { ...c, color: action.payload.color } : c));
        setTransactions(prev => prev.map(t => t.category === action.payload.name ? { ...t, categoryColor: action.payload.color } : t));
        setSubCategoriesList(prev => prev.map(sc => sc.categoryName === action.payload.name ? { ...sc, categoryColor: action.payload.color } : sc));
      } else if (action.type === "SUB_CATEGORY_ADDED") {
        setSubCategoriesList(prev => [...prev, action.payload]);
      }
    };

    return () => ws.close();
  }, []);

  const handleAddTransaction = async (newT: Omit<Transaction, "id">) => {
    try {
      // Omit category from submission as per user request
      const { category, ...submissionData } = newT;
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submissionData),
      });
      if (!res.ok) throw new Error("Failed to add transaction");
      // WebSocket will handle the state update
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteTransaction = async (id: number) => {
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete transaction");
      // WebSocket will handle the state update
    } catch (error) {
      console.error(error);
    }
  };

  const vendors = useMemo(() => {
    const vSet = new Set<string>();
    transactions.forEach(t => {
      if (t.vendor) vSet.add(t.vendor);
    });
    return Array.from(vSet).sort();
  }, [transactions]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-500 font-medium animate-pulse">Syncing family budget...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans selection:bg-blue-100">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-black/5 px-6 py-4">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                <Wallet size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">spendlog</h1>
                <div className="flex items-center gap-2 text-xs text-zinc-500 font-medium">
                  <Users size={12} />
                  <span>Shared with Family</span>
                  <span className="w-1 h-1 bg-zinc-300 rounded-full" />
                  <span className="text-emerald-600">Live Sync Active</span>
                </div>
              </div>
            </div>

            <Navigation />
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-8">
          <Routes>
            <Route path="/" element={<Dashboard transactions={transactions} categories={categories} />} />
            <Route path="/transactions" element={
              <TransactionGrid 
                transactions={transactions} 
                categories={categories}
                subCategories={subCategoriesList}
                vendors={vendors}
                onAdd={handleAddTransaction}
                onDelete={handleDeleteTransaction}
              />
            } />
            <Route path="/history" element={
              <HistoryView 
                transactions={transactions} 
                categories={categories}
                selectedMonth={selectedHistoryMonth}
                onSelectMonth={setSelectedHistoryMonth}
              />
            } />
            <Route path="/categories" element={
              <CategoryManager 
                categories={categories}
                subCategories={subCategoriesList}
                onUpdateCategoryColor={updateCategoryColor}
                onAddSubCategory={addSubCategory}
              />
            } />
          </Routes>
        </main>

        {/* Footer / Info */}
        <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-black/5">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 text-zinc-400 text-sm">
            <p>© 2026 spendlog. All transactions are synced in real-time.</p>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-zinc-100 border border-zinc-200 rounded text-[10px] font-bold text-zinc-500">ENTER</kbd>
                <span>Save Row</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-zinc-100 border border-zinc-200 rounded text-[10px] font-bold text-zinc-500">=</kbd>
                <span>Calculate</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  );
}
