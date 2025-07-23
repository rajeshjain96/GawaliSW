import axios from "axios";

export async function getMonthlySummary() {
    
    const [entriesRes, milkRatesRes] = await Promise.all([
        axios.get(import.meta.env.VITE_API_URL + "/entries"),
        axios.get(import.meta.env.VITE_API_URL + "/milkrates")
    ]);

    const entries = entriesRes.data;
    let milkRates = milkRatesRes.data; 

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
        if (isNaN(delivered)) {
            console.warn(`Skipping entry due to non-numeric delivered_qty:`, entry);
            return;
        }

        const entryDateStr = entry.date; 
        if (!entryDateStr) {
            console.warn(`Skipping entry due to missing date:`, entry);
            return; 
        }
        const entryDate = new Date(entryDateStr);
        if (isNaN(entryDate.getTime())) {
            console.warn(`Skipping entry due to invalid date format: ${entryDateStr}`, entry);
            return;
        }


        const month = entryDateStr.substring(0, 7); 
        const userId = entry.userId;
        const key = `${userId}_${month}`; 


        let applicableRate = 0; 
        let foundRate = null;   

        for (let i = 0; i < milkRates.length; i++) {
            const currentRate = milkRates[i];
 
            const currentRateDate = new Date(currentRate.from);

            if (isNaN(currentRateDate.getTime())) {
                console.warn(`Invalid rate date found in milkRates: ${currentRate.from}`, currentRate);
                continue; 
            }

            if (currentRateDate <= entryDate) {
                foundRate = currentRate;
            } else {
               
                break;
            }
        }

        if (foundRate) {
           
            applicableRate = parseFloat(foundRate.rate) || 0;
            if (isNaN(applicableRate)) {
                 console.warn(`Invalid rate value for date: ${entryDateStr}. Found: ${foundRate.rate}. Using rate of 0.`);
                 applicableRate = 0;
            }
        } else {
            console.warn(`No applicable milk rate found for date: ${entryDateStr}. Using rate of 0.`);
            
        }

        const MonthlyAmount = applicableRate * delivered;
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



















// // // utils/calculateMonthlySummary.js
// // import axios from "axios";

// // export async function getMonthlySummary() {
// //   const res = await axios.get(import.meta.env.VITE_API_URL + "/entries");
// //   const entries = res.data;
// //   const summaryMap = {};

// //   entries.forEach((entry) => {
// //     if (!entry.delivered_qty || isNaN(entry.delivered_qty)) return;

// //     const month = entry.date?.substring(0, 7);
// //     const userId = entry.userId;
// //     const key = `${userId}_${month}`;
// //     const delivered = parseFloat(entry.delivered_qty);
// //     const MonthlyAmount = 60 * delivered;

// //     if (!summaryMap[key]) {
// //       summaryMap[key] = {
// //         userId,
// //         name: entry.name,
// //         month,
// //         totalDelivered: 0,
// //         totalMonthlyAmount: 0,
// //       };
// //     }

// //     summaryMap[key].totalDelivered += delivered;
// //     summaryMap[key].totalMonthlyAmount += MonthlyAmount;
// //   });

// //   return Object.values(summaryMap).sort((a, b) => a.month.localeCompare(b.month));
// // }