import { useEffect, useState } from "react";
import {
  CommonUtilityBar,
  CheckBoxHeaders,
  ListHeaders,
  Entity
} from "../external/vite-sdk";
import AdminCustomerForm from "./AdminCustomerForm";
import { BeatLoader } from "react-spinners";
import axios from "axios";

export default function AdminCustomers(props) {
  let [customerList, setCustomerList] = useState([]);
  let [action, setAction] = useState("list");
  let [filteredCustomerList, setFilteredCustomerList] = useState([]);
  let [customerToBeEdited, setCustomerToBeEdited] = useState("");
  let [flagLoad, setFlagLoad] = useState(false);
  let [message, setMessage] = useState("");
  let [searchText, setSearchText] = useState("");
  let [sortedField, setSortedField] = useState("");
  let [direction, setDirection] = useState("");
  let { selectedEntity } = props;
  let { flagFormInvalid } = props;
  let { flagToggleButton } = props;
  let customerSchema = [
    { attribute: "name" },
    { attribute: "emailId" },
    { attribute: "mobileNumber" },
    { attribute: "address" },
    { attribute: "companyName" },
    { attribute: "designation" },
  ];
  let customerValidations = {
    name: { message: "", mxLen: 80, mnLen: 4, onlyDigits: false },
    emailId: { message: "", onlyDigits: false },
    mobileNumber: {
      message: "",
      mxLen: 10,
      mnLen: 10,
      onlyDigits: true,
    },
    address: { message: "" },
    companyName: { message: "" },
    designation: { message: "" },
  };
  let [showInList, setShowInList] = useState(getShowInListFromCustomerSchema());
  let [emptyCustomer, setEmptyCustomer] = useState(getEmptyCustomer());
  function getShowInListFromCustomerSchema() {
    let list = [];
    let cnt = 0;
    customerSchema.forEach((e, index) => {
      let obj = {};
      if (e.type != "relationalId") {
        obj["attribute"] = e.attribute;
        if (cnt < 5) {
          obj["show"] = true;
        } else {
          obj["show"] = false;
        }
        cnt++;
        list.push(obj);
      }
    });
    return list;
  }
  function getEmptyCustomer() {
    let eCustomer = {};
    customerSchema.forEach((e, index) => {
      if (e["defaultValue"]) {
        eCustomer[e["attribute"]] = e["defaultValue"];
      } else {
        eCustomer[e["attribute"]] = "";
      }
    });
    return eCustomer;
  }
  function getFileListFromCustomerSchema() {
    let list = [];
    customerSchema.forEach((e, index) => {
      let obj = {};
      if (e.type == "file") {
        obj["fileAttributeName"] = e.attribute;
        list.push(obj);
      }
    });
    return list;
  }
  useEffect(() => {
    getData();
  }, []);
  async function getData() {
    setFlagLoad(true);
    try {
      let response = await axios(import.meta.env.VITE_API_URL + "/customers");
      let cList = await response.data;

      setCustomerList(cList);
      setFilteredCustomerList(cList);
    } catch (error) {
      showMessage("Something went wrong, refresh the page");
    }
    setFlagLoad(false);
  }
  async function handleFormSubmit(customer) {
    let message;
    let customerForBackEnd = { ...customer };
    for (let key in customerForBackEnd) {
      customerSchema.forEach((e, index) => {
        if (key == e.attribute && e.relationalData) {
          delete customerForBackEnd[key];
        }
      });
    }
    if (action == "add") {
      setFlagLoad(true);
      try {
        let response = await axios.post(
          import.meta.env.VITE_API_URL + "/customers",
          customerForBackEnd,
          { headers: { "Content-type": "multipart/form-data" } }
        );
        customer._id = await response.data.insertedId;
        message = "Customer added successfully";
        let prList = [...customerList];
        prList.push(customer);
        setCustomerList(prList);
        let fprList = [...filteredCustomerList];
        fprList.push(customer);
        setFilteredCustomerList(fprList);
        showMessage(message);
        setAction("list");
      } catch (error) {
        showMessage("Something went wrong, refresh the page");
      }

      setFlagLoad(false);
    } else if (action == "update") {
      customer._id = customerToBeEdited._id;  
      // await updateBackendCustomer(customer);
      setFlagLoad(true);
      try {
        let response = await axios.put(
          import.meta.env.VITE_API_URL + "/customers",
          customer,
          { headers: { "Content-type": "multipart/form-data" } }
        );
        let r = await response.data;
        message = "Customer Updated successfully";
        let prList = customerList.map((e, index) => {
          if (e._id == customer._id) return customer;
          return e;
        });
        let fprList = filteredCustomerList.map((e, index) => {
          if (e._id == customer._id) return customer;
          return e;
        });
        setCustomerList(prList);
        setFilteredCustomerList(fprList);
        showMessage(message);
        setAction("list");
      } catch (error) {
        showMessage("Something went wrong, refresh the page");
      }
      setFlagLoad(false);
    }
  }
  function handleFormCloseClick() {
    setAction("list");
  }
  function handleListClick() {
    setAction("list");
  }
  function handleAddEntityClick() {
    setAction("add");
  }
  function handleEditButtonClick(customer) {
    setAction("update");
    setCustomerToBeEdited(customer);
  }
  function showMessage(message) {
    setMessage(message);
    window.setTimeout(() => {
      setMessage("");
    }, 3000);
  }
  async function handleDeleteButtonClick(ans, customer) {
    // await deleteBackendCustomer(customer.id);
    setFlagLoad(true);
    try {
      let response = await axios.delete(
        import.meta.env.VITE_API_URL + "/customers/" + customer._id
      );
      let r = await response.data;
      message = `Customer - ${customer.name} deleted successfully.`;
      let prList = customerList.filter((e, index) => e._id != customer._id);
      setCustomerList(prList);

      let fprList = customerList.filter((e, index) => e._id != customer._id);
      setFilteredCustomerList(fprList);
      showMessage(message);
    } catch (error) {
      showMessage("Something went wrong, refresh the page");
    }
    setFlagLoad(false);
  }
  function handleListCheckBoxClick(checked, selectedIndex) {
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
      d = !direction;
    } else {
      d = false;
    }
    let list = [...filteredCustomerList];
    setDirection(d);
    if (d == false) {
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
    setFilteredCustomerList(list);
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

    let list = [...filteredCustomerList];
    setDirection(!direction);
    if (d == false) {
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
    // setSelectedList(list);
    setFilteredCustomerList(list);
    setSortedField("updateDate");
  }
  function handleFormTextChangeValidations(message, index) {
    props.onFormTextChangeValidations(message, index);
  }
  function handleFileUploadChange(file, index) {
    props.onFileUploadChange(file, index);
  }

  function handleSearchKeyUp(event) {
    let searchText = event.target.value;
    setSearchText(searchText);
    performSearchOperation(searchText);
  }
  function performSearchOperation(searchText) {
    let query = searchText.trim();
    if (query.length == 0) {
      setFilteredCustomerList(customerList);
      return;
    }
    let searchedCustomers = [];
    // searchedCustomers = filterByName(query);
    searchedCustomers = filterByShowInListAttributes(query);
    setFilteredCustomerList(searchedCustomers);
  }
  function filterByName(query) {
    let fList = [];
    // console.log(selectedEntity.attributes[0].showInList);

    for (let i = 0; i < selectedList.length; i++) {
      if (selectedList[i].name.toLowerCase().includes(query.toLowerCase())) {
        fList.push(selectedList[i]);
      }
    } //for
    return fList;
  }
  function filterByShowInListAttributes(query) {
    let fList = [];
    for (let i = 0; i < customerList.length; i++) {
      for (let j = 0; j < showInList.length; j++) {
        if (showInList[j].show) {
          let parameterName = showInList[j].attribute;
          if (
            customerList[i][parameterName] &&
            customerList[i][parameterName]
              .toLowerCase()
              .includes(query.toLowerCase())
          ) {
            fList.push(customerList[i]);
            break;
          }
        }
      } 
    } 
    return fList;
  }
  function handleChangeImageClick(index) {
    props.onChangeImageClick(index);
  }
  function handleChangeImageCancelClick(index) {
    props.onChangeImageCancelClick(index);
  }
  function handleFileChangeInUpdateMode(file, fileIndex) {
    let fl = [...fileList];
    fl[fileIndex]["newFileName"] = file.name;
    fl[fileIndex]["newFile"] = file;
    setFileList(fl);
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
        filteredList={filteredCustomerList}
        showInList={showInList}
        onListClick={handleListClick}
        onAddEntityClick={handleAddEntityClick}
        onSearchKeyUp={handleSearchKeyUp}
      />
      {filteredCustomerList.length == 0 && customerList.length != 0 && (
        <div className="text-center">Nothing to show</div>
      )}
      {customerList.length == 0 && action == "list" && (
        <div className="text-center">List is empty</div>
      )}
      {(action == "add" || action == "update") && (
        <div className="row">
          <AdminCustomerForm
            customerSchema={customerSchema}
            customerValidations={customerValidations}
            emptyCustomer={emptyCustomer}
            selectedEntity={selectedEntity}
            customerToBeEdited={customerToBeEdited}
            action={action}
            flagFormInvalid={flagFormInvalid}
            onFormSubmit={handleFormSubmit}
            onFormCloseClick={handleFormCloseClick}
            onFormTextChangeValidations={handleFormTextChangeValidations}
            onCancelFormButton={handleFormCloseClick}
          />
        </div>
      )}
      {action == "list" && filteredCustomerList.length != 0 && (
        <div className="row  my-2 mx-auto  p-1">
          {/* <div className="col-1">
            <a
              href="#"
              onClick={() => {
                handleSrNoClick();
              }}
            ></a>
          </div> */}
          {showInList.map((e, index) => (
            <div className="col-2" key={index}>
              <input
                type="checkbox"
                name=""
                id=""
                checked={showInList[index]["show"] == true}
                onChange={(e) => {
                  handleListCheckBoxClick(e.target.checked, index);
                }}
              />{" "}
              {e.attribute.charAt(0).toUpperCase() + e.attribute.slice(1)}
            </div>
          ))}
        </div>
      )}
      {action == "list" && filteredCustomerList.length != 0 && (
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
          {showInList.map(
            (e, index) =>
              e.show && (
                <div className={"col-2 "} key={index}>
                  <a
                    href="#"
                    className={
                      sortedField == e.attribute
                        ? " text-large text-danger"
                        : ""
                    }
                    onClick={() => {
                      handleHeaderClick(index);
                    }}
                  >
                    {e.attribute.charAt(0).toUpperCase() + e.attribute.slice(1)}{" "}
                    {sortedField == e.attribute && direction && (
                      <i className="bi bi-arrow-up"></i>
                    )}
                    {sortedField == e.attribute && !direction && (
                      <i className="bi bi-arrow-down"></i>
                    )}
                  </a>
                </div>
              )
          )}
          <div className="col-1">&nbsp;</div>
        </div>
      )}
      {action == "list" &&
        filteredCustomerList.length != 0 &&
        filteredCustomerList.map((e, index) => (
          <Entity
            entity={e}
            key={index + 1}
            index={index}
            sortedField={sortedField}
            direction={direction}
            listSize={filteredCustomerList.length}
            selectedEntity={selectedEntity}
            showInList={showInList}
            onEditButtonClick={handleEditButtonClick}
            onDeleteButtonClick={handleDeleteButtonClick}
          />
        ))}
    </>
  );
}
