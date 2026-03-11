import React, { useMemo } from "react";
import { Transaction, Category } from "../types";
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid 
} from "recharts";
import { TrendingUp, PoundSterling, PieChart as PieChartIcon, Calendar, Filter, BarChart3 } from "lucide-react";
import { subMonths, isWithinInterval, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, format, parseISO } from "date-fns";

interface DashboardProps {
  transactions: Transaction[];
  categories: Category[]; // Added categories prop
  baseDate?: Date;
}

export const Dashboard: React.FC<DashboardProps> = ({ transactions, categories, baseDate = new Date() }) => {
  const [selectedCategory, setSelectedCategory] = React.useState<string>("All");

  const stats = useMemo(() => {
    // 1. Filter transactions by category if selected
    const filteredTransactions = selectedCategory === "All" 
      ? transactions 
      : transactions.filter(t => t.category === selectedCategory);

    // 2. Current Month Stats (based on baseDate)
    const monthStart = startOfMonth(baseDate);
    const monthEnd = endOfMonth(baseDate);
    
    const currentMonthTransactions = filteredTransactions.filter(t => 
      isWithinInterval(parseISO(t.date), { start: monthStart, end: monthEnd })
    );

    const total = currentMonthTransactions.reduce((sum: number, t: Transaction) => sum + (t.amount * (t.multiplier || 1)), 0);
    
    // Category Breakdown (for the current month)
    const categoryMap = currentMonthTransactions.reduce((acc: Record<string, { value: number; color: string }>, t: Transaction) => {
      const cat = t.category || "Uncategorized";
      const color = t.categoryColor || "#71717A";
      if (!acc[cat]) {
        acc[cat] = { value: 0, color };
      }
      acc[cat].value += (t.amount * (t.multiplier || 1));
      return acc;
    }, {} as Record<string, { value: number; color: string }>);

    const categoryData = Object.entries(categoryMap)
      .map(([name, data]) => ({ name, value: data.value, color: data.color }))
      .sort((a, b) => b.value - a.value);

    // Sub-category Breakdown (for the current month)
    const subCategoryMap = currentMonthTransactions.reduce((acc: Record<string, { value: number; color: string }>, t: Transaction) => {
      const sub = t.subCategory || "Uncategorized";
      const color = t.categoryColor || "#71717A";
      if (!acc[sub]) {
        acc[sub] = { value: 0, color };
      }
      acc[sub].value += (t.amount * (t.multiplier || 1));
      return acc;
    }, {} as Record<string, { value: number; color: string }>);
    
    const subCategoryData = Object.entries(subCategoryMap)
      .map(([name, data]) => ({ name, value: data.value, color: data.color }))
      .sort((a, b) => b.value - a.value);

    // Daily Trend (Current Month)
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const dailyData = days.map(day => {
      const dayTotal = currentMonthTransactions
        .filter(t => isSameDay(parseISO(t.date), day))
        .reduce((sum: number, t: Transaction) => sum + (t.amount * (t.multiplier || 1)), 0);
      return {
        date: format(day, "dd"),
        amount: dayTotal,
      };
    });

    // 3. Monthly Trend (Last 6 Months)
    const monthlyTrendData = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(baseDate, i);
      const mStart = startOfMonth(d);
      const mEnd = endOfMonth(d);
      
      const mTotal = filteredTransactions
        .filter(t => isWithinInterval(parseISO(t.date), { start: mStart, end: mEnd }))
        .reduce((sum: number, t: Transaction) => sum + (t.amount * (t.multiplier || 1)), 0);
      
      monthlyTrendData.push({
        month: format(d, "MMM"),
        amount: mTotal,
      });
    }

    return { 
      total, 
      categoryData, 
      subCategoryData, 
      dailyData, 
      monthlyTrendData,
      transactionCount: currentMonthTransactions.length,
      isFiltered: selectedCategory !== "All"
    };
  }, [transactions, baseDate, selectedCategory]);

  return (
    <div className="space-y-6">
      {/* Dashboard Header with Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl shadow-sm border border-black/5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
            <Filter size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-900">Dashboard Overview</h2>
            <p className="text-xs text-zinc-500">Real-time spending analysis</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Filter Category:</span>
          <select 
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-zinc-50 border border-black/5 rounded-xl px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer min-w-[160px]"
          >
            <option value="All">All Categories</option>
            {categories.map(cat => (
              <option key={cat.name} value={cat.name}>{cat.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-black/5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <PoundSterling size={20} />
            </div>
            <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wider">Month Total</h3>
          </div>
          <p className="text-3xl font-bold text-zinc-900">
            £{stats.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-black/5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <TrendingUp size={20} />
            </div>
            <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wider">Avg Daily</h3>
          </div>
          <p className="text-3xl font-bold text-zinc-900">
            £{(stats.total / 30).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-black/5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <Calendar size={20} />
            </div>
            <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wider">Month Count</h3>
          </div>
          <p className="text-3xl font-bold text-zinc-900">{stats.transactionCount}</p>
        </div>
      </div>

      {/* Charts Row 1: Breakdown & Daily Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-black/5">
          <div className="flex items-center gap-2 mb-6">
            <PieChartIcon size={18} className="text-zinc-400" />
            <h3 className="text-sm font-semibold text-zinc-700 uppercase tracking-wider">
              {stats.isFiltered ? `Sub-categories: ${selectedCategory}` : "By Category"}
            </h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.isFiltered ? stats.subCategoryData : stats.categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {(stats.isFiltered ? stats.subCategoryData : stats.categoryData).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => `£${value.toLocaleString()}`}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {(stats.isFiltered ? stats.subCategoryData : stats.categoryData).slice(0, 4).map((cat, i) => (
              <div key={cat.name} className="flex items-center gap-2 text-xs text-zinc-600">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                <span className="truncate">{cat.name}</span>
                <span className="ml-auto font-medium">£{cat.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-black/5">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp size={18} className="text-zinc-400" />
            <h3 className="text-sm font-semibold text-zinc-700 uppercase tracking-wider">Daily Spending (Current Month)</h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.dailyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  interval={4}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                />
                <Tooltip 
                  cursor={{ fill: '#f9fafb' }}
                  formatter={(value: number) => `£${value.toLocaleString()}`}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Row 2: Monthly Trend */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-black/5">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 size={18} className="text-zinc-400" />
          <h3 className="text-sm font-semibold text-zinc-700 uppercase tracking-wider">Monthly Trend (Last 6 Months)</h3>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.monthlyTrendData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis 
                dataKey="month" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: '#9ca3af', fontWeight: 500 }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: '#9ca3af' }}
              />
              <Tooltip 
                cursor={{ fill: '#f9fafb' }}
                formatter={(value: number) => `£${value.toLocaleString()}`}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
              <Bar dataKey="amount" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
