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
import ChangeQtyModal from "./ChangeQtyModal";
import {
  recordsAddBulk,
  recordsUpdateBulk,
  analyseImportExcelSheet,
} from "../external/vite-sdk";
import { getEmptyObject, getShowInList } from "../external/vite-sdk";
import AdminDailyEntryForm from "./AdminDailyEntryForm";

export default function AdminDailyEntry(props) {
  const [anotherDate, setAnotherDate] = useState("");
  let [showChangeModal, setShowChangeModal] = useState(false);
  let [modalUser, setModalUser] = useState(null);
  let [modalQty, setModalQty] = useState("");

  let [selectedIds, setSelectedIds] = useState([]);
  let [currentDayEntryList, setCurrentDayEntryList] = useState([]);
  let [filteredCurrentDayEntryList, setFilteredCurrentDayEntryList] = useState(
    []
  );
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

  const [selectedDateOption, setSelectedDateOption] = useState("Today");
  const [allEntriesFromDatabase, setAllEntriesFromDatabase] = useState([]);
  const [globalLatestEntryDate, setGlobalLatestEntryDate] = useState(null);
  const [totalUsersWithRoleId, setTotalUsersWithRoleId] = useState(0); // New state for total users

  const [validationMessage, setValidationMessage] = useState("");
  const [validationMessageDate, setValidationMessageDate] = useState(null);


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
      show: true,
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
    roleId: "68691372fa624c1dff2e06be",
    name: "",
    daily_qty: "",
    delivered_qty: "",
    entry_status: "",
  });

  useEffect(() => {
    fetchAllEntriesAndInitializeDisplay();
  }, []);

  // Corrected useEffect for validation logic using totalUsersWithRoleId
  useEffect(() => {
    if (globalLatestEntryDate && allEntriesFromDatabase.length > 0 && totalUsersWithRoleId > 0) {
      const latestDateISO = globalLatestEntryDate.toISOString().split("T")[0];
      const entriesForLatestDate = allEntriesFromDatabase.filter((entry) => {
        const entryDateFormatted =
          entry.date instanceof Date
            ? entry.date.toISOString().split("T")[0]
            : typeof entry.date === "string" && entry.date.includes("T")
            ? entry.date.split("T")[0]
            : entry.date;
        return entryDateFormatted === latestDateISO;
      });

      // Count entries for the latest date that have a valid delivered_qty
      const countValidDeliveredQtyForLatestDate = entriesForLatestDate.filter((entry) => {
        const deliveredQty = entry.delivered_qty;
        return deliveredQty !== "" && !isNaN(Number(deliveredQty)) && Number(deliveredQty) >= 0;
      }).length;

      const isDayCompletelyFilled = countValidDeliveredQtyForLatestDate === totalUsersWithRoleId;

      if (!isDayCompletelyFilled) { // If not all entries for the latest date are filled
        const msg = `Please enter the data of ${globalLatestEntryDate.toLocaleDateString()} date.`;
        setValidationMessage(msg);
        setValidationMessageDate(globalLatestEntryDate);
      } else { // If all entries are filled for the latest date, suggest the next day
        const nextDay = new Date(globalLatestEntryDate);
        nextDay.setDate(globalLatestEntryDate.getDate() + 1);
        const msg = `Please enter the data of ${nextDay.toLocaleDateString()} date.`;
        setValidationMessage(msg);
        setValidationMessageDate(nextDay);
      }
    } else if (allEntriesFromDatabase.length === 0 || totalUsersWithRoleId === 0) {
      setValidationMessage("No entries or users found in the database. Please add users and entries.");
      setValidationMessageDate(null);
    } else { // Fallback for other cases (e.g., initial load before data is ready)
      setValidationMessage("");
      setValidationMessageDate(null);
    }
  }, [globalLatestEntryDate, allEntriesFromDatabase, totalUsersWithRoleId]); // Add totalUsersWithRoleId as a dependency

  const calculateGlobalLatestEntryDate = (entries) => {
    if (!entries || entries.length === 0) {
      setGlobalLatestEntryDate(null);
      return;
    }

    const validEntryDates = entries
      .filter((entry) => entry.date)
      .map((entry) => {
        const dateObj =
          entry.date instanceof Date
            ? entry.date
            : typeof entry.date === "string"
            ? new Date(entry.date.split("T")[0])
            : null;
        return dateObj ? dateObj.getTime() : 0;
      })
      .filter(Boolean);

    if (validEntryDates.length > 0) {
      const latestTimestamp = Math.max(...validEntryDates);
      setGlobalLatestEntryDate(new Date(latestTimestamp));
    } else {
      setGlobalLatestEntryDate(null);
    }
  };

  async function fetchAllEntriesAndInitializeDisplay(
    option = selectedDateOption,
    customDate = anotherDate
  ) {
    setFlagLoad(true);
    try {
      const [entryRes, userRes] = await Promise.all([
        axios(import.meta.env.VITE_API_URL + "/entries"),
        axios(import.meta.env.VITE_API_URL + "/users"),
      ]);

      const allDatabaseEntries = entryRes.data;
      const allUsers = userRes.data;

      // Calculate total users for the specific roleId
      const countUsers = allUsers.filter(user => user.roleId === "68691372fa624c1dff2e06be").length;
      setTotalUsersWithRoleId(countUsers);


      setAllEntriesFromDatabase(allDatabaseEntries);
      calculateGlobalLatestEntryDate(allDatabaseEntries);

      const userList = allUsers; // Use allUsers directly
      const dateToDisplay = resolveSelectedDate(option, customDate);

      const mergedListForCurrentDay = userList
        .filter((user) => user.roleId === "68691372fa624c1dff2e06be")
        .map((user) => {
          const entryForSelectedDate = allDatabaseEntries.find((entry) => {
            const entryDateFormatted =
              entry.date instanceof Date
                ? entry.date.toISOString().split("T")[0]
                : typeof entry.date === "string" && entry.date.includes("T")
                ? entry.date.split("T")[0]
                : entry.date;

            return entry.userId === user._id && entryDateFormatted === dateToDisplay;
          });

          return {
            _id: user._id,
            userId: user._id,
            name: user.name,
            daily_qty: user.daily_qty,
            delivered_qty: entryForSelectedDate?.delivered_qty ?? "",
            entry_status: entryForSelectedDate?.entry_status || "",
            date:
              entryForSelectedDate?.date &&
              typeof entryForSelectedDate.date === "string" &&
              entryForSelectedDate.date.includes("T")
                ? entryForSelectedDate.date.split("T")[0]
                : entryForSelectedDate?.date || dateToDisplay,
            updateDate: entryForSelectedDate?.updateDate || "",
            entryId: entryForSelectedDate?._id || null,
          };
        });

      mergedListForCurrentDay.sort(
        (a, b) => new Date(b.updateDate || 0) - new Date(a.updateDate || 0)
      );

      setCurrentDayEntryList(mergedListForCurrentDay);
      setFilteredCurrentDayEntryList(mergedListForCurrentDay);
    } catch (error) {
      console.error("Error fetching all entries or initializing display:", error);
      showMessage("Something went wrong while fetching data.");
      setAllEntriesFromDatabase([]);
      setGlobalLatestEntryDate(null);
      setTotalUsersWithRoleId(0);
    }
    setFlagLoad(false);
  }

  async function handleFormSubmit(entry) {
    let message;
    let entryForBackEnd = { ...entry };
    for (let key in entryForBackEnd) {
      entrySchema.forEach((e) => {
        if (key == e.attribute && e.relationalData) {
          delete entryForBackEnd[key];
        }
      });
    }

    if (entryForBackEnd.date instanceof Date) {
      entryForBackEnd.date = entryForBackEnd.date.toISOString().split("T")[0];
    } else if (
      typeof entryForBackEnd.date === "string" &&
      entryForBackEnd.date.includes("T")
    ) {
      entryForBackEnd.date = entryForBackEnd.date.split("T")[0];
    }

    if (action === "add") {
      setFlagLoad(true);
      try {
        const response = await axios.post(
          import.meta.env.VITE_API_URL + "/entries",
          entryForBackEnd,
          { headers: { "Content-type": "application/json" } }
        );
        const addedEntryFromServer = response.data;

        setAllEntriesFromDatabase((prevAll) => {
          const newEntry = {
            ...addedEntryFromServer,
            userId: entryForBackEnd.userId,
            name: entryForBackEnd.name,
            date: entryForBackEnd.date,
          };
          return [...prevAll, newEntry];
        });

        setCurrentDayEntryList((prevList) => {
          const newList = [
            ...prevList,
            {
              ...entry,
              ...addedEntryFromServer,
              entryId: addedEntryFromServer._id,
              updateDate:
                addedEntryFromServer.updateDate || new Date().toISOString(),
            },
          ];
          return newList.sort(
            (a, b) => new Date(b.updateDate || 0) - new Date(a.updateDate || 0)
          );
        });
        setFilteredCurrentDayEntryList((prevList) => {
          const newList = [
            ...prevList,
            {
              ...entry,
              ...addedEntryFromServer,
              entryId: addedEntryFromServer._id,
              updateDate:
                addedEntryFromServer.updateDate || new Date().toISOString(),
            },
          ];
          return newList.sort(
            (a, b) => new Date(b.updateDate || 0) - new Date(a.updateDate || 0)
          );
        });

        message = "Entry added successfully";
        showMessage(message);
        setAction("list");
      } catch (error) {
        console.error("Error adding entry:", error);
        showMessage("Something went wrong, refresh the page");
      }
      setFlagLoad(false);
    } else if (action === "update") {
      const entryToUpdateId = userToBeEdited.entryId;

      if (!entryToUpdateId) {
        showMessage("Error: Cannot update. Entry ID not found for this record.");
        setFlagLoad(false);
        return;
      }

      setFlagLoad(true);
      try {
        const response = await axios.put(
          `${import.meta.env.VITE_API_URL}/entries/${entryToUpdateId}`,
          entryForBackEnd,
          { headers: { "Content-type": "application/json" } }
        );

        const updatedBackendEntry = response.data;

        setAllEntriesFromDatabase((prevAll) => {
          return prevAll.map((item) => {
            if (item._id === updatedBackendEntry._id) {
              return {
                ...item,
                ...updatedBackendEntry,
                updateDate: updatedBackendEntry.updateDate || new Date().toISOString(),
              };
            }
            return item;
          });
        });

        setCurrentDayEntryList((prevList) => {
          const newList = prevList.map((item) => {
            if (item._id === userToBeEdited._id) {
              return {
                ...item,
                ...updatedBackendEntry,
                entryId: updatedBackendEntry._id,
                updateDate:
                  updatedBackendEntry.updateDate || new Date().toISOString(),
              };
            }
            return item;
          });
          return newList.sort(
            (a, b) => new Date(b.updateDate || 0) - new Date(a.updateDate || 0)
          );
        });
        setFilteredCurrentDayEntryList((prevList) => {
          const newList = prevList.map((item) => {
            if (item._id === userToBeEdited._id) {
              return {
                ...item,
                ...updatedBackendEntry,
                entryId: updatedBackendEntry._id,
                updateDate:
                  updatedBackendEntry.updateDate || new Date().toISOString(),
              };
            }
            return item;
          });
          return newList.sort(
            (a, b) => new Date(b.updateDate || 0) - new Date(a.updateDate || 0)
          );
        });

        message = "Entry Updated successfully";
        showMessage(message);
        setAction("list");
      } catch (error) {
        console.error("Error updating entry:", error);
        showMessage("Something went wrong during update, please try again.");
      }
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

    const currentSelectedDate = resolveSelectedDate(
      selectedDateOption,
      anotherDate
    );

    const entryData = {
      userId: modalUser.userId,
      name: modalUser.name,
      daily_qty: modalUser.daily_qty,
      delivered_qty: modalQty,
      entry_status: "Change",
      date: currentSelectedDate,
    };

    const url = modalUser.entryId
      ? `${import.meta.env.VITE_API_URL}/entries/${modalUser.entryId}`
      : `${import.meta.env.VITE_API_URL}/entries`;

    const method = modalUser.entryId ? axios.put : axios.post;

    try {
      const response = await method(url, entryData, {
        headers: { "Content-type": "application/json" },
      });

      const updatedEntryFromServer = response.data;

      setAllEntriesFromDatabase((prevAll) => {
        if (!modalUser.entryId) {
          return [...prevAll, updatedEntryFromServer];
        } else {
          return prevAll.map((item) => {
            if (item._id === updatedEntryFromServer._id) {
              return { ...item, ...updatedEntryFromServer };
            }
            return item;
          });
        }
      });

      setCurrentDayEntryList((prevList) => {
        const newList = prevList
          .map((item) => {
            if (item._id === modalUser._id) {
              return {
                ...item,
                ...updatedEntryFromServer,
                entryId: updatedEntryFromServer._id,
                updateDate:
                  updatedEntryFromServer.updateDate || new Date().toISOString(),
              };
            }
            return item;
          })
          .sort(
            (a, b) => new Date(b.updateDate || 0) - new Date(a.updateDate || 0)
          );
        return newList;
      });

      setFilteredCurrentDayEntryList((prevList) => {
        const newList = prevList
          .map((item) => {
            if (item._id === modalUser._id) {
              return {
                ...item,
                ...updatedEntryFromServer,
                entryId: updatedEntryFromServer._id,
                updateDate:
                  updatedEntryFromServer.updateDate || new Date().toISOString(),
              };
            }
            return item;
          })
          .sort(
            (a, b) => new Date(b.updateDate || 0) - new Date(a.updateDate || 0)
          );
        return newList;
      });

      showMessage("Entry updated to 'Change'");
      setSelectedIds([]);
      setShowChangeModal(false);
    } catch (error) {
      console.error("Change update failed:", error);
      if (error.response) {
        console.error("Error response data:", error.response.data);
        console.error("Error response status:", error.response.status);
        console.error("Error response headers:", error.response.headers);
      } else if (error.request) {
        console.error("Error request:", error.request);
      } else {
        console.error("Error message:", error.message);
      }
      showMessage("Failed to update entry");
      setShowChangeModal(false);
    }
  }

  function handleDeleteButtonClick(ans, entry) {
    if (ans == "No") {
      showMessage("Delete operation cancelled");
      return;
    }
    if (ans == "Yes") {
      performDeleteOperation(entry);
    }
  }

  async function handleDeliverButtonClick() {
    const currentSelectedDate = resolveSelectedDate(
      selectedDateOption,
      anotherDate
    );
    setFlagLoad(true);

    const successfulUpdates = [];

    for (const id of selectedIds) {
      const entry = currentDayEntryList.find((e) => e._id === id);
      const entryData = {
        userId: entry.userId,
        name: entry.name,
        daily_qty: entry.daily_qty,
        delivered_qty: entry.daily_qty,
        entry_status: "Delivered",
        date: currentSelectedDate,
      };
      const url = entry.entryId
        ? `${import.meta.env.VITE_API_URL}/entries/${entry.entryId}`
        : `${import.meta.env.VITE_API_URL}/entries`;
      const method = entry.entryId ? axios.put : axios.post;

      try {
        const response = await method(url, entryData, {
          headers: { "Content-type": "application/json" },
        });
        const updatedEntryFromServer = response.data;
        successfulUpdates.push(updatedEntryFromServer);
      } catch (err) {
        console.error(err);
        showMessage("Failed to mark as Delivered for " + entry.name);
      }
    }

    setAllEntriesFromDatabase((prevAll) => {
      let newAll = [...prevAll];
      successfulUpdates.forEach((updatedItem) => {
        const index = newAll.findIndex((item) => item._id === updatedItem._id);
        if (index > -1) {
          newAll[index] = { ...newAll[index], ...updatedItem };
        } else {
          newAll.push(updatedItem);
        }
      });
      return newAll;
    });

    fetchAllEntriesAndInitializeDisplay(selectedDateOption, anotherDate);

    showMessage("Marked selected entries as Delivered");
    setSelectedIds([]);
    setFlagLoad(false);
  }

  async function handleKhadaButtonClick() {
    const currentSelectedDate = resolveSelectedDate(
      selectedDateOption,
      anotherDate
    );
    setFlagLoad(true);

    const successfulUpdates = [];

    for (const id of selectedIds) {
      const userEntry = currentDayEntryList.find((e) => e._id === id);
      const entryId = userEntry.entryId;

      const entryData = {
        userId: userEntry.userId,
        name: userEntry.name,
        daily_qty: userEntry.daily_qty,
        delivered_qty: 0,
        entry_status: "Khada",
        date: currentSelectedDate,
      };

      const url = entryId
        ? `${import.meta.env.VITE_API_URL}/entries/${entryId}`
        : `${import.meta.env.VITE_API_URL}/entries`;

      const method = entryId ? axios.put : axios.post;

      try {
        const response = await method(url, entryData, {
          headers: { "Content-type": "application/json" },
        });

        const updatedEntryFromServer = response.data;
        successfulUpdates.push(updatedEntryFromServer);
      } catch (error) {
        console.error("Error for", userEntry.name, error);
        showMessage(`Failed to mark Khada for ${userEntry.name}`);
      }
    }

    setAllEntriesFromDatabase((prevAll) => {
      let newAll = [...prevAll];
      successfulUpdates.forEach((updatedItem) => {
        const index = newAll.findIndex((item) => item._id === updatedItem._id);
        if (index > -1) {
          newAll[index] = { ...newAll[index], ...updatedItem };
        } else {
          newAll.push(updatedItem);
        }
      });
      return newAll;
    });

    fetchAllEntriesAndInitializeDisplay(selectedDateOption, anotherDate);

    showMessage("Marked selected entries as Khada");
    setSelectedIds([]);
    setFlagLoad(false);
  }

  function handleChangeButtonClick() {
    if (selectedIds.length !== 1) {
      showMessage("Select exactly one user to change delivered quantity.");
      return;
    }
    const user = currentDayEntryList.find((u) => u._id === selectedIds[0]);
    setModalUser(user);
    setModalQty(user.delivered_qty || "");
    setShowChangeModal(true);
  }

  async function performDeleteOperation(entry) {
    setFlagLoad(true);
    try {
      await axios.delete(
        import.meta.env.VITE_API_URL + "/entries/" + entry.entryId
      );

      setAllEntriesFromDatabase((prevAll) => {
        return prevAll.filter((item) => item._id !== entry.entryId);
      });

      const updatedEntry = {
        ...entry,
        delivered_qty: "",
        entry_status: "",
        entryId: null,
        updateDate: "",
      };

      setCurrentDayEntryList((prevList) => {
        const newList = prevList.map((e) =>
          e._id === entry._id ? updatedEntry : e
        );
        setFilteredCurrentDayEntryList(newList);
        return newList;
      });

      showMessage(`Entry - ${entry.name} deleted successfully.`);
    } catch (error) {
      console.log(error);
      showMessage("Something went wrong, refresh the page");
    }
    setFlagLoad(false);
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
    let list = [...filteredCurrentDayEntryList];
    setDirection(d);
    if (d === false) {
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
    setFilteredCurrentDayEntryList(list);
    setSortedField(field);
  }
  function handleSrNoClick() {
    let d = false;
    if (sortedField === "updateDate") {
      d = !direction;
    } else {
      d = false;
    }

    let list = [...filteredCurrentDayEntryList];
    setDirection(!direction);
    if (d === false) {
      list.sort((a, b) => {
        if (new Date(a.updateDate || 0) > new Date(b.updateDate || 0)) {
          return 1;
        }
        if (new Date(a.updateDate || 0) < new Date(b.updateDate || 0)) {
          return -1;
        }
        return 0;
      });
    } else {
      list.sort((a, b) => {
        if (new Date(a.updateDate || 0) < new Date(b.updateDate || 0)) {
          return 1;
        }
        if (new Date(a.updateDate || 0) > new Date(b.updateDate || 0)) {
          return -1;
        }
        return 0;
      });
    }
    setFilteredCurrentDayEntryList(list);
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
    if (query.length === 0) {
      setFilteredCurrentDayEntryList(currentDayEntryList);
      return;
    }
    let searchedEntrys = [];
    searchedEntrys = filterByShowInListAttributes(query);
    setFilteredCurrentDayEntryList(searchedEntrys);
  }
  function filterByName(query) {
    let fList = [];
    for (let i = 0; i < currentDayEntryList.length; i++) {
      if (currentDayEntryList[i].name.toLowerCase().includes(query.toLowerCase())) {
        fList.push(currentDayEntryList[i]);
      }
    }
    return fList;
  }
  function filterByShowInListAttributes(query) {
    let fList = [];
    for (let i = 0; i < currentDayEntryList.length; i++) {
      for (let j = 0; j < showInList.length; j++) {
        if (showInList[j].show) {
          let parameterName = showInList[j].attribute;
          if (
            currentDayEntryList[i][parameterName] &&
            currentDayEntryList[i][parameterName]
              .toLowerCase()
              .includes(query.toLowerCase())
          ) {
            fList.push(currentDayEntryList[i]);
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
      let result = analyseImportExcelSheet(jsonData, allEntriesFromDatabase);
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
          allEntriesFromDatabase,
          import.meta.env.VITE_API_URL
        );
        if (result.success) {
          setAllEntriesFromDatabase(result.updatedList);
          fetchAllEntriesAndInitializeDisplay(selectedDateOption, anotherDate);
        }
        showMessage(result.message);
      }
      if (recordsToBeUpdated.length > 0) {
        result = await recordsUpdateBulk(
          recordsToBeUpdated,
          "users",
          allEntriesFromDatabase,
          import.meta.env.VITE_API_URL
        );
        if (result.success) {
          setAllEntriesFromDatabase(result.updatedList);
          fetchAllEntriesAndInitializeDisplay(selectedDateOption, anotherDate);
        }
        showMessage(result.message);
      }
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

  function fetchDataForSelectedDate(
    option = selectedDateOption,
    customDate = anotherDate
  ) {
    setSelectedIds([]);
    fetchAllEntriesAndInitializeDisplay(option, customDate);
  }

  const currentlyDisplayedDate = new Date(
    resolveSelectedDate(selectedDateOption, anotherDate)
  );
  currentlyDisplayedDate.setHours(0, 0, 0, 0);

  const globalLatestEntryDateOnly = globalLatestEntryDate ? new Date(globalLatestEntryDate) : null;
  if (globalLatestEntryDateOnly) {
    globalLatestEntryDateOnly.setHours(0, 0, 0, 0);
  }

  // Determine if actions should be disabled
  let disableActions = false;

  // Actions are disabled if:
  // 1. There's a validation message date (meaning we have a point of reference) AND
  // 2. The currently displayed date is AFTER the date that the validation message is asking to be filled.
  if (validationMessageDate) {
    const requiredValidationDate = new Date(validationMessageDate);
    requiredValidationDate.setHours(0, 0, 0, 0);

    // Disable if currently displayed date is strictly AFTER the requiredValidationDate
    if (currentlyDisplayedDate.getTime() > requiredValidationDate.getTime()) {
      disableActions = true;
    }
  }


  return (
    <>
      <CommonUtilityBar
        action={action}
        message={message}
        selectedEntity={selectedEntity}
        flagToggleButton={flagToggleButton}
        filteredList={filteredCurrentDayEntryList}
        mainList={currentDayEntryList}
        showInList={showInList}
        onListClick={handleListClick}
        onAddEntityClick={handleAddEntityClick}
        onSearchKeyUp={handleSearchKeyUp}
        onExcelFileUploadClick={handleExcelFileUploadClick}
        onClearSelectedFile={handleClearSelectedFile}
      />

      {filteredCurrentDayEntryList.length === 0 &&
        currentDayEntryList.length !== 0 && (
          <div className="text-center">Nothing to show for this date</div>
        )}
      {currentDayEntryList.length === 0 && (
        <div className="text-center">No entries available for this date</div>
      )}
      {action === "list" && (
        <div className="text-center my-3">
          <label className="fw-bold me-3">Select Date:</label>

          <div className="btn-group" role="group">
            <button
              type="button"
              className={` btn ${
                selectedDateOption === "Today"
                  ? "btn-primary"
                  : "btn-outline-primary"
              }`}
              onClick={() => {
                setSelectedDateOption("Today");
                setAnotherDate("");
                fetchDataForSelectedDate("Today");
              }}
            >
              Today
            </button>
            <button
              type="button"
              className={`btn ${
                selectedDateOption === "Yesterday"
                  ? "btn-primary"
                  : "btn-outline-primary"
              }`}
              onClick={() => {
                setSelectedDateOption("Yesterday");
                setAnotherDate("");
                fetchDataForSelectedDate("Yesterday");
              }}
            >
              Yesterday
            </button>
            <button
              type="button"
              className={`btn ${
                selectedDateOption === "Another Day"
                  ? "btn-primary"
                  : "btn-outline-primary"
              }`}
              onClick={() => {
                setSelectedDateOption("Another Day");
              }}
            >
              Another Day
            </button>
            {selectedDateOption === "Another Day" && (
              <input
                type="date"
                className="form-control d-inline-block ms-2"
                style={{ width: "auto" }}
                value={anotherDate}
                onChange={(e) => {
                  setAnotherDate(e.target.value);
                  setSelectedIds([]);
                  fetchDataForSelectedDate("Another Day", e.target.value);
                }}
                disabled={
                    validationMessageDate &&
                    new Date(anotherDate).setHours(0, 0, 0, 0) > validationMessageDate.setHours(0,0,0,0)
                }
              />
            )}
          </div>
        </div>
      )}

      {action === "list" && (
        <div className="text-center my-3">
          <div className="text-center my-3">
            <button
              className="btn btn-success mx-1"
              onClick={handleDeliverButtonClick}
              disabled={selectedIds.length === 0 || disableActions}
            >
              Delivered
            </button>

            <button
              className="btn btn-warning mx-1"
              onClick={handleKhadaButtonClick}
              disabled={selectedIds.length === 0 || disableActions}
            >
              Khada
            </button>

            <button
              className="btn btn-secondary mx-1"
              onClick={handleChangeButtonClick}
              disabled={selectedIds.length !== 1 || disableActions}
            >
              Change
            </button>
          </div>

          {globalLatestEntryDate !== null ? (
            <div className="text-sm text-red-600 font-semibold mt-2">
              Last entry date: {globalLatestEntryDate.toLocaleDateString()}
            </div>
          ) : (
            <div className="text-sm text-gray-500 mt-2">
              No entries with a date found.
            </div>
          )}

          {validationMessage && (
            <div className="text-sm text-blue-600 font-semibold mt-2">
              {validationMessage}
            </div>
          )}
        </div>
      )}

      {action === "list" && filteredCurrentDayEntryList.length !== 0 && (
        <CheckBoxHeaders
          showInList={showInList}
          onListCheckBoxClick={handleListCheckBoxClick}
        />
      )}

      {action === "list" && filteredCurrentDayEntryList.length !== 0 && (
        <div className="row my-2 mx-auto p-1">
          <div className="col-1">
            <input
              type="checkbox"
              checked={
                selectedIds.length > 0 &&
                selectedIds.length === filteredCurrentDayEntryList.length
              }
              onChange={(ev) => {
                if (ev.target.checked) {
                  setSelectedIds(filteredCurrentDayEntryList.map((entry) => entry._id));
                } else {
                  setSelectedIds([]);
                }
              }}
              disabled={disableActions}
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
              {sortedField === "updateDate" && direction && (
                <i className="bi bi-arrow-up"></i>
              )}
              {sortedField === "updateDate" && !direction && (
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
          <AdminDailyEntryForm
            entrySchema={entrySchema}
            entryValidations={entryValidations}
            emptyEntry={emptyEntry}
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
        filteredCurrentDayEntryList.length !== 0 &&
        filteredCurrentDayEntryList.map((e, index) => (
          <div
            className={`row mx-auto    mt-2 my-1 ${
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
                disabled={disableActions}
              />
            </div>
            <div className="col-11">
              <Entity
                entity={e}
                index={index}
                sortedField={sortedField}
                direction={direction}
                listSize={filteredCurrentDayEntryList.length}
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
// import {
//   CommonUtilityBar,
//   CheckBoxHeaders,
//   ListHeaders,
//   Entity,
// } from "../external/vite-sdk";
// import { BeatLoader } from "react-spinners";
// import axios from "axios";
// import * as XLSX from "xlsx";
// import ModalImport from "./ModalImport";
// import ChangeQtyModal from "./ChangeQtyModal";
// import {
//   recordsAddBulk,
//   recordsUpdateBulk,
//   analyseImportExcelSheet,
// } from "../external/vite-sdk";
// import { getEmptyObject, getShowInList } from "../external/vite-sdk";
// import AdminDailyEntryForm from "./AdminDailyEntryForm";

// export default function AdminDailyEntry(props) {
//   const [anotherDate, setAnotherDate] = useState("");
//   let [showChangeModal, setShowChangeModal] = useState(false);
//   let [modalUser, setModalUser] = useState(null);
//   let [modalQty, setModalQty] = useState("");

//   let [selectedIds, setSelectedIds] = useState([]);
//   let [currentDayEntryList, setCurrentDayEntryList] = useState([]);
//   let [filteredCurrentDayEntryList, setFilteredCurrentDayEntryList] = useState(
//     []
//   );
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

//   const [selectedDateOption, setSelectedDateOption] = useState("Today");
//   const [allEntriesFromDatabase, setAllEntriesFromDatabase] = useState([]);
//   const [globalLatestEntryDate, setGlobalLatestEntryDate] = useState(null);

//   // New state for validation message specifically for the last entry date
//   const [validationMessage, setValidationMessage] = useState("");

//   function resolveSelectedDate(option, customDate = "") {
//     const today = new Date();
//     if (option === "Today") return today.toISOString().split("T")[0];
//     if (option === "Yesterday") {
//       const yest = new Date(today);
//       yest.setDate(yest.getDate() - 1);
//       return yest.toISOString().split("T")[0];
//     }
//     if (option === "Another Day" && customDate) return customDate;
//     return today.toISOString().split("T")[0];
//   }

//   let entrySchema = [
//     { attribute: "name", type: "normal" },
//     { attribute: "daily_qty", type: "normal" },
//     { attribute: "delivered_qty", type: "normal" },
//     {
//       attribute: "entry_status",
//       type: "normal",
//       show: true,
//     },
//   ];
//   let entryValidations = {
//     name: { message: "", mxLen: 200, mnLen: 4, onlyDigits: false },
//     daily_qty: { message: "", onlyDigits: true },
//     delivered_qty: { message: "", onlyDigits: true },
//     entry_status: { message: "" },
//   };

//   let [showInList, setShowInList] = useState(getShowInList(entrySchema));

//   let [emptyEntry, setEmptyEntry] = useState({
//     ...getEmptyObject(entrySchema),
//     roleId: "68691372fa624c1dff2e06be",
//     name: "",
//     daily_qty: "",
//     delivered_qty: "",
//     entry_status: "",
//   });

//   useEffect(() => {
//     fetchAllEntriesAndInitializeDisplay();
//   }, []);

//   // New useEffect for validation
//   useEffect(() => {
//     if (globalLatestEntryDate && allEntriesFromDatabase.length > 0) {
//       const latestDateISO = globalLatestEntryDate.toISOString().split("T")[0];
//       const entriesForLatestDate = allEntriesFromDatabase.filter((entry) => {
//         const entryDateFormatted =
//           entry.date instanceof Date
//             ? entry.date.toISOString().split("T")[0]
//             : typeof entry.date === "string" && entry.date.includes("T")
//             ? entry.date.split("T")[0]
//             : entry.date;
//         return entryDateFormatted === latestDateISO;
//       });

//       const isDeliveredQtyNotNumber = entriesForLatestDate.some((entry) => {
//         const deliveredQty = entry.delivered_qty;
//         // Check if it's not a number, or if it's an empty string that can't be converted to 0
//         return (
//           deliveredQty === "" ||
//           isNaN(Number(deliveredQty)) ||
//           Number(deliveredQty) < 0
//         );
//       });

//       if (isDeliveredQtyNotNumber) {
//         setValidationMessage(
//           `Please enter the data of ${globalLatestEntryDate.toLocaleDateString()} date.`
//         );
//       } else {
//         const nextDay = new Date(globalLatestEntryDate);
//         nextDay.setDate(globalLatestEntryDate.getDate() + 1);
//         setValidationMessage(
//           `Please enter the data of ${nextDay.toLocaleDateString()} date.`
//         );
//       }
//     } else if (allEntriesFromDatabase.length === 0) {
//       setValidationMessage("No entries found in the database.");
//     } else {
//       setValidationMessage(""); // Clear message if no latest date or other issues
//     }
//   }, [globalLatestEntryDate, allEntriesFromDatabase]);

//   const calculateGlobalLatestEntryDate = (entries) => {
//     if (!entries || entries.length === 0) {
//       setGlobalLatestEntryDate(null);
//       return;
//     }

//     const validEntryDates = entries
//       .filter((entry) => entry.date)
//       .map((entry) => {
//         const dateObj =
//           entry.date instanceof Date
//             ? entry.date
//             : typeof entry.date === "string"
//             ? new Date(entry.date.split("T")[0]) // Ensure only date part is used
//             : null;
//         return dateObj ? dateObj.getTime() : 0;
//       })
//       .filter(Boolean); // Filter out null/0 timestamps

//     if (validEntryDates.length > 0) {
//       const latestTimestamp = Math.max(...validEntryDates);
//       setGlobalLatestEntryDate(new Date(latestTimestamp));
//     } else {
//       setGlobalLatestEntryDate(null);
//     }
//   };

//   async function fetchAllEntriesAndInitializeDisplay(
//     option = selectedDateOption,
//     customDate = anotherDate
//   ) {
//     setFlagLoad(true);
//     try {
//       const [entryRes, userRes] = await Promise.all([
//         axios(import.meta.env.VITE_API_URL + "/entries"),
//         axios(import.meta.env.VITE_API_URL + "/users"),
//       ]);

//       const allDatabaseEntries = entryRes.data;

//       setAllEntriesFromDatabase(allDatabaseEntries);
//       calculateGlobalLatestEntryDate(allDatabaseEntries);

//       const userList = userRes.data;
//       const dateToDisplay = resolveSelectedDate(option, customDate);

//       const mergedListForCurrentDay = userList
//         .filter((user) => user.roleId === "68691372fa624c1dff2e06be")
//         .map((user) => {
//           const entryForSelectedDate = allDatabaseEntries.find((entry) => {
//             const entryDateFormatted =
//               entry.date instanceof Date
//                 ? entry.date.toISOString().split("T")[0]
//                 : typeof entry.date === "string" && entry.date.includes("T")
//                 ? entry.date.split("T")[0]
//                 : entry.date;

//             return entry.userId === user._id && entryDateFormatted === dateToDisplay;
//           });

//           return {
//             _id: user._id,
//             userId: user._id,
//             name: user.name,
//             daily_qty: user.daily_qty,
//             delivered_qty: entryForSelectedDate?.delivered_qty ?? "",
//             entry_status: entryForSelectedDate?.entry_status || "",
//             date:
//               entryForSelectedDate?.date &&
//               typeof entryForSelectedDate.date === "string" &&
//               entryForSelectedDate.date.includes("T")
//                 ? entryForSelectedDate.date.split("T")[0]
//                 : entryForSelectedDate?.date || dateToDisplay,
//             updateDate: entryForSelectedDate?.updateDate || "",
//             entryId: entryForSelectedDate?._id || null,
//           };
//         });

//       mergedListForCurrentDay.sort(
//         (a, b) => new Date(b.updateDate || 0) - new Date(a.updateDate || 0)
//       );

//       setCurrentDayEntryList(mergedListForCurrentDay);
//       setFilteredCurrentDayEntryList(mergedListForCurrentDay);
//     } catch (error) {
//       console.error("Error fetching all entries or initializing display:", error);
//       showMessage("Something went wrong while fetching data.");
//       setAllEntriesFromDatabase([]);
//       setGlobalLatestEntryDate(null);
//     }
//     setFlagLoad(false);
//   }

//   async function handleFormSubmit(entry) {
//     let message;
//     let entryForBackEnd = { ...entry };
//     for (let key in entryForBackEnd) {
//       entrySchema.forEach((e) => {
//         if (key == e.attribute && e.relationalData) {
//           delete entryForBackEnd[key];
//         }
//       });
//     }

//     if (entryForBackEnd.date instanceof Date) {
//       entryForBackEnd.date = entryForBackEnd.date.toISOString().split("T")[0];
//     } else if (
//       typeof entryForBackEnd.date === "string" &&
//       entryForBackEnd.date.includes("T")
//     ) {
//       entryForBackEnd.date = entryForBackEnd.date.split("T")[0];
//     }

//     if (action === "add") {
//       setFlagLoad(true);
//       try {
//         const response = await axios.post(
//           import.meta.env.VITE_API_URL + "/entries",
//           entryForBackEnd,
//           { headers: { "Content-type": "application/json" } }
//         );
//         const addedEntryFromServer = response.data;

//         setAllEntriesFromDatabase((prevAll) => {
//           const newEntry = {
//             ...addedEntryFromServer,
//             userId: entryForBackEnd.userId,
//             name: entryForBackEnd.name,
//             date: entryForBackEnd.date,
//           };
//           return [...prevAll, newEntry];
//         });

//         setCurrentDayEntryList((prevList) => {
//           const newList = [
//             ...prevList,
//             {
//               ...entry,
//               ...addedEntryFromServer,
//               entryId: addedEntryFromServer._id,
//               updateDate:
//                 addedEntryFromServer.updateDate || new Date().toISOString(),
//             },
//           ];
//           return newList.sort(
//             (a, b) => new Date(b.updateDate || 0) - new Date(a.updateDate || 0)
//           );
//         });
//         setFilteredCurrentDayEntryList((prevList) => {
//           const newList = [
//             ...prevList,
//             {
//               ...entry,
//               ...addedEntryFromServer,
//               entryId: addedEntryFromServer._id,
//               updateDate:
//                 addedEntryFromServer.updateDate || new Date().toISOString(),
//             },
//           ];
//           return newList.sort(
//             (a, b) => new Date(b.updateDate || 0) - new Date(a.updateDate || 0)
//           );
//         });

//         message = "Entry added successfully";
//         showMessage(message);
//         setAction("list");
//       } catch (error) {
//         console.error("Error adding entry:", error);
//         showMessage("Something went wrong, refresh the page");
//       }
//       setFlagLoad(false);
//     } else if (action === "update") {
//       const entryToUpdateId = userToBeEdited.entryId;

//       if (!entryToUpdateId) {
//         showMessage("Error: Cannot update. Entry ID not found for this record.");
//         setFlagLoad(false);
//         return;
//       }

//       setFlagLoad(true);
//       try {
//         const response = await axios.put(
//           `${import.meta.env.VITE_API_URL}/entries/${entryToUpdateId}`,
//           entryForBackEnd,
//           { headers: { "Content-type": "application/json" } }
//         );

//         const updatedBackendEntry = response.data;

//         setAllEntriesFromDatabase((prevAll) => {
//           return prevAll.map((item) => {
//             if (item._id === updatedBackendEntry._id) {
//               return {
//                 ...item,
//                 ...updatedBackendEntry,
//                 updateDate: updatedBackendEntry.updateDate || new Date().toISOString(),
//               };
//             }
//             return item;
//           });
//         });

//         setCurrentDayEntryList((prevList) => {
//           const newList = prevList.map((item) => {
//             if (item._id === userToBeEdited._id) {
//               return {
//                 ...item,
//                 ...updatedBackendEntry,
//                 entryId: updatedBackendEntry._id,
//                 updateDate:
//                   updatedBackendEntry.updateDate || new Date().toISOString(),
//               };
//             }
//             return item;
//           });
//           return newList.sort(
//             (a, b) => new Date(b.updateDate || 0) - new Date(a.updateDate || 0)
//           );
//         });
//         setFilteredCurrentDayEntryList((prevList) => {
//           const newList = prevList.map((item) => {
//             if (item._id === userToBeEdited._id) {
//               return {
//                 ...item,
//                 ...updatedBackendEntry,
//                 entryId: updatedBackendEntry._id,
//                 updateDate:
//                   updatedBackendEntry.updateDate || new Date().toISOString(),
//               };
//             }
//             return item;
//           });
//           return newList.sort(
//             (a, b) => new Date(b.updateDate || 0) - new Date(a.updateDate || 0)
//           );
//         });

//         message = "Entry Updated successfully";
//         showMessage(message);
//         setAction("list");
//       } catch (error) {
//         console.error("Error updating entry:", error);
//         showMessage("Something went wrong during update, please try again.");
//       }
//       setFlagLoad(false);
//     }
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

//   async function handleModalQtySubmit() {
//     if (!modalUser || modalQty === "") {
//       showMessage("Please enter a valid quantity.");
//       return;
//     }

//     const currentSelectedDate = resolveSelectedDate(
//       selectedDateOption,
//       anotherDate
//     );

//     const entryData = {
//       userId: modalUser.userId,
//       name: modalUser.name,
//       daily_qty: modalUser.daily_qty,
//       delivered_qty: modalQty,
//       entry_status: "Change",
//       date: currentSelectedDate,
//     };

//     const url = modalUser.entryId
//       ? `${import.meta.env.VITE_API_URL}/entries/${modalUser.entryId}`
//       : `${import.meta.env.VITE_API_URL}/entries`;

//     const method = modalUser.entryId ? axios.put : axios.post;

//     try {
//       const response = await method(url, entryData, {
//         headers: { "Content-type": "application/json" },
//       });

//       const updatedEntryFromServer = response.data;

//       setAllEntriesFromDatabase((prevAll) => {
//         if (!modalUser.entryId) {
//           return [...prevAll, updatedEntryFromServer];
//         } else {
//           return prevAll.map((item) => {
//             if (item._id === updatedEntryFromServer._id) {
//               return { ...item, ...updatedEntryFromServer };
//             }
//             return item;
//           });
//         }
//       });

//       setCurrentDayEntryList((prevList) => {
//         const newList = prevList
//           .map((item) => {
//             if (item._id === modalUser._id) {
//               return {
//                 ...item,
//                 ...updatedEntryFromServer,
//                 entryId: updatedEntryFromServer._id,
//                 updateDate:
//                   updatedEntryFromServer.updateDate || new Date().toISOString(),
//               };
//             }
//             return item;
//           })
//           .sort(
//             (a, b) => new Date(b.updateDate || 0) - new Date(a.updateDate || 0)
//           );
//         return newList;
//       });

//       setFilteredCurrentDayEntryList((prevList) => {
//         const newList = prevList
//           .map((item) => {
//             if (item._id === modalUser._id) {
//               return {
//                 ...item,
//                 ...updatedEntryFromServer,
//                 entryId: updatedEntryFromServer._id,
//                 updateDate:
//                   updatedEntryFromServer.updateDate || new Date().toISOString(),
//               };
//             }
//             return item;
//           })
//           .sort(
//             (a, b) => new Date(b.updateDate || 0) - new Date(a.updateDate || 0)
//           );
//         return newList;
//       });

//       showMessage("Entry updated to 'Change'");
//       setSelectedIds([]);
//       setShowChangeModal(false);
//     } catch (error) {
//       console.error("Change update failed:", error);
//       if (error.response) {
//         console.error("Error response data:", error.response.data);
//         console.error("Error response status:", error.response.status);
//         console.error("Error response headers:", error.response.headers);
//       } else if (error.request) {
//         console.error("Error request:", error.request);
//       } else {
//         console.error("Error message:", error.message);
//       }
//       showMessage("Failed to update entry");
//       setShowChangeModal(false);
//     }
//   }

//   function handleDeleteButtonClick(ans, entry) {
//     if (ans == "No") {
//       showMessage("Delete operation cancelled");
//       return;
//     }
//     if (ans == "Yes") {
//       performDeleteOperation(entry);
//     }
//   }

//   async function handleDeliverButtonClick() {
//     const currentSelectedDate = resolveSelectedDate(
//       selectedDateOption,
//       anotherDate
//     );
//     setFlagLoad(true);

//     const successfulUpdates = [];

//     for (const id of selectedIds) {
//       const entry = currentDayEntryList.find((e) => e._id === id);
//       const entryData = {
//         userId: entry.userId,
//         name: entry.name,
//         daily_qty: entry.daily_qty,
//         delivered_qty: entry.daily_qty,
//         entry_status: "Delivered",
//         date: currentSelectedDate,
//       };
//       const url = entry.entryId
//         ? `${import.meta.env.VITE_API_URL}/entries/${entry.entryId}`
//         : `${import.meta.env.VITE_API_URL}/entries`;
//       const method = entry.entryId ? axios.put : axios.post;

//       try {
//         const response = await method(url, entryData, {
//           headers: { "Content-type": "application/json" },
//         });
//         const updatedEntryFromServer = response.data;
//         successfulUpdates.push(updatedEntryFromServer);
//       } catch (err) {
//         console.error(err);
//         showMessage("Failed to mark as Delivered for " + entry.name);
//       }
//     }

//     setAllEntriesFromDatabase((prevAll) => {
//       let newAll = [...prevAll];
//       successfulUpdates.forEach((updatedItem) => {
//         const index = newAll.findIndex((item) => item._id === updatedItem._id);
//         if (index > -1) {
//           newAll[index] = { ...newAll[index], ...updatedItem };
//         } else {
//           newAll.push(updatedItem);
//         }
//       });
//       return newAll;
//     });

//     fetchAllEntriesAndInitializeDisplay(selectedDateOption, anotherDate);

//     showMessage("Marked selected entries as Delivered");
//     setSelectedIds([]);
//     setFlagLoad(false);
//   }

//   async function handleKhadaButtonClick() {
//     const currentSelectedDate = resolveSelectedDate(
//       selectedDateOption,
//       anotherDate
//     );
//     setFlagLoad(true);

//     const successfulUpdates = [];

//     for (const id of selectedIds) {
//       const userEntry = currentDayEntryList.find((e) => e._id === id);
//       const entryId = userEntry.entryId;

//       const entryData = {
//         userId: userEntry.userId,
//         name: userEntry.name,
//         daily_qty: userEntry.daily_qty,
//         delivered_qty: 0,
//         entry_status: "Khada",
//         date: currentSelectedDate,
//       };

//       const url = entryId
//         ? `${import.meta.env.VITE_API_URL}/entries/${entryId}`
//         : `${import.meta.env.VITE_API_URL}/entries`;

//       const method = entryId ? axios.put : axios.post;

//       try {
//         const response = await method(url, entryData, {
//           headers: { "Content-type": "application/json" },
//         });

//         const updatedEntryFromServer = response.data;
//         successfulUpdates.push(updatedEntryFromServer);
//       } catch (error) {
//         console.error("Error for", userEntry.name, error);
//         showMessage(`Failed to mark Khada for ${userEntry.name}`);
//       }
//     }

//     setAllEntriesFromDatabase((prevAll) => {
//       let newAll = [...prevAll];
//       successfulUpdates.forEach((updatedItem) => {
//         const index = newAll.findIndex((item) => item._id === updatedItem._id);
//         if (index > -1) {
//           newAll[index] = { ...newAll[index], ...updatedItem };
//         } else {
//           newAll.push(updatedItem);
//         }
//       });
//       return newAll;
//     });

//     fetchAllEntriesAndInitializeDisplay(selectedDateOption, anotherDate);

//     showMessage("Marked selected entries as Khada");
//     setSelectedIds([]);
//     setFlagLoad(false);
//   }

//   function handleChangeButtonClick() {
//     if (selectedIds.length !== 1) {
//       showMessage("Select exactly one user to change delivered quantity.");
//       return;
//     }
//     const user = currentDayEntryList.find((u) => u._id === selectedIds[0]);
//     setModalUser(user);
//     setModalQty(user.delivered_qty || "");
//     setShowChangeModal(true);
//   }

//   async function performDeleteOperation(entry) {
//     setFlagLoad(true);
//     try {
//       await axios.delete(
//         import.meta.env.VITE_API_URL + "/entries/" + entry.entryId
//       );

//       setAllEntriesFromDatabase((prevAll) => {
//         return prevAll.filter((item) => item._id !== entry.entryId);
//       });

//       const updatedEntry = {
//         ...entry,
//         delivered_qty: "",
//         entry_status: "",
//         entryId: null,
//         updateDate: "",
//       };

//       setCurrentDayEntryList((prevList) => {
//         const newList = prevList.map((e) =>
//           e._id === entry._id ? updatedEntry : e
//         );
//         setFilteredCurrentDayEntryList(newList);
//         return newList;
//       });

//       showMessage(`Entry - ${entry.name} deleted successfully.`);
//     } catch (error) {
//       console.log(error);
//       showMessage("Something went wrong, refresh the page");
//     }
//     setFlagLoad(false);
//   }

//   function handleListCheckBoxClick(checked, selectedIndex) {
//     let cnt = 0;
//     showInList.forEach((e) => {
//       if (e.show) {
//         cnt++;
//       }
//     });
//     if (cnt === 1 && !checked) {
//       showMessage("Minimum 1 field should be selected.");
//       return;
//     }
//     if (cnt === 5 && checked) {
//       showMessage("Maximum 5 fields can be selected.");
//       return;
//     }
//     let att = [...showInList];
//     let a = att.map((e, index) => {
//       let p = { ...e };
//       if (index === selectedIndex && checked) {
//         p.show = true;
//       } else if (index === selectedIndex && !checked) {
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
//       d = !direction;
//     } else {
//       d = false;
//     }
//     let list = [...filteredCurrentDayEntryList];
//     setDirection(d);
//     if (d === false) {
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
//     setFilteredCurrentDayEntryList(list);
//     setSortedField(field);
//   }
//   function handleSrNoClick() {
//     let d = false;
//     if (sortedField === "updateDate") {
//       d = !direction;
//     } else {
//       d = false;
//     }

//     let list = [...filteredCurrentDayEntryList];
//     setDirection(!direction);
//     if (d === false) {
//       list.sort((a, b) => {
//         if (new Date(a.updateDate || 0) > new Date(b.updateDate || 0)) {
//           return 1;
//         }
//         if (new Date(a.updateDate || 0) < new Date(b.updateDate || 0)) {
//           return -1;
//         }
//         return 0;
//       });
//     } else {
//       list.sort((a, b) => {
//         if (new Date(a.updateDate || 0) < new Date(b.updateDate || 0)) {
//           return 1;
//         }
//         if (new Date(a.updateDate || 0) > new Date(b.updateDate || 0)) {
//           return -1;
//         }
//         return 0;
//       });
//     }
//     setFilteredCurrentDayEntryList(list);
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
//     if (query.length === 0) {
//       setFilteredCurrentDayEntryList(currentDayEntryList);
//       return;
//     }
//     let searchedEntrys = [];
//     searchedEntrys = filterByShowInListAttributes(query);
//     setFilteredCurrentDayEntryList(searchedEntrys);
//   }
//   function filterByName(query) {
//     let fList = [];
//     for (let i = 0; i < currentDayEntryList.length; i++) {
//       if (currentDayEntryList[i].name.toLowerCase().includes(query.toLowerCase())) {
//         fList.push(currentDayEntryList[i]);
//       }
//     }
//     return fList;
//   }
//   function filterByShowInListAttributes(query) {
//     let fList = [];
//     for (let i = 0; i < currentDayEntryList.length; i++) {
//       for (let j = 0; j < showInList.length; j++) {
//         if (showInList[j].show) {
//           let parameterName = showInList[j].attribute;
//           if (
//             currentDayEntryList[i][parameterName] &&
//             currentDayEntryList[i][parameterName]
//               .toLowerCase()
//               .includes(query.toLowerCase())
//           ) {
//             fList.push(currentDayEntryList[i]);
//             break;
//           }
//         }
//       }
//     }
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
//       const workbook = XLSX.read(arrayBuffer, { type: "array" });
//       const sheetName = workbook.SheetNames[0];
//       const worksheet = workbook.Sheets[sheetName];
//       const jsonData = XLSX.utils.sheet_to_json(worksheet);
//       setSheetData(jsonData);
//       let result = analyseImportExcelSheet(jsonData, allEntriesFromDatabase);
//       if (result.message) {
//         showMessage(result.message);
//       } else {
//         showImportAnalysis(result);
//       }
//     };
//     reader.readAsArrayBuffer(file);
//   }
//   function showImportAnalysis(result) {
//     setCntAdd(result.cntA);
//     setCntUpdate(result.cntU);
//     setRecordsToBeAdded(result.recordsToBeAdded);
//     setRecordsToBeUpdated(result.recordsToBeUpdated);
//     setFlagImport(true);
//   }
//   function handleModalCloseClick() {
//     setFlagImport(false);
//   }
//   async function handleImportButtonClick() {
//     setFlagImport(false);
//     setFlagLoad(true);
//     let result;
//     try {
//       if (recordsToBeAdded.length > 0) {
//         result = await recordsAddBulk(
//           recordsToBeAdded,
//           "users",
//           allEntriesFromDatabase,
//           import.meta.env.VITE_API_URL
//         );
//         if (result.success) {
//           setAllEntriesFromDatabase(result.updatedList);
//           fetchAllEntriesAndInitializeDisplay(selectedDateOption, anotherDate);
//         }
//         showMessage(result.message);
//       }
//       if (recordsToBeUpdated.length > 0) {
//         result = await recordsUpdateBulk(
//           recordsToBeUpdated,
//           "users",
//           allEntriesFromDatabase,
//           import.meta.env.VITE_API_URL
//         );
//         if (result.success) {
//           setAllEntriesFromDatabase(result.updatedList);
//           fetchAllEntriesAndInitializeDisplay(selectedDateOption, anotherDate);
//         }
//         showMessage(result.message);
//       }
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

//   function fetchDataForSelectedDate(
//     option = selectedDateOption,
//     customDate = anotherDate
//   ) {
//     setSelectedIds([]);
//     fetchAllEntriesAndInitializeDisplay(option, customDate);
//   }

//   return (
//     <>
//       <CommonUtilityBar
//         action={action}
//         message={message}
//         selectedEntity={selectedEntity}
//         flagToggleButton={flagToggleButton}
//         filteredList={filteredCurrentDayEntryList}
//         mainList={currentDayEntryList}
//         showInList={showInList}
//         onListClick={handleListClick}
//         onAddEntityClick={handleAddEntityClick}
//         onSearchKeyUp={handleSearchKeyUp}
//         onExcelFileUploadClick={handleExcelFileUploadClick}
//         onClearSelectedFile={handleClearSelectedFile}
//       />

//       {filteredCurrentDayEntryList.length === 0 &&
//         currentDayEntryList.length !== 0 && (
//           <div className="text-center">Nothing to show for this date</div>
//         )}
//       {currentDayEntryList.length === 0 && (
//         <div className="text-center">No entries available for this date</div>
//       )}
//       {action === "list" && (
//         <div className="text-center my-3">
//           <label className="fw-bold me-3">Select Date:</label>

//           <div className="btn-group" role="group">
//             <button
//               type="button"
//               className={` btn ${
//                 selectedDateOption === "Today"
//                   ? "btn-primary"
//                   : "btn-outline-primary"
//               }`}
//               onClick={() => {
//                 setSelectedDateOption("Today");
//                 setAnotherDate("");
//                 fetchDataForSelectedDate("Today");
//               }}
//             >
//               Today
//             </button>
//             <button
//               type="button"
//               className={`btn ${
//                 selectedDateOption === "Yesterday"
//                   ? "btn-primary"
//                   : "btn-outline-primary"
//               }`}
//               onClick={() => {
//                 setSelectedDateOption("Yesterday");
//                 setAnotherDate("");
//                 fetchDataForSelectedDate("Yesterday");
//               }}
//             >
//               Yesterday
//             </button>
//             <button
//               type="button"
//               className={`btn ${
//                 selectedDateOption === "Another Day"
//                   ? "btn-primary"
//                   : "btn-outline-primary"
//               }`}
//               onClick={() => {
//                 setSelectedDateOption("Another Day");
//               }}
//             >
//               Another Day
//             </button>
//             {selectedDateOption === "Another Day" && (
//               <input
//                 type="date"
//                 className="form-control d-inline-block ms-2"
//                 style={{ width: "auto" }}
//                 value={anotherDate}
//                 onChange={(e) => {
//                   setAnotherDate(e.target.value);
//                   setSelectedIds([]);
//                   fetchDataForSelectedDate("Another Day", e.target.value);
//                 }}
//               />
//             )}
//           </div>
//         </div>
//       )}

//       {action === "list" && (
//         <div className="text-center my-3">
//           <div className="text-center my-3">
//             <button
//               className="btn btn-success mx-1"
//               onClick={handleDeliverButtonClick}
//               disabled={selectedIds.length === 0}
//             >
//               Delivered
//             </button>

//             <button
//               className="btn btn-warning mx-1"
//               onClick={handleKhadaButtonClick}
//               disabled={selectedIds.length === 0}
//             >
//               Khada
//             </button>

//             <button
//               className="btn btn-secondary mx-1"
//               onClick={handleChangeButtonClick}
//               disabled={selectedIds.length !== 1}
//             >
//               Change
//             </button>
//           </div>

//           {globalLatestEntryDate !== null ? (
//             <div className="text-sm text-red-600 font-semibold mt-2">
//               Last entry date: {globalLatestEntryDate.toLocaleDateString()}
//             </div>
//           ) : (
//             <div className="text-sm text-gray-500 mt-2">
//               No entries with a date found.
//             </div>
//           )}

//           {/* Display the validation message here */}
//           {validationMessage && (
//             <div className="text-sm text-blue-600 font-semibold mt-2">
//               {validationMessage}
//             </div>
//           )}
//         </div>
//       )}

//       {action === "list" && filteredCurrentDayEntryList.length !== 0 && (
//         <CheckBoxHeaders
//           showInList={showInList}
//           onListCheckBoxClick={handleListCheckBoxClick}
//         />
//       )}

//       {action === "list" && filteredCurrentDayEntryList.length !== 0 && (
//         <div className="row my-2 mx-auto p-1">
//           <div className="col-1">
//             <input
//               type="checkbox"
//               checked={
//                 selectedIds.length > 0 &&
//                 selectedIds.length === filteredCurrentDayEntryList.length
//               }
//               onChange={(ev) => {
//                 if (ev.target.checked) {
//                   setSelectedIds(filteredCurrentDayEntryList.map((entry) => entry._id));
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
//               {sortedField === "updateDate" && direction && (
//                 <i className="bi bi-arrow-up"></i>
//               )}
//               {sortedField === "updateDate" && !direction && (
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
//       {(action === "add" || action === "update") && (
//         <div className="row">
//           <AdminDailyEntryForm
//             entrySchema={entrySchema}
//             entryValidations={entryValidations}
//             emptyEntry={emptyEntry}
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
//       {showChangeModal && (
//         <ChangeQtyModal
//           user={modalUser}
//           qty={modalQty}
//           onQtyChange={(e) => setModalQty(e.target.value)}
//           onSave={handleModalQtySubmit}
//           onClose={() => setShowChangeModal(false)}
//         />
//       )}

//       {action === "list" &&
//         filteredCurrentDayEntryList.length !== 0 &&
//         filteredCurrentDayEntryList.map((e, index) => (
//           <div
//             className={`row mx-auto    mt-2 my-1 ${
//               e.entry_status === "Delivered"
//                 ? "bg-success bg-opacity-25"
//                 : e.entry_status === "Change"
//                 ? "bg-warning bg-opacity-25"
//                 : e.entry_status === "Khada"
//                 ? "bg-secondary bg-opacity-25"
//                 : ""
//             }`}
//             key={index}
//           >
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
//                 listSize={filteredCurrentDayEntryList.length}
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
























// // import { useEffect, useState } from "react";
// // import {
// //   CommonUtilityBar,
// //   CheckBoxHeaders,
// //   ListHeaders,
// //   Entity,
// // } from "../external/vite-sdk";
// // import { BeatLoader } from "react-spinners";
// // import axios from "axios";
// // import * as XLSX from "xlsx";
// // import ModalImport from "./ModalImport";
// // import ChangeQtyModal from "./ChangeQtyModal";
// // import {
// //   recordsAddBulk,
// //   recordsUpdateBulk,
// //   analyseImportExcelSheet,
// // } from "../external/vite-sdk";
// // import { getEmptyObject, getShowInList } from "../external/vite-sdk";
// // import AdminDailyEntryForm from "./AdminDailyEntryForm";

// // export default function AdminDailyEntry(props) {
// //   const [anotherDate, setAnotherDate] = useState("");
// //   let [showChangeModal, setShowChangeModal] = useState(false);
// //   let [modalUser, setModalUser] = useState(null);
// //   let [modalQty, setModalQty] = useState("");

// //   let [selectedIds, setSelectedIds] = useState([]);
// //   let [currentDayEntryList, setCurrentDayEntryList] = useState([]);
// //   let [filteredCurrentDayEntryList, setFilteredCurrentDayEntryList] = useState([]);
// //   let [action, setAction] = useState("list");
// //   let [userToBeEdited, setUserToBeEdited] = useState("");
// //   let [flagLoad, setFlagLoad] = useState(false);
// //   let [flagImport, setFlagImport] = useState(false);
// //   let [message, setMessage] = useState("");
// //   let [searchText, setSearchText] = useState("");
// //   let [sortedField, setSortedField] = useState("");
// //   let [direction, setDirection] = useState("");
// //   let [sheetData, setSheetData] = useState(null);
// //   let [selectedFile, setSelectedFile] = useState("");
// //   let [recordsToBeAdded, setRecordsToBeAdded] = useState([]);
// //   let [recordsToBeUpdated, setRecordsToBeUpdated] = useState([]);
// //   let [cntUpdate, setCntUpdate] = useState(0);
// //   let [cntAdd, setCntAdd] = useState(0);
// //   let { selectedEntity } = props;
// //   let { flagFormInvalid } = props;
// //   let { flagToggleButton } = props;

// //   const [selectedDateOption, setSelectedDateOption] = useState("Today");
// //   const [allEntriesFromDatabase, setAllEntriesFromDatabase] = useState([]);
// //   const [globalLatestEntryDate, setGlobalLatestEntryDate] = useState(null); 

// //   function resolveSelectedDate(option, customDate = "") {
// //     const today = new Date();
// //     if (option === "Today") return today.toISOString().split("T")[0];
// //     if (option === "Yesterday") {
// //       const yest = new Date(today);
// //       yest.setDate(yest.getDate() - 1);
// //       return yest.toISOString().split("T")[0];
// //     }
// //     if (option === "Another Day" && customDate) return customDate;
// //     return today.toISOString().split("T")[0];
// //   }

// //   let entrySchema = [
// //     { attribute: "name", type: "normal" },
// //     { attribute: "daily_qty", type: "normal" },
// //     { attribute: "delivered_qty", type: "normal" },
// //     {
// //       attribute: "entry_status",
// //       type: "normal",
// //       show: true,
// //     },
// //   ];
// //   let entryValidations = {
// //     name: { message: "", mxLen: 200, mnLen: 4, onlyDigits: false },
// //     daily_qty: { message: "", onlyDigits: true },
// //     delivered_qty: { message: "", onlyDigits: true },
// //     entry_status: { message: "" },
// //   };

// //   let [showInList, setShowInList] = useState(getShowInList(entrySchema));

// //   let [emptyEntry, setEmptyEntry] = useState({
// //     ...getEmptyObject(entrySchema),
// //     roleId: "68691372fa624c1dff2e06be",
// //     name: "",
// //     daily_qty: "",
// //     delivered_qty: "",
// //     entry_status: "",
// //   });

// //   useEffect(() => {
// //     fetchAllEntriesAndInitializeDisplay();
// //   }, []);

  
// //   const calculateGlobalLatestEntryDate = (entries) => {
// //     if (!entries || entries.length === 0) {
// //       setGlobalLatestEntryDate(null);
// //       return;
// //     }

// //     const validEntryDates = entries.filter((entry) => entry.date).map((entry) => new Date(entry.date).getTime());
// //     if (validEntryDates.length > 0) {
// //       const latestTimestamp = Math.max(...validEntryDates);
// //       setGlobalLatestEntryDate(new Date(latestTimestamp)); 
// //     } else {
// //       setGlobalLatestEntryDate(null);
// //     }
// //   };

// //   async function fetchAllEntriesAndInitializeDisplay(
// //     option = selectedDateOption,
// //     customDate = anotherDate
// //   ) {
// //     setFlagLoad(true);
// //     try {
// //       const [entryRes, userRes] = await Promise.all([
// //         axios(import.meta.env.VITE_API_URL + "/entries"),
// //         axios(import.meta.env.VITE_API_URL + "/users"),
// //       ]);

// //       const allDatabaseEntries = entryRes.data;

// //       setAllEntriesFromDatabase(allDatabaseEntries);
// //       calculateGlobalLatestEntryDate(allDatabaseEntries); 

// //       const userList = userRes.data;
// //       const dateToDisplay = resolveSelectedDate(option, customDate);

// //       const mergedListForCurrentDay = userList
// //         .filter((user) => user.roleId === "68691372fa624c1dff2e06be")
// //         .map((user) => {
// //           const entryForSelectedDate = allDatabaseEntries.find((entry) => {
// //             const entryDateFormatted =
// //               entry.date instanceof Date
// //                 ? entry.date.toISOString().split("T")[0]
// //                 : typeof entry.date === "string" && entry.date.includes("T")
// //                 ? entry.date.split("T")[0]
// //                 : entry.date;

// //             return entry.userId === user._id && entryDateFormatted === dateToDisplay;
// //           });

// //           return {
// //             _id: user._id,
// //             userId: user._id,
// //             name: user.name,
// //             daily_qty: user.daily_qty,
// //             delivered_qty: entryForSelectedDate?.delivered_qty ?? "",
// //             entry_status: entryForSelectedDate?.entry_status || "",
// //             date:
// //               entryForSelectedDate?.date &&
// //               typeof entryForSelectedDate.date === "string" &&
// //               entryForSelectedDate.date.includes("T")
// //                 ? entryForSelectedDate.date.split("T")[0]
// //                 : entryForSelectedDate?.date || dateToDisplay,
// //             updateDate: entryForSelectedDate?.updateDate || "",
// //             entryId: entryForSelectedDate?._id || null,
// //           };
// //         });

// //       mergedListForCurrentDay.sort(
// //         (a, b) => new Date(b.updateDate || 0) - new Date(a.updateDate || 0)
// //       );

// //       setCurrentDayEntryList(mergedListForCurrentDay);
// //       setFilteredCurrentDayEntryList(mergedListForCurrentDay);
// //     } catch (error) {
// //       console.error("Error fetching all entries or initializing display:", error);
// //       showMessage("Something went wrong while fetching data.");
// //       setAllEntriesFromDatabase([]);
// //       setGlobalLatestEntryDate(null);
// //     }
// //     setFlagLoad(false);
// //   }

// //   async function handleFormSubmit(entry) {
// //     let message;
// //     let entryForBackEnd = { ...entry };
// //     for (let key in entryForBackEnd) {
// //       entrySchema.forEach((e) => {
// //         if (key == e.attribute && e.relationalData) {
// //           delete entryForBackEnd[key];
// //         }
// //       });
// //     }

// //     if (entryForBackEnd.date instanceof Date) {
// //       entryForBackEnd.date = entryForBackEnd.date.toISOString().split("T")[0];
// //     } else if (
// //       typeof entryForBackEnd.date === "string" &&
// //       entryForBackEnd.date.includes("T")
// //     ) {
// //       entryForBackEnd.date = entryForBackEnd.date.split("T")[0];
// //     }

// //     if (action === "add") {
// //       setFlagLoad(true);
// //       try {
// //         const response = await axios.post(
// //           import.meta.env.VITE_API_URL + "/entries",
// //           entryForBackEnd,
// //           { headers: { "Content-type": "application/json" } }
// //         );
// //         const addedEntryFromServer = response.data;

// //         setAllEntriesFromDatabase(prevAll => {
// //             const newEntry = {
// //                 ...addedEntryFromServer,
// //                 userId: entryForBackEnd.userId,
// //                 name: entryForBackEnd.name,
// //                 date: entryForBackEnd.date
// //             };
// //             return [...prevAll, newEntry];
// //         });

// //         setCurrentDayEntryList((prevList) => {
// //           const newList = [
// //             ...prevList,
// //             {
// //               ...entry,
// //               ...addedEntryFromServer,
// //               entryId: addedEntryFromServer._id,
// //               updateDate:
// //                 addedEntryFromServer.updateDate || new Date().toISOString(),
// //             },
// //           ];
// //           return newList.sort(
// //             (a, b) => new Date(b.updateDate || 0) - new Date(a.updateDate || 0)
// //           );
// //         });
// //         setFilteredCurrentDayEntryList((prevList) => {
// //           const newList = [
// //             ...prevList,
// //             {
// //               ...entry,
// //               ...addedEntryFromServer,
// //               entryId: addedEntryFromServer._id,
// //               updateDate:
// //                 addedEntryFromServer.updateDate || new Date().toISOString(),
// //             },
// //           ];
// //           return newList.sort(
// //             (a, b) => new Date(b.updateDate || 0) - new Date(a.updateDate || 0)
// //           );
// //         });

// //         message = "Entry added successfully";
// //         showMessage(message);
// //         setAction("list");
// //       } catch (error) {
// //         console.error("Error adding entry:", error);
// //         showMessage("Something went wrong, refresh the page");
// //       }
// //       setFlagLoad(false);
// //     } else if (action === "update") {
// //       const entryToUpdateId = userToBeEdited.entryId;

// //       if (!entryToUpdateId) {
// //         showMessage(
// //           "Error: Cannot update. Entry ID not found for this record."
// //         );
// //         setFlagLoad(false);
// //         return;
// //       }

// //       setFlagLoad(true);
// //       try {
// //         const response = await axios.put(
// //           `${import.meta.env.VITE_API_URL}/entries/${entryToUpdateId}`,
// //           entryForBackEnd,
// //           { headers: { "Content-type": "application/json" } }
// //         );

// //         const updatedBackendEntry = response.data;

// //         setAllEntriesFromDatabase(prevAll => {
// //             return prevAll.map(item => {
// //                 if (item._id === updatedBackendEntry._id) {
// //                     return {
// //                         ...item,
// //                         ...updatedBackendEntry,
// //                         updateDate: updatedBackendEntry.updateDate || new Date().toISOString(),
// //                     };
// //                 }
// //                 return item;
// //             });
// //         });

// //         setCurrentDayEntryList((prevList) => {
// //           const newList = prevList.map((item) => {
// //             if (item._id === userToBeEdited._id) {
// //               return {
// //                 ...item,
// //                 ...updatedBackendEntry,
// //                 entryId: updatedBackendEntry._id,
// //                 updateDate:
// //                   updatedBackendEntry.updateDate || new Date().toISOString(),
// //               };
// //             }
// //             return item;
// //           });
// //           return newList.sort(
// //             (a, b) => new Date(b.updateDate || 0) - new Date(a.updateDate || 0)
// //           );
// //         });
// //         setFilteredCurrentDayEntryList((prevList) => {
// //           const newList = prevList.map((item) => {
// //             if (item._id === userToBeEdited._id) {
// //               return {
// //                 ...item,
// //                 ...updatedBackendEntry,
// //                 entryId: updatedBackendEntry._id,
// //                 updateDate:
// //                   updatedBackendEntry.updateDate || new Date().toISOString(),
// //               };
// //             }
// //             return item;
// //           });
// //           return newList.sort(
// //             (a, b) => new Date(b.updateDate || 0) - new Date(a.updateDate || 0)
// //           );
// //         });

// //         message = "Entry Updated successfully";
// //         showMessage(message);
// //         setAction("list");
// //       } catch (error) {
// //         console.error("Error updating entry:", error);
// //         showMessage("Something went wrong during update, please try again.");
// //       }
// //       setFlagLoad(false);
// //     }
// //   }
// //   function handleFormCloseClick() {
// //     props.onFormCloseClick();
// //   }

// //   function handleListClick() {
// //     setAction("list");
// //   }
// //   function handleAddEntityClick() {
// //     setAction("add");
// //   }
// //   function handleEditButtonClick(entry) {
// //     let safeEntry = {
// //       ...emptyEntry,
// //       ...entry,
// //       info: entry.info || "",
// //     };
// //     setAction("update");
// //     setUserToBeEdited(safeEntry);
// //   }
// //   function showMessage(message) {
// //     setMessage(message);
// //     window.setTimeout(() => {
// //       setMessage("");
// //     }, 3000);
// //   }

// //   async function handleModalQtySubmit() {
// //     if (!modalUser || modalQty === "") {
// //       showMessage("Please enter a valid quantity.");
// //       return;
// //     }

// //     const currentSelectedDate = resolveSelectedDate(
// //       selectedDateOption,
// //       anotherDate
// //     );

// //     const entryData = {
// //       userId: modalUser.userId,
// //       name: modalUser.name,
// //       daily_qty: modalUser.daily_qty,
// //       delivered_qty: modalQty,
// //       entry_status: "Change",
// //       date: currentSelectedDate,
// //     };

// //     const url = modalUser.entryId
// //       ? `${import.meta.env.VITE_API_URL}/entries/${modalUser.entryId}`
// //       : `${import.meta.env.VITE_API_URL}/entries`;

// //     const method = modalUser.entryId ? axios.put : axios.post;

// //     try {
// //       const response = await method(url, entryData, {
// //         headers: { "Content-type": "application/json" },
// //       });

// //       const updatedEntryFromServer = response.data;

// //       setAllEntriesFromDatabase(prevAll => {
// //           if (!modalUser.entryId) {
// //               return [...prevAll, updatedEntryFromServer];
// //           } else {
// //               return prevAll.map(item => {
// //                   if (item._id === updatedEntryFromServer._id) {
// //                       return { ...item, ...updatedEntryFromServer };
// //                   }
// //                   return item;
// //               });
// //           }
// //       });

// //       setCurrentDayEntryList((prevList) => {
// //         const newList = prevList
// //           .map((item) => {
// //             if (item._id === modalUser._id) {
// //               return {
// //                 ...item,
// //                 ...updatedEntryFromServer,
// //                 entryId: updatedEntryFromServer._id,
// //                 updateDate:
// //                   updatedEntryFromServer.updateDate || new Date().toISOString(),
// //               };
// //             }
// //             return item;
// //           })
// //           .sort(
// //             (a, b) => new Date(b.updateDate || 0) - new Date(a.updateDate || 0)
// //           );
// //         return newList;
// //       });

// //       setFilteredCurrentDayEntryList((prevList) => {
// //         const newList = prevList
// //           .map((item) => {
// //             if (item._id === modalUser._id) {
// //               return {
// //                 ...item,
// //                 ...updatedEntryFromServer,
// //                 entryId: updatedEntryFromServer._id,
// //                 updateDate:
// //                   updatedEntryFromServer.updateDate || new Date().toISOString(),
// //               };
// //             }
// //             return item;
// //           })
// //           .sort(
// //             (a, b) => new Date(b.updateDate || 0) - new Date(a.updateDate || 0)
// //           );
// //         return newList;
// //       });

// //       showMessage("Entry updated to 'Change'");
// //       setSelectedIds([]);
// //       setShowChangeModal(false);
// //     } catch (error) {
// //       console.error("Change update failed:", error);
// //       if (error.response) {
// //         console.error("Error response data:", error.response.data);
// //         console.error("Error response status:", error.response.status);
// //         console.error("Error response headers:", error.response.headers);
// //       } else if (error.request) {
// //         console.error("Error request:", error.request);
// //       } else {
// //         console.error("Error message:", error.message);
// //       }
// //       showMessage("Failed to update entry");
// //       setShowChangeModal(false);
// //     }
// //   }

// //   function handleDeleteButtonClick(ans, entry) {
// //     if (ans == "No") {
// //       showMessage("Delete operation cancelled");
// //       return;
// //     }
// //     if (ans == "Yes") {
// //       performDeleteOperation(entry);
// //     }
// //   }

// //   async function handleDeliverButtonClick() {
// //     const currentSelectedDate = resolveSelectedDate(
// //       selectedDateOption,
// //       anotherDate
// //     );
// //     setFlagLoad(true);

// //     const successfulUpdates = [];

// //     for (const id of selectedIds) {
// //       const entry = currentDayEntryList.find((e) => e._id === id);
// //       const entryData = {
// //         userId: entry.userId,
// //         name: entry.name,
// //         daily_qty: entry.daily_qty,
// //         delivered_qty: entry.daily_qty,
// //         entry_status: "Delivered",
// //         date: currentSelectedDate,
// //       };
// //       const url = entry.entryId
// //         ? `${import.meta.env.VITE_API_URL}/entries/${entry.entryId}`
// //         : `${import.meta.env.VITE_API_URL}/entries`;
// //       const method = entry.entryId ? axios.put : axios.post;

// //       try {
// //         const response = await method(url, entryData, {
// //           headers: { "Content-type": "application/json" },
// //         });
// //         const updatedEntryFromServer = response.data;
// //         successfulUpdates.push(updatedEntryFromServer);
// //       } catch (err) {
// //         console.error(err);
// //         showMessage("Failed to mark as Delivered for " + entry.name);
// //       }
// //     }

// //     setAllEntriesFromDatabase(prevAll => {
// //         let newAll = [...prevAll];
// //         successfulUpdates.forEach(updatedItem => {
// //             const index = newAll.findIndex(item => item._id === updatedItem._id);
// //             if (index > -1) {
// //                 newAll[index] = { ...newAll[index], ...updatedItem };
// //             } else {
// //                 newAll.push(updatedItem);
// //             }
// //         });
// //         return newAll;
// //     });

// //     fetchAllEntriesAndInitializeDisplay(selectedDateOption, anotherDate);

// //     showMessage("Marked selected entries as Delivered");
// //     setSelectedIds([]);
// //     setFlagLoad(false);
// //   }

// //   async function handleKhadaButtonClick() {
// //     const currentSelectedDate = resolveSelectedDate(
// //       selectedDateOption,
// //       anotherDate
// //     );
// //     setFlagLoad(true);

// //     const successfulUpdates = [];

// //     for (const id of selectedIds) {
// //       const userEntry = currentDayEntryList.find((e) => e._id === id);
// //       const entryId = userEntry.entryId;

// //       const entryData = {
// //         userId: userEntry.userId,
// //         name: userEntry.name,
// //         daily_qty: userEntry.daily_qty,
// //         delivered_qty: 0,
// //         entry_status: "Khada",
// //         date: currentSelectedDate,
// //       };

// //       const url = entryId
// //         ? `${import.meta.env.VITE_API_URL}/entries/${entryId}`
// //         : `${import.meta.env.VITE_API_URL}/entries`;

// //       const method = entryId ? axios.put : axios.post;

// //       try {
// //         const response = await method(url, entryData, {
// //           headers: { "Content-type": "application/json" },
// //         });

// //         const updatedEntryFromServer = response.data;
// //         successfulUpdates.push(updatedEntryFromServer);
// //       } catch (error) {
// //         console.error("Error for", userEntry.name, error);
// //         showMessage(`Failed to mark Khada for ${userEntry.name}`);
// //       }
// //     }

// //     setAllEntriesFromDatabase(prevAll => {
// //         let newAll = [...prevAll];
// //         successfulUpdates.forEach(updatedItem => {
// //             const index = newAll.findIndex(item => item._id === updatedItem._id);
// //             if (index > -1) {
// //                 newAll[index] = { ...newAll[index], ...updatedItem };
// //             } else {
// //                 newAll.push(updatedItem);
// //             }
// //         });
// //         return newAll;
// //     });

// //     fetchAllEntriesAndInitializeDisplay(selectedDateOption, anotherDate);

// //     showMessage("Marked selected entries as Khada");
// //     setSelectedIds([]);
// //     setFlagLoad(false);
// //   }

// //   function handleChangeButtonClick() {
// //     if (selectedIds.length !== 1) {
// //       showMessage("Select exactly one user to change delivered quantity.");
// //       return;
// //     }
// //     const user = currentDayEntryList.find((u) => u._id === selectedIds[0]);
// //     setModalUser(user);
// //     setModalQty(user.delivered_qty || "");
// //     setShowChangeModal(true);
// //   }

// //   async function performDeleteOperation(entry) {
// //     setFlagLoad(true);
// //     try {
// //       await axios.delete(
// //         import.meta.env.VITE_API_URL + "/entries/" + entry.entryId
// //       );

// //       setAllEntriesFromDatabase(prevAll => {
// //           return prevAll.filter(item => item._id !== entry.entryId);
// //       });

// //       const updatedEntry = {
// //         ...entry,
// //         delivered_qty: "",
// //         entry_status: "",
// //         entryId: null,
// //         updateDate: "",
// //       };

// //       setCurrentDayEntryList((prevList) => {
// //         const newList = prevList.map((e) =>
// //           e._id === entry._id ? updatedEntry : e
// //         );
// //         setFilteredCurrentDayEntryList(newList);
// //         return newList;
// //       });

// //       showMessage(`Entry - ${entry.name} deleted successfully.`);
// //     } catch (error) {
// //       console.log(error);
// //       showMessage("Something went wrong, refresh the page");
// //     }
// //     setFlagLoad(false);
// //   }

// //   function handleListCheckBoxClick(checked, selectedIndex) {
// //     let cnt = 0;
// //     showInList.forEach((e) => {
// //       if (e.show) {
// //         cnt++;
// //       }
// //     });
// //     if (cnt === 1 && !checked) {
// //       showMessage("Minimum 1 field should be selected.");
// //       return;
// //     }
// //     if (cnt === 5 && checked) {
// //       showMessage("Maximum 5 fields can be selected.");
// //       return;
// //     }
// //     let att = [...showInList];
// //     let a = att.map((e, index) => {
// //       let p = { ...e };
// //       if (index === selectedIndex && checked) {
// //         p.show = true;
// //       } else if (index === selectedIndex && !checked) {
// //         p.show = false;
// //       }
// //       return p;
// //     });
// //     setShowInList(a);
// //   }
// //   function handleHeaderClick(index) {
// //     let field = showInList[index].attribute;
// //     let d = false;
// //     if (field === sortedField) {
// //       d = !direction;
// //     } else {
// //       d = false;
// //     }
// //     let list = [...filteredCurrentDayEntryList];
// //     setDirection(d);
// //     if (d === false) {
// //       list.sort((a, b) => {
// //         if (a[field] > b[field]) {
// //           return 1;
// //         }
// //         if (a[field] < b[field]) {
// //           return -1;
// //         }
// //         return 0;
// //       });
// //     } else {
// //       list.sort((a, b) => {
// //         if (a[field] < b[field]) {
// //           return 1;
// //         }
// //         if (a[field] > b[field]) {
// //           return -1;
// //         }
// //         return 0;
// //       });
// //     }
// //     setFilteredCurrentDayEntryList(list);
// //     setSortedField(field);
// //   }
// //   function handleSrNoClick() {
// //     let d = false;
// //     if (sortedField === "updateDate") {
// //       d = !direction;
// //     } else {
// //       d = false;
// //     }

// //     let list = [...filteredCurrentDayEntryList];
// //     setDirection(!direction);
// //     if (d === false) {
// //       list.sort((a, b) => {
// //         if (new Date(a.updateDate || 0) > new Date(b.updateDate || 0)) {
// //           return 1;
// //         }
// //         if (new Date(a.updateDate || 0) < new Date(b.updateDate || 0)) {
// //           return -1;
// //         }
// //         return 0;
// //       });
// //     } else {
// //       list.sort((a, b) => {
// //         if (new Date(a.updateDate || 0) < new Date(b.updateDate || 0)) {
// //           return 1;
// //         }
// //         if (new Date(a.updateDate || 0) > new Date(b.updateDate || 0)) {
// //           return -1;
// //         }
// //         return 0;
// //       });
// //     }
// //     setFilteredCurrentDayEntryList(list);
// //     setSortedField("updateDate");
// //   }
// //   function handleFormTextChangeValidations(message, index) {
// //     props.onFormTextChangeValidations(message, index);
// //   }
// //   function handleSearchKeyUp(event) {
// //     let searchText = event.target.value;
// //     setSearchText(searchText);
// //     performSearchOperation(searchText);
// //   }
// //   function performSearchOperation(searchText) {
// //     let query = searchText.trim();
// //     if (query.length === 0) {
// //       setFilteredCurrentDayEntryList(currentDayEntryList);
// //       return;
// //     }
// //     let searchedEntrys = [];
// //     searchedEntrys = filterByShowInListAttributes(query);
// //     setFilteredCurrentDayEntryList(searchedEntrys);
// //   }
// //   function filterByName(query) {
// //     let fList = [];
// //     for (let i = 0; i < currentDayEntryList.length; i++) {
// //       if (currentDayEntryList[i].name.toLowerCase().includes(query.toLowerCase())) {
// //         fList.push(currentDayEntryList[i]);
// //       }
// //     }
// //     return fList;
// //   }
// //   function filterByShowInListAttributes(query) {
// //     let fList = [];
// //     for (let i = 0; i < currentDayEntryList.length; i++) {
// //       for (let j = 0; j < showInList.length; j++) {
// //         if (showInList[j].show) {
// //           let parameterName = showInList[j].attribute;
// //           if (
// //             currentDayEntryList[i][parameterName] &&
// //             currentDayEntryList[i][parameterName]
// //               .toLowerCase()
// //               .includes(query.toLowerCase())
// //           ) {
// //             fList.push(currentDayEntryList[i]);
// //             break;
// //           }
// //         }
// //       }
// //     }
// //     return fList;
// //   }
// //   function handleToggleText(index) {
// //     let sil = [...showInList];
// //     sil[index].flagReadMore = !sil[index].flagReadMore;
// //     setShowInList(sil);
// //   }
// //   function handleExcelFileUploadClick(file, msg) {
// //     if (msg) {
// //       showMessage(message);
// //       return;
// //     }
// //     setSelectedFile(file);
// //     const reader = new FileReader();
// //     reader.onload = (event) => {
// //       const arrayBuffer = event.target.result;
// //       const workbook = XLSX.read(arrayBuffer, { type: "array" });
// //       const sheetName = workbook.SheetNames[0];
// //       const worksheet = workbook.Sheets[sheetName];
// //       const jsonData = XLSX.utils.sheet_to_json(worksheet);
// //       setSheetData(jsonData);
// //       let result = analyseImportExcelSheet(jsonData, allEntriesFromDatabase);
// //       if (result.message) {
// //         showMessage(result.message);
// //       } else {
// //         showImportAnalysis(result);
// //       }
// //     };
// //     reader.readAsArrayBuffer(file);
// //   }
// //   function showImportAnalysis(result) {
// //     setCntAdd(result.cntA);
// //     setCntUpdate(result.cntU);
// //     setRecordsToBeAdded(result.recordsToBeAdded);
// //     setRecordsToBeUpdated(result.recordsToBeUpdated);
// //     setFlagImport(true);
// //   }
// //   function handleModalCloseClick() {
// //     setFlagImport(false);
// //   }
// //   async function handleImportButtonClick() {
// //     setFlagImport(false);
// //     setFlagLoad(true);
// //     let result;
// //     try {
// //       if (recordsToBeAdded.length > 0) {
// //         result = await recordsAddBulk(
// //           recordsToBeAdded,
// //           "users",
// //           allEntriesFromDatabase,
// //           import.meta.env.VITE_API_URL
// //         );
// //         if (result.success) {
// //           setAllEntriesFromDatabase(result.updatedList);
// //           fetchAllEntriesAndInitializeDisplay(selectedDateOption, anotherDate);
// //         }
// //         showMessage(result.message);
// //       }
// //       if (recordsToBeUpdated.length > 0) {
// //         result = await recordsUpdateBulk(
// //           recordsToBeUpdated,
// //           "users",
// //           allEntriesFromDatabase,
// //           import.meta.env.VITE_API_URL
// //         );
// //         if (result.success) {
// //           setAllEntriesFromDatabase(result.updatedList);
// //           fetchAllEntriesAndInitializeDisplay(selectedDateOption, anotherDate);
// //         }
// //         showMessage(result.message);
// //       }
// //     } catch (error) {
// //       console.log(error);
// //       showMessage("Something went wrong, refresh the page");
// //     }
// //     setFlagLoad(false);
// //   }
// //   function handleClearSelectedFile() {
// //     setSelectedFile(null);
// //   }
// //   if (flagLoad) {
// //     return (
// //       <div className="my-5 text-center">
// //         <BeatLoader size={24} color={"blue"} />
// //       </div>
// //     );
// //   }

// //   function fetchDataForSelectedDate(
// //     option = selectedDateOption,
// //     customDate = anotherDate
// //   ) {
// //     setSelectedIds([]);
// //     fetchAllEntriesAndInitializeDisplay(option, customDate);
// //   }

// //   return (
// //     <>
// //       <CommonUtilityBar
// //         action={action}
// //         message={message}
// //         selectedEntity={selectedEntity}
// //         flagToggleButton={flagToggleButton}
// //         filteredList={filteredCurrentDayEntryList}
// //         mainList={currentDayEntryList}
// //         showInList={showInList}
// //         onListClick={handleListClick}
// //         onAddEntityClick={handleAddEntityClick}
// //         onSearchKeyUp={handleSearchKeyUp}
// //         onExcelFileUploadClick={handleExcelFileUploadClick}
// //         onClearSelectedFile={handleClearSelectedFile}
// //       />

// //       {filteredCurrentDayEntryList.length === 0 && currentDayEntryList.length !== 0 && (
// //         <div className="text-center">Nothing to show for this date</div>
// //       )}
// //       {currentDayEntryList.length === 0 && (
// //         <div className="text-center">No entries available for this date</div>
// //       )}
// //       {action === "list" && (
// //         <div className="text-center my-3">
// //           <label className="fw-bold me-3">Select Date:</label>

// //           <div className="btn-group" role="group">
// //             <button
// //               type="button"
// //               className={` btn ${
// //                 selectedDateOption === "Today"
// //                   ? "btn-primary"
// //                   : "btn-outline-primary"
// //               }`}
// //               onClick={() => {
// //                 setSelectedDateOption("Today");
// //                 setAnotherDate("");
// //                 fetchDataForSelectedDate("Today");
// //               }}
// //             >
// //               Today
// //             </button>
// //             <button
// //               type="button"
// //               className={`btn ${
// //                 selectedDateOption === "Yesterday"
// //                   ? "btn-primary"
// //                   : "btn-outline-primary"
// //               }`}
// //               onClick={() => {
// //                 setSelectedDateOption("Yesterday");
// //                 setAnotherDate("");
// //                 fetchDataForSelectedDate("Yesterday");
// //               }}
// //             >
// //               Yesterday
// //             </button>
// //             <button
// //               type="button"
// //               className={`btn ${
// //                 selectedDateOption === "Another Day"
// //                   ? "btn-primary"
// //                   : "btn-outline-primary"
// //               }`}
// //               onClick={() => {
// //                 setSelectedDateOption("Another Day");
// //               }}
// //             >
// //               Another Day
// //             </button>
// //             {selectedDateOption === "Another Day" && (
// //               <input
// //                 type="date"
// //                 className="form-control d-inline-block ms-2"
// //                 style={{ width: "auto" }}
// //                 value={anotherDate}
// //                 onChange={(e) => {
// //                   setAnotherDate(e.target.value);
// //                   setSelectedIds([]);
// //                   fetchDataForSelectedDate("Another Day", e.target.value);
// //                 }}
// //               />
// //             )}
// //           </div>
// //         </div>
// //       )}

// //       {action === "list" && (
// //         <div className="text-center my-3">
// //           <div className="text-center my-3">
// //             <button
// //               className="btn btn-success mx-1"
// //               onClick={handleDeliverButtonClick}
// //               disabled={selectedIds.length === 0}
// //             >
// //               Delivered
// //             </button>

// //             <button
// //               className="btn btn-warning mx-1"
// //               onClick={handleKhadaButtonClick}
// //               disabled={selectedIds.length === 0}
// //             >
// //               Khada
// //             </button>

// //             <button
// //               className="btn btn-secondary mx-1"
// //               onClick={handleChangeButtonClick}
// //               disabled={selectedIds.length !== 1}
// //             >
// //               Change
// //             </button>
// //           </div>

// //           {globalLatestEntryDate !== null ? (
// //             <div className="text-sm text-red-600 font-semibold mt-2">
// //               Last entry date: {globalLatestEntryDate.toLocaleDateString()}
// //             </div>
// //           ) : (
// //             <div className="text-sm text-gray-500 mt-2">
// //               No entries with a date found.
// //             </div>
// //           )}
// //         </div>
// //       )}

// //       {action === "list" && filteredCurrentDayEntryList.length !== 0 && (
// //         <CheckBoxHeaders
// //           showInList={showInList}
// //           onListCheckBoxClick={handleListCheckBoxClick}
// //         />
// //       )}

// //       {action === "list" && filteredCurrentDayEntryList.length !== 0 && (
// //         <div className="row my-2 mx-auto p-1">
// //           <div className="col-1">
// //             <input
// //               type="checkbox"
// //               checked={
// //                 selectedIds.length > 0 &&
// //                 selectedIds.length === filteredCurrentDayEntryList.length
// //               }
// //               onChange={(ev) => {
// //                 if (ev.target.checked) {
// //                   setSelectedIds(filteredCurrentDayEntryList.map((entry) => entry._id));
// //                 } else {
// //                   setSelectedIds([]);
// //                 }
// //               }}
// //             />
// //           </div>
// //           <div className="col-1">
// //             <a
// //               href="#"
// //               onClick={() => {
// //                 handleSrNoClick();
// //               }}
// //             >
// //               SN.{" "}
// //               {sortedField === "updateDate" && direction && (
// //                 <i className="bi bi-arrow-up"></i>
// //               )}
// //               {sortedField === "updateDate" && !direction && (
// //                 <i className="bi bi-arrow-down"></i>
// //               )}
// //             </a>
// //           </div>
// //           <ListHeaders
// //             showInList={showInList}
// //             sortedField={sortedField}
// //             direction={direction}
// //             onHeaderClick={handleHeaderClick}
// //           />
// //           <div className="col-1">&nbsp;</div>
// //         </div>
// //       )}
// //       {(action === "add" || action === "update") && (
// //         <div className="row">
// //           <AdminDailyEntryForm
// //             entrySchema={entrySchema}
// //             entryValidations={entryValidations}
// //             emptyEntry={emptyEntry}
// //             selectedEntity={selectedEntity}
// //             userToBeEdited={userToBeEdited}
// //             action={action}
// //             flagFormInvalid={flagFormInvalid}
// //             onFormSubmit={handleFormSubmit}
// //             onFormCloseClick={handleFormCloseClick}
// //             onFormTextChangeValidations={handleFormTextChangeValidations}
// //           />
// //         </div>
// //       )}
// //       {showChangeModal && (
// //         <ChangeQtyModal
// //           user={modalUser}
// //           qty={modalQty}
// //           onQtyChange={(e) => setModalQty(e.target.value)}
// //           onSave={handleModalQtySubmit}
// //           onClose={() => setShowChangeModal(false)}
// //         />
// //       )}

// //       {action === "list" &&
// //         filteredCurrentDayEntryList.length !== 0 &&
// //         filteredCurrentDayEntryList.map((e, index) => (
// //           <div
// //             className={`row mx-auto   mt-2 my-1 ${
// //               e.entry_status === "Delivered"
// //                 ? "bg-success bg-opacity-25"
// //                 : e.entry_status === "Change"
// //                 ? "bg-warning bg-opacity-25"
// //                 : e.entry_status === "Khada"
// //                 ? "bg-secondary bg-opacity-25"
// //                 : ""
// //             }`}
// //             key={index}
// //           >
// //             <div className="col-1 d-flex align-items-center">
// //               <input
// //                 type="checkbox"
// //                 checked={selectedIds.includes(e._id)}
// //                 onChange={(ev) => {
// //                   if (ev.target.checked) {
// //                     setSelectedIds((prev) => [...prev, e._id]);
// //                   } else {
// //                     setSelectedIds((prev) => prev.filter((id) => id !== e._id));
// //                   }
// //                 }}
// //               />
// //             </div>
// //             <div className="col-11">
// //               <Entity
// //                 entity={e}
// //                 index={index}
// //                 sortedField={sortedField}
// //                 direction={direction}
// //                 listSize={filteredCurrentDayEntryList.length}
// //                 selectedEntity={selectedEntity}
// //                 showInList={showInList}
// //                 VITE_API_URL={import.meta.env.VITE_API_URL}
// //                 onEditButtonClick={handleEditButtonClick}
// //                 onDeleteButtonClick={handleDeleteButtonClick}
// //                 onToggleText={handleToggleText}
// //               />
// //             </div>
// //           </div>
// //         ))}

// //       {flagImport && (
// //         <ModalImport
// //           modalText={"Summary of Bulk Import"}
// //           additions={recordsToBeAdded}
// //           updations={recordsToBeUpdated}
// //           btnGroup={["Yes", "No"]}
// //           onModalCloseClick={handleModalCloseClick}
// //           onModalButtonCancelClick={handleModalCloseClick}
// //           onImportButtonClick={handleImportButtonClick}
// //         />
// //       )}
// //     </>
// //   );
// // }



















// // import { useEffect, useState } from "react";
// // import {
// //   CommonUtilityBar,
// //   CheckBoxHeaders,
// //   ListHeaders,
// //   Entity,
// // } from "../external/vite-sdk";
// // import { BeatLoader } from "react-spinners";
// // import axios from "axios";
// // import * as XLSX from "xlsx";
// // import ModalImport from "./ModalImport";
// // import ChangeQtyModal from "./ChangeQtyModal";
// // import {
// //   recordsAddBulk,
// //   recordsUpdateBulk,
// //   analyseImportExcelSheet,
// // } from "../external/vite-sdk";
// // import { getEmptyObject, getShowInList } from "../external/vite-sdk";
// // import AdminDailyEntryForm from "./AdminDailyEntryForm";

// // export default function AdminDailyEntry(props) {
// //   const [anotherDate, setAnotherDate] = useState("");
// //   let [showChangeModal, setShowChangeModal] = useState(false);
// //   let [modalUser, setModalUser] = useState(null);
// //   let [modalQty, setModalQty] = useState("");

// //   let [selectedIds, setSelectedIds] = useState([]);
// //   let [currentDayEntryList, setCurrentDayEntryList] = useState([]);
// //   let [filteredCurrentDayEntryList, setFilteredCurrentDayEntryList] = useState([]);
// //   let [action, setAction] = useState("list");
// //   let [userToBeEdited, setUserToBeEdited] = useState("");
// //   let [flagLoad, setFlagLoad] = useState(false);
// //   let [flagImport, setFlagImport] = useState(false);
// //   let [message, setMessage] = useState("");
// //   let [searchText, setSearchText] = useState("");
// //   let [sortedField, setSortedField] = useState("");
// //   let [direction, setDirection] = useState("");
// //   let [sheetData, setSheetData] = useState(null);
// //   let [selectedFile, setSelectedFile] = useState("");
// //   let [recordsToBeAdded, setRecordsToBeAdded] = useState([]);
// //   let [recordsToBeUpdated, setRecordsToBeUpdated] = useState([]);
// //   let [cntUpdate, setCntUpdate] = useState(0);
// //   let [cntAdd, setCntAdd] = useState(0);
// //   let { selectedEntity } = props;
// //   let { flagFormInvalid } = props;
// //   let { flagToggleButton } = props;

// //   const [selectedDateOption, setSelectedDateOption] = useState("Today");
// //   const [allEntriesFromDatabase, setAllEntriesFromDatabase] = useState([]);
// //   const [globalLatestUpdatedDate, setGlobalLatestUpdatedDate] = useState(null);

// //   function resolveSelectedDate(option, customDate = "") {
// //     const today = new Date();
// //     if (option === "Today") return today.toISOString().split("T")[0];
// //     if (option === "Yesterday") {
// //       const yest = new Date(today);
// //       yest.setDate(yest.getDate() - 1);
// //       return yest.toISOString().split("T")[0];
// //     }
// //     if (option === "Another Day" && customDate) return customDate;
// //     return today.toISOString().split("T")[0];
// //   }

// //   let entrySchema = [
// //     { attribute: "name", type: "normal" },
// //     { attribute: "daily_qty", type: "normal" },
// //     { attribute: "delivered_qty", type: "normal" },
// //     {
// //       attribute: "entry_status",
// //       type: "normal",
// //       show: true,
// //     },
// //   ];
// //   let entryValidations = {
// //     name: { message: "", mxLen: 200, mnLen: 4, onlyDigits: false },
// //     daily_qty: { message: "", onlyDigits: true },
// //     delivered_qty: { message: "", onlyDigits: true },
// //     entry_status: { message: "" },
// //   };

// //   let [showInList, setShowInList] = useState(getShowInList(entrySchema));

// //   let [emptyEntry, setEmptyEntry] = useState({
// //     ...getEmptyObject(entrySchema),
// //     roleId: "68691372fa624c1dff2e06be",
// //     name: "",
// //     daily_qty: "",
// //     delivered_qty: "",
// //     entry_status: "",
// //   });

// //   useEffect(() => {
// //     fetchAllEntriesAndInitializeDisplay();
// //   }, []);

// //   const calculateGlobalLatestDate = (entries) => {
// //     if (!entries || entries.length === 0) {
// //       setGlobalLatestUpdatedDate(null);
// //       return;
// //     }

// //     const validUpdateDates = entries
// //       .filter((entry) => entry.updateDate)
// //       .map((entry) => new Date(entry.updateDate).getTime());

// //     if (validUpdateDates.length > 0) {
// //       const latestTimestamp = Math.max(...validUpdateDates);
// //       setGlobalLatestUpdatedDate(new Date(latestTimestamp));
// //     } else {
// //       setGlobalLatestUpdatedDate(null);
// //     }
// //   };

// //   async function fetchAllEntriesAndInitializeDisplay(
// //     option = selectedDateOption,
// //     customDate = anotherDate
// //   ) {
// //     setFlagLoad(true);
// //     try {
// //       const [entryRes, userRes] = await Promise.all([
// //         axios(import.meta.env.VITE_API_URL + "/entries"),
// //         axios(import.meta.env.VITE_API_URL + "/users"),
// //       ]);

// //       const allDatabaseEntries = entryRes.data;
// //       const userList = userRes.data;

// //       setAllEntriesFromDatabase(allDatabaseEntries);
// //       calculateGlobalLatestDate(allDatabaseEntries);

// //       const dateToDisplay = resolveSelectedDate(option, customDate);

// //       const mergedListForCurrentDay = userList
// //         .filter((user) => user.roleId === "68691372fa624c1dff2e06be")
// //         .map((user) => {
// //           const entryForSelectedDate = allDatabaseEntries.find((entry) => {
// //             const entryDateFormatted =
// //               entry.date instanceof Date
// //                 ? entry.date.toISOString().split("T")[0]
// //                 : typeof entry.date === "string" && entry.date.includes("T")
// //                 ? entry.date.split("T")[0]
// //                 : entry.date;

// //             return entry.userId === user._id && entryDateFormatted === dateToDisplay;
// //           });

// //           return {
// //             _id: user._id,
// //             userId: user._id,
// //             name: user.name,
// //             daily_qty: user.daily_qty,
// //             delivered_qty: entryForSelectedDate?.delivered_qty ?? "",
// //             entry_status: entryForSelectedDate?.entry_status || "",
// //             date:
// //               entryForSelectedDate?.date &&
// //               typeof entryForSelectedDate.date === "string" &&
// //               entryForSelectedDate.date.includes("T")
// //                 ? entryForSelectedDate.date.split("T")[0]
// //                 : entryForSelectedDate?.date || dateToDisplay,
// //             updateDate: entryForSelectedDate?.updateDate || "",
// //             entryId: entryForSelectedDate?._id || null,
// //           };
// //         });

// //       mergedListForCurrentDay.sort(
// //         (a, b) => new Date(b.updateDate || 0) - new Date(a.updateDate || 0)
// //       );

// //       setCurrentDayEntryList(mergedListForCurrentDay);
// //       setFilteredCurrentDayEntryList(mergedListForCurrentDay);
// //     } catch (error) {
// //       console.error("Error fetching all entries or initializing display:", error);
// //       showMessage("Something went wrong while fetching data.");
// //       setAllEntriesFromDatabase([]);
// //       setGlobalLatestUpdatedDate(null);
// //     }
// //     setFlagLoad(false);
// //   }

// //   async function handleFormSubmit(entry) {
// //     let message;
// //     let entryForBackEnd = { ...entry };
// //     for (let key in entryForBackEnd) {
// //       entrySchema.forEach((e) => {
// //         if (key == e.attribute && e.relationalData) {
// //           delete entryForBackEnd[key];
// //         }
// //       });
// //     }

// //     if (entryForBackEnd.date instanceof Date) {
// //       entryForBackEnd.date = entryForBackEnd.date.toISOString().split("T")[0];
// //     } else if (
// //       typeof entryForBackEnd.date === "string" &&
// //       entryForBackEnd.date.includes("T")
// //     ) {
// //       entryForBackEnd.date = entryForBackEnd.date.split("T")[0];
// //     }

// //     if (action === "add") {
// //       setFlagLoad(true);
// //       try {
// //         const response = await axios.post(
// //           import.meta.env.VITE_API_URL + "/entries",
// //           entryForBackEnd,
// //           { headers: { "Content-type": "application/json" } }
// //         );
// //         const addedEntryFromServer = response.data;

// //         setAllEntriesFromDatabase(prevAll => {
// //             const newEntry = {
// //                 ...addedEntryFromServer,
// //                 userId: entryForBackEnd.userId,
// //                 name: entryForBackEnd.name,
// //                 date: entryForBackEnd.date
// //             };
// //             return [...prevAll, newEntry];
// //         });

// //         setCurrentDayEntryList((prevList) => {
// //           const newList = [
// //             ...prevList,
// //             {
// //               ...entry,
// //               ...addedEntryFromServer,
// //               entryId: addedEntryFromServer._id,
// //               updateDate:
// //                 addedEntryFromServer.updateDate || new Date().toISOString(),
// //             },
// //           ];
// //           return newList.sort(
// //             (a, b) => new Date(b.updateDate || 0) - new Date(a.updateDate || 0)
// //           );
// //         });
// //         setFilteredCurrentDayEntryList((prevList) => {
// //           const newList = [
// //             ...prevList,
// //             {
// //               ...entry,
// //               ...addedEntryFromServer,
// //               entryId: addedEntryFromServer._id,
// //               updateDate:
// //                 addedEntryFromServer.updateDate || new Date().toISOString(),
// //             },
// //           ];
// //           return newList.sort(
// //             (a, b) => new Date(b.updateDate || 0) - new Date(a.updateDate || 0)
// //           );
// //         });

// //         message = "Entry added successfully";
// //         showMessage(message);
// //         setAction("list");
// //       } catch (error) {
// //         console.error("Error adding entry:", error);
// //         showMessage("Something went wrong, refresh the page");
// //       }
// //       setFlagLoad(false);
// //     } else if (action === "update") {
// //       const entryToUpdateId = userToBeEdited.entryId;

// //       if (!entryToUpdateId) {
// //         showMessage(
// //           "Error: Cannot update. Entry ID not found for this record."
// //         );
// //         setFlagLoad(false);
// //         return;
// //       }

// //       setFlagLoad(true);
// //       try {
// //         const response = await axios.put(
// //           `${import.meta.env.VITE_API_URL}/entries/${entryToUpdateId}`,
// //           entryForBackEnd,
// //           { headers: { "Content-type": "application/json" } }
// //         );

// //         const updatedBackendEntry = response.data;

// //         setAllEntriesFromDatabase(prevAll => {
// //             return prevAll.map(item => {
// //                 if (item._id === updatedBackendEntry._id) {
// //                     return {
// //                         ...item,
// //                         ...updatedBackendEntry,
// //                         updateDate: updatedBackendEntry.updateDate || new Date().toISOString(),
// //                     };
// //                 }
// //                 return item;
// //             });
// //         });

// //         setCurrentDayEntryList((prevList) => {
// //           const newList = prevList.map((item) => {
// //             if (item._id === userToBeEdited._id) {
// //               return {
// //                 ...item,
// //                 ...updatedBackendEntry,
// //                 entryId: updatedBackendEntry._id,
// //                 updateDate:
// //                   updatedBackendEntry.updateDate || new Date().toISOString(),
// //               };
// //             }
// //             return item;
// //           });
// //           return newList.sort(
// //             (a, b) => new Date(b.updateDate || 0) - new Date(a.updateDate || 0)
// //           );
// //         });
// //         setFilteredCurrentDayEntryList((prevList) => {
// //           const newList = prevList.map((item) => {
// //             if (item._id === userToBeEdited._id) {
// //               return {
// //                 ...item,
// //                 ...updatedBackendEntry,
// //                 entryId: updatedBackendEntry._id,
// //                 updateDate:
// //                   updatedBackendEntry.updateDate || new Date().toISOString(),
// //               };
// //             }
// //             return item;
// //           });
// //           return newList.sort(
// //             (a, b) => new Date(b.updateDate || 0) - new Date(a.updateDate || 0)
// //           );
// //         });

// //         message = "Entry Updated successfully";
// //         showMessage(message);
// //         setAction("list");
// //       } catch (error) {
// //         console.error("Error updating entry:", error);
// //         showMessage("Something went wrong during update, please try again.");
// //       }
// //       setFlagLoad(false);
// //     }
// //   }
// //   function handleFormCloseClick() {
// //     props.onFormCloseClick();
// //   }

// //   function handleListClick() {
// //     setAction("list");
// //   }
// //   function handleAddEntityClick() {
// //     setAction("add");
// //   }
// //   function handleEditButtonClick(entry) {
// //     let safeEntry = {
// //       ...emptyEntry,
// //       ...entry,
// //       info: entry.info || "",
// //     };
// //     setAction("update");
// //     setUserToBeEdited(safeEntry);
// //   }
// //   function showMessage(message) {
// //     setMessage(message);
// //     window.setTimeout(() => {
// //       setMessage("");
// //     }, 3000);
// //   }

// //   async function handleModalQtySubmit() {
// //     if (!modalUser || modalQty === "") {
// //       showMessage("Please enter a valid quantity.");
// //       return;
// //     }

// //     const currentSelectedDate = resolveSelectedDate(
// //       selectedDateOption,
// //       anotherDate
// //     );

// //     const entryData = {
// //       userId: modalUser.userId,
// //       name: modalUser.name,
// //       daily_qty: modalUser.daily_qty,
// //       delivered_qty: modalQty,
// //       entry_status: "Change",
// //       date: currentSelectedDate,
// //     };

// //     const url = modalUser.entryId
// //       ? `${import.meta.env.VITE_API_URL}/entries/${modalUser.entryId}`
// //       : `${import.meta.env.VITE_API_URL}/entries`;

// //     const method = modalUser.entryId ? axios.put : axios.post;

// //     try {
// //       const response = await method(url, entryData, {
// //         headers: { "Content-type": "application/json" },
// //       });

// //       const updatedEntryFromServer = response.data;

// //       setAllEntriesFromDatabase(prevAll => {
// //           if (!modalUser.entryId) {
// //               return [...prevAll, updatedEntryFromServer];
// //           } else {
// //               return prevAll.map(item => {
// //                   if (item._id === updatedEntryFromServer._id) {
// //                       return { ...item, ...updatedEntryFromServer };
// //                   }
// //                   return item;
// //               });
// //           }
// //       });

// //       setCurrentDayEntryList((prevList) => {
// //         const newList = prevList
// //           .map((item) => {
// //             if (item._id === modalUser._id) {
// //               return {
// //                 ...item,
// //                 ...updatedEntryFromServer,
// //                 entryId: updatedEntryFromServer._id,
// //                 updateDate:
// //                   updatedEntryFromServer.updateDate || new Date().toISOString(),
// //               };
// //             }
// //             return item;
// //           })
// //           .sort(
// //             (a, b) => new Date(b.updateDate || 0) - new Date(a.updateDate || 0)
// //           );
// //         return newList;
// //       });

// //       setFilteredCurrentDayEntryList((prevList) => {
// //         const newList = prevList
// //           .map((item) => {
// //             if (item._id === modalUser._id) {
// //               return {
// //                 ...item,
// //                 ...updatedEntryFromServer,
// //                 entryId: updatedEntryFromServer._id,
// //                 updateDate:
// //                   updatedEntryFromServer.updateDate || new Date().toISOString(),
// //               };
// //             }
// //             return item;
// //           })
// //           .sort(
// //             (a, b) => new Date(b.updateDate || 0) - new Date(a.updateDate || 0)
// //           );
// //         return newList;
// //       });

// //       showMessage("Entry updated to 'Change'");
// //       setSelectedIds([]);
// //       setShowChangeModal(false);
// //     } catch (error) {
// //       console.error("Change update failed:", error);
// //       if (error.response) {
// //         console.error("Error response data:", error.response.data);
// //         console.error("Error response status:", error.response.status);
// //         console.error("Error response headers:", error.response.headers);
// //       } else if (error.request) {
// //         console.error("Error request:", error.request);
// //       } else {
// //         console.error("Error message:", error.message);
// //       }
// //       showMessage("Failed to update entry");
// //       setShowChangeModal(false);
// //     }
// //   }

// //   function handleDeleteButtonClick(ans, entry) {
// //     if (ans == "No") {
// //       showMessage("Delete operation cancelled");
// //       return;
// //     }
// //     if (ans == "Yes") {
// //       performDeleteOperation(entry);
// //     }
// //   }

// //   async function handleDeliverButtonClick() {
// //     const currentSelectedDate = resolveSelectedDate(
// //       selectedDateOption,
// //       anotherDate
// //     );
// //     setFlagLoad(true);

// //     const successfulUpdates = [];

// //     for (const id of selectedIds) {
// //       const entry = currentDayEntryList.find((e) => e._id === id);
// //       const entryData = {
// //         userId: entry.userId,
// //         name: entry.name,
// //         daily_qty: entry.daily_qty,
// //         delivered_qty: entry.daily_qty,
// //         entry_status: "Delivered",
// //         date: currentSelectedDate,
// //       };
// //       const url = entry.entryId
// //         ? `${import.meta.env.VITE_API_URL}/entries/${entry.entryId}`
// //         : `${import.meta.env.VITE_API_URL}/entries`;
// //       const method = entry.entryId ? axios.put : axios.post;

// //       try {
// //         const response = await method(url, entryData, {
// //           headers: { "Content-type": "application/json" },
// //         });
// //         const updatedEntryFromServer = response.data;
// //         successfulUpdates.push(updatedEntryFromServer);
// //       } catch (err) {
// //         console.error(err);
// //         showMessage("Failed to mark as Delivered for " + entry.name);
// //       }
// //     }

// //     setAllEntriesFromDatabase(prevAll => {
// //         let newAll = [...prevAll];
// //         successfulUpdates.forEach(updatedItem => {
// //             const index = newAll.findIndex(item => item._id === updatedItem._id);
// //             if (index > -1) {
// //                 newAll[index] = { ...newAll[index], ...updatedItem };
// //             } else {
// //                 newAll.push(updatedItem);
// //             }
// //         });
// //         return newAll;
// //     });

// //     fetchAllEntriesAndInitializeDisplay(selectedDateOption, anotherDate);

// //     showMessage("Marked selected entries as Delivered");
// //     setSelectedIds([]);
// //     setFlagLoad(false);
// //   }

// //   async function handleKhadaButtonClick() {
// //     const currentSelectedDate = resolveSelectedDate(
// //       selectedDateOption,
// //       anotherDate
// //     );
// //     setFlagLoad(true);

// //     const successfulUpdates = [];

// //     for (const id of selectedIds) {
// //       const userEntry = currentDayEntryList.find((e) => e._id === id);
// //       const entryId = userEntry.entryId;

// //       const entryData = {
// //         userId: userEntry.userId,
// //         name: userEntry.name,
// //         daily_qty: userEntry.daily_qty,
// //         delivered_qty: 0,
// //         entry_status: "Khada",
// //         date: currentSelectedDate,
// //       };

// //       const url = entryId
// //         ? `${import.meta.env.VITE_API_URL}/entries/${entryId}`
// //         : `${import.meta.env.VITE_API_URL}/entries`;

// //       const method = entryId ? axios.put : axios.post;

// //       try {
// //         const response = await method(url, entryData, {
// //           headers: { "Content-type": "application/json" },
// //         });

// //         const updatedEntryFromServer = response.data;
// //         successfulUpdates.push(updatedEntryFromServer);
// //       } catch (error) {
// //         console.error("Error for", userEntry.name, error);
// //         showMessage(`Failed to mark Khada for ${userEntry.name}`);
// //       }
// //     }

// //     setAllEntriesFromDatabase(prevAll => {
// //         let newAll = [...prevAll];
// //         successfulUpdates.forEach(updatedItem => {
// //             const index = newAll.findIndex(item => item._id === updatedItem._id);
// //             if (index > -1) {
// //                 newAll[index] = { ...newAll[index], ...updatedItem };
// //             } else {
// //                 newAll.push(updatedItem);
// //             }
// //         });
// //         return newAll;
// //     });

// //     fetchAllEntriesAndInitializeDisplay(selectedDateOption, anotherDate);

// //     showMessage("Marked selected entries as Khada");
// //     setSelectedIds([]);
// //     setFlagLoad(false);
// //   }

// //   function handleChangeButtonClick() {
// //     if (selectedIds.length !== 1) {
// //       showMessage("Select exactly one user to change delivered quantity.");
// //       return;
// //     }
// //     const user = currentDayEntryList.find((u) => u._id === selectedIds[0]);
// //     setModalUser(user);
// //     setModalQty(user.delivered_qty || "");
// //     setShowChangeModal(true);
// //   }

// //   async function performDeleteOperation(entry) {
// //     setFlagLoad(true);
// //     try {
// //       await axios.delete(
// //         import.meta.env.VITE_API_URL + "/entries/" + entry.entryId
// //       );

// //       setAllEntriesFromDatabase(prevAll => {
// //           return prevAll.filter(item => item._id !== entry.entryId);
// //       });

// //       const updatedEntry = {
// //         ...entry,
// //         delivered_qty: "",
// //         entry_status: "",
// //         entryId: null,
// //         updateDate: "",
// //       };

// //       setCurrentDayEntryList((prevList) => {
// //         const newList = prevList.map((e) =>
// //           e._id === entry._id ? updatedEntry : e
// //         );
// //         setFilteredCurrentDayEntryList(newList);
// //         return newList;
// //       });

// //       showMessage(`Entry - ${entry.name} deleted successfully.`);
// //     } catch (error) {
// //       console.log(error);
// //       showMessage("Something went wrong, refresh the page");
// //     }
// //     setFlagLoad(false);
// //   }

// //   function handleListCheckBoxClick(checked, selectedIndex) {
// //     let cnt = 0;
// //     showInList.forEach((e) => {
// //       if (e.show) {
// //         cnt++;
// //       }
// //     });
// //     if (cnt === 1 && !checked) {
// //       showMessage("Minimum 1 field should be selected.");
// //       return;
// //     }
// //     if (cnt === 5 && checked) {
// //       showMessage("Maximum 5 fields can be selected.");
// //       return;
// //     }
// //     let att = [...showInList];
// //     let a = att.map((e, index) => {
// //       let p = { ...e };
// //       if (index === selectedIndex && checked) {
// //         p.show = true;
// //       } else if (index === selectedIndex && !checked) {
// //         p.show = false;
// //       }
// //       return p;
// //     });
// //     setShowInList(a);
// //   }
// //   function handleHeaderClick(index) {
// //     let field = showInList[index].attribute;
// //     let d = false;
// //     if (field === sortedField) {
// //       d = !direction;
// //     } else {
// //       d = false;
// //     }
// //     let list = [...filteredCurrentDayEntryList];
// //     setDirection(d);
// //     if (d === false) {
// //       list.sort((a, b) => {
// //         if (a[field] > b[field]) {
// //           return 1;
// //         }
// //         if (a[field] < b[field]) {
// //           return -1;
// //         }
// //         return 0;
// //       });
// //     } else {
// //       list.sort((a, b) => {
// //         if (a[field] < b[field]) {
// //           return 1;
// //         }
// //         if (a[field] > b[field]) {
// //           return -1;
// //         }
// //         return 0;
// //       });
// //     }
// //     setFilteredCurrentDayEntryList(list);
// //     setSortedField(field);
// //   }
// //   function handleSrNoClick() {
// //     let d = false;
// //     if (sortedField === "updateDate") {
// //       d = !direction;
// //     } else {
// //       d = false;
// //     }

// //     let list = [...filteredCurrentDayEntryList];
// //     setDirection(!direction);
// //     if (d === false) {
// //       list.sort((a, b) => {
// //         if (new Date(a.updateDate || 0) > new Date(b.updateDate || 0)) {
// //           return 1;
// //         }
// //         if (new Date(a.updateDate || 0) < new Date(b.updateDate || 0)) {
// //           return -1;
// //         }
// //         return 0;
// //       });
// //     } else {
// //       list.sort((a, b) => {
// //         if (new Date(a.updateDate || 0) < new Date(b.updateDate || 0)) {
// //           return 1;
// //         }
// //         if (new Date(a.updateDate || 0) > new Date(b.updateDate || 0)) {
// //           return -1;
// //         }
// //         return 0;
// //       });
// //     }
// //     setFilteredCurrentDayEntryList(list);
// //     setSortedField("updateDate");
// //   }
// //   function handleFormTextChangeValidations(message, index) {
// //     props.onFormTextChangeValidations(message, index);
// //   }
// //   function handleSearchKeyUp(event) {
// //     let searchText = event.target.value;
// //     setSearchText(searchText);
// //     performSearchOperation(searchText);
// //   }
// //   function performSearchOperation(searchText) {
// //     let query = searchText.trim();
// //     if (query.length === 0) {
// //       setFilteredCurrentDayEntryList(currentDayEntryList);
// //       return;
// //     }
// //     let searchedEntrys = [];
// //     searchedEntrys = filterByShowInListAttributes(query);
// //     setFilteredCurrentDayEntryList(searchedEntrys);
// //   }
// //   function filterByName(query) {
// //     let fList = [];
// //     for (let i = 0; i < currentDayEntryList.length; i++) {
// //       if (currentDayEntryList[i].name.toLowerCase().includes(query.toLowerCase())) {
// //         fList.push(currentDayEntryList[i]);
// //       }
// //     }
// //     return fList;
// //   }
// //   function filterByShowInListAttributes(query) {
// //     let fList = [];
// //     for (let i = 0; i < currentDayEntryList.length; i++) {
// //       for (let j = 0; j < showInList.length; j++) {
// //         if (showInList[j].show) {
// //           let parameterName = showInList[j].attribute;
// //           if (
// //             currentDayEntryList[i][parameterName] &&
// //             currentDayEntryList[i][parameterName]
// //               .toLowerCase()
// //               .includes(query.toLowerCase())
// //           ) {
// //             fList.push(currentDayEntryList[i]);
// //             break;
// //           }
// //         }
// //       }
// //     }
// //     return fList;
// //   }
// //   function handleToggleText(index) {
// //     let sil = [...showInList];
// //     sil[index].flagReadMore = !sil[index].flagReadMore;
// //     setShowInList(sil);
// //   }
// //   function handleExcelFileUploadClick(file, msg) {
// //     if (msg) {
// //       showMessage(message);
// //       return;
// //     }
// //     setSelectedFile(file);
// //     const reader = new FileReader();
// //     reader.onload = (event) => {
// //       const arrayBuffer = event.target.result;
// //       const workbook = XLSX.read(arrayBuffer, { type: "array" });
// //       const sheetName = workbook.SheetNames[0];
// //       const worksheet = workbook.Sheets[sheetName];
// //       const jsonData = XLSX.utils.sheet_to_json(worksheet);
// //       setSheetData(jsonData);
// //       let result = analyseImportExcelSheet(jsonData, allEntriesFromDatabase);
// //       if (result.message) {
// //         showMessage(result.message);
// //       } else {
// //         showImportAnalysis(result);
// //       }
// //     };
// //     reader.readAsArrayBuffer(file);
// //   }
// //   function showImportAnalysis(result) {
// //     setCntAdd(result.cntA);
// //     setCntUpdate(result.cntU);
// //     setRecordsToBeAdded(result.recordsToBeAdded);
// //     setRecordsToBeUpdated(result.recordsToBeUpdated);
// //     setFlagImport(true);
// //   }
// //   function handleModalCloseClick() {
// //     setFlagImport(false);
// //   }
// //   async function handleImportButtonClick() {
// //     setFlagImport(false);
// //     setFlagLoad(true);
// //     let result;
// //     try {
// //       if (recordsToBeAdded.length > 0) {
// //         result = await recordsAddBulk(
// //           recordsToBeAdded,
// //           "users",
// //           allEntriesFromDatabase,
// //           import.meta.env.VITE_API_URL
// //         );
// //         if (result.success) {
// //           setAllEntriesFromDatabase(result.updatedList);
// //           // Re-filter the current day's list based on updated allEntriesFromDatabase
// //           fetchAllEntriesAndInitializeDisplay(selectedDateOption, anotherDate);
// //         }
// //         showMessage(result.message);
// //       }
// //       if (recordsToBeUpdated.length > 0) {
// //         result = await recordsUpdateBulk(
// //           recordsToBeUpdated,
// //           "users",
// //           allEntriesFromDatabase,
// //           import.meta.env.VITE_API_URL
// //         );
// //         if (result.success) {
// //           setAllEntriesFromDatabase(result.updatedList);
// //           // Re-filter the current day's list based on updated allEntriesFromDatabase
// //           fetchAllEntriesAndInitializeDisplay(selectedDateOption, anotherDate);
// //         }
// //         showMessage(result.message);
// //       }
// //     } catch (error) {
// //       console.log(error);
// //       showMessage("Something went wrong, refresh the page");
// //     }
// //     setFlagLoad(false);
// //   }
// //   function handleClearSelectedFile() {
// //     setSelectedFile(null);
// //   }
// //   if (flagLoad) {
// //     return (
// //       <div className="my-5 text-center">
// //         <BeatLoader size={24} color={"blue"} />
// //       </div>
// //     );
// //   }

// //   function fetchDataForSelectedDate(
// //     option = selectedDateOption,
// //     customDate = anotherDate
// //   ) {
// //     setSelectedIds([]);
// //     fetchAllEntriesAndInitializeDisplay(option, customDate);
// //   }

// //   return (
// //     <>
// //       <CommonUtilityBar
// //         action={action}
// //         message={message}
// //         selectedEntity={selectedEntity}
// //         flagToggleButton={flagToggleButton}
// //         filteredList={filteredCurrentDayEntryList}
// //         mainList={currentDayEntryList}
// //         showInList={showInList}
// //         onListClick={handleListClick}
// //         onAddEntityClick={handleAddEntityClick}
// //         onSearchKeyUp={handleSearchKeyUp}
// //         onExcelFileUploadClick={handleExcelFileUploadClick}
// //         onClearSelectedFile={handleClearSelectedFile}
// //       />

// //       {filteredCurrentDayEntryList.length === 0 && currentDayEntryList.length !== 0 && (
// //         <div className="text-center">Nothing to show for this date</div>
// //       )}
// //       {currentDayEntryList.length === 0 && (
// //         <div className="text-center">No entries available for this date</div>
// //       )}
// //       {action === "list" && (
// //         <div className="text-center my-3">
// //           <label className="fw-bold me-3">Select Date:</label>

// //           <div className="btn-group" role="group">
// //             <button
// //               type="button"
// //               className={` btn ${
// //                 selectedDateOption === "Today"
// //                   ? "btn-primary"
// //                   : "btn-outline-primary"
// //               }`}
// //               onClick={() => {
// //                 setSelectedDateOption("Today");
// //                 setAnotherDate("");
// //                 fetchDataForSelectedDate("Today");
// //               }}
// //             >
// //               Today
// //             </button>
// //             <button
// //               type="button"
// //               className={`btn ${
// //                 selectedDateOption === "Yesterday"
// //                   ? "btn-primary"
// //                   : "btn-outline-primary"
// //               }`}
// //               onClick={() => {
// //                 setSelectedDateOption("Yesterday");
// //                 setAnotherDate("");
// //                 fetchDataForSelectedDate("Yesterday");
// //               }}
// //             >
// //               Yesterday
// //             </button>
// //             <button
// //               type="button"
// //               className={`btn ${
// //                 selectedDateOption === "Another Day"
// //                   ? "btn-primary"
// //                   : "btn-outline-primary"
// //               }`}
// //               onClick={() => {
// //                 setSelectedDateOption("Another Day");
// //               }}
// //             >
// //               Another Day
// //             </button>
// //             {selectedDateOption === "Another Day" && (
// //               <input
// //                 type="date"
// //                 className="form-control d-inline-block ms-2"
// //                 style={{ width: "auto" }}
// //                 value={anotherDate}
// //                 onChange={(e) => {
// //                   setAnotherDate(e.target.value);
// //                   setSelectedIds([]);
// //                   fetchDataForSelectedDate("Another Day", e.target.value);
// //                 }}
// //               />
// //             )}
// //           </div>
// //         </div>
// //       )}

// //       {action === "list" && (
// //         <div className="text-center my-3">
// //           <div className="text-center my-3">
// //             <button
// //               className="btn btn-success mx-1"
// //               onClick={handleDeliverButtonClick}
// //               disabled={selectedIds.length === 0}
// //             >
// //               Delivered
// //             </button>

// //             <button
// //               className="btn btn-warning mx-1"
// //               onClick={handleKhadaButtonClick}
// //               disabled={selectedIds.length === 0}
// //             >
// //               Khada
// //             </button>

// //             <button
// //               className="btn btn-secondary mx-1"
// //               onClick={handleChangeButtonClick}
// //               disabled={selectedIds.length !== 1}
// //             >
// //               Change
// //             </button>
// //           </div>

// //           {globalLatestUpdatedDate !== null ? (
// //             <div className="text-sm text-red-600 font-semibold mt-2">
// //               Last database update: {globalLatestUpdatedDate.toLocaleString()}
// //             </div>
// //           ) : (
// //             <div className="text-sm text-gray-500 mt-2">
// //               No entries with update date found in the database.
// //             </div>
// //           )}
// //         </div>
// //       )}

// //       {action === "list" && filteredCurrentDayEntryList.length !== 0 && (
// //         <CheckBoxHeaders
// //           showInList={showInList}
// //           onListCheckBoxClick={handleListCheckBoxClick}
// //         />
// //       )}

// //       {action === "list" && filteredCurrentDayEntryList.length !== 0 && (
// //         <div className="row my-2 mx-auto p-1">
// //           <div className="col-1">
// //             <input
// //               type="checkbox"
// //               checked={
// //                 selectedIds.length > 0 &&
// //                 selectedIds.length === filteredCurrentDayEntryList.length
// //               }
// //               onChange={(ev) => {
// //                 if (ev.target.checked) {
// //                   setSelectedIds(filteredCurrentDayEntryList.map((entry) => entry._id));
// //                 } else {
// //                   setSelectedIds([]);
// //                 }
// //               }}
// //             />
// //           </div>
// //           <div className="col-1">
// //             <a
// //               href="#"
// //               onClick={() => {
// //                 handleSrNoClick();
// //               }}
// //             >
// //               SN.{" "}
// //               {sortedField === "updateDate" && direction && (
// //                 <i className="bi bi-arrow-up"></i>
// //               )}
// //               {sortedField === "updateDate" && !direction && (
// //                 <i className="bi bi-arrow-down"></i>
// //               )}
// //             </a>
// //           </div>
// //           <ListHeaders
// //             showInList={showInList}
// //             sortedField={sortedField}
// //             direction={direction}
// //             onHeaderClick={handleHeaderClick}
// //           />
// //           <div className="col-1">&nbsp;</div>
// //         </div>
// //       )}
// //       {(action === "add" || action === "update") && (
// //         <div className="row">
// //           <AdminDailyEntryForm
// //             entrySchema={entrySchema}
// //             entryValidations={entryValidations}
// //             emptyEntry={emptyEntry}
// //             selectedEntity={selectedEntity}
// //             userToBeEdited={userToBeEdited}
// //             action={action}
// //             flagFormInvalid={flagFormInvalid}
// //             onFormSubmit={handleFormSubmit}
// //             onFormCloseClick={handleFormCloseClick}
// //             onFormTextChangeValidations={handleFormTextChangeValidations}
// //           />
// //         </div>
// //       )}
// //       {showChangeModal && (
// //         <ChangeQtyModal
// //           user={modalUser}
// //           qty={modalQty}
// //           onQtyChange={(e) => setModalQty(e.target.value)}
// //           onSave={handleModalQtySubmit}
// //           onClose={() => setShowChangeModal(false)}
// //         />
// //       )}

// //       {action === "list" &&
// //         filteredCurrentDayEntryList.length !== 0 &&
// //         filteredCurrentDayEntryList.map((e, index) => (
// //           <div
// //             className={`row mx-auto   mt-2 my-1 ${
// //               e.entry_status === "Delivered"
// //                 ? "bg-success bg-opacity-25"
// //                 : e.entry_status === "Change"
// //                 ? "bg-warning bg-opacity-25"
// //                 : e.entry_status === "Khada"
// //                 ? "bg-secondary bg-opacity-25"
// //                 : ""
// //             }`}
// //             key={index}
// //           >
// //             <div className="col-1 d-flex align-items-center">
// //               <input
// //                 type="checkbox"
// //                 checked={selectedIds.includes(e._id)}
// //                 onChange={(ev) => {
// //                   if (ev.target.checked) {
// //                     setSelectedIds((prev) => [...prev, e._id]);
// //                   } else {
// //                     setSelectedIds((prev) => prev.filter((id) => id !== e._id));
// //                   }
// //                 }}
// //               />
// //             </div>
// //             <div className="col-11">
// //               <Entity
// //                 entity={e}
// //                 index={index}
// //                 sortedField={sortedField}
// //                 direction={direction}
// //                 listSize={filteredCurrentDayEntryList.length}
// //                 selectedEntity={selectedEntity}
// //                 showInList={showInList}
// //                 VITE_API_URL={import.meta.env.VITE_API_URL}
// //                 onEditButtonClick={handleEditButtonClick}
// //                 onDeleteButtonClick={handleDeleteButtonClick}
// //                 onToggleText={handleToggleText}
// //               />
// //             </div>
// //           </div>
// //         ))}

// //       {flagImport && (
// //         <ModalImport
// //           modalText={"Summary of Bulk Import"}
// //           additions={recordsToBeAdded}
// //           updations={recordsToBeUpdated}
// //           btnGroup={["Yes", "No"]}
// //           onModalCloseClick={handleModalCloseClick}
// //           onModalButtonCancelClick={handleModalCloseClick}
// //           onImportButtonClick={handleImportButtonClick}
// //         />
// //       )}
// //     </>
// //   );
// // }





















// // // import { useEffect, useState } from "react";
// // // import {
// // //   CommonUtilityBar,
// // //   CheckBoxHeaders,
// // //   ListHeaders,
// // //   Entity,
// // // } from "../external/vite-sdk";
// // // import { BeatLoader } from "react-spinners";
// // // import axios from "axios";
// // // import * as XLSX from "xlsx";
// // // import ModalImport from "./ModalImport";
// // // import ChangeQtyModal from "./ChangeQtyModal";
// // // import {
// // //   recordsAddBulk,
// // //   recordsUpdateBulk,
// // //   analyseImportExcelSheet,
// // // } from "../external/vite-sdk";
// // // import { getEmptyObject, getShowInList } from "../external/vite-sdk";
// // // import AdminDailyEntryForm from "./AdminDailyEntryForm";

// // // export default function AdminDailyEntry(props) {
// // //   const [anotherDate, setAnotherDate] = useState("");
// // //   let [showChangeModal, setShowChangeModal] = useState(false);
// // //   let [modalUser, setModalUser] = useState(null);
// // //   let [modalQty, setModalQty] = useState("");

// // //   let [selectedIds, setSelectedIds] = useState([]);
// // //   let [entryList, setEntryList] = useState([]);
// // //   let [filteredEntryList, setFilteredEntryList] = useState([]);
// // //   let [action, setAction] = useState("list");
// // //   let [userToBeEdited, setUserToBeEdited] = useState("");
// // //   let [flagLoad, setFlagLoad] = useState(false);
// // //   let [flagImport, setFlagImport] = useState(false);
// // //   let [message, setMessage] = useState("");
// // //   let [searchText, setSearchText] = useState("");
// // //   let [sortedField, setSortedField] = useState("");
// // //   let [direction, setDirection] = useState("");
// // //   let [sheetData, setSheetData] = useState(null);
// // //   let [selectedFile, setSelectedFile] = useState("");
// // //   let [recordsToBeAdded, setRecordsToBeAdded] = useState([]);
// // //   let [recordsToBeUpdated, setRecordsToBeUpdated] = useState([]);
// // //   let [cntUpdate, setCntUpdate] = useState(0);
// // //   let [cntAdd, setCntAdd] = useState(0);
// // //   let { selectedEntity } = props;
// // //   let { flagFormInvalid } = props;
// // //   let { flagToggleButton } = props;

// // //   const [selectedDateOption, setSelectedDateOption] = useState("Today");

// // //   function resolveSelectedDate(option, customDate = "") {
// // //     const today = new Date();
// // //     if (option === "Today") return today.toISOString().split("T")[0];
// // //     if (option === "Yesterday") {
// // //       const yest = new Date(today);
// // //       yest.setDate(yest.getDate() - 1);
// // //       return yest.toISOString().split("T")[0];
// // //     }
// // //     if (option === "Another Day" && customDate) return customDate;
// // //     return today.toISOString().split("T")[0];
// // //   }

// // //   let entrySchema = [
// // //     { attribute: "name", type: "normal" },
// // //     { attribute: "daily_qty", type: "normal" },
// // //     { attribute: "delivered_qty", type: "normal" },
// // //     {
// // //       attribute: "entry_status",
// // //       type: "normal",
// // //       show: true,
// // //     },
// // //   ];
// // //   let entryValidations = {
// // //     name: { message: "", mxLen: 200, mnLen: 4, onlyDigits: false },
// // //     daily_qty: { message: "", onlyDigits: true },
// // //     delivered_qty: { message: "", onlyDigits: true },
// // //     entry_status: { message: "" },
// // //   };

// // //   let [showInList, setShowInList] = useState(getShowInList(entrySchema));

// // //   let [emptyEntry, setEmptyEntry] = useState({
// // //     ...getEmptyObject(entrySchema),
// // //     roleId: "68691372fa624c1dff2e06be",
// // //     name: "",
// // //     daily_qty: "",
// // //     delivered_qty: "",
// // //     entry_status: "",
// // //   });

// // //   useEffect(() => {
// // //     fetchDataForSelectedDate();
// // //   }, []);

// // //   async function getData(dateToFetch) {
// // //     setFlagLoad(true);
// // //     try {
// // //       const [entryRes, userRes] = await Promise.all([
// // //         axios(import.meta.env.VITE_API_URL + "/entries"),
// // //         axios(import.meta.env.VITE_API_URL + "/users"),
// // //       ]);

// // //       const entryListRaw = entryRes.data;
// // //       const userList = userRes.data;

// // //       const today = dateToFetch;

// // //       const mergedList = userList
// // //         .filter((user) => user.roleId === "68691372fa624c1dff2e06be")
// // //         .map((user) => {
// // //           const todayEntry = entryListRaw.find((entry) => {
// // //             // Normalize entry.date from DB for comparison
// // //             const entryDateFormatted =
// // //               entry.date instanceof Date
// // //                 ? entry.date.toISOString().split("T")[0]
// // //                 : typeof entry.date === "string" && entry.date.includes("T")
// // //                 ? entry.date.split("T")[0]
// // //                 : entry.date; // Use as is if already YYYY-MM-DD string

// // //             return entry.userId === user._id && entryDateFormatted === today;
// // //           });

// // //           return {
// // //             _id: user._id,
// // //             userId: user._id,
// // //             name: user.name,
// // //             daily_qty: user.daily_qty,
// // //             delivered_qty: todayEntry?.delivered_qty ?? "",
// // //             entry_status: todayEntry?.entry_status || "",
// // //             // Ensure the date field in the frontend object is consistently YYYY-MM-DD string
// // //             date:
// // //               todayEntry?.date &&
// // //               typeof todayEntry.date === "string" &&
// // //               todayEntry.date.includes("T")
// // //                 ? todayEntry.date.split("T")[0]
// // //                 : todayEntry?.date || today,
// // //             updateDate: todayEntry?.updateDate || "",
// // //             entryId: todayEntry?._id || null,
// // //           };
// // //         });

// // //       mergedList.sort(
// // //         (a, b) => new Date(b.updateDate || 0) - new Date(a.updateDate || 0)
// // //       );

// // //       setEntryList(mergedList);
// // //       setFilteredEntryList(mergedList);
// // //     } catch (error) {
// // //       console.error(error);
// // //       showMessage("Something went wrong while fetching data.");
// // //     }
// // //     setFlagLoad(false);
// // //   }

// // //   async function handleFormSubmit(entry) {
// // //     let message;
// // //     let entryForBackEnd = { ...entry };
// // //     for (let key in entryForBackEnd) {
// // //       entrySchema.forEach((e, index) => {
// // //         if (key == e.attribute && e.relationalData) {
// // //           delete entryForBackEnd[key];
// // //         }
// // //       });
// // //     }

// // //     if (entryForBackEnd.date instanceof Date) {
// // //       entryForBackEnd.date = entryForBackEnd.date.toISOString().split("T")[0];
// // //     } else if (
// // //       typeof entryForBackEnd.date === "string" &&
// // //       entryForBackEnd.date.includes("T")
// // //     ) {
// // //       entryForBackEnd.date = entryForBackEnd.date.split("T")[0];
// // //     }

// // //     if (action == "add") {
// // //       setFlagLoad(true);
// // //       try {
// // //         const response = await axios.post(
// // //           import.meta.env.VITE_API_URL + "/entries",
// // //           entryForBackEnd,
// // //           { headers: { "Content-type": "application/json" } }
// // //         );
// // //         const addedEntryFromServer = response.data;

// // //         setEntryList((prevList) => {
// // //           const newList = [
// // //             ...prevList,
// // //             {
// // //               ...entry,
// // //               ...addedEntryFromServer,
// // //               entryId: addedEntryFromServer._id,
// // //               updateDate:
// // //                 addedEntryFromServer.updateDate || new Date().toISOString(),
// // //             },
// // //           ];
// // //           return newList.sort(
// // //             (a, b) => new Date(b.updateDate || 0) - new Date(a.updateDate || 0)
// // //           );
// // //         });
// // //         setFilteredEntryList((prevList) => {
// // //           const newList = [
// // //             ...prevList,
// // //             {
// // //               ...entry,
// // //               ...addedEntryFromServer,
// // //               entryId: addedEntryFromServer._id,
// // //               updateDate:
// // //                 addedEntryFromServer.updateDate || new Date().toISOString(),
// // //             },
// // //           ];
// // //           return newList.sort(
// // //             (a, b) => new Date(b.updateDate || 0) - new Date(a.updateDate || 0)
// // //           );
// // //         });

// // //         message = "Entry added successfully";
// // //         showMessage(message);
// // //         setAction("list");
// // //       } catch (error) {
// // //         console.error("Error adding entry:", error);
// // //         showMessage("Something went wrong, refresh the page");
// // //       }
// // //       setFlagLoad(false);
// // //     } else if (action == "update") {
// // //       const entryToUpdateId = userToBeEdited.entryId;

// // //       if (!entryToUpdateId) {
// // //         showMessage(
// // //           "Error: Cannot update. Entry ID not found for this record."
// // //         );
// // //         setFlagLoad(false);
// // //         return;
// // //       }

// // //       setFlagLoad(true);
// // //       try {
// // //         const response = await axios.put(
// // //           `${import.meta.env.VITE_API_URL}/entries/${entryToUpdateId}`,
// // //           entryForBackEnd,
// // //           { headers: { "Content-type": "application/json" } }
// // //         );

// // //         const updatedBackendEntry = response.data;

// // //         setEntryList((prevList) => {
// // //           const newList = prevList.map((item) => {
// // //             if (item._id === userToBeEdited._id) {
// // //               return {
// // //                 ...item,
// // //                 ...updatedBackendEntry,
// // //                 entryId: updatedBackendEntry._id,
// // //                 updateDate:
// // //                   updatedBackendEntry.updateDate || new Date().toISOString(),
// // //               };
// // //             }
// // //             return item;
// // //           });
// // //           return newList.sort(
// // //             (a, b) => new Date(b.updateDate || 0) - new Date(a.updateDate || 0)
// // //           );
// // //         });
// // //         setFilteredEntryList((prevList) => {
// // //           const newList = prevList.map((item) => {
// // //             if (item._id === userToBeEdited._id) {
// // //               return {
// // //                 ...item,
// // //                 ...updatedBackendEntry,
// // //                 entryId: updatedBackendEntry._id,
// // //                 updateDate:
// // //                   updatedBackendEntry.updateDate || new Date().toISOString(),
// // //               };
// // //             }
// // //             return item;
// // //           });
// // //           return newList.sort(
// // //             (a, b) => new Date(b.updateDate || 0) - new Date(a.updateDate || 0)
// // //           );
// // //         });

// // //         message = "Entry Updated successfully";
// // //         showMessage(message);
// // //         setAction("list");
// // //       } catch (error) {
// // //         console.error("Error updating entry:", error);
// // //         showMessage("Something went wrong during update, please try again.");
// // //       }
// // //       setFlagLoad(false);
// // //     }
// // //   }
// // //   function handleFormCloseClick() {
// // //     props.onFormCloseClick();
// // //   }
// // //   const latestUpdatedDate = entryList.length
// // //     ? new Date(
// // //         Math.max(
// // //           ...entryList
// // //             .filter((entry) => entry.updateDate)
// // //             .map((entry) => new Date(entry.updateDate))
// // //         )
// // //       )
// // //     : null;

// // //   function handleListClick() {
// // //     setAction("list");
// // //   }
// // //   function handleAddEntityClick() {
// // //     setAction("add");
// // //   }
// // //   function handleEditButtonClick(entry) {
// // //     let safeEntry = {
// // //       ...emptyEntry,
// // //       ...entry,
// // //       info: entry.info || "",
// // //     };
// // //     setAction("update");
// // //     setUserToBeEdited(safeEntry);
// // //   }
// // //   function showMessage(message) {
// // //     setMessage(message);
// // //     window.setTimeout(() => {
// // //       setMessage("");
// // //     }, 3000);
// // //   }

// // //   async function handleModalQtySubmit() {
// // //     if (!modalUser || modalQty === "") {
// // //       showMessage("Please enter a valid quantity.");
// // //       return;
// // //     }

// // //     const currentSelectedDate = resolveSelectedDate(
// // //       selectedDateOption,
// // //       anotherDate
// // //     );

// // //     const entryData = {
// // //       userId: modalUser.userId,
// // //       name: modalUser.name,
// // //       daily_qty: modalUser.daily_qty,
// // //       delivered_qty: modalQty,
// // //       entry_status: "Change",
// // //       date: currentSelectedDate,
// // //     };

// // //     const url = modalUser.entryId
// // //       ? `${import.meta.env.VITE_API_URL}/entries/${modalUser.entryId}`
// // //       : `${import.meta.env.VITE_API_URL}/entries`;

// // //     const method = modalUser.entryId ? axios.put : axios.post;

// // //     try {
// // //       const response = await method(url, entryData, {
// // //         headers: { "Content-type": "application/json" },
// // //       });

// // //       const updatedEntryFromServer = response.data;

// // //       setEntryList((prevList) => {
// // //         const newList = prevList
// // //           .map((item) => {
// // //             if (item._id === modalUser._id) {
// // //               return {
// // //                 ...item,
// // //                 ...updatedEntryFromServer,
// // //                 entryId: updatedEntryFromServer._id,
// // //                 updateDate:
// // //                   updatedEntryFromServer.updateDate || new Date().toISOString(),
// // //               };
// // //             }
// // //             return item;
// // //           })
// // //           .sort(
// // //             (a, b) => new Date(b.updateDate || 0) - new Date(a.updateDate || 0)
// // //           );
// // //         return newList;
// // //       });

// // //       setFilteredEntryList((prevList) => {
// // //         const newList = prevList
// // //           .map((item) => {
// // //             if (item._id === modalUser._id) {
// // //               return {
// // //                 ...item,
// // //                 ...updatedEntryFromServer,
// // //                 entryId: updatedEntryFromServer._id,
// // //                 updateDate:
// // //                   updatedEntryFromServer.updateDate || new Date().toISOString(),
// // //               };
// // //             }
// // //             return item;
// // //           })
// // //           .sort(
// // //             (a, b) => new Date(b.updateDate || 0) - new Date(a.updateDate || 0)
// // //           );
// // //         return newList;
// // //       });

// // //       showMessage("Entry updated to 'Change'");
// // //       setSelectedIds([]);
// // //       setShowChangeModal(false);
// // //     } catch (error) {
// // //       console.error("Change update failed:", error);
// // //       if (error.response) {
// // //         console.error("Error response data:", error.response.data);
// // //         console.error("Error response status:", error.response.status);
// // //         console.error("Error response headers:", error.response.headers);
// // //       } else if (error.request) {
// // //         console.error("Error request:", error.request);
// // //       } else {
// // //         console.error("Error message:", error.message);
// // //       }
// // //       showMessage("Failed to update entry");
// // //       setShowChangeModal(false);
// // //     }
// // //   }

// // //   function handleDeleteButtonClick(ans, entry) {
// // //     if (ans == "No") {
// // //       showMessage("Delete operation cancelled");
// // //       return;
// // //     }
// // //     if (ans == "Yes") {
// // //       performDeleteOperation(entry);
// // //     }
// // //   }

// // //   async function handleDeliverButtonClick() {
// // //     const currentSelectedDate = resolveSelectedDate(
// // //       selectedDateOption,
// // //       anotherDate
// // //     );

// // //     for (const id of selectedIds) {
// // //       const entry = entryList.find((e) => e._id === id);

// // //       const entryData = {
// // //         userId: entry.userId,
// // //         name: entry.name,
// // //         daily_qty: entry.daily_qty,
// // //         delivered_qty: entry.daily_qty,
// // //         entry_status: "Delivered",
// // //         date: currentSelectedDate,
// // //       };

// // //       const url = entry.entryId
// // //         ? `${import.meta.env.VITE_API_URL}/entries/${entry.entryId}`
// // //         : `${import.meta.env.VITE_API_URL}/entries`;

// // //       const method = entry.entryId ? axios.put : axios.post;

// // //       try {
// // //         const response = await method(url, entryData, {
// // //           headers: { "Content-type": "application/json" },
// // //         });

// // //         const updatedEntryFromServer = response.data;
// // //         setEntryList((prevList) => {
// // //           const newList = prevList
// // //             .map((item) => {
// // //               if (item._id === entry._id) {
// // //                 return {
// // //                   ...item,
// // //                   ...updatedEntryFromServer,
// // //                   entryId: updatedEntryFromServer._id,
// // //                   updateDate:
// // //                     updatedEntryFromServer.updateDate ||
// // //                     new Date().toISOString(),
// // //                 };
// // //               }
// // //               return item;
// // //             })
// // //             .sort(
// // //               (a, b) =>
// // //                 new Date(b.updateDate || 0) - new Date(a.updateDate || 0)
// // //             );
// // //           setFilteredEntryList(newList);
// // //           return newList;
// // //         });
// // //       } catch (err) {
// // //         console.error(err);
// // //         showMessage("Failed to mark as Delivered for " + entry.name);
// // //       }
// // //     }

// // //     showMessage("Marked selected entries as Delivered");
// // //     setSelectedIds([]);
// // //   }

// // //   async function handleKhadaButtonClick() {
// // //     const currentSelectedDate = resolveSelectedDate(
// // //       selectedDateOption,
// // //       anotherDate
// // //     );

// // //     for (const id of selectedIds) {
// // //       const userEntry = entryList.find((e) => e._id === id);
// // //       const entryId = userEntry.entryId;

// // //       const entryData = {
// // //         userId: userEntry.userId,
// // //         name: userEntry.name,
// // //         daily_qty: userEntry.daily_qty,
// // //         delivered_qty: 0,
// // //         entry_status: "Khada",
// // //         date: currentSelectedDate,
// // //       };

// // //       const url = entryId
// // //         ? `${import.meta.env.VITE_API_URL}/entries/${entryId}`
// // //         : `${import.meta.env.VITE_API_URL}/entries`;

// // //       const method = entryId ? axios.put : axios.post;

// // //       try {
// // //         const response = await method(url, entryData, {
// // //           headers: { "Content-type": "application/json" },
// // //         });

// // //         const updatedEntryFromServer = response.data;
// // //         setEntryList((prevList) => {
// // //           const newList = prevList
// // //             .map((item) => {
// // //               if (item._id === userEntry._id) {
// // //                 return {
// // //                   ...item,
// // //                   ...updatedEntryFromServer,
// // //                   entryId: updatedEntryFromServer._id,
// // //                   updateDate:
// // //                     updatedEntryFromServer.updateDate ||
// // //                     new Date().toISOString(),
// // //                 };
// // //               }
// // //               return item;
// // //             })
// // //             .sort(
// // //               (a, b) =>
// // //                 new Date(b.updateDate || 0) - new Date(a.updateDate || 0)
// // //             );
// // //           setFilteredEntryList(newList);
// // //           return newList;
// // //         });
// // //       } catch (error) {
// // //         console.error("Error for", userEntry.name, error);
// // //         showMessage(`Failed to mark Khada for ${userEntry.name}`);
// // //       }
// // //     }

// // //     showMessage("Marked selected entries as Khada");
// // //     setSelectedIds([]);
// // //   }

// // //   function handleChangeButtonClick() {
// // //     if (selectedIds.length !== 1) {
// // //       showMessage("Select exactly one user to change delivered quantity.");
// // //       return;
// // //     }
// // //     const user = entryList.find((u) => u._id === selectedIds[0]);
// // //     setModalUser(user);
// // //     setModalQty(user.delivered_qty || "");
// // //     setShowChangeModal(true);
// // //   }

// // //   async function performDeleteOperation(entry) {
// // //     setFlagLoad(true);
// // //     try {
// // //       await axios.delete(
// // //         import.meta.env.VITE_API_URL + "/entries/" + entry.entryId
// // //       );

// // //       const updatedEntry = {
// // //         ...entry,
// // //         delivered_qty: "",
// // //         entry_status: "",
// // //         entryId: null,
// // //         updateDate: "",
// // //       };

// // //       setEntryList((prevList) => {
// // //         const newList = prevList.map((e) =>
// // //           e._id === entry._id ? updatedEntry : e
// // //         );
// // //         setFilteredEntryList(newList);
// // //         return newList;
// // //       });

// // //       showMessage(`Entry - ${entry.name} deleted successfully.`);
// // //     } catch (error) {
// // //       console.log(error);
// // //       showMessage("Something went wrong, refresh the page");
// // //     }
// // //     setFlagLoad(false);
// // //   }

// // //   function handleListCheckBoxClick(checked, selectedIndex) {
// // //     let cnt = 0;
// // //     showInList.forEach((e, index) => {
// // //       if (e.show) {
// // //         cnt++;
// // //       }
// // //     });
// // //     if (cnt == 1 && !checked) {
// // //       showMessage("Minimum 1 field should be selected.");
// // //       return;
// // //     }
// // //     if (cnt == 5 && checked) {
// // //       showMessage("Maximum 5 fields can be selected.");
// // //       return;
// // //     }
// // //     let att = [...showInList];
// // //     let a = att.map((e, index) => {
// // //       let p = { ...e };
// // //       if (index == selectedIndex && checked) {
// // //         p.show = true;
// // //       } else if (index == selectedIndex && !checked) {
// // //         p.show = false;
// // //       }
// // //       return p;
// // //     });
// // //     setShowInList(a);
// // //   }
// // //   function handleHeaderClick(index) {
// // //     let field = showInList[index].attribute;
// // //     let d = false;
// // //     if (field === sortedField) {
// // //       d = !direction;
// // //     } else {
// // //       d = false;
// // //     }
// // //     let list = [...filteredEntryList];
// // //     setDirection(d);
// // //     if (d == false) {
// // //       list.sort((a, b) => {
// // //         if (a[field] > b[field]) {
// // //           return 1;
// // //         }
// // //         if (a[field] < b[field]) {
// // //           return -1;
// // //         }
// // //         return 0;
// // //       });
// // //     } else {
// // //       list.sort((a, b) => {
// // //         if (a[field] < b[field]) {
// // //           return 1;
// // //         }
// // //         if (a[field] > b[field]) {
// // //           return -1;
// // //         }
// // //         return 0;
// // //       });
// // //     }
// // //     setFilteredEntryList(list);
// // //     setSortedField(field);
// // //   }
// // //   function handleSrNoClick() {
// // //     let d = false;
// // //     if (sortedField === "updateDate") {
// // //       d = !direction;
// // //     } else {
// // //       d = false;
// // //     }

// // //     let list = [...filteredEntryList];
// // //     setDirection(!direction);
// // //     if (d == false) {
// // //       list.sort((a, b) => {
// // //         if (new Date(a["updateDate"]) > new Date(b["updateDate"])) {
// // //           return 1;
// // //         }
// // //         if (new Date(a["updateDate"]) < new Date(b["updateDate"])) {
// // //           return -1;
// // //         }
// // //         return 0;
// // //       });
// // //     } else {
// // //       list.sort((a, b) => {
// // //         if (new Date(a["updateDate"]) < new Date(b["updateDate"])) {
// // //           return 1;
// // //         }
// // //         if (new Date(a["updateDate"]) > new Date(b["updateDate"])) {
// // //           return -1;
// // //         }
// // //         return 0;
// // //       });
// // //     }
// // //     setFilteredEntryList(list);
// // //     setSortedField("updateDate");
// // //   }
// // //   function handleFormTextChangeValidations(message, index) {
// // //     props.onFormTextChangeValidations(message, index);
// // //   }
// // //   function handleSearchKeyUp(event) {
// // //     let searchText = event.target.value;
// // //     setSearchText(searchText);
// // //     performSearchOperation(searchText);
// // //   }
// // //   function performSearchOperation(searchText) {
// // //     let query = searchText.trim();
// // //     if (query.length == 0) {
// // //       setFilteredEntryList(entryList);
// // //       return;
// // //     }
// // //     let searchedEntrys = [];
// // //     searchedEntrys = filterByShowInListAttributes(query);
// // //     setFilteredEntryList(searchedEntrys);
// // //   }
// // //   function filterByName(query) {
// // //     let fList = [];
// // //     for (let i = 0; i < selectedList.length; i++) {
// // //       if (selectedList[i].name.toLowerCase().includes(query.toLowerCase())) {
// // //         fList.push(selectedList[i]);
// // //       }
// // //     }
// // //     return fList;
// // //   }
// // //   function filterByShowInListAttributes(query) {
// // //     let fList = [];
// // //     for (let i = 0; i < entryList.length; i++) {
// // //       for (let j = 0; j < showInList.length; j++) {
// // //         if (showInList[j].show) {
// // //           let parameterName = showInList[j].attribute;
// // //           if (
// // //             entryList[i][parameterName] &&
// // //             entryList[i][parameterName]
// // //               .toLowerCase()
// // //               .includes(query.toLowerCase())
// // //           ) {
// // //             fList.push(entryList[i]);
// // //             break;
// // //           }
// // //         }
// // //       }
// // //     }
// // //     return fList;
// // //   }
// // //   function handleToggleText(index) {
// // //     let sil = [...showInList];
// // //     sil[index].flagReadMore = !sil[index].flagReadMore;
// // //     setShowInList(sil);
// // //   }
// // //   function handleExcelFileUploadClick(file, msg) {
// // //     if (msg) {
// // //       showMessage(message);
// // //       return;
// // //     }
// // //     setSelectedFile(file);
// // //     const reader = new FileReader();
// // //     reader.onload = (event) => {
// // //       const arrayBuffer = event.target.result;
// // //       const workbook = XLSX.read(arrayBuffer, { type: "array" });
// // //       const sheetName = workbook.SheetNames[0];
// // //       const worksheet = workbook.Sheets[sheetName];
// // //       const jsonData = XLSX.utils.sheet_to_json(worksheet);
// // //       setSheetData(jsonData);
// // //       let result = analyseImportExcelSheet(jsonData, entryList);
// // //       if (result.message) {
// // //         showMessage(result.message);
// // //       } else {
// // //         showImportAnalysis(result);
// // //       }
// // //     };
// // //     reader.readAsArrayBuffer(file);
// // //   }
// // //   function showImportAnalysis(result) {
// // //     setCntAdd(result.cntA);
// // //     setCntUpdate(result.cntU);
// // //     setRecordsToBeAdded(result.recordsToBeAdded);
// // //     setRecordsToBeUpdated(result.recordsToBeUpdated);
// // //     setFlagImport(true);
// // //   }
// // //   function handleModalCloseClick() {
// // //     setFlagImport(false);
// // //   }
// // //   async function handleImportButtonClick() {
// // //     setFlagImport(false);
// // //     setFlagLoad(true);
// // //     let result;
// // //     try {
// // //       if (recordsToBeAdded.length > 0) {
// // //         result = await recordsAddBulk(
// // //           recordsToBeAdded,
// // //           "users",
// // //           entryList,
// // //           import.meta.env.VITE_API_URL
// // //         );
// // //         if (result.success) {
// // //           setEntryList(result.updatedList);
// // //           setFilteredEntryList(result.updatedList);
// // //         }
// // //         showMessage(result.message);
// // //       }
// // //       if (recordsToBeUpdated.length > 0) {
// // //         result = await recordsUpdateBulk(
// // //           recordsToBeUpdated,
// // //           "users",
// // //           entryList,
// // //           import.meta.env.VITE_API_URL
// // //         );
// // //         if (result.success) {
// // //           setEntryList(result.updatedList);
// // //           setFilteredEntryList(result.updatedList);
// // //         }
// // //         showMessage(result.message);
// // //       }
// // //     } catch (error) {
// // //       console.log(error);
// // //       showMessage("Something went wrong, refresh the page");
// // //     }
// // //     setFlagLoad(false);
// // //   }
// // //   function handleClearSelectedFile() {
// // //     setSelectedFile(null);
// // //   }
// // //   if (flagLoad) {
// // //     return (
// // //       <div className="my-5 text-center">
// // //         <BeatLoader size={24} color={"blue"} />
// // //       </div>
// // //     );
// // //   }

// // //   function fetchDataForSelectedDate(
// // //     option = selectedDateOption,
// // //     customDate = anotherDate
// // //   ) {
// // //     setSelectedIds([]);
// // //     const actualDate = resolveSelectedDate(option, customDate);
// // //     getData(actualDate);
// // //   }

// // //   return (
// // //     <>
// // //       <CommonUtilityBar
// // //         action={action}
// // //         message={message}
// // //         selectedEntity={selectedEntity}
// // //         flagToggleButton={flagToggleButton}
// // //         filteredList={filteredEntryList}
// // //         mainList={entryList}
// // //         showInList={showInList}
// // //         onListClick={handleListClick}
// // //         onAddEntityClick={handleAddEntityClick}
// // //         onSearchKeyUp={handleSearchKeyUp}
// // //         onExcelFileUploadClick={handleExcelFileUploadClick}
// // //         onClearSelectedFile={handleClearSelectedFile}
// // //       />

// // //       {filteredEntryList.length === 0 && entryList.length !== 0 && (
// // //         <div className="text-center">Nothing to show</div>
// // //       )}
// // //       {entryList.length === 0 && (
// // //         <div className="text-center">List is empty</div>
// // //       )}
// // //       {action === "list" && (
// // //         <div className="text-center my-3">
// // //           <label className="fw-bold me-3">Select Date:</label>

// // //           <div className="btn-group" role="group">
// // //             <button
// // //               type="button"
// // //               className={` btn ${
// // //                 selectedDateOption === "Today"
// // //                   ? "btn-primary"
// // //                   : "btn-outline-primary"
// // //               }`}
// // //               onClick={() => {
// // //                 setSelectedDateOption("Today");
// // //                 setAnotherDate("");
// // //                 fetchDataForSelectedDate("Today");
// // //               }}
// // //             >
// // //               Today
// // //             </button>
// // //             <button
// // //               type="button"
// // //               className={`btn ${
// // //                 selectedDateOption === "Yesterday"
// // //                   ? "btn-primary"
// // //                   : "btn-outline-primary"
// // //               }`}
// // //               onClick={() => {
// // //                 setSelectedDateOption("Yesterday");
// // //                 setAnotherDate("");
// // //                 fetchDataForSelectedDate("Yesterday");
// // //               }}
// // //             >
// // //               Yesterday
// // //             </button>
// // //             <button
// // //               type="button"
// // //               className={`btn ${
// // //                 selectedDateOption === "Another Day"
// // //                   ? "btn-primary"
// // //                   : "btn-outline-primary"
// // //               }`}
// // //               onClick={() => {
// // //                 setSelectedDateOption("Another Day");
// // //               }}
// // //             >
// // //               Another Day
// // //             </button>
// // //             {selectedDateOption === "Another Day" && (
// // //               <input
// // //                 type="date"
// // //                 className="form-control d-inline-block ms-2"
// // //                 style={{ width: "auto" }} // Added inline style to keep it compact
// // //                 value={anotherDate}
// // //                 onChange={(e) => {
// // //                   setAnotherDate(e.target.value);
// // //                   setSelectedIds([]);
// // //                   fetchDataForSelectedDate("Another Day", e.target.value);
// // //                 }}
// // //               />
// // //             )}
// // //           </div>
// // //         </div>
// // //       )}

// // //       {action === "list" && filteredEntryList.length !== 0 && (
// // //         <CheckBoxHeaders
// // //           showInList={showInList}
// // //           onListCheckBoxClick={handleListCheckBoxClick}
// // //         />
// // //       )}

// // //       {action === "list" && (
// // //         <div className="text-center my-3">
// // //           <div className="text-center my-3">
// // //             <button
// // //               className="btn btn-success mx-1"
// // //               onClick={handleDeliverButtonClick}
// // //               disabled={selectedIds.length === 0}
// // //             >
// // //               Delivered
// // //             </button>

// // //             <button
// // //               className="btn btn-warning mx-1"
// // //               onClick={handleKhadaButtonClick}
// // //               disabled={selectedIds.length === 0}
// // //             >
// // //               Khada
// // //             </button>

// // //             <button
// // //               className="btn btn-secondary mx-1"
// // //               onClick={handleChangeButtonClick}
// // //               disabled={selectedIds.length !== 1}
// // //             >
// // //               Change
// // //             </button>
// // //           </div>

// // //           {latestUpdatedDate !== null ? (
// // //             <div className="text-sm text-red-600 font-semibold mt-2">
// // //               Last updated: {latestUpdatedDate.toLocaleString()}
// // //             </div>
// // //           ) : (
// // //             <div className="text-sm text-gray-500 mt-2">
// // //               No entries available
// // //             </div>
// // //           )}
// // //         </div>
// // //       )}

// // //       {action === "list" && filteredEntryList.length !== 0 && (
// // //         <div className="row my-2 mx-auto p-1">
// // //           <div className="col-1">
// // //             <input
// // //               type="checkbox"
// // //               checked={
// // //                 selectedIds.length > 0 &&
// // //                 selectedIds.length === filteredEntryList.length
// // //               }
// // //               onChange={(ev) => {
// // //                 if (ev.target.checked) {
// // //                   setSelectedIds(filteredEntryList.map((entry) => entry._id));
// // //                 } else {
// // //                   setSelectedIds([]);
// // //                 }
// // //               }}
// // //             />
// // //           </div>
// // //           <div className="col-1">
// // //             <a
// // //               href="#"
// // //               onClick={() => {
// // //                 handleSrNoClick();
// // //               }}
// // //             >
// // //               SN.{" "}
// // //               {sortedField == "updateDate" && direction && (
// // //                 <i className="bi bi-arrow-up"></i>
// // //               )}
// // //               {sortedField == "updateDate" && !direction && (
// // //                 <i className="bi bi-arrow-down"></i>
// // //               )}
// // //             </a>
// // //           </div>
// // //           <ListHeaders
// // //             showInList={showInList}
// // //             sortedField={sortedField}
// // //             direction={direction}
// // //             onHeaderClick={handleHeaderClick}
// // //           />
// // //           <div className="col-1">&nbsp;</div>
// // //         </div>
// // //       )}
// // //       {(action == "add" || action == "update") && (
// // //         <div className="row">
// // //           <AdminDailyEntryForm
// // //             entrySchema={entrySchema}
// // //             entryValidations={entryValidations}
// // //             emptyEntry={emptyEntry}
// // //             selectedEntity={selectedEntity}
// // //             userToBeEdited={userToBeEdited}
// // //             action={action}
// // //             flagFormInvalid={flagFormInvalid}
// // //             onFormSubmit={handleFormSubmit}
// // //             onFormCloseClick={handleFormCloseClick}
// // //             onFormTextChangeValidations={handleFormTextChangeValidations}
// // //           />
// // //         </div>
// // //       )}
// // //       {showChangeModal && (
// // //         <ChangeQtyModal
// // //           user={modalUser}
// // //           qty={modalQty}
// // //           onQtyChange={(e) => setModalQty(e.target.value)}
// // //           onSave={handleModalQtySubmit}
// // //           onClose={() => setShowChangeModal(false)}
// // //         />
// // //       )}

// // //       {action === "list" &&
// // //         filteredEntryList.length !== 0 &&
// // //         filteredEntryList.map((e, index) => (
// // //           <div
// // //             className={`row mx-auto   mt-2 my-1 ${
// // //               e.entry_status === "Delivered"
// // //                 ? "bg-success bg-opacity-25"
// // //                 : e.entry_status === "Change"
// // //                 ? "bg-warning bg-opacity-25"
// // //                 : e.entry_status === "Khada"
// // //                 ? "bg-secondary bg-opacity-25"
// // //                 : ""
// // //             }`}
// // //             key={index}
// // //           >
// // //             <div className="col-1 d-flex align-items-center">
// // //               <input
// // //                 type="checkbox"
// // //                 checked={selectedIds.includes(e._id)}
// // //                 onChange={(ev) => {
// // //                   if (ev.target.checked) {
// // //                     setSelectedIds((prev) => [...prev, e._id]);
// // //                   } else {
// // //                     setSelectedIds((prev) => prev.filter((id) => id !== e._id));
// // //                   }
// // //                 }}
// // //               />
// // //             </div>
// // //             <div className="col-11">
// // //               <Entity
// // //                 entity={e}
// // //                 index={index}
// // //                 sortedField={sortedField}
// // //                 direction={direction}
// // //                 listSize={filteredEntryList.length}
// // //                 selectedEntity={selectedEntity}
// // //                 showInList={showInList}
// // //                 VITE_API_URL={import.meta.env.VITE_API_URL}
// // //                 onEditButtonClick={handleEditButtonClick}
// // //                 onDeleteButtonClick={handleDeleteButtonClick}
// // //                 onToggleText={handleToggleText}
// // //               />
// // //             </div>
// // //           </div>
// // //         ))}

// // //       {flagImport && (
// // //         <ModalImport
// // //           modalText={"Summary of Bulk Import"}
// // //           additions={recordsToBeAdded}
// // //           updations={recordsToBeUpdated}
// // //           btnGroup={["Yes", "No"]}
// // //           onModalCloseClick={handleModalCloseClick}
// // //           onModalButtonCancelClick={handleModalCloseClick}
// // //           onImportButtonClick={handleImportButtonClick}
// // //         />
// // //       )}
// // //     </>
// // //   );
// // // }






















// // // import { useEffect, useState } from "react";
// // // import {
// // //   CommonUtilityBar,
// // //   CheckBoxHeaders,
// // //   ListHeaders,
// // //   Entity,
// // // } from "../external/vite-sdk";
// // // import { BeatLoader } from "react-spinners";
// // // import axios from "axios";
// // // import * as XLSX from "xlsx";
// // // import ModalImport from "./ModalImport";
// // // import ChangeQtyModal from "./ChangeQtyModal";
// // // import {
// // //   recordsAddBulk,
// // //   recordsUpdateBulk,
// // //   analyseImportExcelSheet,
// // // } from "../external/vite-sdk";
// // // import { getEmptyObject, getShowInList } from "../external/vite-sdk";
// // // import AdminDailyEntryForm from "./AdminDailyEntryForm";

// // // export default function AdminDailyEntry(props) {
// // //   const [anotherDate, setAnotherDate] = useState("");
// // //   let [showChangeModal, setShowChangeModal] = useState(false);
// // //   let [modalUser, setModalUser] = useState(null);
// // //   let [modalQty, setModalQty] = useState("");

// // //   let [selectedIds, setSelectedIds] = useState([]);
// // //   let [entryList, setEntryList] = useState([]);
// // //   let [filteredEntryList, setFilteredEntryList] = useState([]);
// // //   let [action, setAction] = useState("list");
// // //   let [userToBeEdited, setUserToBeEdited] = useState("");
// // //   let [flagLoad, setFlagLoad] = useState(false);
// // //   let [flagImport, setFlagImport] = useState(false);
// // //   let [message, setMessage] = useState("");
// // //   let [searchText, setSearchText] = useState("");
// // //   let [sortedField, setSortedField] = useState("");
// // //   let [direction, setDirection] = useState("");
// // //   let [sheetData, setSheetData] = useState(null);
// // //   let [selectedFile, setSelectedFile] = useState("");
// // //   let [recordsToBeAdded, setRecordsToBeAdded] = useState([]);
// // //   let [recordsToBeUpdated, setRecordsToBeUpdated] = useState([]);
// // //   let [cntUpdate, setCntUpdate] = useState(0);
// // //   let [cntAdd, setCntAdd] = useState(0);
// // //   let { selectedEntity } = props;
// // //   let { flagFormInvalid } = props;
// // //   let { flagToggleButton } = props;

// // //   const [selectedDateOption, setSelectedDateOption] = useState("Today");

// // //   function resolveSelectedDate(option, customDate = "") {
// // //     const today = new Date();
// // //     if (option === "Today") return today.toISOString().split("T")[0];
// // //     if (option === "Yesterday") {
// // //       const yest = new Date(today);
// // //       yest.setDate(yest.getDate() - 1);
// // //       return yest.toISOString().split("T")[0];
// // //     }
// // //     if (option === "Another Day" && customDate) return customDate;
// // //     return today.toISOString().split("T")[0];
// // //   }

// // //   let entrySchema = [
// // //     { attribute: "name", type: "normal" },
// // //     { attribute: "daily_qty", type: "normal" },
// // //     { attribute: "delivered_qty", type: "normal" },
// // //     {
// // //       attribute: "entry_status",
// // //       type: "normal",
// // //       show: true,
// // //     },
// // //   ];
// // //   let entryValidations = {
// // //     name: { message: "", mxLen: 200, mnLen: 4, onlyDigits: false },
// // //     daily_qty: { message: "", onlyDigits: true },
// // //     delivered_qty: { message: "", onlyDigits: true },
// // //     entry_status: { message: "" },
// // //   };

// // //   let [showInList, setShowInList] = useState(getShowInList(entrySchema));

// // //   let [emptyEntry, setEmptyEntry] = useState({
// // //     ...getEmptyObject(entrySchema),
// // //     roleId: "68691372fa624c1dff2e06be",
// // //     name: "",
// // //     daily_qty: "",
// // //     delivered_qty: "",
// // //     entry_status: "",
// // //   });

// // //   useEffect(() => {
// // //     fetchDataForSelectedDate();
// // //   }, []);

// // //   async function getData(dateToFetch) {
// // //     setFlagLoad(true);
// // //     try {
// // //       const [entryRes, userRes] = await Promise.all([
// // //         axios(import.meta.env.VITE_API_URL + "/entries"),
// // //         axios(import.meta.env.VITE_API_URL + "/users"),
// // //       ]);

// // //       const entryListRaw = entryRes.data;
// // //       const userList = userRes.data;

// // //       const today = dateToFetch;

// // //       const mergedList = userList
// // //         .filter((user) => user.roleId === "68691372fa624c1dff2e06be")
// // //         .map((user) => {
// // //           const todayEntry = entryListRaw.find((entry) => {
// // //             // Normalize entry.date from DB for comparison
// // //             const entryDateFormatted =
// // //               entry.date instanceof Date
// // //                 ? entry.date.toISOString().split("T")[0]
// // //                 : typeof entry.date === "string" && entry.date.includes("T")
// // //                 ? entry.date.split("T")[0]
// // //                 : entry.date; // Use as is if already YYYY-MM-DD string

// // //             return entry.userId === user._id && entryDateFormatted === today;
// // //           });

// // //           return {
// // //             _id: user._id,
// // //             userId: user._id,
// // //             name: user.name,
// // //             daily_qty: user.daily_qty,
// // //             delivered_qty: todayEntry?.delivered_qty ?? "",
// // //             entry_status: todayEntry?.entry_status || "",
// // //             // Ensure the date field in the frontend object is consistently YYYY-MM-DD string
// // //             date:
// // //               todayEntry?.date &&
// // //               typeof todayEntry.date === "string" &&
// // //               todayEntry.date.includes("T")
// // //                 ? todayEntry.date.split("T")[0]
// // //                 : todayEntry?.date || today,
// // //             updateDate: todayEntry?.updateDate || "",
// // //             entryId: todayEntry?._id || null,
// // //           };
// // //         });

// // //       mergedList.sort(
// // //         (a, b) => new Date(b.updateDate || 0) - new Date(a.updateDate || 0)
// // //       );

// // //       setEntryList(mergedList);
// // //       setFilteredEntryList(mergedList);
// // //     } catch (error) {
// // //       console.error(error);
// // //       showMessage("Something went wrong while fetching data.");
// // //     }
// // //     setFlagLoad(false);
// // //   }

// // //   async function handleFormSubmit(entry) {
// // //     let message;
// // //     let entryForBackEnd = { ...entry };
// // //     for (let key in entryForBackEnd) {
// // //       entrySchema.forEach((e, index) => {
// // //         if (key == e.attribute && e.relationalData) {
// // //           delete entryForBackEnd[key];
// // //         }
// // //       });
// // //     }

// // //     if (entryForBackEnd.date instanceof Date) {
// // //       entryForBackEnd.date = entryForBackEnd.date.toISOString().split("T")[0];
// // //     } else if (
// // //       typeof entryForBackEnd.date === "string" &&
// // //       entryForBackEnd.date.includes("T")
// // //     ) {
// // //       entryForBackEnd.date = entryForBackEnd.date.split("T")[0];
// // //     }

// // //     if (action == "add") {
// // //       setFlagLoad(true);
// // //       try {
// // //         const response = await axios.post(
// // //           import.meta.env.VITE_API_URL + "/entries",
// // //           entryForBackEnd,
// // //           { headers: { "Content-type": "application/json" } }
// // //         );
// // //         const addedEntryFromServer = response.data;

// // //         setEntryList((prevList) => {
// // //           const newList = [
// // //             ...prevList,
// // //             {
// // //               ...entry,
// // //               ...addedEntryFromServer,
// // //               entryId: addedEntryFromServer._id,
// // //               updateDate:
// // //                 addedEntryFromServer.updateDate || new Date().toISOString(),
// // //             },
// // //           ];
// // //           return newList.sort(
// // //             (a, b) => new Date(b.updateDate || 0) - new Date(a.updateDate || 0)
// // //           );
// // //         });
// // //         setFilteredEntryList((prevList) => {
// // //           const newList = [
// // //             ...prevList,
// // //             {
// // //               ...entry,
// // //               ...addedEntryFromServer,
// // //               entryId: addedEntryFromServer._id,
// // //               updateDate:
// // //                 addedEntryFromServer.updateDate || new Date().toISOString(),
// // //             },
// // //           ];
// // //           return newList.sort(
// // //             (a, b) => new Date(b.updateDate || 0) - new Date(a.updateDate || 0)
// // //           );
// // //         });

// // //         message = "Entry added successfully";
// // //         showMessage(message);
// // //         setAction("list");
// // //       } catch (error) {
// // //         console.error("Error adding entry:", error);
// // //         showMessage("Something went wrong, refresh the page");
// // //       }
// // //       setFlagLoad(false);
// // //     } else if (action == "update") {
// // //       const entryToUpdateId = userToBeEdited.entryId;

// // //       if (!entryToUpdateId) {
// // //         showMessage(
// // //           "Error: Cannot update. Entry ID not found for this record."
// // //         );
// // //         setFlagLoad(false);
// // //         return;
// // //       }

// // //       setFlagLoad(true);
// // //       try {
// // //         const response = await axios.put(
// // //           `${import.meta.env.VITE_API_URL}/entries/${entryToUpdateId}`,
// // //           entryForBackEnd,
// // //           { headers: { "Content-type": "application/json" } }
// // //         );

// // //         const updatedBackendEntry = response.data;

// // //         setEntryList((prevList) => {
// // //           const newList = prevList.map((item) => {
// // //             if (item._id === userToBeEdited._id) {
// // //               return {
// // //                 ...item,
// // //                 ...updatedBackendEntry,
// // //                 entryId: updatedBackendEntry._id,
// // //                 updateDate:
// // //                   updatedBackendEntry.updateDate || new Date().toISOString(),
// // //               };
// // //             }
// // //             return item;
// // //           });
// // //           return newList.sort(
// // //             (a, b) => new Date(b.updateDate || 0) - new Date(a.updateDate || 0)
// // //           );
// // //         });
// // //         setFilteredEntryList((prevList) => {
// // //           const newList = prevList.map((item) => {
// // //             if (item._id === userToBeEdited._id) {
// // //               return {
// // //                 ...item,
// // //                 ...updatedBackendEntry,
// // //                 entryId: updatedBackendEntry._id,
// // //                 updateDate:
// // //                   updatedBackendEntry.updateDate || new Date().toISOString(),
// // //               };
// // //             }
// // //             return item;
// // //           });
// // //           return newList.sort(
// // //             (a, b) => new Date(b.updateDate || 0) - new Date(a.updateDate || 0)
// // //           );
// // //         });

// // //         message = "Entry Updated successfully";
// // //         showMessage(message);
// // //         setAction("list");
// // //       } catch (error) {
// // //         console.error("Error updating entry:", error);
// // //         showMessage("Something went wrong during update, please try again.");
// // //       }
// // //       setFlagLoad(false);
// // //     }
// // //   }
// // //   function handleFormCloseClick() {
// // //     props.onFormCloseClick();
// // //   }
// // //   const latestUpdatedDate = entryList.length
// // //   ? new Date(
// // //       Math.max(
// // //         ...entryList
// // //           .filter((entry) => entry.updateDate) 
// // //           .map((entry) => new Date(entry.updateDate))
// // //       )
// // //     )
// // //   : null;


// // //   function handleListClick() {
// // //     setAction("list");
// // //   }
// // //   function handleAddEntityClick() {
// // //     setAction("add");
// // //   }
// // //   function handleEditButtonClick(entry) {
// // //     let safeEntry = {
// // //       ...emptyEntry,
// // //       ...entry,
// // //       info: entry.info || "",
// // //     };
// // //     setAction("update");
// // //     setUserToBeEdited(safeEntry);
// // //   }
// // //   function showMessage(message) {
// // //     setMessage(message);
// // //     window.setTimeout(() => {
// // //       setMessage("");
// // //     }, 3000);
// // //   }

// // //   async function handleModalQtySubmit() {
// // //     if (!modalUser || modalQty === "") {
// // //       showMessage("Please enter a valid quantity.");
// // //       return;
// // //     }

// // //     const currentSelectedDate = resolveSelectedDate(
// // //       selectedDateOption,
// // //       anotherDate
// // //     );

// // //     const entryData = {
// // //       userId: modalUser.userId,
// // //       name: modalUser.name,
// // //       daily_qty: modalUser.daily_qty,
// // //       delivered_qty: modalQty,
// // //       entry_status: "Change",
// // //       date: currentSelectedDate,
// // //     };

// // //     const url = modalUser.entryId
// // //       ? `${import.meta.env.VITE_API_URL}/entries/${modalUser.entryId}`
// // //       : `${import.meta.env.VITE_API_URL}/entries`;

// // //     const method = modalUser.entryId ? axios.put : axios.post;

// // //     try {
// // //       const response = await method(url, entryData, {
// // //         headers: { "Content-type": "application/json" },
// // //       });

// // //       const updatedEntryFromServer = response.data;

// // //       setEntryList((prevList) => {
// // //         const newList = prevList
// // //           .map((item) => {
// // //             if (item._id === modalUser._id) {
// // //               return {
// // //                 ...item,
// // //                 ...updatedEntryFromServer,
// // //                 entryId: updatedEntryFromServer._id,
// // //                 updateDate:
// // //                   updatedEntryFromServer.updateDate || new Date().toISOString(),
// // //               };
// // //             }
// // //             return item;
// // //           })
// // //           .sort(
// // //             (a, b) => new Date(b.updateDate || 0) - new Date(a.updateDate || 0)
// // //           );
// // //         return newList;
// // //       });

// // //       setFilteredEntryList((prevList) => {
// // //         const newList = prevList
// // //           .map((item) => {
// // //             if (item._id === modalUser._id) {
// // //               return {
// // //                 ...item,
// // //                 ...updatedEntryFromServer,
// // //                 entryId: updatedEntryFromServer._id,
// // //                 updateDate:
// // //                   updatedEntryFromServer.updateDate || new Date().toISOString(),
// // //               };
// // //             }
// // //             return item;
// // //           })
// // //           .sort(
// // //             (a, b) => new Date(b.updateDate || 0) - new Date(a.updateDate || 0)
// // //           );
// // //         return newList;
// // //       });

// // //       showMessage("Entry updated to 'Change'");
// // //       setSelectedIds([]);
// // //       setShowChangeModal(false);
// // //     } catch (error) {
// // //       console.error("Change update failed:", error);
// // //       if (error.response) {
// // //         console.error("Error response data:", error.response.data);
// // //         console.error("Error response status:", error.response.status);
// // //         console.error("Error response headers:", error.response.headers); // Add this for more detail
// // //       } else if (error.request) {
// // //         console.error("Error request:", error.request);
// // //       } else {
// // //         console.error("Error message:", error.message);
// // //       }
// // //       showMessage("Failed to update entry");
// // //       setShowChangeModal(false); // Ensure modal closes even on error
// // //     }
// // //   }

// // //   function handleDeleteButtonClick(ans, entry) {
// // //     if (ans == "No") {
// // //       showMessage("Delete operation cancelled");
// // //       return;
// // //     }
// // //     if (ans == "Yes") {
// // //       performDeleteOperation(entry);
// // //     }
// // //   }

// // //   async function handleDeliverButtonClick() {
// // //     const currentSelectedDate = resolveSelectedDate(
// // //       selectedDateOption,
// // //       anotherDate
// // //     );

// // //     for (const id of selectedIds) {
// // //       const entry = entryList.find((e) => e._id === id);

// // //       const entryData = {
// // //         userId: entry.userId,
// // //         name: entry.name,
// // //         daily_qty: entry.daily_qty,
// // //         delivered_qty: entry.daily_qty,
// // //         entry_status: "Delivered",
// // //         date: currentSelectedDate,
// // //       };

// // //       const url = entry.entryId
// // //         ? `${import.meta.env.VITE_API_URL}/entries/${entry.entryId}`
// // //         : `${import.meta.env.VITE_API_URL}/entries`;

// // //       const method = entry.entryId ? axios.put : axios.post;

// // //       try {
// // //         const response = await method(url, entryData, {
// // //           headers: { "Content-type": "application/json" },
// // //         });

// // //         const updatedEntryFromServer = response.data;
// // //         setEntryList((prevList) => {
// // //           const newList = prevList
// // //             .map((item) => {
// // //               if (item._id === entry._id) {
// // //                 return {
// // //                   ...item,
// // //                   ...updatedEntryFromServer,
// // //                   entryId: updatedEntryFromServer._id,
// // //                   updateDate:
// // //                     updatedEntryFromServer.updateDate ||
// // //                     new Date().toISOString(),
// // //                 };
// // //               }
// // //               return item;
// // //             })
// // //             .sort(
// // //               (a, b) =>
// // //                 new Date(b.updateDate || 0) - new Date(a.updateDate || 0)
// // //             );
// // //           setFilteredEntryList(newList);
// // //           return newList;
// // //         });
// // //       } catch (err) {
// // //         console.error(err);
// // //         showMessage("Failed to mark as Delivered for " + entry.name);
// // //       }
// // //     }

// // //     showMessage("Marked selected entries as Delivered");
// // //     setSelectedIds([]);
// // //   }

// // //   async function handleKhadaButtonClick() {
// // //     const currentSelectedDate = resolveSelectedDate(
// // //       selectedDateOption,
// // //       anotherDate
// // //     );

// // //     for (const id of selectedIds) {
// // //       const userEntry = entryList.find((e) => e._id === id);
// // //       const entryId = userEntry.entryId;

// // //       const entryData = {
// // //         userId: userEntry.userId,
// // //         name: userEntry.name,
// // //         daily_qty: userEntry.daily_qty,
// // //         delivered_qty: 0,
// // //         entry_status: "Khada",
// // //         date: currentSelectedDate,
// // //       };

// // //       const url = entryId
// // //         ? `${import.meta.env.VITE_API_URL}/entries/${entryId}`
// // //         : `${import.meta.env.VITE_API_URL}/entries`;

// // //       const method = entryId ? axios.put : axios.post;

// // //       try {
// // //         const response = await method(url, entryData, {
// // //           headers: { "Content-type": "application/json" },
// // //         });

// // //         const updatedEntryFromServer = response.data;
// // //         setEntryList((prevList) => {
// // //           const newList = prevList
// // //             .map((item) => {
// // //               if (item._id === userEntry._id) {
// // //                 return {
// // //                   ...item,
// // //                   ...updatedEntryFromServer,
// // //                   entryId: updatedEntryFromServer._id,
// // //                   updateDate:
// // //                     updatedEntryFromServer.updateDate ||
// // //                     new Date().toISOString(),
// // //                 };
// // //               }
// // //               return item;
// // //             })
// // //             .sort(
// // //               (a, b) =>
// // //                 new Date(b.updateDate || 0) - new Date(a.updateDate || 0)
// // //             );
// // //           setFilteredEntryList(newList);
// // //           return newList;
// // //         });
// // //       } catch (error) {
// // //         console.error("Error for", userEntry.name, error);
// // //         showMessage(`Failed to mark Khada for ${userEntry.name}`);
// // //       }
// // //     }

// // //     showMessage("Marked selected entries as Khada");
// // //     setSelectedIds([]);
// // //   }

// // //   function handleChangeButtonClick() {
// // //     if (selectedIds.length !== 1) {
// // //       showMessage("Select exactly one user to change delivered quantity.");
// // //       return;
// // //     }
// // //     const user = entryList.find((u) => u._id === selectedIds[0]);
// // //     setModalUser(user);
// // //     setModalQty(user.delivered_qty || "");
// // //     setShowChangeModal(true);
// // //   }

// // //   async function performDeleteOperation(entry) {
// // //     setFlagLoad(true);
// // //     try {
// // //       await axios.delete(
// // //         import.meta.env.VITE_API_URL + "/entries/" + entry.entryId
// // //       );

// // //       const updatedEntry = {
// // //         ...entry,
// // //         delivered_qty: "",
// // //         entry_status: "",
// // //         entryId: null,
// // //         updateDate: "",
// // //       };

// // //       setEntryList((prevList) => {
// // //         const newList = prevList.map((e) =>
// // //           e._id === entry._id ? updatedEntry : e
// // //         );
// // //         setFilteredEntryList(newList);
// // //         return newList;
// // //       });

// // //       showMessage(`Entry - ${entry.name} deleted successfully.`);
// // //     } catch (error) {
// // //       console.log(error);
// // //       showMessage("Something went wrong, refresh the page");
// // //     }
// // //     setFlagLoad(false);
// // //   }

// // //   function handleListCheckBoxClick(checked, selectedIndex) {
// // //     let cnt = 0;
// // //     showInList.forEach((e, index) => {
// // //       if (e.show) {
// // //         cnt++;
// // //       }
// // //     });
// // //     if (cnt == 1 && !checked) {
// // //       showMessage("Minimum 1 field should be selected.");
// // //       return;
// // //     }
// // //     if (cnt == 5 && checked) {
// // //       showMessage("Maximum 5 fields can be selected.");
// // //       return;
// // //     }
// // //     let att = [...showInList];
// // //     let a = att.map((e, index) => {
// // //       let p = { ...e };
// // //       if (index == selectedIndex && checked) {
// // //         p.show = true;
// // //       } else if (index == selectedIndex && !checked) {
// // //         p.show = false;
// // //       }
// // //       return p;
// // //     });
// // //     setShowInList(a);
// // //   }
// // //   function handleHeaderClick(index) {
// // //     let field = showInList[index].attribute;
// // //     let d = false;
// // //     if (field === sortedField) {
// // //       d = !direction;
// // //     } else {
// // //       d = false;
// // //     }
// // //     let list = [...filteredEntryList];
// // //     setDirection(d);
// // //     if (d == false) {
// // //       list.sort((a, b) => {
// // //         if (a[field] > b[field]) {
// // //           return 1;
// // //         }
// // //         if (a[field] < b[field]) {
// // //           return -1;
// // //         }
// // //         return 0;
// // //       });
// // //     } else {
// // //       list.sort((a, b) => {
// // //         if (a[field] < b[field]) {
// // //           return 1;
// // //         }
// // //         if (a[field] > b[field]) {
// // //           return -1;
// // //         }
// // //         return 0;
// // //       });
// // //     }
// // //     setFilteredEntryList(list);
// // //     setSortedField(field);
// // //   }
// // //   function handleSrNoClick() {
// // //     let d = false;
// // //     if (sortedField === "updateDate") {
// // //       d = !direction;
// // //     } else {
// // //       d = false;
// // //     }

// // //     let list = [...filteredEntryList];
// // //     setDirection(!direction);
// // //     if (d == false) {
// // //       list.sort((a, b) => {
// // //         if (new Date(a["updateDate"]) > new Date(b["updateDate"])) {
// // //           return 1;
// // //         }
// // //         if (new Date(a["updateDate"]) < new Date(b["updateDate"])) {
// // //           return -1;
// // //         }
// // //         return 0;
// // //       });
// // //     } else {
// // //       list.sort((a, b) => {
// // //         if (new Date(a["updateDate"]) < new Date(b["updateDate"])) {
// // //           return 1;
// // //         }
// // //         if (new Date(a["updateDate"]) > new Date(b["updateDate"])) {
// // //           return -1;
// // //         }
// // //         return 0;
// // //       });
// // //     }
// // //     setFilteredEntryList(list);
// // //     setSortedField("updateDate");
// // //   }
// // //   function handleFormTextChangeValidations(message, index) {
// // //     props.onFormTextChangeValidations(message, index);
// // //   }
// // //   function handleSearchKeyUp(event) {
// // //     let searchText = event.target.value;
// // //     setSearchText(searchText);
// // //     performSearchOperation(searchText);
// // //   }
// // //   function performSearchOperation(searchText) {
// // //     let query = searchText.trim();
// // //     if (query.length == 0) {
// // //       setFilteredEntryList(entryList);
// // //       return;
// // //     }
// // //     let searchedEntrys = [];
// // //     searchedEntrys = filterByShowInListAttributes(query);
// // //     setFilteredEntryList(searchedEntrys);
// // //   }
// // //   function filterByName(query) {
// // //     let fList = [];
// // //     for (let i = 0; i < selectedList.length; i++) {
// // //       if (selectedList[i].name.toLowerCase().includes(query.toLowerCase())) {
// // //         fList.push(selectedList[i]);
// // //       }
// // //     }
// // //     return fList;
// // //   }
// // //   function filterByShowInListAttributes(query) {
// // //     let fList = [];
// // //     for (let i = 0; i < entryList.length; i++) {
// // //       for (let j = 0; j < showInList.length; j++) {
// // //         if (showInList[j].show) {
// // //           let parameterName = showInList[j].attribute;
// // //           if (
// // //             entryList[i][parameterName] &&
// // //             entryList[i][parameterName]
// // //               .toLowerCase()
// // //               .includes(query.toLowerCase())
// // //           ) {
// // //             fList.push(entryList[i]);
// // //             break;
// // //           }
// // //         }
// // //       }
// // //     }
// // //     return fList;
// // //   }
// // //   function handleToggleText(index) {
// // //     let sil = [...showInList];
// // //     sil[index].flagReadMore = !sil[index].flagReadMore;
// // //     setShowInList(sil);
// // //   }
// // //   function handleExcelFileUploadClick(file, msg) {
// // //     if (msg) {
// // //       showMessage(message);
// // //       return;
// // //     }
// // //     setSelectedFile(file);
// // //     const reader = new FileReader();
// // //     reader.onload = (event) => {
// // //       const arrayBuffer = event.target.result;
// // //       const workbook = XLSX.read(arrayBuffer, { type: "array" });
// // //       const sheetName = workbook.SheetNames[0];
// // //       const worksheet = workbook.Sheets[sheetName];
// // //       const jsonData = XLSX.utils.sheet_to_json(worksheet);
// // //       setSheetData(jsonData);
// // //       let result = analyseImportExcelSheet(jsonData, entryList);
// // //       if (result.message) {
// // //         showMessage(result.message);
// // //       } else {
// // //         showImportAnalysis(result);
// // //       }
// // //     };
// // //     reader.readAsArrayBuffer(file);
// // //   }
// // //   function showImportAnalysis(result) {
// // //     setCntAdd(result.cntA);
// // //     setCntUpdate(result.cntU);
// // //     setRecordsToBeAdded(result.recordsToBeAdded);
// // //     setRecordsToBeUpdated(result.recordsToBeUpdated);
// // //     setFlagImport(true);
// // //   }
// // //   function handleModalCloseClick() {
// // //     setFlagImport(false);
// // //   }
// // //   async function handleImportButtonClick() {
// // //     setFlagImport(false);
// // //     setFlagLoad(true);
// // //     let result;
// // //     try {
// // //       if (recordsToBeAdded.length > 0) {
// // //         result = await recordsAddBulk(
// // //           recordsToBeAdded,
// // //           "users",
// // //           entryList,
// // //           import.meta.env.VITE_API_URL
// // //         );
// // //         if (result.success) {
// // //           setEntryList(result.updatedList);
// // //           setFilteredEntryList(result.updatedList);
// // //         }
// // //         showMessage(result.message);
// // //       }
// // //       if (recordsToBeUpdated.length > 0) {
// // //         result = await recordsUpdateBulk(
// // //           recordsToBeUpdated,
// // //           "users",
// // //           entryList,
// // //           import.meta.env.VITE_API_URL
// // //         );
// // //         if (result.success) {
// // //           setEntryList(result.updatedList);
// // //           setFilteredEntryList(result.updatedList);
// // //         }
// // //         showMessage(result.message);
// // //       }
// // //     } catch (error) {
// // //       console.log(error);
// // //       showMessage("Something went wrong, refresh the page");
// // //     }
// // //     setFlagLoad(false);
// // //   }
// // //   function handleClearSelectedFile() {
// // //     setSelectedFile(null);
// // //   }
// // //   if (flagLoad) {
// // //     return (
// // //       <div className="my-5 text-center">
// // //         <BeatLoader size={24} color={"blue"} />
// // //       </div>
// // //     );
// // //   }

// // //   function fetchDataForSelectedDate(
// // //     option = selectedDateOption,
// // //     customDate = anotherDate
// // //   ) {
// // //     setSelectedIds([]);
// // //     const actualDate = resolveSelectedDate(option, customDate);
// // //     getData(actualDate);
// // //   }

// // //   return (
// // //     <>
// // //       <CommonUtilityBar
// // //         action={action}
// // //         message={message}
// // //         selectedEntity={selectedEntity}
// // //         flagToggleButton={flagToggleButton}
// // //         filteredList={filteredEntryList}
// // //         mainList={entryList}
// // //         showInList={showInList}
// // //         onListClick={handleListClick}
// // //         onAddEntityClick={handleAddEntityClick}
// // //         onSearchKeyUp={handleSearchKeyUp}
// // //         onExcelFileUploadClick={handleExcelFileUploadClick}
// // //         onClearSelectedFile={handleClearSelectedFile}
// // //       />

// // //       {filteredEntryList.length === 0 && entryList.length !== 0 && (
// // //         <div className="text-center">Nothing to show</div>
// // //       )}
// // //       {entryList.length === 0 && (
// // //         <div className="text-center">List is empty</div>
// // //       )}
// // //       {action === "list" && (
// // //         <div className="text-center my-3">
// // //           <label className="fw-bold me-3">Select Date:</label>

// // //           <div className="btn-group" role="group">
// // //             <button
// // //               type="button"
// // //               className={` btn ${
// // //                 selectedDateOption === "Today"
// // //                   ? "btn-primary"
// // //                   : "btn-outline-primary"
// // //               }`}
// // //               onClick={() => {
// // //                 setSelectedDateOption("Today");
// // //                 setAnotherDate("");
// // //                 fetchDataForSelectedDate("Today");
// // //               }}
// // //             >
// // //               Today
// // //             </button>
// // //             <button
// // //               type="button"
// // //               className={`btn ${
// // //                 selectedDateOption === "Yesterday"
// // //                   ? "btn-primary"
// // //                   : "btn-outline-primary"
// // //               }`}
// // //               onClick={() => {
// // //                 setSelectedDateOption("Yesterday");
// // //                 setAnotherDate("");
// // //                 fetchDataForSelectedDate("Yesterday");
// // //               }}
// // //             >
// // //               Yesterday
// // //             </button>
// // //             <button
// // //               type="button"
// // //               className={`btn ${
// // //                 selectedDateOption === "Another Day"
// // //                   ? "btn-primary"
// // //                   : "btn-outline-primary"
// // //               }`}
// // //               onClick={() => {
// // //                 setSelectedDateOption("Another Day");
// // //               }}
// // //             >
// // //               Another Day
// // //             </button>
// // //           </div>

// // //           {selectedDateOption === "Another Day" && (
// // //             <input
// // //               type="date"
// // //               className="form-control d-inline-block mx-2 mt-2"
// // //               value={anotherDate}
// // //               onChange={(e) => {
// // //                 setAnotherDate(e.target.value);
// // //                 setSelectedIds([]);
// // //                 fetchDataForSelectedDate("Another Day", e.target.value);
// // //               }}
// // //             />
// // //           )}
// // //         </div>
// // //       )}

// // //       {action === "list" && filteredEntryList.length !== 0 && (
// // //         <CheckBoxHeaders
// // //           showInList={showInList}
// // //           onListCheckBoxClick={handleListCheckBoxClick}
// // //         />
// // //       )}

// // //       {action === "list" && (
// // //         // && selectedIds.length > 0
// // //         <div className="text-center my-3">
// // //           <div className="text-center my-3">
// // //             <button
// // //               className="btn btn-success mx-1"
// // //               onClick={handleDeliverButtonClick}
// // //               disabled={selectedIds.length === 0}
// // //             >
// // //               Delivered
// // //             </button>

// // //             <button
// // //               className="btn btn-warning mx-1"
// // //               onClick={handleKhadaButtonClick}
// // //               disabled={selectedIds.length === 0}
// // //             >
// // //               Khada
// // //             </button>

// // //             <button
// // //               className="btn btn-secondary mx-1"
// // //               onClick={handleChangeButtonClick}
// // //               disabled={selectedIds.length !== 1}
// // //             >
// // //               Change
// // //             </button>
// // //           </div>

// // //           {latestUpdatedDate !== null ? (
// // //             <div className="text-sm text-red-600 font-semibold mt-2">
// // //               Last updated: {latestUpdatedDate.toLocaleString()}
// // //             </div>
// // //           ) : (
// // //             <div className="text-sm text-gray-500 mt-2">
// // //               No entries available
// // //             </div>
// // //           )}
// // //         </div>
// // //       )}

// // //       {action === "list" && filteredEntryList.length !== 0 && (
// // //         <div className="row my-2 mx-auto p-1">
// // //           <div className="col-1">
// // //             <input
// // //               type="checkbox"
// // //               checked={
// // //                 selectedIds.length > 0 &&
// // //                 selectedIds.length === filteredEntryList.length
// // //               }
// // //               onChange={(ev) => {
// // //                 if (ev.target.checked) {
// // //                   setSelectedIds(filteredEntryList.map((entry) => entry._id));
// // //                 } else {
// // //                   setSelectedIds([]);
// // //                 }
// // //               }}
// // //             />
// // //           </div>
// // //           <div className="col-1">
// // //             <a
// // //               href="#"
// // //               onClick={() => {
// // //                 handleSrNoClick();
// // //               }}
// // //             >
// // //               SN.{" "}
// // //               {sortedField == "updateDate" && direction && (
// // //                 <i className="bi bi-arrow-up"></i>
// // //               )}
// // //               {sortedField == "updateDate" && !direction && (
// // //                 <i className="bi bi-arrow-down"></i>
// // //               )}
// // //             </a>
// // //           </div>
// // //           <ListHeaders
// // //             showInList={showInList}
// // //             sortedField={sortedField}
// // //             direction={direction}
// // //             onHeaderClick={handleHeaderClick}
// // //           />
// // //           <div className="col-1">&nbsp;</div>
// // //         </div>
// // //       )}
// // //       {(action == "add" || action == "update") && (
// // //         <div className="row">
// // //           <AdminDailyEntryForm
// // //             entrySchema={entrySchema}
// // //             entryValidations={entryValidations}
// // //             emptyEntry={emptyEntry}
// // //             selectedEntity={selectedEntity}
// // //             userToBeEdited={userToBeEdited}
// // //             action={action}
// // //             flagFormInvalid={flagFormInvalid}
// // //             onFormSubmit={handleFormSubmit}
// // //             onFormCloseClick={handleFormCloseClick}
// // //             onFormTextChangeValidations={handleFormTextChangeValidations}
// // //           />
// // //         </div>
// // //       )}
// // //       {showChangeModal && (
// // //         <ChangeQtyModal
// // //           user={modalUser}
// // //           qty={modalQty}
// // //           onQtyChange={(e) => setModalQty(e.target.value)}
// // //           onSave={handleModalQtySubmit}
// // //           onClose={() => setShowChangeModal(false)}
// // //         />
// // //       )}

// // //       {action === "list" &&
// // //         filteredEntryList.length !== 0 &&
// // //         filteredEntryList.map((e, index) => (
// // //           <div
// // //             className={`row mx-auto 	mt-2 my-1 ${
// // //               e.entry_status === "Delivered"
// // //                 ? "bg-success bg-opacity-25"
// // //                 : e.entry_status === "Change"
// // //                 ? "bg-warning bg-opacity-25"
// // //                 : e.entry_status === "Khada"
// // //                 ? "bg-secondary bg-opacity-25"
// // //                 : ""
// // //             }`}
// // //             key={index}
// // //           >
// // //             <div className="col-1 d-flex align-items-center">
// // //               <input
// // //                 type="checkbox"
// // //                 checked={selectedIds.includes(e._id)}
// // //                 onChange={(ev) => {
// // //                   if (ev.target.checked) {
// // //                     setSelectedIds((prev) => [...prev, e._id]);
// // //                   } else {
// // //                     setSelectedIds((prev) => prev.filter((id) => id !== e._id));
// // //                   }
// // //                 }}
// // //               />
// // //             </div>
// // //             <div className="col-11">
// // //               <Entity
// // //                 entity={e}
// // //                 index={index}
// // //                 sortedField={sortedField}
// // //                 direction={direction}
// // //                 listSize={filteredEntryList.length}
// // //                 selectedEntity={selectedEntity}
// // //                 showInList={showInList}
// // //                 VITE_API_URL={import.meta.env.VITE_API_URL}
// // //                 onEditButtonClick={handleEditButtonClick}
// // //                 onDeleteButtonClick={handleDeleteButtonClick}
// // //                 onToggleText={handleToggleText}
// // //               />
// // //             </div>
// // //           </div>
// // //         ))}

// // //       {flagImport && (
// // //         <ModalImport
// // //           modalText={"Summary of Bulk Import"}
// // //           additions={recordsToBeAdded}
// // //           updations={recordsToBeUpdated}
// // //           btnGroup={["Yes", "No"]}
// // //           onModalCloseClick={handleModalCloseClick}
// // //           onModalButtonCancelClick={handleModalCloseClick}
// // //           onImportButtonClick={handleImportButtonClick}
// // //         />
// // //       )}
// // //     </>
// // //   );
// // // }
