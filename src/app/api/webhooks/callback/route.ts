import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
	const searchParams = req.nextUrl.searchParams;
	const reference = searchParams.get("reference");

	if (!reference) {
		return NextResponse.redirect(
			new URL("/basket?error=no_reference", req.url)
		);
	}

	try {
		// Verify the transaction using Paystack API
		const response = await fetch(
			`https://api.paystack.co/transaction/verify/${reference}`,
			{
				method: "GET",
				headers: {
					Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
				},
			}
		);

		const data = await response.json();

		if (data.status && data.data.status === "success") {
			const orderNumber = data.data.metadata.orderNumber;

			// Redirect to success page
			return NextResponse.redirect(
				new URL(
					`/success?reference=${reference}&orderNumber=${orderNumber}`,
					req.url
				)
			);
		} else {
			// Payment failed or was cancelled
			return NextResponse.redirect(
				new URL("/basket?error=payment_failed", req.url)
			);
		}
	} catch (error) {
		console.error("Error verifying transaction:", error);
		return NextResponse.redirect(
			new URL("/basket?error=verification_failed", req.url)
		);
	}
}
