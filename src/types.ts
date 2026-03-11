export interface Category {
  name: string;
  color: string;
}

export interface SubCategory {
  name: string;
  categoryName: string;
  categoryColor?: string;
}

export interface Transaction {
  id: number;
  date: string;
  category?: string;
  categoryColor?: string;
  subCategory: string;
  vendor: string;
  description?: string;
  amount: number;
  multiplier: number;
  createdAt?: string;
}

export type TransactionAction = 
  | { type: "TRANSACTION_ADDED"; payload: Transaction }
  | { type: "TRANSACTION_DELETED"; payload: number }
  | { type: "CATEGORY_UPDATED"; payload: { name: string; color: string } }
  | { type: "SUB_CATEGORY_ADDED"; payload: SubCategory };
