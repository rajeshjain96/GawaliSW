import { useEffect, useState } from "react";
import {
  CommonUtilityBar,
  CheckBoxHeaders,
  ListHeaders,
  Entity,
} from "../external/vite-sdk";
import AdminAreaForm from "./AdminAreaForm";
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

export default function AdminAreas(props) {
  let [areaList, setAreaList] = useState([]);
  let [productList, setProductList] = useState([]);
  let [action, setAction] = useState("list");
  let [filteredAreaList, setFilteredAreaList] = useState([]);
  let [areaToBeEdited, setAreaToBeEdited] = useState("");
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
  let [cntShow, setCntShow] = useState(window.maxCnt); // Initially 5 attributes are shown

  let { selectedEntity } = props;
  let { flagFormInvalid } = props;
  let { flagToggleButton } = props;
  let { user } = props;
  let areaSchema = [
    { attribute: "name", type: "normal" },
    { attribute: "description", type: "normal" },
  ];
  let areaValidations = {
    name: { message: "", mxLen: 200, mnLen: 4, onlyDigits: false },
    description: { message: "" },
  };
  let [showInList, setShowInList] = useState(
    getShowInList(areaSchema, cntShow)
  );
  let [emptyArea, setEmptyArea] = useState(getEmptyObject(areaSchema));

  function getShowInListFromAreaSchema() {
    let list = [];
    let cnt = 0;
    areaSchema.forEach((e, index) => {
      let obj = {};
      if (e.type != "relationalId" && e.type != "array") {
        // do not show id of relational data and "array" is sort of sub-collection
        obj["attribute"] = e.attribute;
        if (cnt < 5) {
          obj["show"] = true;
        } else {
          obj["show"] = false;
        }
        obj["type"] = e.type;
        if (e.type == "singleFile") {
          obj["allowedFileType"] = e.allowedFileType;
        }
        if (e.type == "text-area") {
          obj["flagReadMore"] = false;
        }
        cnt++;
        list.push(obj);
      }
    });
    return list;
  }
  function getEmptyArea() {
    let eArea = {};
    areaSchema.forEach((e, index) => {
      if (e["defaultValue"]) {
        eArea[e["attribute"]] = e["defaultValue"];
      } else {
        eArea[e["attribute"]] = "";
      }
    });
    return eArea;
  }
  useEffect(() => {
    getData();
  }, []);
  async function getData() {
    setFlagLoad(true);
    try {
      let response = await axios(import.meta.env.VITE_API_URL + "/areas");
      let eList = await response.data;
      response = await axios(import.meta.env.VITE_API_URL + "/products");
      let pList = await response.data;
      // In the areaList, add a parameter - product
      eList.forEach((area) => {
        // get area (string) from areaId
        for (let i = 0; i < pList.length; i++) {
          if (area.productId == pList[i]._id) {
            area.product = pList[i].name;
            break;
          }
        } //for
      });
      setAreaList(eList);
      setFilteredAreaList(eList);
      setProductList(pList);
    } catch (error) {
      showMessage("Something went wrong, refresh the page");
    }
    setFlagLoad(false);
  }
  async function handleFormSubmit(area) {
    // always add user
    area.user = user.name;
    let message;
    // now remove relational data
    let areaForBackEnd = { ...area };
    for (let key in areaForBackEnd) {
      areaSchema.forEach((e, index) => {
        if (key == e.attribute && e.relationalData) {
          delete areaForBackEnd[key];
        }
      });
    }
    if (action == "add") {
      setFlagLoad(true);
      try {
        let response = await axios.post(
          import.meta.env.VITE_API_URL + "/areas",
          areaForBackEnd,
          { headers: { "Content-type": "multipart/form-data" } }
        );
        area = response.data; // received record with _id
        message = "Area added successfully";
        // update the area list now.
        let prList = [...areaList];
        prList.push(area);
        setAreaList(prList);
        let fprList = [...filteredAreaList];
        fprList.push(area);
        setFilteredAreaList(fprList);
        showMessage(message);
        setAction("list");
      } catch (error) {
        showMessage("Something went wrong, refresh the page");
      }
      setFlagLoad(false);
    } //...add
    else if (action == "update") {
      area._id = areaToBeEdited._id; // The form does not have id field
      setFlagLoad(true);
      try {
        let response = await axios.put(
          import.meta.env.VITE_API_URL + "/areas",
          area,
          { headers: { "Content-type": "multipart/form-data" } }
        );
        let r = await response.data;
        message = "Area Updated successfully";
        // update the area list now.
        let prList = areaList.map((e, index) => {
          if (e._id == area._id) return area;
          return e;
        });
        let fprList = filteredAreaList.map((e, index) => {
          if (e._id == area._id) return area;
          return e;
        });
        setAreaList(prList);
        setFilteredAreaList(fprList);
        showMessage(message);
        setAction("list");
      } catch (error) {
        console.log(error);

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
  function handleEditButtonClick(area) {
    setAction("update");
    setAreaToBeEdited(area);
  }
  function showMessage(message) {
    setMessage(message);
    window.setTimeout(() => {
      setMessage("");
    }, 3000);
  }
  function handleDeleteButtonClick(ans, area) {
    // await deleteBackendArea(area.id);
    if (ans == "No") {
      // delete operation cancelled
      showMessage("Delete operation cancelled");
      return;
    }
    if (ans == "Yes") {
      // delete operation allowed
      performDeleteOperation(area);
    }
  }
  async function performDeleteOperation(area) {
    try {
      let response = await axios.delete(
        import.meta.env.VITE_API_URL + "/areas/" + area._id
      );
      let r = await response.data;
      message = `Area - ${area.name} deleted successfully.`;
      //update the area list now.
      let prList = areaList.filter((e, index) => e._id != area._id);
      setAreaList(prList);

      let fprList = areaList.filter((e, index) => e._id != area._id);
      setFilteredAreaList(fprList);
      showMessage(message);
    } catch (error) {
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
    if (cnt == window.maxCnt && checked) {
      showMessage("Maximum " + window.maxCnt + " fields can be selected.");
      return;
    }
    let att = [...showInList];
    let a = att.map((e, index) => {
      let p = { ...e };
      if (index == selectedIndex && checked) {
        p.show = true;
        setCntShow(cnt + 1);
      } else if (index == selectedIndex && !checked) {
        p.show = false;
        setCntShow(cnt - 1);
      }
      return p;
    });
    // sEntity.attributes = a;
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
    let list = [...filteredAreaList];
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
    setFilteredAreaList(list);
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

    let list = [...filteredAreaList];
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
    setFilteredAreaList(list);
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
      setFilteredAreaList(areaList);
      return;
    }
    let searchedAreas = [];
    searchedAreas = filterByShowInListAttributes(query);
    setFilteredAreaList(searchedAreas);
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
    for (let i = 0; i < areaList.length; i++) {
      for (let j = 0; j < showInList.length; j++) {
        if (showInList[j].show) {
          let parameterName = showInList[j].attribute;
          if (
            areaList[i][parameterName] &&
            areaList[i][parameterName]
              .toLowerCase()
              .includes(query.toLowerCase())
          ) {
            fList.push(areaList[i]);
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
      let result = analyseImportExcelSheet(jsonData, areaList);
      if (result.message) {
        showMessage(result.message);
      } else {
        showImportAnalysis(result);
      }
      // analyseSheetData(jsonData, productList);
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
          "areas",
          areaList,
          import.meta.env.VITE_API_URL
        );
        if (result.success) {
          setAreaList(result.updatedList);
          setFilteredAreaList(result.updatedList);
        }
        showMessage(result.message);
      }
      if (recordsToBeUpdated.length > 0) {
        result = await recordsUpdateBulk(
          recordsToBeUpdated,
          "areas",
          areaList,
          import.meta.env.VITE_API_URL
        );
        if (result.success) {
          setAreaList(result.updatedList);
          setFilteredAreaList(result.updatedList);
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
        filteredList={filteredAreaList}
        mainList={areaList}
        showInList={showInList}
        onListClick={handleListClick}
        onAddEntityClick={handleAddEntityClick}
        onSearchKeyUp={handleSearchKeyUp}
        onExcelFileUploadClick={handleExcelFileUploadClick}
        onClearSelectedFile={handleClearSelectedFile}
      />
      {filteredAreaList.length == 0 && areaList.length != 0 && (
        <div className="text-center">Nothing to show</div>
      )}
      {areaList.length == 0 && <div className="text-center">List is empty</div>}
      {(action == "add" || action == "update") && (
        <div className="row">
          <AdminAreaForm
            areaSchema={areaSchema}
            areaValidations={areaValidations}
            emptyArea={emptyArea}
            productList={productList}
            selectedEntity={selectedEntity}
            areaToBeEdited={areaToBeEdited}
            action={action}
            flagFormInvalid={flagFormInvalid}
            onFormSubmit={handleFormSubmit}
            onFormCloseClick={handleFormCloseClick}
            onFormTextChangeValidations={handleFormTextChangeValidations}
          />
        </div>
      )}
      {action == "list" && filteredAreaList.length != 0 && (
        <CheckBoxHeaders
          showInList={showInList}
          cntShow={cntShow}
          onListCheckBoxClick={handleListCheckBoxClick}
        />
      )}
      {action == "list" && filteredAreaList.length != 0 && (
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
            cntShow={cntShow}
            onHeaderClick={handleHeaderClick}
          />
          <div className="col-1">&nbsp;</div>
        </div>
      )}
      {action == "list" &&
        filteredAreaList.length != 0 &&
        filteredAreaList.map((e, index) => (
          <Entity
            entity={e}
            key={index + 1}
            index={index}
            user={user}
            sortedField={sortedField}
            direction={direction}
            listSize={filteredAreaList.length}
            selectedEntity={selectedEntity}
            showInList={showInList}
            cntShow={cntShow}
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
