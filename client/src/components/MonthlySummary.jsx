// MonthlySummary.jsx
import axios from "axios";

// This function now expects year, month, and userList as arguments
export async function getMonthlySummary(year, month, userList) { // <-- Added userList
    try {
        const url = import.meta.env.VITE_API_URL;

        if (!year || !month || isNaN(parseInt(year)) || isNaN(parseInt(month))) {
            console.error("getMonthlySummary: Invalid year or month provided.", { year, month });
            return [];
        }

        const [entriesRes, milkRatesRes] = await Promise.all([
            // Use the correct endpoint as per your backend route setup
            // This assumes you have `router.get("/monthly/:year/:month", ...)` in entry.router.js
            axios.get(`${url}/entries/${year}/${month}`),
            axios.get(`${url}/milkrates`)
        ]);

        const entries = entriesRes.data || [];
        let milkRates = milkRatesRes.data || [];

        const summaryMap = {};

        milkRates.sort((a, b) => {
            const dateA = new Date(a.from);
            const dateB = new Date(b.from);
            if (isNaN(dateA.getTime())) return 1;
            if (isNaN(dateB.getTime())) return -1;
            return dateA - dateB;
        });

        entries.forEach((entry) => {
            const delivered = parseFloat(entry.delivered_qty);
            if (isNaN(delivered)) return;

            const entryDateStr = entry.date;
            if (!entryDateStr) return;
            const entryDate = new Date(entryDateStr);
            if (isNaN(entryDate.getTime())) return;

            const userId = entry.userId;
            // --- CRITICAL CHANGE HERE: Get name from userList ---
            const user = userList.find(u => u._id === userId);
            const name = user ? user.name : 'Unknown User'; // Default to 'Unknown User' if not found
            // --- END CRITICAL CHANGE ---

            let applicableRate = 0;
            let foundRate = null;

            for (let i = 0; i < milkRates.length; i++) {
                const currentRate = milkRates[i];
                const currentRateDate = new Date(currentRate.from);
                if (isNaN(currentRateDate.getTime())) continue;
                if (currentRateDate <= entryDate) {
                    foundRate = currentRate;
                } else break;
            }

            if (foundRate) {
                applicableRate = parseFloat(foundRate.rate) || 0;
                if (isNaN(applicableRate)) {
                    applicableRate = 0;
                }
            }

            const MonthlyAmount = applicableRate * delivered;

            if (!summaryMap[userId]) {
                summaryMap[userId] = {
                    userId,
                    name: name, // Use the name found from userList
                    month: `${year}-${month.toString().padStart(2, '0')}`,
                    totalDelivered: 0,
                    totalMonthlyAmount: 0,
                };
            }

            summaryMap[userId].totalDelivered += delivered;
            summaryMap[userId].totalMonthlyAmount += MonthlyAmount;
        });

        // Ensure names are strings for sorting
        return Object.values(summaryMap).sort((a, b) => {
            const nameA = String(a.name || ''); // Ensure it's a string, even if default
            const nameB = String(b.name || ''); // Ensure it's a string, even if default
            return nameA.localeCompare(nameB);
        });

    } catch (err) {
        console.error("Error in getMonthlySummary:", err);
        return [];
    }
}










