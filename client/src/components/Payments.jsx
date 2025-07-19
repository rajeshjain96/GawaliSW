import { useEffect, useState } from "react";
import {
  CommonUtilityBar,
  CheckBoxHeaders,
  ListHeaders,
  Entity,
} from "../external/vite-sdk";
import { BeatLoader } from "react-spinners";
import axios from "axios";
import * as XLSX from "xlsx";
import ModalImport from "./ModalImport";
import {
  recordsAddBulk,
  recordsUpdateBulk,
  analyseImportExcelSheet,
} from "../external/vite-sdk";
import { getEmptyObject, getShowInList } from "../external/vite-sdk";
import PaymentForm from "./PaymentForm";
import { getMonthlySummary } from './MonthlySummary';

export default function Payments(props) {
  let [paymentList, setPaymentList] = useState([]);
  let [filteredPaymentList, setFilteredPaymentList] = useState([]);
  let [action, setAction] = useState("list");
  let [userToBeEdited, setUserToBeEdited] = useState("");
  let [flagLoad, setFlagLoad] = useState(false);
  let [flagImport, setFlagImport] = useState(false);
  let [message, setMessage] = useState("");
  let [searchText, setSearchText] = useState("");
  let [sortedField, setSortedField] = useState("");
  let [direction, setDirection] = useState("");
  let [sheetData, setSheetData] = useState(null);
  let [selectedFile, setSelectedFile] = useState("");

  const today = new Date();
  const currentMonth = (today.getMonth() + 1).toString().padStart(2, "0");
  const currentYear = today.getFullYear().toString();
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);

  let [recordsToBeAdded, setRecordsToBeAdded] = useState([]);
  let [recordsToBeUpdated, setRecordsToBeUpdated] = useState([]);
  let [cntUpdate, setCntUpdate] = useState(0);
  let [cntAdd, setCntAdd] = useState(0);
  let { selectedEntity } = props;
  let { flagFormInvalid } = props;
  let { flagToggleButton } = props;

  let paymentSchema = [
    { attribute: "name", type: "normal" },
    { attribute: "totalDelivered", type: "normal" },
    { attribute: "totalMonthlyAmount", type: "normal" },
    { attribute: "paidAmount", type: "normal" },
    { attribute: "balanceAmount", type: "normal" },
    { attribute: "payment_mode", type: "normal" }, // Added payment_mode to schema
  ];

  let paymentValidations = {
    name: { message: "", mxLen: 200, mnLen: 4, onlyDigits: false },
    totalDelivered: { message: "", onlyDigits: true },
    totalMonthlyAmount: { message: "", onlyDigits: true },
    paidAmount: { message: "", onlyDigits: true },
    balanceAmount: { message: "", onlyDigits: true },
    payment_mode: { message: "" }, // Added validation for payment_mode
  };

  let [showInList, setShowInList] = useState(getShowInList(paymentSchema));

  let [emptyPayment, setEmptyPayment] = useState({
    ...getEmptyObject(paymentSchema),
    roleId: "68691372fa624c1dff2e06be",
    name: "",
    totalDelivered: 0,
    totalMonthlyAmount: 0,
    paidAmount: null,
    balanceAmount: 0,
    payment_mode: "", // Default payment mode to Cash
  });

  useEffect(() => {
    fetchAndProcessData();
  }, [selectedMonth, selectedYear]);

  async function fetchAndProcessData() {
    setFlagLoad(true);
    try {
      const [userRes, paymentRes] = await Promise.all([
        axios(import.meta.env.VITE_API_URL + "/users"),
        axios(import.meta.env.VITE_API_URL + "/payments"),
      ]);
      const userList = userRes.data;
      const paymentListRaw = paymentRes.data;

      const allMonthlySummaries = await getMonthlySummary();

      const currentMonthYear = `${selectedYear}-${selectedMonth}`;

      const mergedList = userList
        .filter((user) => user.roleId === "68691372fa624c1dff2e06be")
        .map((user) => {
          const startDate = new Date(user.start_date);
          const startYearNum = startDate.getFullYear();
          const startMonthNum = startDate.getMonth();

          if (
            startYearNum > parseInt(selectedYear) ||
            (startYearNum === parseInt(selectedYear) &&
              startMonthNum > parseInt(selectedMonth) - 1)
          ) {
            return null;
          }

          const userSummaryForMonth = allMonthlySummaries.find(
            (summary) => summary.userId === user._id && summary.month === currentMonthYear
          );

          const monthlyBillRecord = paymentListRaw.find(
            (p) =>
              p.userId === user._id &&
              p.date?.split("T")[0].substring(0, 7) === currentMonthYear &&
              p.payment_status === "MonthlyBill"
          );

          let totalDelivered = userSummaryForMonth?.totalDelivered ?? 0;
          let calculatedTotalMonthlyAmount = userSummaryForMonth?.totalMonthlyAmount ?? 0;
          
          let paidAmount = monthlyBillRecord?.paidAmount ?? null;
          let balanceAmount;

          if (paidAmount !== null) {
              balanceAmount = calculatedTotalMonthlyAmount - paidAmount;
          } else {
              balanceAmount = calculatedTotalMonthlyAmount;
          }

          let effectiveUpdateDate = monthlyBillRecord?.updateDate || user.updateDate || new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1, 1).toISOString();
          let paymentMode = monthlyBillRecord?.payment_mode ?? ""; // Get payment_mode or default to Cash


          return {
            _id: user._id,
            userId: user._id,
            name: user.name,
            totalDelivered: totalDelivered,
            totalMonthlyAmount: calculatedTotalMonthlyAmount,
            paidAmount: paidAmount,
            balanceAmount: balanceAmount,
            updateDate: effectiveUpdateDate,
            paymentId: monthlyBillRecord?._id || null,
            payment_mode: paymentMode, // Add payment_mode to the merged record
          };
        })
        .filter(Boolean);

      mergedList.sort(
        (a, b) => new Date(b.updateDate || 0) - new Date(a.updateDate || 0)
      );

      setPaymentList(mergedList);
      setFilteredPaymentList(mergedList);
    } catch (error) {
      console.error("Error in fetchAndProcessData:", error);
      showMessage("Something went wrong while fetching data.");
    }
    setFlagLoad(false);
  }

  async function handleFormSubmit(payment) {
    let message;
    let paymentForBackEnd = { ...payment };

    const dateForMonthlyEntry = `${selectedYear}-${selectedMonth}-01T00:00:00.000Z`;

    const monthlyPaymentPayload = {
      userId: paymentForBackEnd.userId,
      name: paymentForBackEnd.name,
      date: dateForMonthlyEntry,
      
      paidAmount: paymentForBackEnd.paidAmount === null ? 0 : paymentForBackEnd.paidAmount,
      balanceAmount: paymentForBackEnd.balanceAmount,
      totalDelivered: paymentForBackEnd.totalDelivered,
      totalMonthlyAmount: paymentForBackEnd.totalMonthlyAmount,
      payment_mode: paymentForBackEnd.payment_mode, // Add payment_mode to the payload
    };

    if (!paymentForBackEnd.paymentId) {
        monthlyPaymentPayload.payment_status = "MonthlyBill";
    }

    setFlagLoad(true);
    try {
      let response;
      if (paymentForBackEnd.paymentId) {
        response = await axios.put(
          `${import.meta.env.VITE_API_URL}/payments/${paymentForBackEnd.paymentId}`,
          monthlyPaymentPayload,
          { headers: { "Content-type": "application/json" } }
        );
        message = "Monthly payment record updated successfully.";
      } else {
        response = await axios.post(
          import.meta.env.VITE_API_URL + "/payments",
          monthlyPaymentPayload,
          { headers: { "Content-type": "application/json" } }
        );
        message = "Added Payemnt Successfully";
      }

      showMessage(message);
      setAction("list");
      await fetchAndProcessData();

    } catch (error) {
      console.error("Form submission error:", error);
      showMessage("Something went wrong with form submission, refresh the page");
    } finally {
      setFlagLoad(false);
    }
  }

  function handleFormCloseClick() {
    props.onFormCloseClick();
  }
  function handleListClick() {
    setAction("list");
  }
  function handleAddEntityClick() {
    setAction("add");
  }
  function handleEditButtonClick(payment) {
    let safePayment = {
      ...emptyPayment,
      ...payment,
      info: payment.info || "",
    };
    safePayment.paidAmount = safePayment.paidAmount === 0 ? null : safePayment.paidAmount;
    setAction("update");
    setUserToBeEdited(safePayment);
  }
  function showMessage(message) {
    setMessage(message);
    window.setTimeout(() => {
      setMessage("");
    }, 3000);
  }

  function handleDeleteButtonClick(ans, payment) {
    if (ans === "No") {
      showMessage("Delete operation cancelled");
      return;
    }
    if (ans === "Yes") {
      performDeleteOperation(payment);
    }
  }

  async function performDeleteOperation(payment) {
    setFlagLoad(true);
    try {
      if (payment.paymentId) {
          await axios.delete(
              `${import.meta.env.VITE_API_URL}/payments/${payment.paymentId}`
          );
          showMessage(`Monthly payment record for ${payment.name} deleted successfully.`);
      } else {
          showMessage(`No specific monthly payment record found for ${payment.name} to delete.`);
      }

      await fetchAndProcessData();

    } catch (error) {
      console.error("Delete operation failed:", error);
      showMessage("Something went wrong during deletion, refresh the page");
    } finally {
      setFlagLoad(false);
    }
  }

  function handleListCheckBoxClick(checked, selectedIndex) {
    let cnt = 0;
    showInList.forEach((e) => {
      if (e.show) {
        cnt++;
      }
    });
    if (cnt === 1 && !checked) {
      showMessage("Minimum 1 field should be selected.");
      return;
    }
    if (cnt === 5 && checked) {
      showMessage("Maximum 5 fields can be selected.");
      return;
    }
    let att = [...showInList];
    let a = att.map((e, index) => {
      let p = { ...e };
      if (index === selectedIndex && checked) {
        p.show = true;
      } else if (index === selectedIndex && !checked) {
        p.show = false;
      }
      return p;
    });
    setShowInList(a);
  }
  function handleHeaderClick(index) {
    let field = showInList[index].attribute;
    let d = false;
    if (field === sortedField) {
      d = !direction;
    } else {
      d = false;
    }
    let list = [...filteredPaymentList];
    setDirection(d);
    if (d === false) {
      list.sort((a, b) => {
        const valA = a[field] !== null && a[field] !== undefined ? a[field] : '';
        const valB = b[field] !== null && b[field] !== undefined ? b[field] : '';

        if (typeof valA === 'string' && typeof valB === 'string') {
          return valA.localeCompare(valB);
        }
        if (valA > valB) {
          return 1;
        }
        if (valA < valB) {
          return -1;
        }
        return 0;
      });
    } else {
      list.sort((a, b) => {
        const valA = a[field] !== null && a[field] !== undefined ? a[field] : '';
        const valB = b[field] !== null && b[field] !== undefined ? b[field] : '';

        if (typeof valA === 'string' && typeof valB === 'string') {
          return valB.localeCompare(valA);
        }
        if (valA < valB) {
          return 1;
        }
        if (valA > valB) {
          return -1;
        }
        return 0;
      });
    }
    setFilteredPaymentList(list);
    setSortedField("updateDate");
  }
  function handleSrNoClick() {
    let d = false;
    if (sortedField === "updateDate") {
      d = !direction;
    } else {
      d = false;
    }

    let list = [...filteredPaymentList];
    setDirection(!direction);
    if (d === false) {
      list.sort((a, b) => {
        if (new Date(a["updateDate"]) > new Date(b["updateDate"])) {
          return 1;
        }
        if (new Date(a["updateDate"]) < new Date(b["updateDate"])) {
          return -1;
        }
        return 0;
      });
    } else {
      list.sort((a, b) => {
        if (new Date(a["updateDate"]) < new Date(b["updateDate"])) {
          return 1;
        }
        if (new Date(a["updateDate"]) > new Date(b["updateDate"])) {
          return -1;
        }
        return 0;
      });
    }
    setFilteredPaymentList(list);
    setSortedField("updateDate");
  }

  function handleSearchKeyUp(event) {
    let searchText = event.target.value;
    setSearchText(searchText);
    performSearchOperation(searchText);
  }
  function performSearchOperation(searchText) {
    let query = searchText.trim();
    if (query.length === 0) {
      setFilteredPaymentList(paymentList);
      return;
    }
    let searchedPayments = [];
    searchedPayments = filterByShowInListAttributes(query);
    setFilteredPaymentList(searchedPayments);
  }

  function filterByShowInListAttributes(query) {
    let fList = [];
    for (let i = 0; i < paymentList.length; i++) {
      for (let j = 0; j < showInList.length; j++) {
        if (showInList[j].show) {
          let parameterName = showInList[j].attribute;
          if (
            paymentList[i][parameterName] !== undefined &&
            paymentList[i][parameterName] !== null &&
            String(paymentList[i][parameterName]).toLowerCase().includes(query.toLowerCase())
          ) {
            fList.push(paymentList[i]);
            break;
          }
        }
      }
    }
    return fList;
  }
  function handleToggleText(index) {
    let sil = [...showInList];
    sil[index].flagReadMore = !sil[index].flagReadMore;
    setShowInList(sil);
  }
  function handleExcelFileUploadClick(file, msg) {
    if (msg) {
      showMessage(message);
      return;
    }
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      const arrayBuffer = event.target.result;
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      setSheetData(jsonData);
      let result = analyseImportExcelSheet(jsonData, paymentList);
      if (result.message) {
        showMessage(result.message);
      } else {
        showImportAnalysis(result);
      }
    };
    reader.readAsArrayBuffer(file);
  }
  function showImportAnalysis(result) {
    setCntAdd(result.cntA);
    setCntUpdate(result.cntU);
    setRecordsToBeAdded(result.recordsToBeAdded);
    setRecordsToBeUpdated(result.recordsToBeUpdated);
    setFlagImport(true);
  }
  function handleModalCloseClick() {
    setFlagImport(false);
  }
  async function handleImportButtonClick() {
    setFlagImport(false);
    setFlagLoad(true);
    let result;
    try {
      if (recordsToBeAdded.length > 0) {
        result = await recordsAddBulk(
          recordsToBeAdded,
          "users",
          paymentList,
          import.meta.env.VITE_API_URL
        );
        if (result.success) {
          await fetchAndProcessData();
        }
        showMessage(result.message);
      }
      if (recordsToBeUpdated.length > 0) {
        result = await recordsUpdateBulk(
          recordsToBeUpdated,
          "users",
          paymentList,
          import.meta.env.VITE_API_URL
        );
        if (result.success) {
          await fetchAndProcessData();
        }
        showMessage(result.message);
      }
    } catch (error) {
      console.log(error);
      showMessage("Something went wrong, refresh the page");
    } finally {
      setFlagLoad(false);
    }
  }
  function handleClearSelectedFile() {
    setSelectedFile(null);
  }
  if (flagLoad) {
    return (
      <div className="my-5 text-center">
        <BeatLoader size={24} color={"blue"} />
      </div>
    );
  }

  return (
    <>
      <CommonUtilityBar
        action={action}
        message={message}
        selectedEntity={selectedEntity}
        flagToggleButton={flagToggleButton}
        filteredList={filteredPaymentList}
        mainList={paymentList}
        showInList={showInList}
        onListClick={handleListClick}
        onAddEntityClick={handleAddEntityClick}
        onSearchKeyUp={handleSearchKeyUp}
        onExcelFileUploadClick={handleExcelFileUploadClick}
        onClearSelectedFile={handleClearSelectedFile}
      />

      {filteredPaymentList.length === 0 && paymentList.length !== 0 && (
        <div className="text-center">Nothing to show</div>
      )}
      {paymentList.length === 0 && (
        <div className="text-center">List is empty</div>
      )}

      {action === "list" && (
        <div className="row px-3 my-2">
          <div className="col-md-3">
            <label className="form-label">Select Month</label>
            <select
              className="form-select"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              {Array.from({ length: 12 }, (_, i) => {
                const month = String(i + 1).padStart(2, "0");
                return (
                  <option key={month} value={month}>
                    {new Date(0, i).toLocaleString("default", { month: "long" })}
                  </option>
                );
              })}
            </select>
          </div>
          <div className="col-md-3">
            <label className="form-label">Select Year</label>
            <select
              className="form-select"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              {Array.from({ length: 5 }, (_, i) => {
                const year = today.getFullYear() - 2 + i;
                return (
                  <option key={year} value={year}>
                    {year}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      )}

      {action === "list" && filteredPaymentList.length !== 0 && (
        <CheckBoxHeaders
          showInList={showInList}
          onListCheckBoxClick={handleListCheckBoxClick}
        />
      )}

      {action === "list" && filteredPaymentList.length !== 0 && (
        <div className="row my-2 mx-auto p-1">
          <div className="col-1">
            <a
              href="#"
              onClick={() => {
                handleSrNoClick();
              }}
            >
              SN.{" "}
              {sortedField == "updateDate" && direction && (
                <i className="bi bi-arrow-up"></i>
              )}
              {sortedField == "updateDate" && !direction && (
                <i className="bi bi-arrow-down"></i>
              )}
            </a>
          </div>
          <ListHeaders
            showInList={showInList}
            sortedField={sortedField}
            direction={direction}
            onHeaderClick={handleHeaderClick}
          />
          <div className="col-1">&nbsp;</div>
        </div>
      )}
      {(action === "add" || action === "update") && (
        <div className="row">
          <PaymentForm
            paymentSchema={paymentSchema}
            paymentValidations={paymentValidations}
            emptyPayment={emptyPayment}
            selectedEntity={selectedEntity}
            userToBeEdited={userToBeEdited}
            action={action}
            flagFormInvalid={flagFormInvalid}
            onFormSubmit={handleFormSubmit}
            onFormCloseClick={handleFormCloseClick}
          />
        </div>
      )}

      {action === "list" &&
        filteredPaymentList.length !== 0 &&
        filteredPaymentList.map((e, index) => (
          <div
            className="row mx-auto mt-2 my-1"
            key={index}
          >
            <div className="col-12">
              <Entity
                entity={e}
                index={index}
                sortedField={sortedField}
                direction={direction}
                listSize={filteredPaymentList.length}
                selectedEntity={selectedEntity}
                showInList={showInList}
                VITE_API_URL={import.meta.env.VITE_API_URL}
                onEditButtonClick={handleEditButtonClick}
                onDeleteButtonClick={handleDeleteButtonClick}
                onToggleText={handleToggleText}
              />
            </div>
          </div>
        ))}

      {flagImport && (
        <ModalImport
          modalText={"Summary of Bulk Import"}
          additions={recordsToBeAdded}
          updations={recordsToBeUpdated}
          btnGroup={["Yes", "No"]}
          onModalCloseClick={handleModalCloseClick}
          onModalButtonCancelClick={handleModalCloseClick}
          onImportButtonClick={handleImportButtonClick}
        />
      )}
    </>
  );
}


