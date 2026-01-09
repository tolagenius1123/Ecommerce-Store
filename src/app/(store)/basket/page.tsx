"use client";

import { SignInButton, useAuth, useUser } from "@clerk/nextjs";
import { useBasketStore } from "../../../../store/store";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AddToBasketButton from "@/components/shared/AddToBasketButton";
import Image from "next/image";
import { imageUrl } from "@/lib/imageUrl";
import Loader from "@/components/shared/Loader";
import {
	createPaystackCheckoutSession,
	Metadata,
} from "@/actions/createPaystackCheckoutSession";

const BasketPage = () => {
	const groupedItems = useBasketStore((state) => state.getGroupedItems());
	const { isSignedIn } = useAuth();
	const { user } = useUser();
	const router = useRouter();

	const [isClient, setIsClient] = useState(false);
	const [isLoading, setIsLoading] = useState(false);

	// Guest checkout form state
	const [guestName, setGuestName] = useState("");
	const [guestEmail, setGuestEmail] = useState("");
	const [showGuestForm, setShowGuestForm] = useState(false);
	const [formErrors, setFormErrors] = useState({ name: "", email: "" });

	useEffect(() => {
		setIsClient(true);
	}, []);

	if (!isClient) {
		return <Loader />;
	}

	if (groupedItems.length === 0) {
		return (
			<div className="container mx-auto p-4 flex flex-col items-center justify-center min-h-[50vh]">
				<h1 className="text-2xl font-bold mb-6 text-gray-800">
					Your Basket
				</h1>
				<p className="text-gray-600 text-lg ">Your basket is empty.</p>
			</div>
		);
	}

	// Validate guest form
	const validateGuestForm = () => {
		const errors = { name: "", email: "" };
		let isValid = true;

		if (!guestName.trim()) {
			errors.name = "Name is required";
			isValid = false;
		}

		if (!guestEmail.trim()) {
			errors.email = "Email is required";
			isValid = false;
		} else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) {
			errors.email = "Please enter a valid email";
			isValid = false;
		}

		setFormErrors(errors);
		return isValid;
	};

	const handleCheckout = async () => {
		// If user is not signed in and guest form is not filled, show the form
		if (!isSignedIn && !showGuestForm) {
			setShowGuestForm(true);
			return;
		}

		// Validate guest form if user is not signed in
		if (!isSignedIn && !validateGuestForm()) {
			return;
		}

		setIsLoading(true);

		try {
			const metadata: Metadata = {
				orderNumber: crypto.randomUUID(),
				customerName: isSignedIn
					? (user?.fullName ?? "Unknown")
					: guestName,
				customerEmail: isSignedIn
					? (user?.emailAddresses[0].emailAddress ?? "Unknown")
					: guestEmail,
				clerkUserId: isSignedIn ? user!.id : "guest",
			};

			const result = await createPaystackCheckoutSession(
				groupedItems,
				metadata
			);

			if (result?.authorizationUrl) {
				window.location.href = result.authorizationUrl;
			}
		} catch (error) {
			console.error(error);
			alert("Failed to initiate checkout. Please try again.");
		} finally {
			setIsLoading(false);
		}
	};

	// Calculate total in Naira
	const totalInNaira = useBasketStore.getState().getTotalPrice();

	return (
		<div className="container mx-auto p-4 max-w-6xl">
			<h1 className="text-2xl font-bold mb-4">Your Basket</h1>
			<div className="flex flex-col lg:flex-row gap-8">
				<div className="flex-grow">
					{groupedItems.map((item) => (
						<div
							key={item.product._id}
							className="mb-4 p-4 border rounded flex items-center justify-between"
						>
							<div
								className="flex items-center cursor-pointer flex-1 min-w-0"
								onClick={() =>
									router.push(
										`/product/${item.product.slug?.current}`
									)
								}
							>
								<div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 mr-4">
									{item.product.image && (
										<Image
											src={imageUrl(
												item.product.image
											).url()}
											alt={
												item.product.name ??
												"product_image"
											}
											className="w-full h-full object-cover rounded"
											width={96}
											height={96}
										/>
									)}
								</div>
								<div className="min-w-0">
									<div className="text-lg sm:text-xl font-semibold truncate">
										{item.product.name}
									</div>
									<p className="text-sm sm:text-base">
										Price: ₦
										{(
											(item.product.price ?? 0) *
											item.quantity
										).toFixed(2)}
									</p>
								</div>
							</div>

							<div className="flex items-center ml-4 flex-shrink-0">
								<AddToBasketButton product={item.product} />
							</div>
						</div>
					))}
				</div>

				<div className="w-full lg:w-80 lg:sticky lg:top-4 h-fit bg-white p-6 border rounded order-first lg:order-last fixed bottom-0 left-0 lg:left-auto">
					<h3 className="text-xl font-semibold">Order Summary</h3>
					<div className="mt-4 space-y-2">
						<p className="flex justify-between">
							<span>Items:</span>
							<span>
								{groupedItems.reduce(
									(total, item) => total + item.quantity,
									0
								)}
							</span>
						</p>
						<p className="flex justify-between text-2xl font-bold border-t pt-2">
							<span>Total:</span>
							<span>₦{totalInNaira.toFixed(2)}</span>
						</p>
					</div>

					{/* Guest Checkout Form */}
					{!isSignedIn && showGuestForm && (
						<div className="mt-4 space-y-3 border-t pt-4">
							<h4 className="font-semibold text-sm">
								Guest Checkout
							</h4>
							<div>
								<input
									type="text"
									placeholder="Full Name"
									value={guestName}
									onChange={(e) =>
										setGuestName(e.target.value)
									}
									className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
								/>
								{formErrors.name && (
									<p className="text-red-500 text-xs mt-1">
										{formErrors.name}
									</p>
								)}
							</div>
							<div>
								<input
									type="email"
									placeholder="Email Address"
									value={guestEmail}
									onChange={(e) =>
										setGuestEmail(e.target.value)
									}
									className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
								/>
								{formErrors.email && (
									<p className="text-red-500 text-xs mt-1">
										{formErrors.email}
									</p>
								)}
							</div>
						</div>
					)}

					{/* Checkout Button */}
					<button
						onClick={handleCheckout}
						disabled={isLoading}
						className="mt-4 w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400 cursor-pointer"
					>
						{isLoading
							? "Processing..."
							: showGuestForm && !isSignedIn
								? "Continue to Payment"
								: "Checkout"}
					</button>

					{/* Sign In Option for Guests */}
					{!isSignedIn && (
						<div className="mt-3 text-center">
							<p className="text-sm text-gray-600 mb-2">
								Already have an account?
							</p>
							<SignInButton mode="modal">
								<button className="text-blue-500 text-sm hover:underline">
									Sign in for faster checkout
								</button>
							</SignInButton>
						</div>
					)}
				</div>
				<div className="h-64 lg:h-0"></div>
			</div>
		</div>
	);
};

export default BasketPage;
