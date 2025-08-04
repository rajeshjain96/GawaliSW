import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";

const BillView = () => {
  const { billId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const month = searchParams.get('month');
  const year = searchParams.get('year');

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [dailyEntries, setDailyEntries] = useState([]);
  const [monthlySummary, setMonthlySummary] = useState(null);
  const [todayStr, setTodayStr] = useState("");

  const fetchBillDetails = async () => {
    if (!billId || !month || !year) {
      console.error("BillView: Missing billId, month, or year parameters.");
      alert("Missing bill details (month/year/ID). Cannot load bill.");
      navigate("/admin/bills");
      return;
    }
    const parsedYear = parseInt(year, 10);
    const parsedMonth = parseInt(month, 10);

    if (isNaN(parsedYear) || isNaN(parsedMonth) || parsedYear < 2000 || parsedMonth < 1 || parsedMonth > 12) {
      console.error("BillView: Invalid year or month format in URL parameters.");
      alert("Invalid bill date (year/month). Cannot load bill.");
      navigate("/admin/bills");
      return;
    }

    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/bills/${parsedYear}/${parsedMonth}/${billId}`);
      const bill = res.data;

      if (!bill) {
        alert("Bill not found for the specified month/year.");
        navigate("/admin/bills");
        return;
      }

      setSelectedCustomer({
        name: bill.name,
        mobileNumber: bill.mobileNumber,
      });

      const entries = bill.entries || [];
      setDailyEntries(entries);

      const totalDelivered = entries.reduce((sum, e) => sum + (parseFloat(e.qty) || 0), 0);
      setMonthlySummary({
        totalDelivered,
        totalMonthlyAmount: bill.totalMonthlyAmount || 0,
      });

      const date = bill.updateDate || new Date();
      setTodayStr(new Date(date).toLocaleDateString("en-IN"));
    } catch (err) {
      console.error("Failed to load bill:", err);
      if (err.response && err.response.status === 404) {
          alert("Bill not found.");
      } else {
          alert("Unable to fetch bill details. Please try again.");
      }
      navigate("/admin/bills");
    }
  };

  useEffect(() => {
    fetchBillDetails();
  }, [billId, month, year]);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-2">Monthly Bill</h2>
      {selectedCustomer && (
        <div className="mb-4">
          <p><strong>Name:</strong> {selectedCustomer.name}</p>
          <p><strong>Mobile:</strong> {selectedCustomer.mobileNumber}</p>
          <p><strong>Bill Date:</strong> {todayStr}</p>
        </div>
      )}
      <div>
        <h3 className="font-semibold mb-2">Daily Milk Entries</h3>
        <table className="w-full border">
          <thead>
            <tr className="bg-gray-200">
              <th className="border p-2">Date</th>
              <th className="border p-2">Qty (L)</th>
              <th className="border p-2">Rate</th>
              <th className="border p-2">Amount</th>
            </tr>
          </thead>
          <tbody>
            {dailyEntries.length > 0 ? (
              dailyEntries.map((entry, index) => (
                <tr key={index}>
                  <td className="border p-2">{new Date(entry.date).toLocaleDateString("en-IN")}</td>
                  <td className="border p-2">{entry.qty}</td>
                  <td className="border p-2">{entry.rate}</td>
                  <td className="border p-2">{entry.amount}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="text-center p-4">No entries available</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {monthlySummary && (
        <div className="mt-4 font-semibold">
          <p>Total Milk Delivered: {monthlySummary.totalDelivered.toFixed(2)} L</p>
          <p>Total Monthly Amount: ₹{monthlySummary.totalMonthlyAmount.toFixed(2)}</p>
        </div>
      )}
    </div>
  );
};

export default BillView;