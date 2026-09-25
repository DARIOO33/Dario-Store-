// Business rules for the admin dashboard numbers. Called from server actions and server components;
// the database is only reached through the repositories in src/prisma.

import { OrderRepository, ORDER_STATUSES, REVENUE_STATUSES, type OrderStatus } from "../prisma/orders";
import { ProductRepository } from "../prisma/products";
import { LOW_STOCK_THRESHOLD } from "../lib/store";
import { dayKey, daysAgo } from "../lib/time";

const CHART_DAYS = 7;

export const StatsService = {
  overview: async () => {
    const [revenueMillimes, orderCount, productCount, lowStock, recentOrders, weekOrders, ...statusCounts] =
      await Promise.all([
        OrderRepository.sumRevenue(),
        OrderRepository.count(),
        ProductRepository.countAll(),
        ProductRepository.findLowStock(LOW_STOCK_THRESHOLD),
        OrderRepository.findMany(undefined, 6, 0),
        OrderRepository.findSince(daysAgo(CHART_DAYS)),
        ...ORDER_STATUSES.map((status) => OrderRepository.count(status)),
      ]);

    const byStatus = Object.fromEntries(ORDER_STATUSES.map((status, i) => [status, statusCounts[i]!])) as Record<
      OrderStatus,
      number
    >;

    // One bar per day for the last week, oldest first, including empty days.
    const perDay = new Map<string, { millimes: number; orders: number }>();
    for (const order of weekOrders) {
      if (order.status === "CANCELLED") continue;
      const key = dayKey(order.createdAt);
      const day = perDay.get(key) ?? { millimes: 0, orders: 0 };
      day.orders += 1;
      if (REVENUE_STATUSES.includes(order.status)) day.millimes += order.totalMillimes;
      perDay.set(key, day);
    }

    const today = Temporal.Now.plainDateISO();
    const chart = Array.from({ length: CHART_DAYS }, (_, i) => {
      const date = today.subtract({ days: CHART_DAYS - 1 - i });
      const key = date.toString();
      return { key, label: date.toLocaleString("en-GB", { weekday: "short" }), ...(perDay.get(key) ?? { millimes: 0, orders: 0 }) };
    });

    return { revenueMillimes, orderCount, productCount, byStatus, lowStock, recentOrders, chart };
  },
};
