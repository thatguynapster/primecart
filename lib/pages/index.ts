import { format, parse } from "date-fns";
import { Orders } from "../types";

export const chartData = (
  orders?: Orders["data"]
): { name: string; revenue: number; orders: number }[] => {
  if (!orders) return [];

  // Aggregate data by date using reduce

  const dailyData: Record<string, { revenue: number; orders: number }> =
    orders.reduce((acc: any, order: any) => {
      const dateKey = format(order.createdAt!, "MMM dd");
      const orderRevenue = order.amount || 0;

      if (!acc[dateKey]) {
        acc[dateKey] = { revenue: 0, orders: 0 };
      }

      acc[dateKey].revenue += orderRevenue;
      acc[dateKey].orders += 1;

      return acc;
    }, {});

  // Convert the data into the expected return type, sorted by date
  const data = Object.entries(dailyData)
    .map(([dateKey, { revenue, orders }]) => ({
      name: dateKey,
      orders,
      revenue: revenue,
    }))
    .sort((a, b) => {
      // Convert formatted date back to a Date object for proper comparison
      const dateA = parse(a.name, "MMM dd", new Date());
      const dateB = parse(b.name, "MMM dd", new Date());

      return dateA.getTime() - dateB.getTime(); // Sort by the most recent last
    });

  return data;
};
