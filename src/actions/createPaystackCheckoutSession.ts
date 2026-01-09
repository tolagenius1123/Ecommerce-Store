"use server";

import { BasketItem } from "../../store/store";

export type Metadata = {
	orderNumber: string;
	customerName: string;
	customerEmail: string;
	clerkUserId: string;
};

export type GroupedBasketItem = {
	product: BasketItem["product"];
	quantity: number;
};

export async function createPaystackCheckoutSession(
	items: GroupedBasketItem[],
	metadata: Metadata
) {
	try {
		const itemsWithoutPrice = items.filter((item) => !item.product.price);
		if (itemsWithoutPrice.length > 0) {
			throw new Error("Some items do not have a price");
		}

		const totalAmount = items.reduce(
			(total, item) => total + item.product.price! * item.quantity * 100,
			0
		);

		const baseUrl =
			process.env.NODE_ENV === "production"
				? `https://${process.env.VERCEL_URL}`
				: `${process.env.NEXT_PUBLIC_BASE_URL}`;

		const callbackUrl = `${baseUrl}/api/webhooks/callback`;

		// Generate a unique reference
		const reference = `ref_${Date.now()}_${Math.random().toString(36).substring(7)}`;

		const response = await fetch(
			"https://api.paystack.co/transaction/initialize",
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					email: metadata.customerEmail,
					amount: Math.round(totalAmount),
					reference: reference,
					currency: "NGN",
					callback_url: callbackUrl,
					metadata: {
						orderNumber: metadata.orderNumber,
						customerName: metadata.customerName,
						customerEmail: metadata.customerEmail,
						clerkUserId: metadata.clerkUserId,
						cart_items: items.map((item) => ({
							product_id: item.product._id,
							product_name: item.product.name,
							quantity: item.quantity,
							price: item.product.price,
						})),
					},
					channels: [
						"card",
						"bank",
						"ussd",
						"qr",
						"mobile_money",
						"bank_transfer",
					],
				}),
			}
		);

		const data = await response.json();

		if (data.status && data.data) {
			return {
				authorizationUrl: data.data.authorization_url,
				reference: data.data.reference,
			};
		}

		throw new Error(
			data.message || "Failed to initialize Paystack transaction"
		);
	} catch (error) {
		console.error("Error creating Paystack checkout session", error);
		throw error;
	}
}
