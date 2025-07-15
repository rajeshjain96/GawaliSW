// utils/calculateMonthlySummary.js
import axios from "axios";

export async function getMonthlySummary() {
  const res = await axios.get(import.meta.env.VITE_API_URL + "/entries");
  const entries = res.data;
  const summaryMap = {};

  entries.forEach((entry) => {
    if (!entry.delivered_qty || isNaN(entry.delivered_qty)) return;

    const month = entry.date?.substring(0, 7);
    const userId = entry.userId;
    const key = `${userId}_${month}`;
    const delivered = parseFloat(entry.delivered_qty);
    const MonthlyAmount = 60 * delivered;

    if (!summaryMap[key]) {
      summaryMap[key] = {
        userId,
        name: entry.name,
        month,
        totalDelivered: 0,
        totalMonthlyAmount: 0,
      };
    }

    summaryMap[key].totalDelivered += delivered;
    summaryMap[key].totalMonthlyAmount += MonthlyAmount;
  });

  return Object.values(summaryMap).sort((a, b) => a.month.localeCompare(b.month));
}



















// // utils/calculateMonthlySummary.js
// import axios from "axios";

// export async function getMonthlySummary() {
//   const res = await axios.get(import.meta.env.VITE_API_URL + "/entries");
//   const entries = res.data;
//   const summaryMap = {};

//   entries.forEach((entry) => {
//     if (!entry.delivered_qty || isNaN(entry.delivered_qty)) return;

//     const month = entry.date?.substring(0, 7);
//     const userId = entry.userId;
//     const key = `${userId}_${month}`;
//     const delivered = parseFloat(entry.delivered_qty);
//     const MonthlyAmount = 60 * delivered;

//     if (!summaryMap[key]) {
//       summaryMap[key] = {
//         userId,
//         name: entry.name,
//         month,
//         totalDelivered: 0,
//         totalMonthlyAmount: 0,
//       };
//     }

//     summaryMap[key].totalDelivered += delivered;
//     summaryMap[key].totalMonthlyAmount += MonthlyAmount;
//   });

//   return Object.values(summaryMap).sort((a, b) => a.month.localeCompare(b.month));
// }
