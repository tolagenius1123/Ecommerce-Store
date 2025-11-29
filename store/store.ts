import { Product } from "../sanity.types";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface BasketItem {
	product: Product;
	quantity: number;
}

interface BasketState {
	items: BasketItem[];
	addItem: (product: Product) => void;
	removeItem: (productId: string) => void;
	clearBasket: () => void;
	getTotalPrice: () => number;
	getItemCount: (productId: string) => number;
	getGroupedItems: () => BasketItem[];
}

export const useBasketStore = create<BasketState>()(
	persist(
		(set, get) => ({
			items: [],

			addItem: (product) =>
				set((state) => {
					const existingItem = state.items.find(
						(item) => item.product._id === product._id
					);

					if (existingItem) {
						return {
							items: state.items.map((item) =>
								item.product._id === product._id
									? { ...item, quantity: item.quantity + 1 }
									: item
							),
						};
					} else {
						return {
							items: [...state.items, { product, quantity: 1 }],
						};
					}
				}),

			removeItem: (productId) =>
				set((state) => {
					const existingItem = state.items.find(
						(item) => item.product._id === productId
					);

					if (!existingItem) {
						return state;
					}

					if (existingItem.quantity > 1) {
						return {
							items: state.items.map((item) =>
								item.product._id === productId
									? { ...item, quantity: item.quantity - 1 }
									: item
							),
						};
					} else {
						return {
							items: state.items.filter(
								(item) => item.product._id !== productId
							),
						};
					}
				}),

			clearBasket: () => set({ items: [] }),

			getTotalPrice: () => {
				return get().items.reduce(
					(total, item) =>
						total + (item.product.price || 0) * item.quantity,
					0
				);
			},

			getItemCount: (productId) => {
				const item = get().items.find(
					(i) => i.product._id === productId
				);
				return item ? item.quantity : 0;
			},

			getGroupedItems: () => get().items,
		}),
		{
			name: "basket-store",
			partialize: (state) => ({ items: state.items }),
		}
	)
);
