import React, { useState, useEffect } from "react";
import axios from "axios";
import { BeatLoader } from "react-spinners";
import { getMonthlySummary } from './MonthlySummary';

export default function BillShare({ billId, onClose, selectedMonth, selectedYear }) {
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [dailyEntries, setDailyEntries] = useState([]); 
  const [monthlySummary, setMonthlySummary] = useState(null);
  const [todayStr, setTodayStr] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBillDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const yearNum = parseInt(selectedYear, 10);
        const monthNum = parseInt(selectedMonth, 10);

        if (isNaN(yearNum) || isNaN(monthNum)) {
            setError("Invalid month or year provided for bill details.");
            setLoading(false);
            return;
        }

        const userRes = await axios.get(`${import.meta.env.VITE_API_URL}/users/${billId}`);
        let customerProfileData = { ...userRes.data };

        const allMonthlyEntriesRes = await axios.get(
            `${import.meta.env.VITE_API_URL}/entries/${yearNum}/${monthNum}`
        );
        const entriesDataForThisUser = (allMonthlyEntriesRes.data || []).filter(
            entry => entry.userId === billId
        );
        setDailyEntries(entriesDataForThisUser);

        const allUsersRes = await axios.get(`${import.meta.env.VITE_API_URL}/users`);
        const allUsersList = allUsersRes.data || [];

        const allMonthlySummaries = await getMonthlySummary(yearNum, monthNum, allUsersList); 
        const currentMonthYear = `${selectedYear}-${selectedMonth}`;
        const userMonthlySummary = allMonthlySummaries.find(
          (summary) => summary.userId === billId && summary.month === currentMonthYear
        );

        if (userMonthlySummary) {
          setMonthlySummary(userMonthlySummary);
          customerProfileData.totalDelivered = userMonthlySummary.totalDelivered;
          customerProfileData.totalMonthlyAmount = userMonthlySummary.totalMonthlyAmount;
        } else {
          console.warn(`No monthly summary found via getMonthlySummary for user ${billId} in ${currentMonthYear}. Defaulting totals to 0.`);
          setMonthlySummary({
            userId: billId,
            month: currentMonthYear,
            totalDelivered: 0,
            totalMonthlyAmount: 0
          });
          customerProfileData.totalDelivered = 0;
          customerProfileData.totalMonthlyAmount = 0;
        }

        setSelectedCustomer(customerProfileData);

        const today = new Date();
        setTodayStr(today.toLocaleDateString("en-IN"));

      } catch (err) {
        console.error("Failed to fetch bill details:", err);
        if (axios.isAxiosError(err)) {
            if (err.response) {
                if (err.response.status === 404) {
                    setError("Data not found for this customer or entries for the selected month. Please check backend response or data existence.");
                } else {
                    setError(`Server Error: ${err.response.status} - ${err.response.data?.message || err.message}`);
                }
            } else {
                setError("Network Error or something went wrong. Please check your internet connection.");
            }
        } else {
            setError("An unexpected error occurred while fetching bill data.");
        }
      } finally {
        setLoading(false);
      }
    };

    if (billId && selectedMonth && selectedYear) {
      fetchBillDetails();
    }
  }, [billId, selectedMonth, selectedYear]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100 vw-100">
        <BeatLoader size={24} color={"blue"} />
        <p className="ms-2">Loading bill details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100 vw-100">
        <div className="alert alert-danger text-center" role="alert">
          {error}
          <div className="mt-3">
            <button className="btn btn-primary" onClick={onClose}>Go Back</button>
          </div>
        </div>
      </div>
    );
  }

  if (!selectedCustomer || !selectedCustomer._id || !monthlySummary) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100 vw-100">
        <div className="alert alert-warning text-center" role="alert">
          Customer or monthly summary data could not be loaded. Please ensure the user exists for the selected ID and has entries for the month.
          <div className="mt-3">
            <button className="btn btn-primary" onClick={onClose}>Go Back</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="d-flex ms-5 ps-5 mt-4 justify-content-left align-items-center vh-100 vw-100">
      <div
        className="bg-white p-5 shadow-lg rounded-4 border w-100"
        style={{ maxWidth: 900 }}
      >
        
        <div className="text-center text-black h5">|| Shree ||</div>
        <div className="text-center text-black fw-bold fs-3">
          The Dairy Shop
        </div>
        <div className="text-center text-black h6">
          220, Market yard, Pune - 411009
        </div>
        <div className="text-end text-black pe-5 h6">Date: {todayStr}</div>

        <div className="h5 text-center text-black mb-3">
          Customer Name : {selectedCustomer.name || 'N/A'}
        </div>
        <div className="h6 text-center text-black mb-2">
          Phone number : {selectedCustomer.mobileNumber || 'N/A'}
        </div>

        <table className="table table-bordered mt-4 text-center">
          <thead className="table-light">
            <tr>
              <th colSpan="11" className="fs-5">Daily Milk Delivery</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              const daysInMonth = new Date(
                parseInt(selectedYear),
                parseInt(selectedMonth),
                0
              ).getDate();

              const chunks = [];
              for (let i = 1; i <= daysInMonth; i += 10) {
                const datesRow = [];
                const qtyRow = [];

                for (let j = i; j < i + 10 && j <= daysInMonth; j++) {
                  const dateStr = `${selectedYear}-${selectedMonth}-${String(j).padStart(2, "0")}`;
                  const entry = dailyEntries.find((e) => e.date?.startsWith(dateStr));
                  const quantity = entry ? parseFloat(entry.qty_delivered || entry.delivered_qty) : 0;

                  datesRow.push(
                    <td key={`date-${j}`} className="fw-bold bg-light">{j}</td>
                  );
                  qtyRow.push(
                    <td key={`qty-${j}`}>
                      {!isNaN(quantity) && quantity > 0 ? quantity.toFixed(1) : "✕"}
                    </td>
                  );
                }

                chunks.push(<tr key={`dates-${i}`}>{datesRow}</tr>);
                chunks.push(<tr key={`qtys-${i}`}>{qtyRow}</tr>);
              }

              return chunks;
            })()}
          </tbody>
        </table>

        <div className="text-center h6 fs-5 mt-4">
          <div className="row">
            <div className="col-6">Total Milk</div>
            <div className="col-6">
              {monthlySummary.totalDelivered.toFixed(2)} Litres
            </div>
          </div>
          <div className="row">
            <div className="col-6 fw-bold">Total Amount</div>
            <div className="col-6 fw-bold">
              Rs. {monthlySummary.totalMonthlyAmount.toFixed(2)} /-
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}