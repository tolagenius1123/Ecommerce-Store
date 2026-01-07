import { getMyOrders } from "@/sanity/lib/orders/getMyOrders";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

async function Orders() {
	const { userId } = await auth();

	if (!userId) {
		redirect("/");
	}

	const orders = await getMyOrders(userId);

	return (
		<div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
			<div className="bg-white p-4 sm:p-8 rounded-xl shadow-lg w-full max-w-4xl">
				<h1 className="text-4xl font-bold text-gray-900 tracking-tight mb-8">
					My Orders
				</h1>

				{orders?.length === 0 ? (
					<div className="text-center text-gray-600">
						<p>You have not placed any orders yet.</p>
					</div>
				) : (
					<div className="space-y-6  sm:space-y-8">
						{orders.map((order) => (
							<div
								key={order.orderNumber}
								className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden"
							>
								<div className="p-4 sm:p-6 border-b border-gray-200">
									<div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mb-4">
										<div className="">
											<p className="text-sm text-gray-600 mb-1 font-bold">
												Order Number
											</p>
											<p className="font-mono text-sm text-green-600 break-all">
												{order.orderNumber}
											</p>
										</div>
										<div className="sm:text-right">
											<p className="text-sm text-gray-600 mb-1">
												Order Date
											</p>
											<p className="font-medium">
												{order.orderDate
													? new Date(
															order.orderDate
														).toLocaleDateString()
													: "N/A"}
											</p>
										</div>
									</div>
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}

export default Orders;
