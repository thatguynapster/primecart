import { format } from "date-fns";
import { Orders } from "../types";

export const chartData = (
  orders?: Orders["data"]
): { name: string; revenue: number; orders: number }[] => {
  if (!orders) return [];

  // Aggregate data by date using reduce
  const dailyData: Record<string, number>[] = orders.reduce(
    (acc: any, order: any) => {
      const dateKey = format(order.createdAt!, "MMM dd");
      const orderRevenue = order.amount || 0;

      if (!acc[dateKey]) {
        acc[dateKey] = { revenue: 0, orders: 0 };
      }

      acc[dateKey].revenue += orderRevenue;
      acc[dateKey].orders += 1;

      return acc;
    },
    []
  );

  // Convert the data into the expected return type
  const data = Object.entries(dailyData).map(
    ([dateKey, { revenue, orders }]) => ({
      name: dateKey,
      orders,
      revenue: revenue,
    })
  );

  return data;
};
