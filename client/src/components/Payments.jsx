import { useEffect, useState } from "react";
import {
  CommonUtilityBar,
  CheckBoxHeaders,
  ListHeaders,
  Entity,
} from "../external/vite-sdk";
// import AdminProductForm from "./AdminProductForm";
import PaymentForm from "./PaymentForm";
import { BeatLoader } from "react-spinners";
import { getMonthlySummary } from "./MonthlySummary";
import axios from "axios";
import * as XLSX from "xlsx";
import ModalImport from "./ModalImport";
import {
  recordsAddBulk,
  recordsUpdateBulk,
  analyseImportExcelSheet,
} from "../external/vite-sdk";
import { getEmptyObject, getShowInList } from "../external/vite-sdk";

export default function Payments(props) {
  let [paymentList, setPaymentList] = useState([]);
  let [filteredPaymentList, setFilteredPaymentList] = useState([]);
  let [categoryList, setCategoryList] = useState([]);
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
  const currentMonth = (today.getMonth() + 1).toString().padStart(2, "0"); // "01" to "12"
  const currentYear = today.getFullYear().toString();
  const [monthlySummary, setMonthlySummary] = useState([]);
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
    { attribute: "balanceAmount", type: "normal" },
    { attribute: "paidAmount", type: "normal" },
    // { attribute: "modeOfPayment", type: "normal" },
  ];
  let paymentValidations = {
    name: { message: "", mxLen: 200, mnLen: 4, onlyDigits: false },
    totalDelivered: {
      message: "",
      onlyDigits: true,
      mxLen: 5, // assuming no one delivers >99999 litres
    },
    totalMonthlyAmount: {
      message: "",
      onlyDigits: true,
      mxLen: 7, // assuming no bills >10L
    },
    balanceAmount: {
      message: "",
      onlyDigits: true,
      mxLen: 7,
    },
    paidAmount: {
      message: "",
      onlyDigits: true,
      mxLen: 7,
    },
    // modeOfPayment: { message: "" },
  };

  let [showInList, setShowInList] = useState(getShowInList(paymentSchema));
  let [emptyPayment, setEmptyPayment] = useState({
    ...getEmptyObject(paymentSchema),
    roleId: "68691372fa624c1dff2e06be",
    name: "",
    totalDelivered: 0,
    totalMonthlyAmount: 0,
    paidAmount: 0,
    balanceAmount: 0,
  });

  useEffect(() => {
    getData();
  }, [selectedMonth, selectedYear]);

  async function getData() {
    setFlagLoad(true);
    try {
      const [paymentRes, userRes, summaryRes] = await Promise.all([
        axios(import.meta.env.VITE_API_URL + "/payments"),
        axios(import.meta.env.VITE_API_URL + "/users"),
        getMonthlySummary(), // << Use your existing monthly summary function
      ]);

      const paymentListRaw = paymentRes.data;
      const userList = userRes.data;
      const monthlySummary = summaryRes; // already grouped by userId + month
      setMonthlySummary(summaryRes);

      const mergedList = userList
        .filter((user) => user.roleId === "68691372fa624c1dff2e06be")
        .map((user) => {
          const startDate = new Date(user.start_date);
          const startMonth = (startDate.getMonth() + 1)
            .toString()
            .padStart(2, "0");
          const startYear = startDate.getFullYear().toString();

          const selectedYearNum = parseInt(selectedYear);
          const selectedMonthNum = parseInt(selectedMonth);
          const startYearNum = parseInt(startYear);
          const startMonthNum = parseInt(startMonth);

          if (
            startYearNum > selectedYearNum ||
            (startYearNum === selectedYearNum &&
              startMonthNum > selectedMonthNum)
          ) {
            return null;
          }

          // Match summary based on userId and month
          const monthKey = `${selectedYear}-${selectedMonth}`; // e.g., "2025-07"
          const matchingSummary = monthlySummary.find(
            (s) => s.userId === user._id && s.month === monthKey
          );

          const matchingPayment = paymentListRaw.find((payment) => {
            const date = new Date(payment.date || payment.updateDate);
            const month = (date.getMonth() + 1).toString().padStart(2, "0");
            const year = date.getFullYear().toString();
            return (
              payment.userId === user._id &&
              month === selectedMonth &&
              year === selectedYear
            );
          });

          return {
            _id: user._id,
            userId: user._id,
            name: user.name,
            totalDelivered: matchingSummary?.totalDelivered ?? 0,
            totalMonthlyAmount: matchingSummary?.totalMonthlyAmount ?? 0,
            balanceAmount:
              matchingPayment?.balanceAmount ??
              matchingSummary?.totalMonthlyAmount ??
              0,
            paidAmount: matchingPayment?.paidAmount ?? 0,
            // payment_status: matchingPayment?.payment_status ?? "",
            date: matchingPayment?.date ?? "",
          };
        })
        .filter(Boolean);

      mergedList.sort(
        (a, b) => new Date(b.updateDate || 0) - new Date(a.updateDate || 0)
      );

      setPaymentList(mergedList);
      setFilteredPaymentList(mergedList);
    } catch (error) {
      console.error(error);
      showMessage("Something went wrong while fetching data.");
    }
    setFlagLoad(false);
  }

  async function handleFormSubmit(payment) {
    let message;
    let paymentForBackEnd = { ...payment };
    for (let key in paymentForBackEnd) {
      paymentSchema.forEach((e, index) => {
        if (key == e.attribute && e.relationalData) {
          delete paymentForBackEnd[key];
        }
      });
    }
    if (action == "add") {
      // payment = await addPaymentToBackend(payment);
      setFlagLoad(true);
      try {
        // let response = await axios.post(
        //   import.meta.env.VITE_API_URL + "/users",
        //   paymentForBackEnd,
        //   { headers: { "Content-type": "multipart/form-data" } }
        // );
        let response = await axios.post(
          import.meta.env.VITE_API_URL + "/payments",
          paymentForBackEnd,
          // { headers: { "Content-type": "multipart/form-data" } }
        );
        let addedPayment = await response.data; //returned  with id

        for (let key in payment) {
          paymentSchema.forEach((e, index) => {
            if (key == e.attribute && e.relationalData) {
              addedPayment[key] = payment[key];
            }
          });
        }
        message = "Payment added successfully";
        let prList = [...paymentList];
        prList.push(addedPayment);
        prList = prList.sort(
          (a, b) => new Date(b.updateDate) - new Date(a.updateDate)
        );
        setPaymentList(prList);
        let fprList = [...filteredPaymentList];
        fprList.push(addedPayment);
        fprList = fprList.sort(
          (a, b) => new Date(b.updateDate) - new Date(a.updateDate)
        );
        setFilteredPaymentList(fprList);
        showMessage(message);
        setAction("list");
      } catch (error) {
        console.log(error); 
        showMessage("Something went wrong, refresh the page");
        setFlagLoad(false); 
      }
      
      setFlagLoad(false);
    } //...add
    else if (action == "update") {
      payment._id = userToBeEdited._id; // The form does not have id field
      setFlagLoad(true);
      try {
        // let response = await axios.put(
        //   import.meta.env.VITE_API_URL + "/users",
        //   paymentForBackEnd,
        //   { headers: { "Content-type": "multipart/form-data" } }
        // );
        let response = await axios.put(
          import.meta.env.VITE_API_URL + "/payments",
          paymentForBackEnd,
          // { headers: { "Content-type": "multipart/form-data" } }
        );
        payment = await response.data;
        console.log("payment");
        console.log(payment);
        message = "Payment Updated successfully";
        // update the payment list now.
        let prList = paymentList.map((e, index) => {
          if (e._id == payment._id) return payment;
          return e;
        });
        prList = prList.sort(
          (a, b) => new Date(b.updateDate) - new Date(a.updateDate)
        );
        let fprList = filteredPaymentList.map((e, index) => {
          if (e._id == payment._id) return payment;
          return e;
        });
        fprList = fprList.sort(
          (a, b) => new Date(b.updateDate) - new Date(a.updateDate)
        );
        setPaymentList(prList);
        setFilteredPaymentList(fprList);
        showMessage(message);
        setAction("list");
      } catch (error) {
        console.log(error); 
        showMessage("Something went wrong, refresh the page");
        setFlagLoad(false);
      }
      
    } //else ...(update)
    setFlagLoad(false);
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
    // setAction("update");
    // setUserToBeEdited(payment);
    let safePayment = {
      ...emptyPayment,
      ...payment,
      info: payment.info || "",
    };
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
    if (ans == "No") {
      // delete operation cancelled
      showMessage("Delete operation cancelled");
      return;
    }
    if (ans == "Yes") {
      // delete operation allowed
      performDeleteOperation(payment);
    }
  }
  async function performDeleteOperation(payment) {
    setFlagLoad(true);
    try {
      // let response = await axios.delete(
      //   import.meta.env.VITE_API_URL + "/users/" + payment._id
      // );
      let response = await axios.delete(
        import.meta.env.VITE_API_URL + "/payments/" + payment._id
      );
      let r = await response.data;
      message = `Payment - ${payment.name} deleted successfully.`;
      //update the payment list now.
      let prList = paymentList.filter((e, index) => e._id != payment._id);
      setPaymentList(prList);

      let fprList = paymentList.filter((e, index) => e._id != payment._id);
      setFilteredPaymentList(fprList);
      showMessage(message);
    } catch (error) {
      console.log(error);
      showMessage("Something went wrong, refresh the page");
    }
    setFlagLoad(false);
  }
  function handleListCheckBoxClick(checked, selectedIndex) {
    // Minimum 1 field should be shown
    let cnt = 0;
    showInList.forEach((e, index) => {
      if (e.show) {
        cnt++;
      }
    });
    if (cnt == 1 && !checked) {
      showMessage("Minimum 1 field should be selected.");
      return;
    }
    if (cnt == 5 && checked) {
      showMessage("Maximum 5 fields can be selected.");
      return;
    }
    let att = [...showInList];
    let a = att.map((e, index) => {
      let p = { ...e };
      if (index == selectedIndex && checked) {
        p.show = true;
      } else if (index == selectedIndex && !checked) {
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
      // same button clicked twice
      d = !direction;
    } else {
      // different field
      d = false;
    }
    let list = [...filteredPaymentList];
    setDirection(d);
    if (d == false) {
      //in ascending order
      list.sort((a, b) => {
        if (a[field] > b[field]) {
          return 1;
        }
        if (a[field] < b[field]) {
          return -1;
        }
        return 0;
      });
    } else {
      //in descending order
      list.sort((a, b) => {
        if (a[field] < b[field]) {
          return 1;
        }
        if (a[field] > b[field]) {
          return -1;
        }
        return 0;
      });
    }
    setFilteredPaymentList(list);
    setSortedField(field);
  }
  function handleSrNoClick() {
    // let field = selectedEntity.attributes[index].id;
    let d = false;
    if (sortedField === "updateDate") {
      d = !direction;
    } else {
      d = false;
    }

    let list = [...filteredPaymentList];
    setDirection(!direction);
    if (d == false) {
      //in ascending order
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
      //in descending order
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
    // setSelectedList(list);
    setFilteredPaymentList(list);
    setSortedField("updateDate");
  }
  function handleFormTextChangeValidations(message, index) {
    props.onFormTextChangeValidations(message, index);
  }
  function handleSearchKeyUp(event) {
    let searchText = event.target.value;
    setSearchText(searchText);
    performSearchOperation(searchText);
  }
  function performSearchOperation(searchText) {
    let query = searchText.trim();
    if (query.length == 0) {
      setFilteredPaymentList(paymentList);
      return;
    }
    let searchedPayments = [];
    searchedPayments = filterByShowInListAttributes(query);
    setFilteredPaymentList(searchedPayments);
  }
  function filterByName(query) {
    let fList = [];
    for (let i = 0; i < selectedList.length; i++) {
      if (selectedList[i].name.toLowerCase().includes(query.toLowerCase())) {
        fList.push(selectedList[i]);
      }
    } //for
    return fList;
  }
  function filterByShowInListAttributes(query) {
    let fList = [];
    for (let i = 0; i < paymentList.length; i++) {
      for (let j = 0; j < showInList.length; j++) {
        if (showInList[j].show) {
          let parameterName = showInList[j].attribute;
          if (
            paymentList[i][parameterName] &&
            paymentList[i][parameterName]
              .toLowerCase()
              .includes(query.toLowerCase())
          ) {
            fList.push(paymentList[i]);
            break;
          }
        }
      } //inner for
    } //outer for
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
      // Read the workbook from the array buffer
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      // Assume reading the first sheet
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      // Convert to JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      // const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
      setSheetData(jsonData);
      let result = analyseImportExcelSheet(jsonData, paymentList);
      if (result.message) {
        showMessage(result.message);
      } else {
        showImportAnalysis(result);
      }
      // analyseSheetData(jsonData, paymentList);
    };
    // reader.readAsBinaryString(file);
    reader.readAsArrayBuffer(file);
  }
  function showImportAnalysis(result) {
    setCntAdd(result.cntA);
    setCntUpdate(result.cntU);
    setRecordsToBeAdded(result.recordsToBeAdded);
    setRecordsToBeUpdated(result.recordsToBeUpdated);
    //open modal
    setFlagImport(true);
  }
  function handleModalCloseClick() {
    setFlagImport(false);
  }
  async function handleImportButtonClick() {
    setFlagImport(false); // close the modal
    setFlagLoad(true);
    let result;
    try {
      if (recordsToBeAdded.length > 0) {
        result = await recordsAddBulk(
          recordsToBeAdded,
          "payments",
          paymentList,
          import.meta.env.VITE_API_URL
        );
        if (result.success) {
          setPaymentList(result.updatedList);
          setFilteredPaymentList(result.updatedList);
        }
        showMessage(result.message);
      }
      if (recordsToBeUpdated.length > 0) {
        result = await recordsUpdateBulk(
          recordsToBeUpdated,
          "payments",
          paymentList,
          import.meta.env.VITE_API_URL
        );
        if (result.success) {
          setPaymentList(result.updatedList);
          setFilteredPaymentList(result.updatedList);
        }
        showMessage(result.message);
      } //if
    } catch (error) {
      console.log(error);
      showMessage("Something went wrong, refresh the page");
    }
    setFlagLoad(false);
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

      {filteredPaymentList.length == 0 && paymentList.length != 0 && (
        <div className="text-center">Nothing to show</div>
      )}
      {paymentList.length == 0 && (
        <div className="text-center">List is empty</div>
      )}
      {action == "list" && filteredPaymentList.length != 0 && (
        <CheckBoxHeaders
          showInList={showInList}
          onListCheckBoxClick={handleListCheckBoxClick}
        />
      )}
      {action == "list" && filteredPaymentList.length != 0 && (
        <div className="row   my-2 mx-auto  p-1">
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
      {(action == "add" || action == "update") && (
        <div className="row">
          <PaymentForm
            paymentSchema={paymentSchema}
            paymentValidations={paymentValidations}
            emptyPayment={emptyPayment}
            categoryList={categoryList}
            selectedEntity={selectedEntity}
            userToBeEdited={userToBeEdited}
            action={action}
            flagFormInvalid={flagFormInvalid}
            onFormSubmit={handleFormSubmit}
            onFormCloseClick={handleFormCloseClick}
            onFormTextChangeValidations={handleFormTextChangeValidations}
          />
        </div>
      )}
      {action == "list" &&
        filteredPaymentList.length != 0 &&
        filteredPaymentList.map((e, index) => (
          <Entity
            entity={e}
            key={index + 1}
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
