import { useEffect, useState } from "react";
import {
  CommonUtilityBar,
  CheckBoxHeaders,
  ListHeaders,
  Entity,
} from "../external/vite-sdk";
import MilkRateForm from "./MilkRateForm";
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

export default function MilkRates(props) {
  let [milkrateList, setMilkRateList] = useState([]);
  let [filteredMilkRateList, setFilteredMilkRateList] = useState([]);
  let [areaList, setAreaList] = useState([]);  
  let [action, setAction] = useState("list");
  let [milkrateToBeEdited, setMilkRateToBeEdited] = useState("");
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

  let milkrateSchema = [
    { attribute: "rate", type: "normal", show: true, name: "Rate" }, 
    { attribute: "from", type: "normal", show: true, name: "From Date" }, 
  ];

  let milkrateValidations = {
    rate: { message: "", onlyDigits: true },
    from: { message: "" },
  };

  let [showInList, setShowInList] = useState(getShowInList(milkrateSchema));

  let [emptyMilkRate, setEmptyMilkRate] = useState({
    rate: "",
    from: "",
  });

  useEffect(() => {
    getData();
  }, []);

  async function getData() {
    setFlagLoad(true);
    try {
      let response = await axios(import.meta.env.VITE_API_URL + "/milkrates");
      let allMilkRates = await response.data;

      let pList = allMilkRates;
      let cList = [];
      try {
        response = await axios(import.meta.env.VITE_API_URL + "/areas");
        cList = await response.data;
      } catch (areaError) {
        console.warn("Could not fetch areas:", areaError);
      }


      pList = pList.sort(
        (a, b) => new Date(b.updateDate || 0) - new Date(a.updateDate || 0) 
      );

      pList.forEach((milkrate) => {
      
        if (milkrate.areaId && cList.length > 0) { 
          for (let i = 0; i < cList.length; i++) {
            if (milkrate.areaId === cList[i]._id) {
              milkrate.area = cList[i].name;
              break;
            }
          }
        }
        milkrate.rate = milkrate.rate || "";
        milkrate.from = milkrate.from || "";
      });

      setMilkRateList(pList);
      setFilteredMilkRateList(pList);
      setAreaList(cList);
    } catch (error) {
      console.error("Error in getData:", error);
      showMessage("Something went wrong, refresh the page");
    }
    setFlagLoad(false);
  }

  async function handleFormSubmit(formDataFromMilkRateForm) {
    let message;
    let milkrateForBackEnd;

    if (action === "add") {
      milkrateForBackEnd = {
        ...emptyMilkRate, 
        ...formDataFromMilkRateForm, 
        addDate: new Date(),
        updateDate: new Date(),
      
      };
    } else if (action === "update") {
      milkrateForBackEnd = {
        ...milkrateToBeEdited, 
        ...formDataFromMilkRateForm, 
        updateDate: new Date(),
        _id: milkrateToBeEdited._id, 
      };
    }

    for (let key in milkrateForBackEnd) {
      milkrateSchema.forEach((e) => {
        if (key === e.attribute && e.relationalData) {
          delete milkrateForBackEnd[key];
        }
      });
    }

    if (action === "add") {
      setFlagLoad(true);
      try {
        let response = await axios.post(
          import.meta.env.VITE_API_URL + "/milkrates",
          milkrateForBackEnd,
          { headers: { "Content-type": "multipart/form-data" } }
        );
        let addedMilkRate = await response.data;

        const sourceDataForMerge = action === "add" ? milkrateForBackEnd : milkrateToBeEdited;

        if (sourceDataForMerge.areaId && areaList.length > 0) {
            const areaObj = areaList.find((a) => a._id === sourceDataForMerge.areaId);
            if (areaObj) {
                addedMilkRate.area = areaObj.name;
            }
        }
        
        addedMilkRate.rate = addedMilkRate.rate || formDataFromMilkRateForm.rate;
        addedMilkRate.from = addedMilkRate.from || formDataFromMilkRateForm.from;


        message = "Milk Rate entry added successfully.";
        let prList = [...milkrateList];
        prList.push(addedMilkRate);
        prList = prList.sort(
          (a, b) => new Date(b.updateDate || 0) - new Date(a.updateDate || 0)
        );
        setMilkRateList(prList);
        setFilteredMilkRateList(prList); 
        showMessage(message);
        setAction("list");
      } catch (error) {
        console.error("Submission error:", error);
        showMessage("Something went wrong, refresh the page");
      }
      setFlagLoad(false);
    } else if (action === "update") {
      milkrateForBackEnd._id = milkrateToBeEdited._id; 

      setFlagLoad(true);
      try {
        let response = await axios.put(
          import.meta.env.VITE_API_URL + "/milkrates",
          milkrateForBackEnd,
          { headers: { "Content-type": "multipart/form-data" } }
        );
        let updatedMilkRate = await response.data; 

        if (updatedMilkRate.areaId && areaList.length > 0) {
          let areaObj = areaList.find((a) => a._id === updatedMilkRate.areaId);
          if (areaObj) {
            updatedMilkRate.area = areaObj.name;
          }
        }
        updatedMilkRate.rate = updatedMilkRate.rate || formDataFromMilkRateForm.rate;
        updatedMilkRate.from = updatedMilkRate.from || formDataFromMilkRateForm.from;


        message = "Milk Rate entry updated successfully.";
        let prList = milkrateList.map((e) => {
          if (e._id === updatedMilkRate._id) return updatedMilkRate;
          return e;
        });
        prList = prList.sort(
          (a, b) => new Date(b.updateDate || 0) - new Date(a.updateDate || 0)
        );
        setMilkRateList(prList);

        let fprList = filteredMilkRateList.map((e) => {
          if (e._id === updatedMilkRate._id) return updatedMilkRate;
          return e;
        });
        fprList = fprList.sort(
          (a, b) => new Date(b.updateDate || 0) - new Date(a.updateDate || 0)
        );
        setFilteredMilkRateList(fprList);

        showMessage(message);
        setAction("list"); 
      } catch (error) {
        console.error("Update error:", error);
        showMessage("Something went wrong, refresh the page");
      }
    }
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

  function handleEditButtonClick(milkrate) {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayFormatted = `${year}-${month}-${day}`;

    let safeMilkRate = {
      rate: milkrate.rate || "",
      from: milkrate.from || todayFormatted,
    };
    setAction("update");
    setMilkRateToBeEdited(safeMilkRate);
  }

  function showMessage(message) {
    setMessage(message);
    window.setTimeout(() => {
      setMessage("");
    }, 3000);
  }
  function handleDeleteButtonClick(ans, milkrate) {
    if (ans === "No") {
      showMessage("Delete operation cancelled");
      return;
    }
    if (ans === "Yes") {
      performDeleteOperation(milkrate);
    }
  }
  async function performDeleteOperation(milkrate) {
    setFlagLoad(true);
    try {
      await axios.delete(
        import.meta.env.VITE_API_URL + "/milkrates/" + milkrate._id
      );
      message = `Milk Rate entry deleted successfully.`;
      let prList = milkrateList.filter((e) => e._id !== milkrate._id);
      setMilkRateList(prList);

      let fprList = filteredMilkRateList.filter((e) => e._id !== milkrate._id);
      setFilteredMilkRateList(fprList);
      showMessage(message);
    } catch (error) {
      console.error("Delete error:", error);
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
    let list = [...filteredMilkRateList];
    setDirection(d);
    if (d === false) { 
      list.sort((a, b) => {
        const valA = a[field] || '';
        const valB = b[field] || '';
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
        const valA = a[field] || '';
        const valB = b[field] || '';
        if (valA < valB) {
          return 1;
        }
        if (valA > valB) {
          return -1;
        }
        return 0;
      });
    }
    setFilteredMilkRateList(list);
    setSortedField(field);
  }

  function handleSrNoClick() {
    let d = false;
    if (sortedField === "updateDate") {
      d = !direction;
    } else {
      d = false;
    }

    let list = [...filteredMilkRateList];
    setDirection(!direction);
    if (d === false) { 
      list.sort((a, b) => {
        if (new Date(a["updateDate"] || 0) > new Date(b["updateDate"] || 0)) {
          return 1;
        }
        if (new Date(a["updateDate"] || 0) < new Date(b["updateDate"] || 0)) {
          return -1;
        }
        return 0;
      });
    } else { 
      list.sort((a, b) => {
        if (new Date(a["updateDate"] || 0) < new Date(b["updateDate"] || 0)) {
          return 1;
        }
        if (new Date(a["updateDate"] || 0) > new Date(b["updateDate"] || 0)) {
          return -1;
        }
        return 0;
      });
    }
    setFilteredMilkRateList(list);
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
      setFilteredMilkRateList(milkrateList);
      return;
    }
    let searchedMilkRates = [];
    searchedMilkRates = filterByShowInListAttributes(query);
    setFilteredMilkRateList(searchedMilkRates);
  }
  function filterByShowInListAttributes(query) {
    let fList = [];
    for (let i = 0; i < milkrateList.length; i++) {
      for (let j = 0; j < showInList.length; j++) {
        if (showInList[j].show && milkrateList[i][showInList[j].attribute] !== undefined && milkrateList[i][showInList[j].attribute] !== null) {
          let parameterName = showInList[j].attribute;
          if (
            milkrateList[i][parameterName]
              .toString()
              .toLowerCase()
              .includes(query.toLowerCase())
          ) {
            fList.push(milkrateList[i]);
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
      let result = analyseImportExcelSheet(jsonData, milkrateList);
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
          "milkrates",
          milkrateList,
          import.meta.env.VITE_API_URL
        );
        if (result.success) {
          setMilkRateList(result.updatedList);
          setFilteredMilkRateList(result.updatedList);
        }
        showMessage(result.message);
      }
      if (recordsToBeUpdated.length > 0) {
        result = await recordsUpdateBulk(
          recordsToBeUpdated,
          "milkrates",
          milkrateList,
          import.meta.env.VITE_API_URL
        );
        if (result.success) {
          setMilkRateList(result.updatedList);
          setFilteredMilkRateList(result.updatedList);
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

  return (
    <>
      <CommonUtilityBar
        action={action}
        message={message}
        selectedEntity={selectedEntity}
        flagToggleButton={flagToggleButton}
        filteredList={filteredMilkRateList}
        mainList={milkrateList}
        showInList={showInList} 
        onListClick={handleListClick}
        onAddEntityClick={handleAddEntityClick}
        onSearchKeyUp={handleSearchKeyUp}
        onExcelFileUploadClick={handleExcelFileUploadClick}
        onClearSelectedFile={handleClearSelectedFile}
      />

      {filteredMilkRateList.length === 0 && milkrateList.length !== 0 && (
        <div className="text-center">Nothing to show</div>
      )}
      {milkrateList.length === 0 && (
        <div className="text-center">List is empty</div>
      )}
      {action === "list" && filteredMilkRateList.length !== 0 && (
        <CheckBoxHeaders
          showInList={showInList} 
          onListCheckBoxClick={handleListCheckBoxClick}
        />
      )}
      {action === "list" && filteredMilkRateList.length !== 0 && (
        <div className="row   my-2 mx-auto   p-1">
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
          <MilkRateForm
            milkrateValidations={{
              rate: milkrateValidations.rate,
              from: milkrateValidations.from
            }}
            emptyMilkRate={{
                rate: emptyMilkRate.rate,
                from: emptyMilkRate.from
            }} 
            areaList={areaList} 
            selectedEntity={selectedEntity}
            milkrateToBeEdited={milkrateToBeEdited}
            action={action}
            flagFormInvalid={flagFormInvalid}
            onFormSubmit={handleFormSubmit}
            onFormCloseClick={handleFormCloseClick}
            onFormTextChangeValidations={handleFormTextChangeValidations}
          />
        </div>
      )}
      {action === "list" &&
        filteredMilkRateList.length !== 0 &&
        filteredMilkRateList.map((e, index) => (
          <Entity
            entity={e}
            key={index + 1}
            index={index}
            sortedField={sortedField}
            direction={direction}
            listSize={filteredMilkRateList.length}
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

