export interface PantryItem {
  amount: number | null;
  unit: string;
}

export interface ShoppingConfig {
  aisleByIngredient: Record<string, string>;
  pantryByIngredient: Record<string, PantryItem>;
}

export interface ShoppingListItem {
  name: string;
  quantityText: string;
}

export interface ShoppingCategory {
  category: string;
  items: ShoppingListItem[];
}
