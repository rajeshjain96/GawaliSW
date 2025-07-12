import { useEffect, useState } from "react";
import {CommonUtilityBar,CheckBoxHeaders,ListHeaders,Entity,} from "../external/vite-sdk";
// import AdminProductForm from "./AdminProductForm";
import { BeatLoader } from "react-spinners";
import axios from "axios";
import * as XLSX from "xlsx";
import ModalImport from "./ModalImport";
import ChangeQtyModal from "./ChangeQtyModal";
import {recordsAddBulk,recordsUpdateBulk,analyseImportExcelSheet,} from "../external/vite-sdk";
import { getEmptyObject, getShowInList } from "../external/vite-sdk";
import AdminDailyEntryForm from "./AdminDailyEntryForm";

export default function AdminDailyEntry(props) {
  //added
  const [anotherDate, setAnotherDate] = useState(""); // used when Another Day is selected
  let [showChangeModal, setShowChangeModal] = useState(false);
let [modalUser, setModalUser] = useState(null);
let [modalQty, setModalQty] = useState("");
//till here  
  let [selectedIds, setSelectedIds] = useState([]);
  let [entryList, setEntryList] = useState([]);
  let [filteredEntryList, setFilteredEntryList] = useState([]);
  //   let [categoryList, setCategoryList] = useState([]);
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

  let [recordsToBeAdded, setRecordsToBeAdded] = useState([]);
  let [recordsToBeUpdated, setRecordsToBeUpdated] = useState([]);
  let [cntUpdate, setCntUpdate] = useState(0);
  let [cntAdd, setCntAdd] = useState(0);
  let { selectedEntity } = props;
  let { flagFormInvalid } = props;
  let { flagToggleButton } = props;
  // NEW STATE for date option
const [selectedDateOption, setSelectedDateOption] = useState("Today");

// NEW FUNCTION to resolve actual date string
function resolveSelectedDate(option, customDate = "") {
  const today = new Date();
  if (option === "Today") return today.toISOString().split("T")[0];
  if (option === "Yesterday") {
    const yest = new Date(today);
    yest.setDate(yest.getDate() - 1);
    return yest.toISOString().split("T")[0];
  }
  if (option === "Another Day" && customDate) return customDate;
  return today.toISOString().split("T")[0];
}

  let entrySchema = [
    { attribute: "name", type: "normal" },
    { attribute: "daily_qty", type: "normal" },
    { attribute: "delivered_qty", type: "normal" }, 
  {
    attribute: "entry_status", 
    type: "normal",
    // options: ["Delivered", "Khada", "Change"],
    show : true
  },
      ];
  let entryValidations = {
    name: { message: "", mxLen: 200, mnLen: 4, onlyDigits: false },
    
    daily_qty: { message: "", onlyDigits: true },
    delivered_qty: { message: "", onlyDigits: true }, 
  entry_status: { message: "" },
   
  };

  let [showInList, setShowInList] = useState(getShowInList(entrySchema));

 let [emptyEntry, setEmptyEntry] = useState({
    ...getEmptyObject(entrySchema),
    // status: "active",
    // role: "",
    roleId: "68691372fa624c1dff2e06be",
    name: "",
    
    daily_qty: "",
    delivered_qty: "",      
  entry_status: "",
      });

  // useEffect(() => {
  //   getData();
  // }, []);
  useEffect(() => {
    fetchDataForSelectedDate();
  }, []);
  
  async function getData(dateToFetch) {
    setFlagLoad(true);
    try {
      const [entryRes, userRes] = await Promise.all([
        axios(import.meta.env.VITE_API_URL + "/entries"),
        axios(import.meta.env.VITE_API_URL + "/users"),
      ]);
  
      const entryListRaw = entryRes.data;
      const userList = userRes.data;
  
      const today = dateToFetch; // passed date here
  
      const mergedList = userList
        .filter((user) => user.roleId === "68691372fa624c1dff2e06be")
        .map((user) => {
          const todayEntry = entryListRaw.find(
            (entry) =>
              entry.userId === user._id &&
              entry.date?.split("T")[0] === today
          );
  
          return {
            _id: user._id,
            userId: user._id,
            name: user.name,
            daily_qty: user.daily_qty,
            delivered_qty: todayEntry?.delivered_qty ?? "",
            entry_status: todayEntry?.entry_status || "",
            date: todayEntry?.date || today,
            updateDate: todayEntry?.updateDate || "",
            entryId: todayEntry?._id || null,
          };
        });
  
      mergedList.sort(
        (a, b) => new Date(b.updateDate || 0) - new Date(a.updateDate || 0)
      );
  
      setEntryList(mergedList);
      setFilteredEntryList(mergedList);
    } catch (error) {
      console.error(error);
      showMessage("Something went wrong while fetching data.");
    }
    setFlagLoad(false);
  }
  
  
  
  async function handleFormSubmit(entry) {
    let message;
    // now remove relational data
    let entryForBackEnd = { ...entry };
    for (let key in entryForBackEnd) {
      entrySchema.forEach((e, index) => {
        if (key == e.attribute && e.relationalData) {
          delete entryForBackEnd[key];
        }
      });
    }
    if (action == "add") {
      // entry = await addEntryToBackend(entry);
      setFlagLoad(true);
      try {
        let response = await axios.post(
          import.meta.env.VITE_API_URL + "/entries",
          entryForBackEnd,
          { headers: { "Content-type": "multipart/form-data" } }
        );
        let addedEntry = await response.data; //returned  with id
       
        for (let key in entry) {
          entrySchema.forEach((e, index) => {
            if (key == e.attribute && e.relationalData) {
              addedEntry[key] = entry[key];
            }
          });
        }
        message = "Entry added successfully";
        // update the entry list now.
        let prList = [...entryList];
        prList.push(addedEntry);
        prList = prList.sort(
          (a, b) => new Date(b.updateDate) - new Date(a.updateDate)
        );
        setEntryList(prList);
        let fprList = [...filteredEntryList];
        fprList.push(addedEntry);
        fprList = fprList.sort(
          (a, b) => new Date(b.updateDate) - new Date(a.updateDate)
        );
        setFilteredEntryList(fprList);
        // update the list in sorted order of updateDate
        showMessage(message);
        setAction("list");
      } catch (error) {
        console.log(error);
        showMessage("Something went wrong, refresh the page");
      }
      setFlagLoad(false);
    } //...add
    else if (action == "update") {
      entry._id = userToBeEdited._id; // The form does not have id field
      setFlagLoad(true);
      try {
                let response = await axios.put(
          import.meta.env.VITE_API_URL + "/entries",
          entryForBackEnd,
          { headers: { "Content-type": "multipart/form-data" } }
        );
        entry = await response.data;
        message = "Entry Updated successfully";
        // update the entry list now.
        let prList = entryList.map((e, index) => {
          if (e._id == entry._id) return entry;
          return e;
        });
        prList = prList.sort(
          (a, b) => new Date(b.updateDate) - new Date(a.updateDate)
        );
        let fprList = filteredEntryList.map((e, index) => {
          if (e._id == entry._id) return entry;
          return e;
        });
        fprList = fprList.sort(
          (a, b) => new Date(b.updateDate) - new Date(a.updateDate)
        );
        setEntryList(prList);
        setFilteredEntryList(fprList);
        showMessage(message);
        setAction("list");
      } catch (error) {
        showMessage("Something went wrong, refresh the page");
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
  function handleEditButtonClick(entry) {
    
    let safeEntry = {
      ...emptyEntry,
      ...entry,
      info: entry.info || "",
    };
    setAction("update");
    setUserToBeEdited(safeEntry);
  }
  function showMessage(message) {
    setMessage(message);
    window.setTimeout(() => {
      setMessage("");
    }, 3000);
  }

async function handleModalQtySubmit() {
  if (!modalUser || modalQty === "") {
    showMessage("Please enter a valid quantity.");
    return;
  }

  const today = resolveSelectedDate(selectedDateOption, anotherDate);


  const entryData = {
    userId: modalUser.userId,
    name: modalUser.name,
    daily_qty: modalUser.daily_qty,
    delivered_qty: modalQty,
    entry_status: "Change",
    date: today,
  };

  const url = modalUser.entryId
    ? `${import.meta.env.VITE_API_URL}/entries/${modalUser.entryId}`
    : `${import.meta.env.VITE_API_URL}/entries`;

  const method = modalUser.entryId ? axios.put : axios.post;

  try {
    await method(url, entryData, {
      headers: { "Content-type": "application/json" },
    });

    showMessage("Entry updated to 'Change'");
    setSelectedIds([]);
    setShowChangeModal(false);
    getData(resolveSelectedDate(selectedDateOption, anotherDate));
// Refresh list
  } catch (error) {
    console.error("Change update failed:", error);
    showMessage("Failed to update entry");
  }
}

  function handleDeleteButtonClick(ans, entry) {
    if (ans == "No") {
      // delete operation cancelled
      showMessage("Delete operation cancelled");
      return;
    }
    if (ans == "Yes") {
      // delete operation allowed
      performDeleteOperation(entry);
    }
  }

async function handleDeliverButtonClick() {
  const today = resolveSelectedDate(selectedDateOption, anotherDate);


  for (const id of selectedIds) {
    const entry = entryList.find((e) => e._id === id);

    const entryData = {
      userId: entry.userId,
      name: entry.name,
      daily_qty: entry.daily_qty,
      delivered_qty: entry.daily_qty,
      entry_status: "Delivered",
      date: today,
    };

    const url = entry.entryId
      ? `${import.meta.env.VITE_API_URL}/entries/${entry.entryId}`
      : `${import.meta.env.VITE_API_URL}/entries`;

    const method = entry.entryId ? axios.put : axios.post;

    try {
      await method(url, entryData, {
        headers: { "Content-type": "application/json" },
      });
    } catch (err) {
      console.error(err);
      showMessage("Failed to mark as Delivered for " + entry.name);
    }
  }

  showMessage("Marked selected entries as Delivered");
  setSelectedIds([]);
  getData(resolveSelectedDate(selectedDateOption, anotherDate));
}


  //  async function handleKhadaButtonClick() {
  //   const today = new Date().toISOString().split("T")[0];
  
  //   for (const id of selectedIds) {
  //     const user = entryList.find((u) => u._id === id);
  //     const existingEntry = entryList.find(
  //       (entry) => entry.userId === user._id && entry.date?.split("T")[0] === today
  //     );
  
  //     const entryData = {
  //       userId: user._id,
  //       name: user.name,
  //       daily_qty: user.daily_qty,
  //       delivered_qty: 0,
  //       entry_status: "Khada",
  //       date: today,
  //     };
  
  //     try {
  //       if (existingEntry) {
  //         await axios.put(
  //           import.meta.env.VITE_API_URL + "/entries/" + existingEntry._id,
  //           entryData,
  //           { headers: { "Content-type": "application/json" } }
  //         );
  //       } else {
  //         await axios.post(
  //           import.meta.env.VITE_API_URL + "/entries",
  //           entryData,
  //           { headers: { "Content-type": "application/json" } }
  //         );
  //       }
  //     } catch (error) {
  //       console.error("Error updating/creating entry for", user.name, error);
  //       showMessage(`Failed for ${user.name}`);
  //     }
  //   }
  
  //   showMessage("Marked selected entries as Khada");
  //   setSelectedIds([]);
  //   getData();
  // }
  async function handleKhadaButtonClick() {
    const today = resolveSelectedDate(selectedDateOption, anotherDate);

  
    for (const id of selectedIds) {
      const userEntry = entryList.find((e) => e._id === id); // _id is userId
      const entryId = userEntry.entryId;
  
      const entryData = {
        userId: userEntry.userId,
        name: userEntry.name,
        daily_qty: userEntry.daily_qty,
        delivered_qty: 0, // <-- This is important
        entry_status: "Khada",
        date: today,
      };
  
      const url = entryId
        ? `${import.meta.env.VITE_API_URL}/entries/${entryId}`
        : `${import.meta.env.VITE_API_URL}/entries`;
  
      const method = entryId ? axios.put : axios.post;
  
      try {
        await method(url, entryData, {
          headers: { "Content-type": "application/json" },
        });
      } catch (error) {
        console.error("Error for", userEntry.name, error);
        showMessage(`Failed to mark Khada for ${userEntry.name}`);
      }
    }
  
    showMessage("Marked selected entries as Khada");
    setSelectedIds([]);
    getData(resolveSelectedDate(selectedDateOption, anotherDate));
  }
  
  function handleChangeButtonClick() {
    if (selectedIds.length !== 1) {
      showMessage("Select exactly one user to change delivered quantity.");
      return;
    }
    const user = entryList.find((u) => u._id === selectedIds[0]);
    setModalUser(user);
    setModalQty(user.delivered_qty || ""); // Pre-fill if exists
    setShowChangeModal(true);
  }

   async function performDeleteOperation(entry) {
  setFlagLoad(true);
  try {
    // Delete from backend using entryId (not _id)
    await axios.delete(
      import.meta.env.VITE_API_URL + "/entries/" + entry.entryId
    );

    const updatedEntry = {
      ...entry,
      delivered_qty: "",
      entry_status: "",
      entryId: null,
      updateDate: "", // Optional: reset updateDate if desired
    };

    const updatedEntryList = entryList.map((e) =>
      e._id === entry._id ? updatedEntry : e
    );
    const updatedFilteredList = filteredEntryList.map((e) =>
      e._id === entry._id ? updatedEntry : e
    );

    setEntryList(updatedEntryList);
    setFilteredEntryList(updatedFilteredList);

    showMessage(`Entry - ${entry.name} deleted successfully.`);
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
    let list = [...filteredEntryList];
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
    setFilteredEntryList(list);
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

    let list = [...filteredEntryList];
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
    setFilteredEntryList(list);
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
      setFilteredEntryList(entryList);
      return;
    }
    let searchedEntrys = [];
    searchedEntrys = filterByShowInListAttributes(query);
    setFilteredEntryList(searchedEntrys);
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
    for (let i = 0; i < entryList.length; i++) {
      for (let j = 0; j < showInList.length; j++) {
        if (showInList[j].show) {
          let parameterName = showInList[j].attribute;
          if (
            entryList[i][parameterName] &&
            entryList[i][parameterName]
              .toLowerCase()
              .includes(query.toLowerCase())
          ) {
            fList.push(entryList[i]);
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
      let result = analyseImportExcelSheet(jsonData, entryList);
      if (result.message) {
        showMessage(result.message);
      } else {
        showImportAnalysis(result);
      }
      // analyseSheetData(jsonData, entryList);
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
          "users",
          entryList,
          import.meta.env.VITE_API_URL
        );
        if (result.success) {
          setEntryList(result.updatedList);
          setFilteredEntryList(result.updatedList);
        }
        showMessage(result.message);
      }
      if (recordsToBeUpdated.length > 0) {
        result = await recordsUpdateBulk(
          recordsToBeUpdated,
          "users",
          entryList,
          import.meta.env.VITE_API_URL
        );
        if (result.success) {
          setEntryList(result.updatedList);
          setFilteredEntryList(result.updatedList);
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

  function fetchDataForSelectedDate(option = selectedDateOption, customDate = anotherDate) {
    const actualDate = resolveSelectedDate(option, customDate);
    getData(actualDate); // Pass actual date directly
  }
  
  return (
    <>
      <CommonUtilityBar
        action={action}
        message={message}
        selectedEntity={selectedEntity}
        flagToggleButton={flagToggleButton}
        filteredList={filteredEntryList}
        mainList={entryList}
        showInList={showInList}
        onListClick={handleListClick}
        onAddEntityClick={handleAddEntityClick}
        onSearchKeyUp={handleSearchKeyUp}
        onExcelFileUploadClick={handleExcelFileUploadClick}
        onClearSelectedFile={handleClearSelectedFile}
      />

      {filteredEntryList.length == 0 && entryList.length != 0 && (
        <div className="text-center">Nothing to show</div>
      )}
      {entryList.length == 0 && (
        <div className="text-center">List is empty</div>
      )}
       {action === "list" && (
  <div className="text-center my-2">
    <label className="fw-bold me-2">Select Date:</label>

    <div className="d-inline-block mx-2">
      <input
        type="radio"
        name="dateOption"
        value="Today"
        checked={selectedDateOption === "Today"}
        onChange={(e) => {
          setSelectedDateOption(e.target.value);
          fetchDataForSelectedDate(e.target.value);
        }}
      />{" "}
      Today
    </div>

    <div className="d-inline-block mx-2">
      <input
        type="radio"
        name="dateOption"
        value="Yesterday"
        checked={selectedDateOption === "Yesterday"}
        onChange={(e) => {
          setSelectedDateOption(e.target.value);
          fetchDataForSelectedDate(e.target.value);
        }}
      />{" "}
      Yesterday
    </div>

    <div className="d-inline-block mx-2">
      <input
        type="radio"
        name="dateOption"
        value="Another Day"
        checked={selectedDateOption === "Another Day"}
        onChange={(e) => {
          setSelectedDateOption(e.target.value);
        }}
      />{" "}
      Another Day
    </div>

    {selectedDateOption === "Another Day" && (
      <input
        type="date"
        value={anotherDate}
        className="mx-2"
        onChange={(e) => {
          setAnotherDate(e.target.value);
          fetchDataForSelectedDate("Another Day", e.target.value);
        }}
      />
    )}
  </div>
)}

      {action == "list" && filteredEntryList.length != 0 && (
        <CheckBoxHeaders
          showInList={showInList}
          onListCheckBoxClick={handleListCheckBoxClick}
        />
      )}
    
{action === "list" && selectedIds.length > 0 && (
  <div className="text-center my-3">
    <button className="btn btn-success mx-1" onClick={handleDeliverButtonClick}>
      Delivered
    </button>
    <button className="text-center btn btn-warning mx-1" onClick={handleKhadaButtonClick}>
      Khada
    </button>
    {selectedIds.length === 1 && (
      <button className="text-center btn btn-secondary mx-1" onClick={handleChangeButtonClick}>
        Change
      </button>
    )}
  </div>
)}

      {action == "list" && filteredEntryList.length != 0 && (
        <div className="row my-2 mx-auto p-1">
          <div className="col-1">
            <input
              type="checkbox"
              checked={
                selectedIds.length === filteredEntryList.length &&
                filteredEntryList.length !== 0
              }
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedIds(filteredEntryList.map((entry) => entry._id));
                } else {
                  setSelectedIds([]);
                }
              }}
            />
          </div>
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
          <AdminDailyEntryForm
            entrySchema={entrySchema}
            entryValidations={entryValidations}
            emptyEntry={emptyEntry}
            // categoryList={categoryList}
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
      {/* added */}
      {showChangeModal && (
  <ChangeQtyModal
    user={modalUser}
    qty={modalQty}
    onQtyChange={(e) => setModalQty(e.target.value)}
    onSave={handleModalQtySubmit}
    onClose={() => setShowChangeModal(false)}
  />
)}

      {action === "list" &&
        filteredEntryList.length !== 0 &&
        filteredEntryList.map((e, index) => (
<div
  className={`row mx-auto  mt-2 my-1 ${
    e.entry_status === "Delivered"
      ? "bg-success bg-opacity-25"
      : e.entry_status === "Change"
      ? "bg-warning bg-opacity-25"
      : e.entry_status === "Khada"
      ? "bg-secondary bg-opacity-25"
      : ""
  }`}
  key={index}
>
            <div className="col-1 d-flex align-items-center">
              <input
                type="checkbox"
                checked={selectedIds.includes(e._id)}
                onChange={(ev) => {
                  if (ev.target.checked) {
                    setSelectedIds((prev) => [...prev, e._id]);
                  } else {
                    setSelectedIds((prev) => prev.filter((id) => id !== e._id));
                  }
                }}
              />
            </div>
            <div className="col-11">
              <Entity
                entity={e}
                index={index}
                sortedField={sortedField}
                direction={direction}
                listSize={filteredEntryList.length}
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

























// import { useEffect, useState } from "react";
// import {CommonUtilityBar,CheckBoxHeaders,ListHeaders,Entity,} from "../external/vite-sdk";
// // import AdminProductForm from "./AdminProductForm";
// import { BeatLoader } from "react-spinners";
// import axios from "axios";
// import * as XLSX from "xlsx";
// import ModalImport from "./ModalImport";
// import ChangeQtyModal from "./ChangeQtyModal";
// import {recordsAddBulk,recordsUpdateBulk,analyseImportExcelSheet,} from "../external/vite-sdk";
// import { getEmptyObject, getShowInList } from "../external/vite-sdk";
// import AdminDailyEntryForm from "./AdminDailyEntryForm";

// export default function AdminDailyEntry(props) {
//   //added
//   const [anotherDate, setAnotherDate] = useState(""); // used when Another Day is selected
//   let [showChangeModal, setShowChangeModal] = useState(false);
// let [modalUser, setModalUser] = useState(null);
// let [modalQty, setModalQty] = useState("");
// //till here  
//   let [selectedIds, setSelectedIds] = useState([]);
//   let [entryList, setEntryList] = useState([]);
//   let [filteredEntryList, setFilteredEntryList] = useState([]);
//   //   let [categoryList, setCategoryList] = useState([]);
//   let [action, setAction] = useState("list");
//   let [userToBeEdited, setUserToBeEdited] = useState("");
//   let [flagLoad, setFlagLoad] = useState(false);
//   let [flagImport, setFlagImport] = useState(false);
//   let [message, setMessage] = useState("");
//   let [searchText, setSearchText] = useState("");
//   let [sortedField, setSortedField] = useState("");
//   let [direction, setDirection] = useState("");
//   let [sheetData, setSheetData] = useState(null);
//   let [selectedFile, setSelectedFile] = useState("");

//   let [recordsToBeAdded, setRecordsToBeAdded] = useState([]);
//   let [recordsToBeUpdated, setRecordsToBeUpdated] = useState([]);
//   let [cntUpdate, setCntUpdate] = useState(0);
//   let [cntAdd, setCntAdd] = useState(0);
//   let { selectedEntity } = props;
//   let { flagFormInvalid } = props;
//   let { flagToggleButton } = props;
//   // NEW STATE for date option
// const [selectedDateOption, setSelectedDateOption] = useState("Today");

// // NEW FUNCTION to resolve actual date string
// function resolveSelectedDate(option, customDate = "") {
//   const today = new Date();
//   if (option === "Today") return today.toISOString().split("T")[0];
//   if (option === "Yesterday") {
//     const yest = new Date(today);
//     yest.setDate(yest.getDate() - 1);
//     return yest.toISOString().split("T")[0];
//   }
//   if (option === "Another Day" && customDate) return customDate;
//   return today.toISOString().split("T")[0];
// }



//   let entrySchema = [
//     { attribute: "name", type: "normal" },
//     { attribute: "daily_qty", type: "normal" },
//     { attribute: "delivered_qty", type: "normal" }, 
//   {
//     attribute: "entry_status", 
//     type: "dropdown",
//     options: ["Delivered", "Khada", "Change"],
//     show : true
//   },
//       ];
//   let entryValidations = {
//     name: { message: "", mxLen: 200, mnLen: 4, onlyDigits: false },
    
//     daily_qty: { message: "", onlyDigits: true },
//     delivered_qty: { message: "", onlyDigits: true }, 
//   entry_status: { message: "" },
   
//   };

//   let [showInList, setShowInList] = useState(getShowInList(entrySchema));

//  let [emptyEntry, setEmptyEntry] = useState({
//     ...getEmptyObject(entrySchema),
//     // status: "active",
//     // role: "",
//     roleId: "68691372fa624c1dff2e06be",
//     name: "",
    
//     daily_qty: "",
//     delivered_qty: "",      
//   entry_status: "",
//       });

//   // useEffect(() => {
//   //   getData();
//   // }, []);
//   useEffect(() => {
//     fetchDataForSelectedDate(); // <-- uses your selected date option
//   }, []);
  
//   //   async function getData() {
//   //   setFlagLoad(true);
//   //   try {
//   //     let response = await axios(import.meta.env.VITE_API_URL + "/entries");
//   //     let response1 = await axios(import.meta.env.VITE_API_URL + "/users");

//   //     let entryList = response.data;
//   //     let userList = response1.data;
//   //     console.log(userList , "userList");
//   //     console.log(entryList , "entryList");
  
//   //     entryList = entryList.sort(
//   //       (a, b) => new Date(b.updateDate) - new Date(a.updateDate)
//   //     );
  
//   //     setEntryList(entryList);
//   //     setFilteredEntryList(entryList);
//   //   } catch (error) {
//   //     showMessage("Something went wrong, refresh the page");
//   //   }
//   //   setFlagLoad(false);
//   // }
//   async function getData() {
//     setFlagLoad(true);
//     try {
//       const [entryRes, userRes] = await Promise.all([
//         axios(import.meta.env.VITE_API_URL + "/entries"),
//         axios(import.meta.env.VITE_API_URL + "/users"),
//       ]);
  
//       const entryListRaw = entryRes.data;
//       const userList = userRes.data;
  
//       // const today = new Date().toISOString().split("T")[0];
//       // const today = resolveSelectedDate(selectedDateOption, anotherDate);
//       const today = resolveSelectedDate(selectedDateOption, anotherDate);

//       // Construct new entryList by combining user info and today’s entry if exists
//         const mergedList = userList
//   .filter((user) => user.roleId === "68691372fa624c1dff2e06be")
//   .map((user) => {
//     const todayEntry = entryListRaw.find(
//       (entry) =>
//         entry.userId === user._id &&
//         entry.date?.split("T")[0] === today
//     );

//     return {
//       _id: user._id,
//       userId: user._id,
//       name: user.name,
//       daily_qty: user.daily_qty,
//       delivered_qty: todayEntry?.delivered_qty ?? "",
//       entry_status: todayEntry?.entry_status || "",
//       date: todayEntry?.date || today,
//       updateDate: todayEntry?.updateDate || "",
//       entryId: todayEntry?._id || null,
//     };
//   });

  
//       // Sort by updateDate descending
//       mergedList.sort(
//         (a, b) => new Date(b.updateDate || 0) - new Date(a.updateDate || 0)
//       );
  
//       setEntryList(mergedList);
//       setFilteredEntryList(mergedList);
//     } catch (error) {
//       console.error(error);
//       showMessage("Something went wrong while fetching data.");
//     }
//     setFlagLoad(false);
//   }
  
  
//   async function handleFormSubmit(entry) {
//     let message;
//     // now remove relational data
//     let entryForBackEnd = { ...entry };
//     for (let key in entryForBackEnd) {
//       entrySchema.forEach((e, index) => {
//         if (key == e.attribute && e.relationalData) {
//           delete entryForBackEnd[key];
//         }
//       });
//     }
//     if (action == "add") {
//       // entry = await addEntryToBackend(entry);
//       setFlagLoad(true);
//       try {
//         let response = await axios.post(
//           import.meta.env.VITE_API_URL + "/entries",
//           entryForBackEnd,
//           { headers: { "Content-type": "multipart/form-data" } }
//         );
//         let addedEntry = await response.data; //returned  with id
       
//         for (let key in entry) {
//           entrySchema.forEach((e, index) => {
//             if (key == e.attribute && e.relationalData) {
//               addedEntry[key] = entry[key];
//             }
//           });
//         }
//         message = "Entry added successfully";
//         // update the entry list now.
//         let prList = [...entryList];
//         prList.push(addedEntry);
//         prList = prList.sort(
//           (a, b) => new Date(b.updateDate) - new Date(a.updateDate)
//         );
//         setEntryList(prList);
//         let fprList = [...filteredEntryList];
//         fprList.push(addedEntry);
//         fprList = fprList.sort(
//           (a, b) => new Date(b.updateDate) - new Date(a.updateDate)
//         );
//         setFilteredEntryList(fprList);
//         // update the list in sorted order of updateDate
//         showMessage(message);
//         setAction("list");
//       } catch (error) {
//         console.log(error);
//         showMessage("Something went wrong, refresh the page");
//       }
//       setFlagLoad(false);
//     } //...add
//     else if (action == "update") {
//       entry._id = userToBeEdited._id; // The form does not have id field
//       setFlagLoad(true);
//       try {
//                 let response = await axios.put(
//           import.meta.env.VITE_API_URL + "/entries",
//           entryForBackEnd,
//           { headers: { "Content-type": "multipart/form-data" } }
//         );
//         entry = await response.data;
//         message = "Entry Updated successfully";
//         // update the entry list now.
//         let prList = entryList.map((e, index) => {
//           if (e._id == entry._id) return entry;
//           return e;
//         });
//         prList = prList.sort(
//           (a, b) => new Date(b.updateDate) - new Date(a.updateDate)
//         );
//         let fprList = filteredEntryList.map((e, index) => {
//           if (e._id == entry._id) return entry;
//           return e;
//         });
//         fprList = fprList.sort(
//           (a, b) => new Date(b.updateDate) - new Date(a.updateDate)
//         );
//         setEntryList(prList);
//         setFilteredEntryList(fprList);
//         showMessage(message);
//         setAction("list");
//       } catch (error) {
//         showMessage("Something went wrong, refresh the page");
//       }
//     } //else ...(update)
//     setFlagLoad(false);
//   }
//   function handleFormCloseClick() {
//     props.onFormCloseClick();
//   }
//   function handleListClick() {
//     setAction("list");
//   }
//   function handleAddEntityClick() {
//     setAction("add");
//   }
//   function handleEditButtonClick(entry) {
//     // setAction("update");
//     // setUserToBeEdited(entry);
//     let safeEntry = {
//       ...emptyEntry,
//       ...entry,
//       info: entry.info || "",
//     };
//     setAction("update");
//     setUserToBeEdited(safeEntry);
//   }
//   function showMessage(message) {
//     setMessage(message);
//     window.setTimeout(() => {
//       setMessage("");
//     }, 3000);
//   }

// // async function handleModalQtySubmit() {
// //   if (!modalUser || modalQty === "") {
// //     showMessage("Please enter a valid quantity.");
// //     return;
// //   }

// //   const today = new Date().toISOString().split("T")[0];

// //   const changedEntry = {
// //     userId: modalUser._id,
// //     name: modalUser.name,
// //     daily_qty: modalUser.daily_qty,
// //     delivered_qty: modalQty,
// //     entry_status: "Change",
// //     date: today,
// //   };

// //   const existingEntry = entryList.find(
// //     (entry) => entry.userId === modalUser._id && entry.date?.split("T")[0] === today
// //   );

// //   try {
// //     if (existingEntry) {
// //       await axios.put(
// //         import.meta.env.VITE_API_URL + "/entries/" + existingEntry._id,
// //         changedEntry,
// //         { headers: { "Content-type": "application/json" } }
// //       );
// //     } else {
// //       await axios.post(
// //         import.meta.env.VITE_API_URL + "/entries",
// //         changedEntry,
// //         { headers: { "Content-type": "application/json" } }
// //       );
// //     }

// //     showMessage("Entry updated to 'Change'");
// //     setSelectedIds([]);
// //     setShowChangeModal(false);
// //     getData(); // Refresh list
// //   } catch (error) {
// //     console.error("Change update failed:", error);
// //     showMessage("Failed to update entry");
// //   }
// // }
// async function handleModalQtySubmit() {
//   if (!modalUser || modalQty === "") {
//     showMessage("Please enter a valid quantity.");
//     return;
//   }

//   const today = new Date().toISOString().split("T")[0];

//   const entryData = {
//     userId: modalUser.userId,
//     name: modalUser.name,
//     daily_qty: modalUser.daily_qty,
//     delivered_qty: modalQty,
//     entry_status: "Change",
//     date: today,
//   };

//   const url = modalUser.entryId
//     ? `${import.meta.env.VITE_API_URL}/entries/${modalUser.entryId}`
//     : `${import.meta.env.VITE_API_URL}/entries`;

//   const method = modalUser.entryId ? axios.put : axios.post;

//   try {
//     await method(url, entryData, {
//       headers: { "Content-type": "application/json" },
//     });

//     showMessage("Entry updated to 'Change'");
//     setSelectedIds([]);
//     setShowChangeModal(false);
//     getData(); // Refresh list
//   } catch (error) {
//     console.error("Change update failed:", error);
//     showMessage("Failed to update entry");
//   }
// }




//   function handleDeleteButtonClick(ans, entry) {
//     if (ans == "No") {
//       // delete operation cancelled
//       showMessage("Delete operation cancelled");
//       return;
//     }
//     if (ans == "Yes") {
//       // delete operation allowed
//       performDeleteOperation(entry);
//     }
//   }


// // async function handleDeliverButtonClick() {
// //   const today = new Date().toISOString().split("T")[0];

// //   for (const id of selectedIds) {
// //     const user = entryList.find((u) => u._id === id);
// //     const existingEntry = entryList.find(
// //       (entry) => entry.userId === user._id && entry.date?.split("T")[0] === today
// //     );

// //     const entryData = {
// //       userId: user._id,
// //       name: user.name,
// //       daily_qty: user.daily_qty,
// //       delivered_qty: user.daily_qty,
// //       entry_status: "Delivered",
// //       date: today,
// //     };

// //     try {
// //       if (existingEntry) {
// //         // UPDATE
// //         await axios.put(
// //           import.meta.env.VITE_API_URL + "/entries/" + existingEntry._id,
// //           entryData,
// //           { headers: { "Content-type": "application/json" } }
// //         );
// //       } else {
// //         // ADD
// //         await axios.post(
// //           import.meta.env.VITE_API_URL + "/entries",
// //           entryData,
// //           { headers: { "Content-type": "application/json" } }
// //         );
// //       }
// //     } catch (error) {
// //       console.error("Error updating/creating entry for", user.name, error);
// //       showMessage(`Failed for ${user.name}`);
// //     }
// //   }

// //   showMessage("Marked selected entries as Delivered");
// //   setSelectedIds([]);
// //   getData(); // Refresh entryList
// // }
// async function handleDeliverButtonClick() {
//   const today = new Date().toISOString().split("T")[0];

//   for (const id of selectedIds) {
//     const entry = entryList.find((e) => e._id === id);

//     const entryData = {
//       userId: entry.userId,
//       name: entry.name,
//       daily_qty: entry.daily_qty,
//       delivered_qty: entry.daily_qty,
//       entry_status: "Delivered",
//       date: today,
//     };

//     const url = entry.entryId
//       ? `${import.meta.env.VITE_API_URL}/entries/${entry.entryId}`
//       : `${import.meta.env.VITE_API_URL}/entries`;

//     const method = entry.entryId ? axios.put : axios.post;

//     try {
//       await method(url, entryData, {
//         headers: { "Content-type": "application/json" },
//       });
//     } catch (err) {
//       console.error(err);
//       showMessage("Failed to mark as Delivered for " + entry.name);
//     }
//   }

//   showMessage("Marked selected entries as Delivered");
//   setSelectedIds([]);
//   getData();
// }


//   //  async function handleKhadaButtonClick() {
//   //   const today = new Date().toISOString().split("T")[0];
  
//   //   for (const id of selectedIds) {
//   //     const user = entryList.find((u) => u._id === id);
//   //     const existingEntry = entryList.find(
//   //       (entry) => entry.userId === user._id && entry.date?.split("T")[0] === today
//   //     );
  
//   //     const entryData = {
//   //       userId: user._id,
//   //       name: user.name,
//   //       daily_qty: user.daily_qty,
//   //       delivered_qty: 0,
//   //       entry_status: "Khada",
//   //       date: today,
//   //     };
  
//   //     try {
//   //       if (existingEntry) {
//   //         await axios.put(
//   //           import.meta.env.VITE_API_URL + "/entries/" + existingEntry._id,
//   //           entryData,
//   //           { headers: { "Content-type": "application/json" } }
//   //         );
//   //       } else {
//   //         await axios.post(
//   //           import.meta.env.VITE_API_URL + "/entries",
//   //           entryData,
//   //           { headers: { "Content-type": "application/json" } }
//   //         );
//   //       }
//   //     } catch (error) {
//   //       console.error("Error updating/creating entry for", user.name, error);
//   //       showMessage(`Failed for ${user.name}`);
//   //     }
//   //   }
  
//   //   showMessage("Marked selected entries as Khada");
//   //   setSelectedIds([]);
//   //   getData();
//   // }
//   async function handleKhadaButtonClick() {
//     const today = new Date().toISOString().split("T")[0];
  
//     for (const id of selectedIds) {
//       const userEntry = entryList.find((e) => e._id === id); // _id is userId
//       const entryId = userEntry.entryId;
  
//       const entryData = {
//         userId: userEntry.userId,
//         name: userEntry.name,
//         daily_qty: userEntry.daily_qty,
//         delivered_qty: 0, // <-- This is important
//         entry_status: "Khada",
//         date: today,
//       };
  
//       const url = entryId
//         ? `${import.meta.env.VITE_API_URL}/entries/${entryId}`
//         : `${import.meta.env.VITE_API_URL}/entries`;
  
//       const method = entryId ? axios.put : axios.post;
  
//       try {
//         await method(url, entryData, {
//           headers: { "Content-type": "application/json" },
//         });
//       } catch (error) {
//         console.error("Error for", userEntry.name, error);
//         showMessage(`Failed to mark Khada for ${userEntry.name}`);
//       }
//     }
  
//     showMessage("Marked selected entries as Khada");
//     setSelectedIds([]);
//     getData();
//   }
  
//   function handleChangeButtonClick() {
//     if (selectedIds.length !== 1) {
//       showMessage("Select exactly one user to change delivered quantity.");
//       return;
//     }
//     const user = entryList.find((u) => u._id === selectedIds[0]);
//     setModalUser(user);
//     setModalQty(user.delivered_qty || ""); // Pre-fill if exists
//     setShowChangeModal(true);
//   }

//    async function performDeleteOperation(entry) {
//   setFlagLoad(true);
//   try {
//     // Delete from backend using entryId (not _id)
//     await axios.delete(
//       import.meta.env.VITE_API_URL + "/entries/" + entry.entryId
//     );

//     const updatedEntry = {
//       ...entry,
//       delivered_qty: "",
//       entry_status: "",
//       entryId: null,
//       updateDate: "", // Optional: reset updateDate if desired
//     };

//     const updatedEntryList = entryList.map((e) =>
//       e._id === entry._id ? updatedEntry : e
//     );
//     const updatedFilteredList = filteredEntryList.map((e) =>
//       e._id === entry._id ? updatedEntry : e
//     );

//     setEntryList(updatedEntryList);
//     setFilteredEntryList(updatedFilteredList);

//     showMessage(`Entry - ${entry.name} deleted successfully.`);
//   } catch (error) {
//     console.log(error);
//     showMessage("Something went wrong, refresh the page");
//   }
//   setFlagLoad(false);
// }

//   function handleListCheckBoxClick(checked, selectedIndex) {
//     // Minimum 1 field should be shown
//     let cnt = 0;
//     showInList.forEach((e, index) => {
//       if (e.show) {
//         cnt++;
//       }
//     });
//     if (cnt == 1 && !checked) {
//       showMessage("Minimum 1 field should be selected.");
//       return;
//     }
//     if (cnt == 5 && checked) {
//       showMessage("Maximum 5 fields can be selected.");
//       return;
//     }
//     let att = [...showInList];
//     let a = att.map((e, index) => {
//       let p = { ...e };
//       if (index == selectedIndex && checked) {
//         p.show = true;
//       } else if (index == selectedIndex && !checked) {
//         p.show = false;
//       }
//       return p;
//     });
//     setShowInList(a);
//   }
//   function handleHeaderClick(index) {
//     let field = showInList[index].attribute;
//     let d = false;
//     if (field === sortedField) {
//       // same button clicked twice
//       d = !direction;
//     } else {
//       // different field
//       d = false;
//     }
//     let list = [...filteredEntryList];
//     setDirection(d);
//     if (d == false) {
//       //in ascending order
//       list.sort((a, b) => {
//         if (a[field] > b[field]) {
//           return 1;
//         }
//         if (a[field] < b[field]) {
//           return -1;
//         }
//         return 0;
//       });
//     } else {
//       //in descending order
//       list.sort((a, b) => {
//         if (a[field] < b[field]) {
//           return 1;
//         }
//         if (a[field] > b[field]) {
//           return -1;
//         }
//         return 0;
//       });
//     }
//     setFilteredEntryList(list);
//     setSortedField(field);
//   }
//   function handleSrNoClick() {
//     // let field = selectedEntity.attributes[index].id;
//     let d = false;
//     if (sortedField === "updateDate") {
//       d = !direction;
//     } else {
//       d = false;
//     }

//     let list = [...filteredEntryList];
//     setDirection(!direction);
//     if (d == false) {
//       //in ascending order
//       list.sort((a, b) => {
//         if (new Date(a["updateDate"]) > new Date(b["updateDate"])) {
//           return 1;
//         }
//         if (new Date(a["updateDate"]) < new Date(b["updateDate"])) {
//           return -1;
//         }
//         return 0;
//       });
//     } else {
//       //in descending order
//       list.sort((a, b) => {
//         if (new Date(a["updateDate"]) < new Date(b["updateDate"])) {
//           return 1;
//         }
//         if (new Date(a["updateDate"]) > new Date(b["updateDate"])) {
//           return -1;
//         }
//         return 0;
//       });
//     }
//     // setSelectedList(list);
//     setFilteredEntryList(list);
//     setSortedField("updateDate");
//   }
//   function handleFormTextChangeValidations(message, index) {
//     props.onFormTextChangeValidations(message, index);
//   }
//   function handleSearchKeyUp(event) {
//     let searchText = event.target.value;
//     setSearchText(searchText);
//     performSearchOperation(searchText);
//   }
//   function performSearchOperation(searchText) {
//     let query = searchText.trim();
//     if (query.length == 0) {
//       setFilteredEntryList(entryList);
//       return;
//     }
//     let searchedEntrys = [];
//     searchedEntrys = filterByShowInListAttributes(query);
//     setFilteredEntryList(searchedEntrys);
//   }
//   function filterByName(query) {
//     let fList = [];
//     for (let i = 0; i < selectedList.length; i++) {
//       if (selectedList[i].name.toLowerCase().includes(query.toLowerCase())) {
//         fList.push(selectedList[i]);
//       }
//     } //for
//     return fList;
//   }
//   function filterByShowInListAttributes(query) {
//     let fList = [];
//     for (let i = 0; i < entryList.length; i++) {
//       for (let j = 0; j < showInList.length; j++) {
//         if (showInList[j].show) {
//           let parameterName = showInList[j].attribute;
//           if (
//             entryList[i][parameterName] &&
//             entryList[i][parameterName]
//               .toLowerCase()
//               .includes(query.toLowerCase())
//           ) {
//             fList.push(entryList[i]);
//             break;
//           }
//         }
//       } //inner for
//     } //outer for
//     return fList;
//   }
//   function handleToggleText(index) {
//     let sil = [...showInList];
//     sil[index].flagReadMore = !sil[index].flagReadMore;
//     setShowInList(sil);
//   }
//   function handleExcelFileUploadClick(file, msg) {
//     if (msg) {
//       showMessage(message);
//       return;
//     }
//     setSelectedFile(file);
//     const reader = new FileReader();
//     reader.onload = (event) => {
//       const arrayBuffer = event.target.result;
//       // Read the workbook from the array buffer
//       const workbook = XLSX.read(arrayBuffer, { type: "array" });
//       // Assume reading the first sheet
//       const sheetName = workbook.SheetNames[0];
//       const worksheet = workbook.Sheets[sheetName];
//       // Convert to JSON
//       const jsonData = XLSX.utils.sheet_to_json(worksheet);
//       // const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
//       setSheetData(jsonData);
//       let result = analyseImportExcelSheet(jsonData, entryList);
//       if (result.message) {
//         showMessage(result.message);
//       } else {
//         showImportAnalysis(result);
//       }
//       // analyseSheetData(jsonData, entryList);
//     };
//     // reader.readAsBinaryString(file);
//     reader.readAsArrayBuffer(file);
//   }
//   function showImportAnalysis(result) {
//     setCntAdd(result.cntA);
//     setCntUpdate(result.cntU);
//     setRecordsToBeAdded(result.recordsToBeAdded);
//     setRecordsToBeUpdated(result.recordsToBeUpdated);
//     //open modal
//     setFlagImport(true);
//   }
//   function handleModalCloseClick() {
//     setFlagImport(false);
//   }
//   async function handleImportButtonClick() {
//     setFlagImport(false); // close the modal
//     setFlagLoad(true);
//     let result;
//     try {
//       if (recordsToBeAdded.length > 0) {
//         result = await recordsAddBulk(
//           recordsToBeAdded,
//           "users",
//           entryList,
//           import.meta.env.VITE_API_URL
//         );
//         if (result.success) {
//           setEntryList(result.updatedList);
//           setFilteredEntryList(result.updatedList);
//         }
//         showMessage(result.message);
//       }
//       if (recordsToBeUpdated.length > 0) {
//         result = await recordsUpdateBulk(
//           recordsToBeUpdated,
//           "users",
//           entryList,
//           import.meta.env.VITE_API_URL
//         );
//         if (result.success) {
//           setEntryList(result.updatedList);
//           setFilteredEntryList(result.updatedList);
//         }
//         showMessage(result.message);
//       } //if
//     } catch (error) {
//       console.log(error);
//       showMessage("Something went wrong, refresh the page");
//     }
//     setFlagLoad(false);
//   }
//   function handleClearSelectedFile() {
//     setSelectedFile(null);
//   }
//   if (flagLoad) {
//     return (
//       <div className="my-5 text-center">
//         <BeatLoader size={24} color={"blue"} />
//       </div>
//     );
//   }
//   // NEW WRAPPER for getData()
//   function fetchDataForSelectedDate(option = selectedDateOption, customDate = anotherDate) {
//     const actualDate = resolveSelectedDate(option, customDate);
  
//     const _Date = Date;
//     globalThis.Date = class extends _Date {
//       constructor(...args) {
//         if (args.length === 0) return new _Date(actualDate + "T00:00:00");
//         return new _Date(...args);
//       }
//       static now() {
//         return new _Date(actualDate + "T00:00:00").getTime();
//       }
//     };
  
//     getData();
  
//     globalThis.Date = _Date;
//   }
  

//   return (
//     <>
//       <CommonUtilityBar
//         action={action}
//         message={message}
//         selectedEntity={selectedEntity}
//         flagToggleButton={flagToggleButton}
//         filteredList={filteredEntryList}
//         mainList={entryList}
//         showInList={showInList}
//         onListClick={handleListClick}
//         onAddEntityClick={handleAddEntityClick}
//         onSearchKeyUp={handleSearchKeyUp}
//         onExcelFileUploadClick={handleExcelFileUploadClick}
//         onClearSelectedFile={handleClearSelectedFile}
//       />

//       {filteredEntryList.length == 0 && entryList.length != 0 && (
//         <div className="text-center">Nothing to show</div>
//       )}
//       {entryList.length == 0 && (
//         <div className="text-center">List is empty</div>
//       )}
//        {action === "list" && (
//   <div className="text-center my-2">
//     <label className="fw-bold me-2">Select Date:</label>

//     <div className="d-inline-block mx-2">
//       <input
//         type="radio"
//         name="dateOption"
//         value="Today"
//         checked={selectedDateOption === "Today"}
//         onChange={(e) => {
//           setSelectedDateOption(e.target.value);
//           fetchDataForSelectedDate(e.target.value);
//         }}
//       />{" "}
//       Today
//     </div>

//     <div className="d-inline-block mx-2">
//       <input
//         type="radio"
//         name="dateOption"
//         value="Yesterday"
//         checked={selectedDateOption === "Yesterday"}
//         onChange={(e) => {
//           setSelectedDateOption(e.target.value);
//           fetchDataForSelectedDate(e.target.value);
//         }}
//       />{" "}
//       Yesterday
//     </div>

//     <div className="d-inline-block mx-2">
//       <input
//         type="radio"
//         name="dateOption"
//         value="Another Day"
//         checked={selectedDateOption === "Another Day"}
//         onChange={(e) => {
//           setSelectedDateOption(e.target.value);
//         }}
//       />{" "}
//       Another Day
//     </div>

//     {selectedDateOption === "Another Day" && (
//       <input
//         type="date"
//         value={anotherDate}
//         className="mx-2"
//         onChange={(e) => {
//           setAnotherDate(e.target.value);
//           fetchDataForSelectedDate("Another Day", e.target.value);
//         }}
//       />
//     )}
//   </div>
// )}


//       {action == "list" && filteredEntryList.length != 0 && (
//         <CheckBoxHeaders
//           showInList={showInList}
//           onListCheckBoxClick={handleListCheckBoxClick}
//         />
//       )}
    
// {action === "list" && selectedIds.length > 0 && (
//   <div className="text-center my-3">
//     <button className="btn btn-primary mx-1" onClick={handleDeliverButtonClick}>
//       Delivered
//     </button>
//     <button className="btn btn-warning mx-1" onClick={handleKhadaButtonClick}>
//       Khada
//     </button>
//     {selectedIds.length === 1 && (
//       <button className="btn btn-danger mx-1" onClick={handleChangeButtonClick}>
//         Change
//       </button>
//     )}
//   </div>
// )}



//       {action == "list" && filteredEntryList.length != 0 && (
//         <div className="row my-2 mx-auto p-1">
//           <div className="col-1">
//             <input
//               type="checkbox"
//               checked={
//                 selectedIds.length === filteredEntryList.length &&
//                 filteredEntryList.length !== 0
//               }
//               onChange={(e) => {
//                 if (e.target.checked) {
//                   setSelectedIds(filteredEntryList.map((entry) => entry._id));
//                 } else {
//                   setSelectedIds([]);
//                 }
//               }}
//             />
//           </div>
//           <div className="col-1">
//             <a
//               href="#"
//               onClick={() => {
//                 handleSrNoClick();
//               }}
//             >
//               SN.{" "}
//               {sortedField == "updateDate" && direction && (
//                 <i className="bi bi-arrow-up"></i>
//               )}
//               {sortedField == "updateDate" && !direction && (
//                 <i className="bi bi-arrow-down"></i>
//               )}
//             </a>
//           </div>
//           <ListHeaders
//             showInList={showInList}
//             sortedField={sortedField}
//             direction={direction}
//             onHeaderClick={handleHeaderClick}
//           />
//           <div className="col-1">&nbsp;</div>
//         </div>
//       )}
//       {(action == "add" || action == "update") && (
//         <div className="row">
//           <AdminDailyEntryForm
//             entrySchema={entrySchema}
//             entryValidations={entryValidations}
//             emptyEntry={emptyEntry}
//             // categoryList={categoryList}
//             selectedEntity={selectedEntity}
//             userToBeEdited={userToBeEdited}
//             action={action}
//             flagFormInvalid={flagFormInvalid}
//             onFormSubmit={handleFormSubmit}
//             onFormCloseClick={handleFormCloseClick}
//             onFormTextChangeValidations={handleFormTextChangeValidations}
//           />
//         </div>
//       )}
//       {/* added */}
//       {showChangeModal && (
//   <ChangeQtyModal
//     user={modalUser}
//     qty={modalQty}
//     onQtyChange={(e) => setModalQty(e.target.value)}
//     onSave={handleModalQtySubmit}
//     onClose={() => setShowChangeModal(false)}
//   />
// )}



//       {action === "list" &&
//         filteredEntryList.length !== 0 &&
//         filteredEntryList.map((e, index) => (
//           <div className="row mx-auto my-1" key={index}>
//             <div className="col-1 d-flex align-items-center">
//               <input
//                 type="checkbox"
//                 checked={selectedIds.includes(e._id)}
//                 onChange={(ev) => {
//                   if (ev.target.checked) {
//                     setSelectedIds((prev) => [...prev, e._id]);
//                   } else {
//                     setSelectedIds((prev) => prev.filter((id) => id !== e._id));
//                   }
//                 }}
//               />
//             </div>
//             <div className="col-11">
//               <Entity
//                 entity={e}
//                 index={index}
//                 sortedField={sortedField}
//                 direction={direction}
//                 listSize={filteredEntryList.length}
//                 selectedEntity={selectedEntity}
//                 showInList={showInList}
//                 VITE_API_URL={import.meta.env.VITE_API_URL}
//                 onEditButtonClick={handleEditButtonClick}
//                 onDeleteButtonClick={handleDeleteButtonClick}
//                 onToggleText={handleToggleText}
//               />
//             </div>
//           </div>
//         ))}

//       {flagImport && (
//         <ModalImport
//           modalText={"Summary of Bulk Import"}
//           additions={recordsToBeAdded}
//           updations={recordsToBeUpdated}
//           btnGroup={["Yes", "No"]}
//           onModalCloseClick={handleModalCloseClick}
//           onModalButtonCancelClick={handleModalCloseClick}
//           onImportButtonClick={handleImportButtonClick}
//         />
//       )}
//     </>
//   );
// }






















// import { useEffect, useState } from "react";
// import {CommonUtilityBar,CheckBoxHeaders,ListHeaders,Entity,} from "../external/vite-sdk";
// // import AdminProductForm from "./AdminProductForm";
// import { BeatLoader } from "react-spinners";
// import axios from "axios";
// import * as XLSX from "xlsx";
// import ModalImport from "./ModalImport";
// import ChangeQtyModal from "./ChangeQtyModal";
// import {recordsAddBulk,recordsUpdateBulk,analyseImportExcelSheet,} from "../external/vite-sdk";
// import { getEmptyObject, getShowInList } from "../external/vite-sdk";
// import AdminDailyEntryForm from "./AdminDailyEntryForm";

// export default function AdminDailyEntry(props) {
//   //added
//   let [showChangeModal, setShowChangeModal] = useState(false);
// let [modalUser, setModalUser] = useState(null);
// let [modalQty, setModalQty] = useState("");
// //till here  
//   let [selectedIds, setSelectedIds] = useState([]);
//   let [entryList, setEntryList] = useState([]);
//   let [filteredEntryList, setFilteredEntryList] = useState([]);
//   //   let [categoryList, setCategoryList] = useState([]);
//   let [action, setAction] = useState("list");
//   let [userToBeEdited, setUserToBeEdited] = useState("");
//   let [flagLoad, setFlagLoad] = useState(false);
//   let [flagImport, setFlagImport] = useState(false);
//   let [message, setMessage] = useState("");
//   let [searchText, setSearchText] = useState("");
//   let [sortedField, setSortedField] = useState("");
//   let [direction, setDirection] = useState("");
//   let [sheetData, setSheetData] = useState(null);
//   let [selectedFile, setSelectedFile] = useState("");

//   let [recordsToBeAdded, setRecordsToBeAdded] = useState([]);
//   let [recordsToBeUpdated, setRecordsToBeUpdated] = useState([]);
//   let [cntUpdate, setCntUpdate] = useState(0);
//   let [cntAdd, setCntAdd] = useState(0);
//   let { selectedEntity } = props;
//   let { flagFormInvalid } = props;
//   let { flagToggleButton } = props;

//   let entrySchema = [
//     { attribute: "name", type: "normal" },
//     { attribute: "daily_qty", type: "normal" },
//     { attribute: "delivered_qty", type: "normal" }, 
//   {
//     attribute: "entry_status", 
//     type: "dropdown",
//     options: ["Delivered", "Khada", "Change"],
//     show : true
//   },
//       ];
//   let entryValidations = {
//     name: { message: "", mxLen: 200, mnLen: 4, onlyDigits: false },
    
//     daily_qty: { message: "", onlyDigits: true },
//     delivered_qty: { message: "", onlyDigits: true }, 
//   entry_status: { message: "" },
   
//   };

//   let [showInList, setShowInList] = useState(getShowInList(entrySchema));

//  let [emptyEntry, setEmptyEntry] = useState({
//     ...getEmptyObject(entrySchema),
//     // status: "active",
//     // role: "",
//     roleId: "68691372fa624c1dff2e06be",
//     name: "",
    
//     daily_qty: "",
//     delivered_qty: "",      
//   entry_status: "",
//       });

//   useEffect(() => {
//     getData();
//   }, []);
//   //   async function getData() {
//   //   setFlagLoad(true);
//   //   try {
//   //     let response = await axios(import.meta.env.VITE_API_URL + "/entries");
//   //     let response1 = await axios(import.meta.env.VITE_API_URL + "/users");

//   //     let entryList = response.data;
//   //     let userList = response1.data;
//   //     console.log(userList , "userList");
//   //     console.log(entryList , "entryList");
  
//   //     entryList = entryList.sort(
//   //       (a, b) => new Date(b.updateDate) - new Date(a.updateDate)
//   //     );
  
//   //     setEntryList(entryList);
//   //     setFilteredEntryList(entryList);
//   //   } catch (error) {
//   //     showMessage("Something went wrong, refresh the page");
//   //   }
//   //   setFlagLoad(false);
//   // }
//   async function getData() {
//     setFlagLoad(true);
//     try {
//       const [entryRes, userRes] = await Promise.all([
//         axios(import.meta.env.VITE_API_URL + "/entries"),
//         axios(import.meta.env.VITE_API_URL + "/users"),
//       ]);
  
//       const entryListRaw = entryRes.data;
//       const userList = userRes.data;
  
//       const today = new Date().toISOString().split("T")[0];
  
//       // Construct new entryList by combining user info and today’s entry if exists
//         const mergedList = userList
//   .filter((user) => user.roleId === "68691372fa624c1dff2e06be")
//   .map((user) => {
//     const todayEntry = entryListRaw.find(
//       (entry) =>
//         entry.userId === user._id &&
//         entry.date?.split("T")[0] === today
//     );

//     return {
//       _id: todayEntry?._id || user._id,
//       userId: user._id,
//       name: user.name,
//       daily_qty: user.daily_qty,
//       delivered_qty: todayEntry?.delivered_qty ?? "",
//       entry_status: todayEntry?.entry_status || "",
//       date: todayEntry?.date || today,
//       updateDate: todayEntry?.updateDate || "",
//       entryId: todayEntry ? todayEntry._id : null,
//     };
//   });

  
//       // Sort by updateDate descending
//       mergedList.sort(
//         (a, b) => new Date(b.updateDate || 0) - new Date(a.updateDate || 0)
//       );
  
//       setEntryList(mergedList);
//       setFilteredEntryList(mergedList);
//     } catch (error) {
//       console.error(error);
//       showMessage("Something went wrong while fetching data.");
//     }
//     setFlagLoad(false);
//   }
  
  
//   async function handleFormSubmit(entry) {
//     let message;
//     // now remove relational data
//     let entryForBackEnd = { ...entry };
//     for (let key in entryForBackEnd) {
//       entrySchema.forEach((e, index) => {
//         if (key == e.attribute && e.relationalData) {
//           delete entryForBackEnd[key];
//         }
//       });
//     }
//     if (action == "add") {
//       // entry = await addEntryToBackend(entry);
//       setFlagLoad(true);
//       try {
//         let response = await axios.post(
//           import.meta.env.VITE_API_URL + "/entries",
//           entryForBackEnd,
//           { headers: { "Content-type": "multipart/form-data" } }
//         );
//         let addedEntry = await response.data; //returned  with id
       
//         for (let key in entry) {
//           entrySchema.forEach((e, index) => {
//             if (key == e.attribute && e.relationalData) {
//               addedEntry[key] = entry[key];
//             }
//           });
//         }
//         message = "Entry added successfully";
//         // update the entry list now.
//         let prList = [...entryList];
//         prList.push(addedEntry);
//         prList = prList.sort(
//           (a, b) => new Date(b.updateDate) - new Date(a.updateDate)
//         );
//         setEntryList(prList);
//         let fprList = [...filteredEntryList];
//         fprList.push(addedEntry);
//         fprList = fprList.sort(
//           (a, b) => new Date(b.updateDate) - new Date(a.updateDate)
//         );
//         setFilteredEntryList(fprList);
//         // update the list in sorted order of updateDate
//         showMessage(message);
//         setAction("list");
//       } catch (error) {
//         console.log(error);
//         showMessage("Something went wrong, refresh the page");
//       }
//       setFlagLoad(false);
//     } //...add
//     else if (action == "update") {
//       entry._id = userToBeEdited._id; // The form does not have id field
//       setFlagLoad(true);
//       try {
//                 let response = await axios.put(
//           import.meta.env.VITE_API_URL + "/entries",
//           entryForBackEnd,
//           { headers: { "Content-type": "multipart/form-data" } }
//         );
//         entry = await response.data;
//         message = "Entry Updated successfully";
//         // update the entry list now.
//         let prList = entryList.map((e, index) => {
//           if (e._id == entry._id) return entry;
//           return e;
//         });
//         prList = prList.sort(
//           (a, b) => new Date(b.updateDate) - new Date(a.updateDate)
//         );
//         let fprList = filteredEntryList.map((e, index) => {
//           if (e._id == entry._id) return entry;
//           return e;
//         });
//         fprList = fprList.sort(
//           (a, b) => new Date(b.updateDate) - new Date(a.updateDate)
//         );
//         setEntryList(prList);
//         setFilteredEntryList(fprList);
//         showMessage(message);
//         setAction("list");
//       } catch (error) {
//         showMessage("Something went wrong, refresh the page");
//       }
//     } //else ...(update)
//     setFlagLoad(false);
//   }
//   function handleFormCloseClick() {
//     props.onFormCloseClick();
//   }
//   function handleListClick() {
//     setAction("list");
//   }
//   function handleAddEntityClick() {
//     setAction("add");
//   }
//   function handleEditButtonClick(entry) {
//     // setAction("update");
//     // setUserToBeEdited(entry);
//     let safeEntry = {
//       ...emptyEntry,
//       ...entry,
//       info: entry.info || "",
//     };
//     setAction("update");
//     setUserToBeEdited(safeEntry);
//   }
//   function showMessage(message) {
//     setMessage(message);
//     window.setTimeout(() => {
//       setMessage("");
//     }, 3000);
//   }

// // async function handleModalQtySubmit() {
// //   if (!modalUser || modalQty === "") {
// //     showMessage("Please enter a valid quantity.");
// //     return;
// //   }

// //   const today = new Date().toISOString().split("T")[0];

// //   const changedEntry = {
// //     userId: modalUser._id,
// //     name: modalUser.name,
// //     daily_qty: modalUser.daily_qty,
// //     delivered_qty: modalQty,
// //     entry_status: "Change",
// //     date: today,
// //   };

// //   const existingEntry = entryList.find(
// //     (entry) => entry.userId === modalUser._id && entry.date?.split("T")[0] === today
// //   );

// //   try {
// //     if (existingEntry) {
// //       await axios.put(
// //         import.meta.env.VITE_API_URL + "/entries/" + existingEntry._id,
// //         changedEntry,
// //         { headers: { "Content-type": "application/json" } }
// //       );
// //     } else {
// //       await axios.post(
// //         import.meta.env.VITE_API_URL + "/entries",
// //         changedEntry,
// //         { headers: { "Content-type": "application/json" } }
// //       );
// //     }

// //     showMessage("Entry updated to 'Change'");
// //     setSelectedIds([]);
// //     setShowChangeModal(false);
// //     getData(); // Refresh list
// //   } catch (error) {
// //     console.error("Change update failed:", error);
// //     showMessage("Failed to update entry");
// //   }
// // }
// async function handleModalQtySubmit() {
//   if (!modalUser || modalQty === "") {
//     showMessage("Please enter a valid quantity.");
//     return;
//   }

//   const today = new Date().toISOString().split("T")[0];

//   const entryData = {
//     userId: modalUser.userId,
//     name: modalUser.name,
//     daily_qty: modalUser.daily_qty,
//     delivered_qty: modalQty,
//     entry_status: "Change",
//     date: today,
//   };

//   const url = modalUser.entryId
//     ? `${import.meta.env.VITE_API_URL}/entries/${modalUser.entryId}`
//     : `${import.meta.env.VITE_API_URL}/entries`;

//   const method = modalUser.entryId ? axios.put : axios.post;

//   try {
//     await method(url, entryData, {
//       headers: { "Content-type": "application/json" },
//     });

//     showMessage("Entry updated to 'Change'");
//     setSelectedIds([]);
//     setShowChangeModal(false);
//     getData(); // Refresh list
//   } catch (error) {
//     console.error("Change update failed:", error);
//     showMessage("Failed to update entry");
//   }
// }




//   function handleDeleteButtonClick(ans, entry) {
//     if (ans == "No") {
//       // delete operation cancelled
//       showMessage("Delete operation cancelled");
//       return;
//     }
//     if (ans == "Yes") {
//       // delete operation allowed
//       performDeleteOperation(entry);
//     }
//   }


// // async function handleDeliverButtonClick() {
// //   const today = new Date().toISOString().split("T")[0];

// //   for (const id of selectedIds) {
// //     const user = entryList.find((u) => u._id === id);
// //     const existingEntry = entryList.find(
// //       (entry) => entry.userId === user._id && entry.date?.split("T")[0] === today
// //     );

// //     const entryData = {
// //       userId: user._id,
// //       name: user.name,
// //       daily_qty: user.daily_qty,
// //       delivered_qty: user.daily_qty,
// //       entry_status: "Delivered",
// //       date: today,
// //     };

// //     try {
// //       if (existingEntry) {
// //         // UPDATE
// //         await axios.put(
// //           import.meta.env.VITE_API_URL + "/entries/" + existingEntry._id,
// //           entryData,
// //           { headers: { "Content-type": "application/json" } }
// //         );
// //       } else {
// //         // ADD
// //         await axios.post(
// //           import.meta.env.VITE_API_URL + "/entries",
// //           entryData,
// //           { headers: { "Content-type": "application/json" } }
// //         );
// //       }
// //     } catch (error) {
// //       console.error("Error updating/creating entry for", user.name, error);
// //       showMessage(`Failed for ${user.name}`);
// //     }
// //   }

// //   showMessage("Marked selected entries as Delivered");
// //   setSelectedIds([]);
// //   getData(); // Refresh entryList
// // }
// async function handleDeliverButtonClick() {
//   const today = new Date().toISOString().split("T")[0];

//   for (const id of selectedIds) {
//     const entry = entryList.find((e) => e._id === id);

//     const entryData = {
//       userId: entry.userId,
//       name: entry.name,
//       daily_qty: entry.daily_qty,
//       delivered_qty: entry.daily_qty,
//       entry_status: "Delivered",
//       date: today,
//     };

//     const url = entry.entryId
//       ? `${import.meta.env.VITE_API_URL}/entries/${entry.entryId}`
//       : `${import.meta.env.VITE_API_URL}/entries`;

//     const method = entry.entryId ? axios.put : axios.post;

//     try {
//       await method(url, entryData, {
//         headers: { "Content-type": "application/json" },
//       });
//     } catch (err) {
//       console.error(err);
//       showMessage("Failed to mark as Delivered for " + entry.name);
//     }
//   }

//   showMessage("Marked selected entries as Delivered");
//   setSelectedIds([]);
//   getData();
// }


//   //  async function handleKhadaButtonClick() {
//   //   const today = new Date().toISOString().split("T")[0];
  
//   //   for (const id of selectedIds) {
//   //     const user = entryList.find((u) => u._id === id);
//   //     const existingEntry = entryList.find(
//   //       (entry) => entry.userId === user._id && entry.date?.split("T")[0] === today
//   //     );
  
//   //     const entryData = {
//   //       userId: user._id,
//   //       name: user.name,
//   //       daily_qty: user.daily_qty,
//   //       delivered_qty: 0,
//   //       entry_status: "Khada",
//   //       date: today,
//   //     };
  
//   //     try {
//   //       if (existingEntry) {
//   //         await axios.put(
//   //           import.meta.env.VITE_API_URL + "/entries/" + existingEntry._id,
//   //           entryData,
//   //           { headers: { "Content-type": "application/json" } }
//   //         );
//   //       } else {
//   //         await axios.post(
//   //           import.meta.env.VITE_API_URL + "/entries",
//   //           entryData,
//   //           { headers: { "Content-type": "application/json" } }
//   //         );
//   //       }
//   //     } catch (error) {
//   //       console.error("Error updating/creating entry for", user.name, error);
//   //       showMessage(`Failed for ${user.name}`);
//   //     }
//   //   }
  
//   //   showMessage("Marked selected entries as Khada");
//   //   setSelectedIds([]);
//   //   getData();
//   // }
//   async function handleKhadaButtonClick() {
//     const today = new Date().toISOString().split("T")[0];
  
//     for (const id of selectedIds) {
//       const userEntry = entryList.find((e) => e._id === id); // _id is userId
//       const entryId = userEntry.entryId;
  
//       const entryData = {
//         userId: userEntry.userId,
//         name: userEntry.name,
//         daily_qty: userEntry.daily_qty,
//         delivered_qty: 0, // <-- This is important
//         entry_status: "Khada",
//         date: today,
//       };
//       console.log("entryId:", entryId, "data:", entryData);

//       const url = entryId
//         ? `${import.meta.env.VITE_API_URL}/entries/${entryId}`
//         : `${import.meta.env.VITE_API_URL}/entries`;
  
//       const method = entryId ? axios.put : axios.post;
  
//       try {
//         await method(url, entryData, {
//           headers: { "Content-type": "application/json" },
//         });
//       } catch (error) {
//         console.error("Error for", userEntry.name, error);
//         showMessage(`Failed to mark Khada for ${userEntry.name}`);
//       }
//     }
  
//     showMessage("Marked selected entries as Khada");
//     setSelectedIds([]);
//     getData();
//   }
  
  





//   // async function handleChangeButtonClick() {
//   //   const today = new Date().toISOString().split("T")[0];
  
//   //   const changedEntry = {
//   //     userId: modalUser._id,
//   //     name: modalUser.name,
//   //     daily_qty: modalUser.daily_qty,
//   //     delivered_qty: modalQty,
//   //     entry_status: "Change",
//   //     date: today,
//   //   };
  
//   //   try {
//   //     const response = await axios.post(
//   //       import.meta.env.VITE_API_URL + "/entries/bulk-add",
//   //       [changedEntry],
//   //       { headers: { "Content-type": "application/json" } }
//   //     );
  
//   //     const updatedList = entryList.map((entry) => {
//   //       if (entry._id === modalUser._id) {
//   //         return {
//   //           ...entry,
//   //           delivered_qty: modalQty,
//   //           entry_status: "Change",
//   //         };
//   //       }
//   //       return entry;
//   //     });
  
//   //     setEntryList(updatedList);
//   //     setFilteredEntryList(updatedList);
//   //     showMessage("Entry updated to 'Change'");
//   //     setSelectedIds([]);
//   //     setShowChangeModal(false);
//   //   } catch (error) {
//   //     console.error("Change update failed:", error);
//   //     showMessage("Failed to update entry");
//   //   }
//   // }

//   // function handleChangeButtonClick() {
//   //   if (selectedIds.length !== 1) {
//   //     showMessage("Select exactly one user to change delivered quantity.");
//   //     return;
//   //   }
//   //   const user = entryList.find((u) => u._id === selectedIds[0]);
//   //   setModalUser(user);
//   //   setModalQty(user.delivered_qty || ""); // Pre-fill with existing value
//   //   setShowChangeModal(true);
//   // }
//   function handleChangeButtonClick() {
//     if (selectedIds.length !== 1) {
//       showMessage("Select exactly one user to change delivered quantity.");
//       return;
//     }
//     const user = entryList.find((u) => u._id === selectedIds[0]);
//     setModalUser(user);
//     setModalQty(user.delivered_qty || ""); // Pre-fill if exists
//     setShowChangeModal(true);
//   }
  
  
  

//   async function performDeleteOperation(entry) {
//     setFlagLoad(true);
//     try {
//       // let response = await axios.delete(
//       //   import.meta.env.VITE_API_URL + "/users/" + entry._id
//       // );
//       let response = await axios.delete(
//         import.meta.env.VITE_API_URL + "/entries/" + entry._id
//       );
//       let r = await response.data;
//       message = `Entry - ${entry.name} deleted successfully.`;
//       //update the entry list now.
//       let prList = entryList.filter((e, index) => e._id != entry._id);
//       setEntryList(prList);

//       let fprList = entryList.filter((e, index) => e._id != entry._id);
//       setFilteredEntryList(fprList);
//       showMessage(message);
//     } catch (error) {
//       console.log(error);
//       showMessage("Something went wrong, refresh the page");
//     }
//     setFlagLoad(false);
//   }
//   function handleListCheckBoxClick(checked, selectedIndex) {
//     // Minimum 1 field should be shown
//     let cnt = 0;
//     showInList.forEach((e, index) => {
//       if (e.show) {
//         cnt++;
//       }
//     });
//     if (cnt == 1 && !checked) {
//       showMessage("Minimum 1 field should be selected.");
//       return;
//     }
//     if (cnt == 5 && checked) {
//       showMessage("Maximum 5 fields can be selected.");
//       return;
//     }
//     let att = [...showInList];
//     let a = att.map((e, index) => {
//       let p = { ...e };
//       if (index == selectedIndex && checked) {
//         p.show = true;
//       } else if (index == selectedIndex && !checked) {
//         p.show = false;
//       }
//       return p;
//     });
//     setShowInList(a);
//   }
//   function handleHeaderClick(index) {
//     let field = showInList[index].attribute;
//     let d = false;
//     if (field === sortedField) {
//       // same button clicked twice
//       d = !direction;
//     } else {
//       // different field
//       d = false;
//     }
//     let list = [...filteredEntryList];
//     setDirection(d);
//     if (d == false) {
//       //in ascending order
//       list.sort((a, b) => {
//         if (a[field] > b[field]) {
//           return 1;
//         }
//         if (a[field] < b[field]) {
//           return -1;
//         }
//         return 0;
//       });
//     } else {
//       //in descending order
//       list.sort((a, b) => {
//         if (a[field] < b[field]) {
//           return 1;
//         }
//         if (a[field] > b[field]) {
//           return -1;
//         }
//         return 0;
//       });
//     }
//     setFilteredEntryList(list);
//     setSortedField(field);
//   }
//   function handleSrNoClick() {
//     // let field = selectedEntity.attributes[index].id;
//     let d = false;
//     if (sortedField === "updateDate") {
//       d = !direction;
//     } else {
//       d = false;
//     }

//     let list = [...filteredEntryList];
//     setDirection(!direction);
//     if (d == false) {
//       //in ascending order
//       list.sort((a, b) => {
//         if (new Date(a["updateDate"]) > new Date(b["updateDate"])) {
//           return 1;
//         }
//         if (new Date(a["updateDate"]) < new Date(b["updateDate"])) {
//           return -1;
//         }
//         return 0;
//       });
//     } else {
//       //in descending order
//       list.sort((a, b) => {
//         if (new Date(a["updateDate"]) < new Date(b["updateDate"])) {
//           return 1;
//         }
//         if (new Date(a["updateDate"]) > new Date(b["updateDate"])) {
//           return -1;
//         }
//         return 0;
//       });
//     }
//     // setSelectedList(list);
//     setFilteredEntryList(list);
//     setSortedField("updateDate");
//   }
//   function handleFormTextChangeValidations(message, index) {
//     props.onFormTextChangeValidations(message, index);
//   }
//   function handleSearchKeyUp(event) {
//     let searchText = event.target.value;
//     setSearchText(searchText);
//     performSearchOperation(searchText);
//   }
//   function performSearchOperation(searchText) {
//     let query = searchText.trim();
//     if (query.length == 0) {
//       setFilteredEntryList(entryList);
//       return;
//     }
//     let searchedEntrys = [];
//     searchedEntrys = filterByShowInListAttributes(query);
//     setFilteredEntryList(searchedEntrys);
//   }
//   function filterByName(query) {
//     let fList = [];
//     for (let i = 0; i < selectedList.length; i++) {
//       if (selectedList[i].name.toLowerCase().includes(query.toLowerCase())) {
//         fList.push(selectedList[i]);
//       }
//     } //for
//     return fList;
//   }
//   function filterByShowInListAttributes(query) {
//     let fList = [];
//     for (let i = 0; i < entryList.length; i++) {
//       for (let j = 0; j < showInList.length; j++) {
//         if (showInList[j].show) {
//           let parameterName = showInList[j].attribute;
//           if (
//             entryList[i][parameterName] &&
//             entryList[i][parameterName]
//               .toLowerCase()
//               .includes(query.toLowerCase())
//           ) {
//             fList.push(entryList[i]);
//             break;
//           }
//         }
//       } //inner for
//     } //outer for
//     return fList;
//   }
//   function handleToggleText(index) {
//     let sil = [...showInList];
//     sil[index].flagReadMore = !sil[index].flagReadMore;
//     setShowInList(sil);
//   }
//   function handleExcelFileUploadClick(file, msg) {
//     if (msg) {
//       showMessage(message);
//       return;
//     }
//     setSelectedFile(file);
//     const reader = new FileReader();
//     reader.onload = (event) => {
//       const arrayBuffer = event.target.result;
//       // Read the workbook from the array buffer
//       const workbook = XLSX.read(arrayBuffer, { type: "array" });
//       // Assume reading the first sheet
//       const sheetName = workbook.SheetNames[0];
//       const worksheet = workbook.Sheets[sheetName];
//       // Convert to JSON
//       const jsonData = XLSX.utils.sheet_to_json(worksheet);
//       // const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
//       setSheetData(jsonData);
//       let result = analyseImportExcelSheet(jsonData, entryList);
//       if (result.message) {
//         showMessage(result.message);
//       } else {
//         showImportAnalysis(result);
//       }
//       // analyseSheetData(jsonData, entryList);
//     };
//     // reader.readAsBinaryString(file);
//     reader.readAsArrayBuffer(file);
//   }
//   function showImportAnalysis(result) {
//     setCntAdd(result.cntA);
//     setCntUpdate(result.cntU);
//     setRecordsToBeAdded(result.recordsToBeAdded);
//     setRecordsToBeUpdated(result.recordsToBeUpdated);
//     //open modal
//     setFlagImport(true);
//   }
//   function handleModalCloseClick() {
//     setFlagImport(false);
//   }
//   async function handleImportButtonClick() {
//     setFlagImport(false); // close the modal
//     setFlagLoad(true);
//     let result;
//     try {
//       if (recordsToBeAdded.length > 0) {
//         result = await recordsAddBulk(
//           recordsToBeAdded,
//           "users",
//           entryList,
//           import.meta.env.VITE_API_URL
//         );
//         if (result.success) {
//           setEntryList(result.updatedList);
//           setFilteredEntryList(result.updatedList);
//         }
//         showMessage(result.message);
//       }
//       if (recordsToBeUpdated.length > 0) {
//         result = await recordsUpdateBulk(
//           recordsToBeUpdated,
//           "users",
//           entryList,
//           import.meta.env.VITE_API_URL
//         );
//         if (result.success) {
//           setEntryList(result.updatedList);
//           setFilteredEntryList(result.updatedList);
//         }
//         showMessage(result.message);
//       } //if
//     } catch (error) {
//       console.log(error);
//       showMessage("Something went wrong, refresh the page");
//     }
//     setFlagLoad(false);
//   }
//   function handleClearSelectedFile() {
//     setSelectedFile(null);
//   }
//   if (flagLoad) {
//     return (
//       <div className="my-5 text-center">
//         <BeatLoader size={24} color={"blue"} />
//       </div>
//     );
//   }
//   return (
//     <>
//       <CommonUtilityBar
//         action={action}
//         message={message}
//         selectedEntity={selectedEntity}
//         flagToggleButton={flagToggleButton}
//         filteredList={filteredEntryList}
//         mainList={entryList}
//         showInList={showInList}
//         onListClick={handleListClick}
//         onAddEntityClick={handleAddEntityClick}
//         onSearchKeyUp={handleSearchKeyUp}
//         onExcelFileUploadClick={handleExcelFileUploadClick}
//         onClearSelectedFile={handleClearSelectedFile}
//       />

//       {filteredEntryList.length == 0 && entryList.length != 0 && (
//         <div className="text-center">Nothing to show</div>
//       )}
//       {entryList.length == 0 && (
//         <div className="text-center">List is empty</div>
//       )}
//       {action == "list" && filteredEntryList.length != 0 && (
//         <CheckBoxHeaders
//           showInList={showInList}
//           onListCheckBoxClick={handleListCheckBoxClick}
//         />
//       )}
//       {action === "list" && selectedIds.length > 0 && (
//   <div className="text-center my-3">
//     <button className="btn btn-primary mx-1" onClick={handleDeliverButtonClick}>
//       Delivered
//     </button>
//     <button className="btn btn-warning mx-1" onClick={handleKhadaButtonClick}>
//   Khada
// </button>
//     <button className="btn btn-danger mx-1" onClick={handleChangeButtonClick}>Change</button>
//   </div>
// )}


//       {action == "list" && filteredEntryList.length != 0 && (
//         <div className="row my-2 mx-auto p-1">
//           <div className="col-1">
//             <input
//               type="checkbox"
//               checked={
//                 selectedIds.length === filteredEntryList.length &&
//                 filteredEntryList.length !== 0
//               }
//               onChange={(e) => {
//                 if (e.target.checked) {
//                   setSelectedIds(filteredEntryList.map((entry) => entry._id));
//                 } else {
//                   setSelectedIds([]);
//                 }
//               }}
//             />
//           </div>
//           <div className="col-1">
//             <a
//               href="#"
//               onClick={() => {
//                 handleSrNoClick();
//               }}
//             >
//               SN.{" "}
//               {sortedField == "updateDate" && direction && (
//                 <i className="bi bi-arrow-up"></i>
//               )}
//               {sortedField == "updateDate" && !direction && (
//                 <i className="bi bi-arrow-down"></i>
//               )}
//             </a>
//           </div>
//           <ListHeaders
//             showInList={showInList}
//             sortedField={sortedField}
//             direction={direction}
//             onHeaderClick={handleHeaderClick}
//           />
//           <div className="col-1">&nbsp;</div>
//         </div>
//       )}
//       {(action == "add" || action == "update") && (
//         <div className="row">
//           <AdminDailyEntryForm
//             entrySchema={entrySchema}
//             entryValidations={entryValidations}
//             emptyEntry={emptyEntry}
//             // categoryList={categoryList}
//             selectedEntity={selectedEntity}
//             userToBeEdited={userToBeEdited}
//             action={action}
//             flagFormInvalid={flagFormInvalid}
//             onFormSubmit={handleFormSubmit}
//             onFormCloseClick={handleFormCloseClick}
//             onFormTextChangeValidations={handleFormTextChangeValidations}
//           />
//         </div>
//       )}
//       {/* added */}
//       {showChangeModal && (
//   <ChangeQtyModal
//     user={modalUser}
//     qty={modalQty}
//     onQtyChange={(e) => setModalQty(e.target.value)}
//     onSave={handleModalQtySubmit}
//     onClose={() => setShowChangeModal(false)}
//   />
// )}



//       {action === "list" &&
//         filteredEntryList.length !== 0 &&
//         filteredEntryList.map((e, index) => (
//           <div className="row mx-auto my-1" key={index}>
//             <div className="col-1 d-flex align-items-center">
//               <input
//                 type="checkbox"
//                 checked={selectedIds.includes(e._id)}
//                 onChange={(ev) => {
//                   if (ev.target.checked) {
//                     setSelectedIds((prev) => [...prev, e._id]);
//                   } else {
//                     setSelectedIds((prev) => prev.filter((id) => id !== e._id));
//                   }
//                 }}
//               />
//             </div>
//             <div className="col-11">
//               <Entity
//                 entity={e}
//                 index={index}
//                 sortedField={sortedField}
//                 direction={direction}
//                 listSize={filteredEntryList.length}
//                 selectedEntity={selectedEntity}
//                 showInList={showInList}
//                 VITE_API_URL={import.meta.env.VITE_API_URL}
//                 onEditButtonClick={handleEditButtonClick}
//                 onDeleteButtonClick={handleDeleteButtonClick}
//                 onToggleText={handleToggleText}
//               />
//             </div>
//           </div>
//         ))}

//       {flagImport && (
//         <ModalImport
//           modalText={"Summary of Bulk Import"}
//           additions={recordsToBeAdded}
//           updations={recordsToBeUpdated}
//           btnGroup={["Yes", "No"]}
//           onModalCloseClick={handleModalCloseClick}
//           onModalButtonCancelClick={handleModalCloseClick}
//           onImportButtonClick={handleImportButtonClick}
//         />
//       )}
//     </>
//   );
// }