import React, { useEffect, useState } from "react";
import { getMonthlySummary } from "./MonthlySummary"

export default function Calculations() {
  const [monthlyData, setMonthlyData] = useState([]);

  useEffect(() => {
    getMonthlySummary()
      .then(setMonthlyData)
      .catch((err) => console.error("Error fetching summary:", err));
  }, []);

  return (
    <div className="container mt-4">
      <h4>Monthly Milk Delivery Summary</h4>
      <table className="table table-bordered table-striped mt-3">
        <thead>
          <tr>
            <th>User</th>
            <th>User ID</th>
            <th>Month</th>
            <th>Total Delivered (L)</th>
            <th>Total Monthly Bill</th>
          </tr>
        </thead>
        <tbody>
          {monthlyData.length === 0 ? (
            <tr>
              <td colSpan="5" className="text-center">No Data</td>
            </tr>
          ) : (
            monthlyData.map((item, index) => (
              <tr key={index}>
                <td>{item.name}</td>
                <td>{item.userId}</td>
                <td>{item.month}</td>
                <td>{item.totalDelivered}</td>
                <td>{item.totalMonthlyAmount}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}















// import React, { useEffect, useState } from "react";
// import axios from "axios";

// export default function Calculations() {
//   const [monthlyData, setMonthlyData] = useState([]);

//   useEffect(() => {
//     async function fetchAndCalculate() {
//       try {
//         const res = await axios.get(import.meta.env.VITE_API_URL + "/entries");
//         const entries = res.data;

//         const summaryMap = {};

//         entries.forEach((entry) => {
//           if (!entry.delivered_qty || isNaN(entry.delivered_qty)) return;

//           const month = entry.date?.substring(0, 7); 
//           const userId = entry.userId;
//           const key = `${userId}_${month}`;
//           const delivered = parseFloat(entry.delivered_qty);
//           const MonthlyAmount = (60 * (parseFloat(entry.delivered_qty)))

//           if (!summaryMap[key]) {
//             summaryMap[key] = {
//               userId,
//               name: entry.name ,
//               month,
//               totalDelivered: 0,
//               totalMonthlyAmount: 0,
//             };
//           }

//           summaryMap[key].totalDelivered += delivered;
//           summaryMap[key].totalMonthlyAmount += MonthlyAmount;
//         });

//         // Convert summaryMap to array
//         const finalSummary = Object.values(summaryMap).sort((a, b) => {
//           return a.month.localeCompare(b.month);
//         });

//         setMonthlyData(finalSummary);
//       } catch (err) {
//         console.error("Error fetching entries:", err);
//       }
//     }

//     fetchAndCalculate();
//   }, []);

//   return (
//     <div className="container mt-4">
//       <h4>Monthly Milk Delivery Summary</h4>
//       <table className="table table-bordered table-striped mt-3">
//         <thead>
//           <tr>
//             <th>User</th>
//             <th>User ID</th>
//             <th>Month</th>
//             <th>Total Delivered (L)</th>
//             <th>Total Monthly Bill</th>
//           </tr>
//         </thead>
//         <tbody>
//           {monthlyData.length === 0 ? (
//             <tr>
//               <td colSpan="4" className="text-center">No Data</td>
//             </tr>
//           ) : (
//             monthlyData.map((item, index) => (
//               <tr key={index}>
//                 <td>{item.name}</td>
//                 <td>{item.userId}</td>
//                 <td>{item.month}</td>
//                 <td>{item.totalDelivered}</td>
//                 <td>{item.totalMonthlyAmount}</td>
//               </tr>
//             ))
//           )}
//         </tbody>
//       </table>
//     </div>
//   );
// }
