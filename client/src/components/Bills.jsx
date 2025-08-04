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
import BillForm from "./BillForm";
import { getMonthlySummary } from "./MonthlySummary";
import BillShare from "./BillShare";

export default function Bills(props) {
  let [selectedIds, setSelectedIds] = useState([]);
  let [billList, setBillList] = useState([]);
  let [filteredBillList, setFilteredBillList] = useState([]);
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

  const [showBillShare, setShowBillShare] = useState(false);
  const [billIdToShare, setBillIdToShare] = useState(null);

  const [billToView, setBillToView] = useState(null);
  const [showBillFormForView, setShowBillFormForView] = useState(false);

  let billSchema = [
    { attribute: "name", type: "normal" },
    { attribute: "totalDelivered", type: "normal" },
    { attribute: "totalMonthlyAmount", type: "normal" },
  ];

  let billValidations = {
    name: { message: "", mxLen: 200, mnLen: 4, onlyDigits: false },
    totalDelivered: { message: "", onlyDigits: true },
    totalMonthlyAmount: { message: "", onlyDigits: true },
  };

  let [showInList, setShowInList] = useState(getShowInList(billSchema));

  let [emptyBill, setEmptyBill] = useState({
    ...getEmptyObject(billSchema),
    roleId: "68691372fa624c1dff2e06be",
    name: "",
    totalDelivered: 0,
    totalMonthlyAmount: 0,
  });

  useEffect(() => {
    fetchAndProcessData();
  }, [selectedMonth, selectedYear]);

  async function fetchAndProcessData() {
    setFlagLoad(true);
    try {
      const yearToFetch = parseInt(selectedYear, 10);
      const monthToFetch = parseInt(selectedMonth, 10);

      if (isNaN(yearToFetch) || isNaN(monthToFetch)) {
        console.error("Invalid year or month selected. Cannot fetch monthly summary.");
        setFlagLoad(false);
        return;
      }

      const userRes = await axios(import.meta.env.VITE_API_URL + "/users");
      const billRes = await axios(
        `${import.meta.env.VITE_API_URL}/bills/${yearToFetch}/${monthToFetch}`
      );

      const userList = userRes.data || [];
      const billListRaw = billRes.data;

      const allMonthlySummaries = await getMonthlySummary(yearToFetch, monthToFetch, userList);

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
            (summary) =>
              summary.userId === user._id && summary.month === currentMonthYear
          );

          const monthlyBillRecord = billListRaw.find(
            (p) =>
              p.userId === user._id &&
              p.date?.split("T")[0].substring(0, 7) === currentMonthYear &&
              p.bill_status === "MonthlyBill"
          );

          let totalDelivered = userSummaryForMonth?.totalDelivered ?? 0;
          let calculatedTotalMonthlyAmount =
            userSummaryForMonth?.totalMonthlyAmount ?? 0;

          let effectiveUpdateDate =
            monthlyBillRecord?.updateDate ||
            user.updateDate ||
            new Date(
              parseInt(selectedYear),
              parseInt(selectedMonth) - 1,
              1
            ).toISOString();

          return {
            _id: user._id,
            userId: user._id,
            name: user.name,
            mobileNumber: user.mobileNumber,
            totalDelivered: totalDelivered,
            totalMonthlyAmount: calculatedTotalMonthlyAmount,
            updateDate: effectiveUpdateDate,
            billId: monthlyBillRecord?._id || null,
          };
        })
        .filter(Boolean);

      mergedList.sort(
        (a, b) => new Date(b.updateDate || 0) - new Date(a.updateDate || 0)
      );

      setBillList(mergedList);
      setFilteredBillList(mergedList);
    } catch (error) {
      console.error("Error in fetchAndProcessData:", error);
      showMessage("Something went wrong while fetching data.");
    }
    setFlagLoad(false);
  }

  async function handleFormSubmit(bill) {
    let message;
    let billForBackEnd = { ...bill };

    const dateForMonthlyEntry = `${selectedYear}-${selectedMonth}-01T00:00:00.000Z`;

    const monthlyBillPayload = {
      userId: billForBackEnd.userId,
      name: billForBackEnd.name,
      date: dateForMonthlyEntry,
      totalDelivered: billForBackEnd.totalDelivered,
      totalMonthlyAmount: billForBackEnd.totalMonthlyAmount,
      bill_mode: billForBackEnd.bill_mode,
    };

    if (!billForBackEnd.billId) {
      monthlyBillPayload.bill_status = "MonthlyBill";
    }

    setFlagLoad(true);
    try {
      let response;
      if (billForBackEnd.billId) {
        response = await axios.put(
          `${import.meta.env.VITE_API_URL}/bills/${selectedYear}/${selectedMonth}/${billForBackEnd.billId}`,
          monthlyBillPayload,
          { headers: { "Content-type": "application/json" } }
        );
        message = "Monthly bill record updated successfully.";
      } else {
        response = await axios.post(
          `${import.meta.env.VITE_API_URL}/bills/${selectedYear}/${selectedMonth}`,
          monthlyBillPayload,
          { headers: { "Content-type": "application/json" } }
        );
        message = "Bill Added Successfully";
      }

      showMessage(message);
      setAction("list");
      setShowBillFormForView(false);
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
    setShowBillFormForView(false);
    setAction("list");
    setUserToBeEdited(null);
    setBillToView(null);
    setShowBillShare(false);
    setBillIdToShare(null);
  }

  function handleListClick() {
    setAction("list");
    setShowBillFormForView(false);
    setShowBillShare(false);
  }
  function handleAddEntityClick() {
    setAction("add");
    setShowBillFormForView(false);
    setShowBillShare(false);
  }
  function showMessage(message) {
    setMessage(message);
    window.setTimeout(() => {
      setMessage("");
    }, 3000);
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
    let list = [...filteredBillList];
    setDirection(d);
    if (d === false) {
      list.sort((a, b) => {
        const valA = a[field] !== null && a[field] !== undefined ? a[field] : "";
        const valB = b[field] !== null && b[field] !== undefined ? b[field] : "";

        if (typeof valA === "string" && typeof valB === "string") {
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
        const valA = a[field] !== null && a[field] !== undefined ? a[field] : "";
        const valB = b[field] !== null && b[field] !== undefined ? b[field] : "";

        if (typeof valA === "string" && typeof valB === "string") {
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
    setFilteredBillList(list);
    setSortedField("updateDate");
  }
  function handleSrNoClick() {
    let d = false;
    if (sortedField === "updateDate") {
      d = !direction;
    } else {
      d = false;
    }

    let list = [...filteredBillList];
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
    setFilteredBillList(list);
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
      setFilteredBillList(billList);
      return;
    }
    let searchedBills = [];
    searchedBills = filterByShowInListAttributes(query);
    setFilteredBillList(searchedBills);
  }

  function filterByShowInListAttributes(query) {
    let fList = [];
    for (let i = 0; i < billList.length; i++) {
      for (let j = 0; j < showInList.length; j++) {
        if (showInList[j].show) {
          let parameterName = showInList[j].attribute;
          if (
            billList[i][parameterName] !== undefined &&
            billList[i][parameterName] !== null &&
            String(billList[i][parameterName])
              .toLowerCase()
              .includes(query.toLowerCase())
          ) {
            fList.push(billList[i]);
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
      let result = analyseImportExcelSheet(jsonData, billList);
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
  function handleModalButtonCancelClick() {
    setFlagImport(false);
    showMessage("Import operation cancelled.");
  }
  async function handleImportButtonClick() {
    setFlagImport(false);
    setFlagLoad(true);
    let result;
    try {
      if (recordsToBeAdded.length > 0) {
        result = await recordsAddBulk(
          recordsToBeAdded,
          "bills",
          billList,
          import.meta.env.VITE_API_URL,
          selectedYear,
          selectedMonth
        );
        if (result.success) {
          await fetchAndProcessData();
        }
        showMessage(result.message);
      }
      if (recordsToBeUpdated.length > 0) {
        result = await recordsUpdateBulk(
          recordsToBeUpdated,
          "bills",
          billList,
          import.meta.env.VITE_API_URL,
          selectedYear,
          selectedMonth
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

  const openBillShareModal = (billId) => {
    setBillIdToShare(billId);
    setShowBillShare(true);
    setAction("share");
    setShowBillFormForView(false);
    showMessage(`Opening Bill Share for ID: ${billId}`);
  };

  const shareBillViaWhatsApp = async (bill) => {
    console.log(bill, "bill .... ");

    const billPayload = {
      name: bill.name,
      mobileNumber: bill.mobileNumber,
      totalDelivered: bill.totalDelivered,
      totalMonthlyAmount: bill.totalMonthlyAmount,
      userId: bill.userId,
      updateDate: bill.updateDate,
      ...(bill.billId && { billId: bill.billId }),
    };

    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/bills/${selectedYear}/${selectedMonth}`,
        billPayload
      );

      const customerUserId = bill.userId;
      const linkMonth = selectedMonth;
      const linkYear = selectedYear;
      const billLink = `http://localhost:5173/bills/share/${customerUserId}?month=${linkMonth}&year=${linkYear}`;

      console.log(billLink, "Billlinkkkkkk");

      const { name, totalDelivered, totalMonthlyAmount } = bill;
      const messageText =
        `Monthly Bill Details for ${name} (${selectedMonth}/${selectedYear}):\n` +
        `Total Delivered Units: ${totalDelivered}\n` +
        `Total Monthly Amount: ₹${totalMonthlyAmount.toFixed(2)}\n\n ,here is your bill for ${billLink}`;

      const encodedMessage = encodeURIComponent(messageText);
      const whatsappUrl = `https://wa.me/${bill.mobileNumber}?text=${encodedMessage}`;

      window.open(whatsappUrl, "_blank");
      showMessage(`Sharing bill for ${name} via WhatsApp.`);
    } catch (err) {
      console.error("Error generating or sharing bill:", err);
      alert("Failed to share bill. Please try again.");
    }
    setAction("list");
  };

  const handleCloseBillShare = () => {
    setShowBillShare(false);
    setBillIdToShare(null);
    setAction("list");
  };

  const handleBillButtonClick = (bill) => {
    openBillShareModal(bill._id);
  };

  const handleShareButtonClick = (bill) => {
    shareBillViaWhatsApp(bill);
  };


  if (flagLoad) {
    return (
      <div className="my-5 text-center">
        <BeatLoader size={24} color={"blue"} />
      </div>
    );
  }

  const showListContent = action === "list" && !showBillShare && !showBillFormForView;

  return (
    <>
      <CommonUtilityBar
        action={action}
        message={message}
        selectedEntity={selectedEntity}
        flagToggleButton={flagToggleButton}
        filteredList={filteredBillList}
        mainList={billList}
        showInList={showInList}
        onListClick={handleListClick}
        onAddEntityClick={handleAddEntityClick}
        onSearchKeyUp={handleSearchKeyUp}
        onExcelFileUploadClick={handleExcelFileUploadClick}
        onClearSelectedFile={handleClearSelectedFile}
      />

      {(action === "add" || action === "update" || showBillFormForView) && (
        <div className="row">
          <BillForm
            billSchema={billSchema}
            billValidations={billValidations}
            emptyBill={emptyBill}
            selectedEntity={selectedEntity}
            userToBeEdited={userToBeEdited}
            action={action}
            flagFormInvalid={flagFormInvalid}
            onFormSubmit={handleFormSubmit}
            onFormCloseClick={handleFormCloseClick}
          />
        </div>
      )}

      {showBillShare && billIdToShare && (
        <BillShare
          billId={billIdToShare}
          onClose={handleCloseBillShare}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
        />
      )}

      {showListContent && (
        <>
          {filteredBillList.length === 0 && billList.length !== 0 && (
            <div className="text-center">Nothing to show</div>
          )}
          {billList.length === 0 && (
            <div className="text-center">List is empty</div>
          )}

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
                    <option key={year} value={year} disabled={year > currentYear}>
                      {year}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {filteredBillList.length !== 0 && (
            <CheckBoxHeaders
              showInList={showInList}
              onListCheckBoxClick={handleListCheckBoxClick}
            />
          )}

          {filteredBillList.length !== 0 && (
            <div className="row my-2 mx-auto p-1 border-bottom pb-2">
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
              <div className="col-2 d-flex justify-content-center align-items-center gap-2">Actions</div>
            </div>
          )}

          {filteredBillList.length !== 0 &&
            filteredBillList.map((e, index) => (
              <div
                className="row mx-auto my-0 py-1 align-items-center"
                key={index}
              >
                <div className="col-1 text-center">{index + 1}</div>
                <div className={`col-${12 - 1 - 2}`}>
                  <Entity
                    entity={e}
                    index={index}
                    sortedField={sortedField}
                    direction={direction}
                    listSize={filteredBillList.length}
                    selectedEntity={selectedEntity}
                    showInList={showInList}
                    VITE_API_URL={import.meta.env.VITE_API_URL}
                    onToggleText={handleToggleText}
                  />
                </div>
                <div className="col-2 d-flex justify-content-center align-items-center gap-2">
                  <button
                    className="btn btn-sm btn-info"
                    onClick={() => handleBillButtonClick(e)}
                  >
                    Bill
                  </button>
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => handleShareButtonClick(e)}
                  >
                    Share
                  </button>
                </div>
              </div>
            ))}
        </>
      )}

      {flagImport && (
        <ModalImport
          modalText={"Summary of Bulk Import"}
          additions={recordsToBeAdded}
          updations={recordsToBeUpdated}
          btnGroup={["Yes", "No"]}
          onModalCloseClick={handleModalCloseClick}
          onModalButtonCancelClick={handleModalButtonCancelClick}
          onImportButtonClick={handleImportButtonClick}
        />
      )}
    </>
  );
}