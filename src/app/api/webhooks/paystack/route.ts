import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import crypto from "crypto";
import { backendClient } from "@/sanity/lib/backend-client";

export async function POST(req: NextRequest) {
	const body = await req.text();
	const headersList = await headers();
	const paystackSignature = headersList.get("x-paystack-signature");

	if (!paystackSignature) {
		return NextResponse.json({ error: "No signature" }, { status: 400 });
	}

	const webhookSecret = process.env.PAYSTACK_WEBHOOK_SECRET;

	if (!webhookSecret) {
		console.log("Paystack webhook secret is not set");
		return NextResponse.json(
			{ error: "Paystack webhook secret is not set" },
			{ status: 400 }
		);
	}

	// Verify webhook signature
	const hash = crypto
		.createHmac("sha512", webhookSecret)
		.update(body)
		.digest("hex");

	if (hash !== paystackSignature) {
		console.error("Webhook signature verification failed");
		return NextResponse.json(
			{ error: "Invalid signature" },
			{ status: 400 }
		);
	}

	let event;
	try {
		event = JSON.parse(body);
	} catch (err) {
		console.error("Error parsing webhook body", err);
		return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
	}

	// Handle charge.success event
	if (event.event === "charge.success") {
		const transaction = event.data;

		try {
			// Verify transaction with Paystack API
			const verifyResponse = await fetch(
				`https://api.paystack.co/transaction/verify/${transaction.reference}`,
				{
					method: "GET",
					headers: {
						Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
					},
				}
			);

			const verifyData = await verifyResponse.json();

			if (verifyData.status && verifyData.data.status === "success") {
				const order = await createOrderInSanity(verifyData.data);
				console.log("Order created in Sanity", order);
			}
		} catch (err) {
			console.log("Error creating order in Sanity", err);
			return NextResponse.json(
				{ error: "Error creating order" },
				{ status: 500 }
			);
		}
	}

	return NextResponse.json({ received: true });
}

// async function createOrderInSanity(transaction: any) {
// 	const { reference, amount, currency, metadata, customer } = transaction;

// 	const {
// 		orderNumber,
// 		customerName,
// 		customerEmail,
// 		clerkUserId,
// 		cart_items,
// 	} = metadata;

// 	const sanityProducts = cart_items.map((item: any) => ({
// 		_key: crypto.randomUUID(),
// 		product: {
// 			_type: "reference",
// 			_ref: item.product_id,
// 		},
// 		quantity: item.quantity || 0,
// 	}));

// 	const order = await backendClient.create({
// 		_type: "order",
// 		orderNumber,
// 		paystackReference: reference,
// 		paystackCustomerId: customer?.customer_code || null,
// 		customerName,
// 		clerkUserId: clerkUserId,
// 		email: customerEmail,
// 		currency: currency.toUpperCase(),
// 		amountDiscount: 0,
// 		products: sanityProducts,
// 		totalPrice: amount / 100,
// 		status: "paid",
// 		orderDate: new Date().toISOString(),
// 	});

// 	return order;
// }

type PaystackCartItem = {
	product_id: string;
	quantity: number;
};

type PaystackMetadata = {
	orderNumber: string;
	customerName: string;
	customerEmail: string;
	clerkUserId?: string;
	cart_items: PaystackCartItem[];
};

type PaystackTransaction = {
	reference: string;
	amount: number;
	currency: string;
	metadata: PaystackMetadata;
	customer?: {
		customer_code?: string;
	};
};

async function createOrderInSanity(transaction: PaystackTransaction) {
	const { reference, amount, currency, metadata, customer } = transaction;

	const {
		orderNumber,
		customerName,
		customerEmail,
		clerkUserId,
		cart_items,
	} = metadata;

	const sanityProducts = cart_items.map((item) => ({
		_key: crypto.randomUUID(),
		product: {
			_type: "reference",
			_ref: item.product_id,
		},
		quantity: item.quantity || 0,
	}));

	const order = await backendClient.create({
		_type: "order",
		orderNumber,
		paystackReference: reference,
		paystackCustomerId: customer?.customer_code || null,
		customerName,
		clerkUserId,
		email: customerEmail,
		currency: currency.toUpperCase(),
		amountDiscount: 0,
		products: sanityProducts,
		totalPrice: amount / 100,
		status: "paid",
		orderDate: new Date().toISOString(),
	});

	return order;
}
