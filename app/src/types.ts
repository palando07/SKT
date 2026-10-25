export type ItemStatus = "active" | "eaten" | "trashed";

export interface Item {
  id: string;
  name: string;
  qty: string;
  price: number | null;
  expires: string; // YYYY-AA-GG
  added: string;
  status: ItemStatus;
}

export interface Recipe {
  title: string;
  time: string;
  uses: string[];
  missing: string[];
  steps: string[];
}
