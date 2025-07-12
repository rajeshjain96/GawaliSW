import { useEffect, useState } from "react";
import {
  CommonUtilityBar,
  CheckBoxHeaders,
  ListHeaders,
  Entity,
} from "../external/vite-sdk";
// import AdminProductForm from "./AdminProductForm";
import CustomerForm from "./CustomerForm";
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

export default function Customers(props) {
  let [productList, setProductList] = useState([]);
  let [filteredProductList, setFilteredProductList] = useState([]);
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
  
  let [recordsToBeAdded, setRecordsToBeAdded] = useState([]);
  let [recordsToBeUpdated, setRecordsToBeUpdated] = useState([]);
  let [cntUpdate, setCntUpdate] = useState(0);
  let [cntAdd, setCntAdd] = useState(0);
  let { selectedEntity } = props;
  let { flagFormInvalid } = props;
  let { flagToggleButton } = props;

  let customerSchema = [
    { attribute: "name", type: "normal" },
    {
      attribute: "category",
      type: "normal",
      relationalData: true,
      list: "categoryList",
      relatedId: "categoryId",
    },
    //changed
    { attribute: "status", type: "normal", defaultValue: "active" },
    { attribute: "emailId", type: "normal" },
    { attribute: "mobileNumber", type: "normal" },
    { attribute: "address", type: "normal" },
    { attribute: "daily_qty", type: "normal" },
    { attribute: "area", type: "normal" },
    { attribute: "start_date", type: "normal" },
    // {
    //   attribute: "role",
    //   type: "normal",
    //   relationalData: true,
    //   list: "roleList",
    //   relatedId: "roleId",
    // },
    // { attribute: "roleId", type: "relationalId" },
    //till here
    { attribute: "categoryId", type: "relationalId" },
    // { attribute: "price", type: "normal" },
    { attribute: "finalPrice", type: "normal" },
    // {
    //   attribute: "customerImage",
    //   type: "singleFile",
    //   allowedFileType: "image",
    //   allowedSize: 2,
    // },
    // { attribute: "info", type: "text-area" },
  ];
  let customerValidations = {
    name: { message: "", mxLen: 200, mnLen: 4, onlyDigits: false },
    // price: {
    //   message: "",
    // },
    
    
    finalPrice: {
      message: "",
      mxLen: 30,
      mnLen: 2,
      onlyDigits: true,
    },
    //changed
    // role: { message: "" },
    emailId: { message: "", onlyDigits: false },
    status: { message: "" },
    mobileNumber: {
      message: "",
      mxLen: 10,
      mnLen: 10,
      onlyDigits: true,
    },
    address: { message: "", mxLen: 200 },
    daily_qty: { message: "", onlyDigits: true },
    area: { message: "", mxLen: 50 },
    start_date: { message: "" },
    //till here
    // info: { message: "", mxLen: 1000, mnLen: 4, onlyDigits: false },
    // customerImage: { message: "" },
    category: { message: "" },
  };

  let [showInList, setShowInList] = useState(getShowInList(customerSchema));
  // let [emptyCustomer, setEmptyProduct] = useState({
  //   ...getEmptyObject(customerSchema),
  //   status: "active",     
  //   role: "",            
  // });
  let [emptyCustomer, setEmptyProduct] = useState({
    ...getEmptyObject(customerSchema),
    status: "active",
    // role: "",
    roleId: "68691372fa624c1dff2e06be",
    name: "",
    emailId: "",
    mobileNumber: "",
    address: "",
    daily_qty: "",
    area: "",
    start_date: "",
    finalPrice: "",
    // info: "",
    category: "",
    categoryId: "",
    // customerImage: ""
  });
  
  
  useEffect(() => {
    getData();
  }, []);
  async function getData() {
    setFlagLoad(true);
    try {
      let response = await axios(import.meta.env.VITE_API_URL + "/users");
let allUsers = await response.data;
// let pList = allUsers.filter((u) => u.role === "user"); //added by rutuja
const userRoleId = "68691372fa624c1dff2e06be";
let pList = allUsers.filter((u) => u.roleId === userRoleId);
      response = await axios(import.meta.env.VITE_API_URL + "/categories");
      let cList = await response.data;
      // Arrange products is sorted order as per updateDate
      pList = pList.sort(
        (a, b) => new Date(b.updateDate) - new Date(a.updateDate)
      );
      // In the productList, add a parameter - category
      pList.forEach((product) => {
        // get category (string) from categoryId
        for (let i = 0; i < cList.length; i++) {
          if (product.categoryId == cList[i]._id) {
            product.category = cList[i].name;
            break;
          }
        } //for
      });
      setProductList(pList);
      setFilteredProductList(pList);
      setCategoryList(cList);
    } catch (error) {
      showMessage("Something went wrong, refresh the page");
    }
    setFlagLoad(false);
  }
  async function handleFormSubmit(product) {
    let message;
    // now remove relational data
    let productForBackEnd = { ...product };
    for (let key in productForBackEnd) {
      customerSchema.forEach((e, index) => {
        if (key == e.attribute && e.relationalData) {
          delete productForBackEnd[key];
        }
      });
    }
    if (action == "add") {
      // product = await addProductToBackend(product);
      setFlagLoad(true);
      try {
        let response = await axios.post(
          import.meta.env.VITE_API_URL + "/users",
          productForBackEnd,
          { headers: { "Content-type": "multipart/form-data" } }
        );
        let addedProduct = await response.data; //returned  with id
        // This addedProduct has id, addDate, updateDate, but the relational data is lost
        // The original product has got relational data.
        for (let key in product) {
          customerSchema.forEach((e, index) => {
            if (key == e.attribute && e.relationalData) {
              addedProduct[key] = product[key];
            }
          });
        }
        message = "Customer added successfully";
        // update the product list now.
        let prList = [...productList];
        prList.push(addedProduct);
        prList = prList.sort(
          (a, b) => new Date(b.updateDate) - new Date(a.updateDate)
        );
        setProductList(prList);
        let fprList = [...filteredProductList];
        fprList.push(addedProduct);
        fprList = fprList.sort(
          (a, b) => new Date(b.updateDate) - new Date(a.updateDate)
        );
        setFilteredProductList(fprList);
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
      product._id = userToBeEdited._id; // The form does not have id field
      setFlagLoad(true);
      try {
        let response = await axios.put(
          import.meta.env.VITE_API_URL + "/users",
          productForBackEnd,
          { headers: { "Content-type": "multipart/form-data" } }
        );
        product = await response.data;
        console.log("product");
        console.log(product);
        message = "Product Updated successfully";
        // update the product list now.
        let prList = productList.map((e, index) => {
          if (e._id == product._id) return product;
          return e;
        });
        prList = prList.sort(
          (a, b) => new Date(b.updateDate) - new Date(a.updateDate)
        );
        let fprList = filteredProductList.map((e, index) => {
          if (e._id == product._id) return product;
          return e;
        });
        fprList = fprList.sort(
          (a, b) => new Date(b.updateDate) - new Date(a.updateDate)
        );
        setProductList(prList);
        setFilteredProductList(fprList);
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
  function handleEditButtonClick(product) {
    // setAction("update");
    // setUserToBeEdited(product);
    let safeProduct = {
      ...emptyCustomer,
      ...product,
      info: product.info || "",
    };
    setAction("update");
    setUserToBeEdited(safeProduct);
  }
  function showMessage(message) {
    setMessage(message);
    window.setTimeout(() => {
      setMessage("");
    }, 3000);
  }
  function handleDeleteButtonClick(ans, product) {
    if (ans == "No") {
      // delete operation cancelled
      showMessage("Delete operation cancelled");
      return;
    }
    if (ans == "Yes") {
      // delete operation allowed
      performDeleteOperation(product);
    }
  }
  async function performDeleteOperation(product) {
    setFlagLoad(true);
    try {
      let response = await axios.delete(
        import.meta.env.VITE_API_URL + "/users/" + product._id
      );
      let r = await response.data;
      message = `Product - ${product.name} deleted successfully.`;
      //update the product list now.
      let prList = productList.filter((e, index) => e._id != product._id);
      setProductList(prList);

      let fprList = productList.filter((e, index) => e._id != product._id);
      setFilteredProductList(fprList);
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
    let list = [...filteredProductList];
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
    setFilteredProductList(list);
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

    let list = [...filteredProductList];
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
    setFilteredProductList(list);
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
      setFilteredProductList(productList);
      return;
    }
    let searchedProducts = [];
    searchedProducts = filterByShowInListAttributes(query);
    setFilteredProductList(searchedProducts);
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
    for (let i = 0; i < productList.length; i++) {
      for (let j = 0; j < showInList.length; j++) {
        if (showInList[j].show) {
          let parameterName = showInList[j].attribute;
          if (
            productList[i][parameterName] &&
            productList[i][parameterName]
              .toLowerCase()
              .includes(query.toLowerCase())
          ) {
            fList.push(productList[i]);
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
      let result = analyseImportExcelSheet(jsonData, productList);
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
          "users",
          productList,
          import.meta.env.VITE_API_URL
        );
        if (result.success) {
          setProductList(result.updatedList);
          setFilteredProductList(result.updatedList);
        }
        showMessage(result.message);
      }
      if (recordsToBeUpdated.length > 0) {
        result = await recordsUpdateBulk(
          recordsToBeUpdated,
          "users",
          productList,
          import.meta.env.VITE_API_URL
        );
        if (result.success) {
          setProductList(result.updatedList);
          setFilteredProductList(result.updatedList);
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
        filteredList={filteredProductList}
        mainList={productList}
        showInList={showInList}
        onListClick={handleListClick}
        onAddEntityClick={handleAddEntityClick}
        onSearchKeyUp={handleSearchKeyUp}
        onExcelFileUploadClick={handleExcelFileUploadClick}
        onClearSelectedFile={handleClearSelectedFile}
      />

      {filteredProductList.length == 0 && productList.length != 0 && (
        <div className="text-center">Nothing to show</div>
      )}
      {productList.length == 0 && (
        <div className="text-center">List is empty</div>
      )}
      {action == "list" && filteredProductList.length != 0 && (
        <CheckBoxHeaders
          showInList={showInList}
          onListCheckBoxClick={handleListCheckBoxClick}
        />
      )}
      {action == "list" && filteredProductList.length != 0 && (
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
          <CustomerForm
            customerSchema={customerSchema}
            customerValidations={customerValidations}
            emptyCustomer={emptyCustomer}
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
        filteredProductList.length != 0 &&
        filteredProductList.map((e, index) => (
          <Entity
            entity={e}
            key={index + 1}
            index={index}
            sortedField={sortedField}
            direction={direction}
            listSize={filteredProductList.length}
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

// import { useEffect, useState } from "react";
// import {
//   CommonUtilityBar,
//   CheckBoxHeaders,
//   ListHeaders,
//   Entity,
// } from "../external/vite-sdk";
// import AdminUserForm from "./AdminUserForm";
// import { BeatLoader } from "react-spinners";
// import axios from "axios";
// import { getEmptyObject, getShowInList } from "../external/vite-sdk";

// export default function Customers(props) {
//   let [userList, setUserList] = useState([]);
//   let [roleList, setRoleList] = useState([]);
//   let [action, setAction] = useState("list");
//   let [filteredUserList, setFilteredUserList] = useState([]);
//   let [userToBeEdited, setUserToBeEdited] = useState("");
//   let [flagLoad, setFlagLoad] = useState(false);
//   let [message, setMessage] = useState("");
//   let [searchText, setSearchText] = useState("");
//   let [sortedField, setSortedField] = useState("");
//   let [direction, setDirection] = useState("");
//   let { selectedEntity } = props;
//   let { flagFormInvalid } = props;
//   let { flagToggleButton } = props;

//   let userSchema = [
//     { attribute: "name", type: "normal" },
//     {
//       attribute: "role",
//       type: "normal",
//       relationalData: true,
//       list: "roleList",
//       relatedId: "roleId",
//     },
//     { attribute: "roleId", type: "relationalId" },
//     { attribute: "status", type: "normal", defaultValue: "active" },
//     { attribute: "emailId", type: "normal" },
//     // { attribute: "password" },
//     { attribute: "mobileNumber", type: "normal" },
//     //added by Rutuja
//     { attribute: "address", type: "normal" },
//   { attribute: "daily_qty", type: "normal" },
//   { attribute: "area", type: "normal" },
//   { attribute: "start_date", type: "normal" },
//     // { attribute: "address" },
//   ];
//   let userValidations = {
//     name: { message: "", mxLen: 80, mnLen: 4, onlyDigits: false },
//     emailId: { message: "", onlyDigits: false },
//     status: { message: "" },
//     mobileNumber: {
//       message: "",
//       mxLen: 10,
//       mnLen: 10,
//       onlyDigits: true,
//     },
//     // address: { message: "" },
//     // password: { message: "" },
//     address: { message: "", mxLen: 200 },
//   daily_qty: { message: "", onlyDigits: true },
//   area: { message: "", mxLen: 50 },
//   start_date: { message: "" },
//     role: { message: "" },
//   };
//   let [showInList, setShowInList] = useState(getShowInList(userSchema));
//   let [emptyUser, setEmptyUser] = useState(getEmptyObject(userSchema));
//   useEffect(() => {
//     getData();
//   }, []);
//   async function getData() {
//     setFlagLoad(true);
//     try {
//       let response = await axios(import.meta.env.VITE_API_URL + "/users");
//       let pList = await response.data;
//       response = await axios(import.meta.env.VITE_API_URL + "/roles");
//       let rList = await response.data;
//       // In the userList, add a parameter - role
//       pList.forEach((user, index) => {
//         // get role (string) from roleId
//         for (let i = 0; i < rList.length; i++) {
//           if (user.roleId == rList[i]._id) {
//             user.role = rList[i].name;
//             break;
//           }
//         } //for
//       });
//       setUserList(pList);
//       setFilteredUserList(pList);
//       setRoleList(rList);
//     } catch (error) {
//       showMessage("Something went wrong, refresh the page");
//     }
//     setFlagLoad(false);
//   }
//   async function handleFormSubmit(user) {
//     let message;
//     // now remove relational data
//     let userForBackEnd = { ...user };
//     for (let key in userForBackEnd) {
//       userSchema.forEach((e, index) => {
//         if (key == e.attribute && e.relationalData) {
//           delete userForBackEnd[key];
//         }
//       });
//     }
//     if (action == "add") {
//       // user = await addUserToBackend(user);
//       setFlagLoad(true);
//       try {
//         let response = await axios.post(
//           import.meta.env.VITE_API_URL + "/users",
//           userForBackEnd,
//           { headers: { "Content-type": "multipart/form-data" } }
//         );
//         let addedUser = await response.data; //returned  with id
//         // This addedUser has id, addDate, updateDate, but the relational data is lost
//         // The original user has got relational data.
//         for (let key in user) {
//           userSchema.forEach((e, index) => {
//             if (key == e.attribute && e.relationalData) {
//               addedUser[key] = user[key];
//             }
//           });
//         }
//         message = "User added successfully";
//         // update the user list now.
//         let prList = [...userList];
//         prList.push(user);
//         prList = prList.sort(
//           (a, b) => new Date(b.updateDate) - new Date(a.updateDate)
//         );
//         setUserList(prList);

//         let fprList = [...filteredUserList];
//         fprList.push(user);
//         fprList = fprList.sort(
//           (a, b) => new Date(b.updateDate) - new Date(a.updateDate)
//         );
//         setFilteredUserList(fprList);
//         showMessage(message);
//         setAction("list");
//       } catch (error) {
//         console.log(error);
//         showMessage("Something went wrong, refresh the page");
//       }
//       setFlagLoad(false);
//     } else if (action == "update") {
//       user._id = userToBeEdited._id; // The form does not have id field
//       setFlagLoad(true);
//       try {
//         let response = await axios.put(
//           import.meta.env.VITE_API_URL + "/users",
//           user,
//           {
//             headers: { "Content-type": "multipart/form-data" },
//           }
//         );
//         let r = await response.data;
//         message = "User Updated successfully";
//         // update the user list now.
//         let prList = userList.map((e, index) => {
//           if (e._id == user._id) return user;
//           return e;
//         });
//         let fprList = filteredUserList.map((e, index) => {
//           if (e._id == user._id) return user;
//           return e;
//         });
//         setUserList(prList);
//         setFilteredUserList(fprList);
//         showMessage(message);
//         setAction("list");
//       } catch (error) {
//         showMessage("Something went wrong, refresh the page");
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
//   function handleEditButtonClick(user) {
//     setAction("update");
//     setUserToBeEdited(user);
//   }
//   function showMessage(message) {
//     setMessage(message);
//     window.setTimeout(() => {
//       setMessage("");
//     }, 3000);
//   }
//   async function handleDeleteButtonClick(ans, user) {
//     if (ans == "No") {
//       // delete operation cancelled
//       showMessage("Delete operation cancelled");
//       return;
//     }
//     if (ans == "Yes") {
//       // delete operation allowed
//       performDeleteOperation(product);
//     }
//   }
//   async function performDeleteOperation(product) {
//     setFlagLoad(true);
//     try {
//       let response = await axios.delete(
//         import.meta.env.VITE_API_URL + "/users/" + user._id
//       );
//       let r = await response.data;
//       message = `User - ${user.name} deleted successfully.`;
//       //update the user list now.
//       let prList = userList.filter((e, index) => e._id != user._id);
//       setUserList(prList);

//       let fprList = userList.filter((e, index) => e._id != user._id);
//       setFilteredUserList(fprList);
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
//     let list = [...filteredUserList];
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
//     setFilteredUserList(list);
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

//     let list = [...filteredUserList];
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
//     setFilteredUserList(list);
//     setSortedField("updateDate");
//   }
//   function handleFormTextChangeValidations(message, index) {
//     props.onFormTextChangeValidations(message, index);
//   }
//   function handleFileUploadChange(file, index) {
//     props.onFileUploadChange(file, index);
//   }

//   function handleSearchKeyUp(event) {
//     let searchText = event.target.value;
//     setSearchText(searchText);
//     performSearchOperation(searchText);
//   }
//   function performSearchOperation(searchText) {
//     let query = searchText.trim();
//     if (query.length == 0) {
//       setFilteredUserList(userList);
//       return;
//     }
//     let searchedUsers = [];
//     // searchedUsers = filterByName(query);
//     searchedUsers = filterByShowInListAttributes(query);
//     setFilteredUserList(searchedUsers);
//   }
//   function filterByName(query) {
//     let fList = [];
//     // console.log(selectedEntity.attributes[0].showInList);

//     for (let i = 0; i < selectedList.length; i++) {
//       if (selectedList[i].name.toLowerCase().includes(query.toLowerCase())) {
//         fList.push(selectedList[i]);
//       }
//     } //for
//     return fList;
//   }
//   function filterByShowInListAttributes(query) {
//     let fList = [];
//     for (let i = 0; i < userList.length; i++) {
//       for (let j = 0; j < showInList.length; j++) {
//         if (showInList[j].show) {
//           let parameterName = showInList[j].attribute;
//           if (
//             userList[i][parameterName] &&
//             userList[i][parameterName]
//               .toLowerCase()
//               .includes(query.toLowerCase())
//           ) {
//             fList.push(userList[i]);
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
//       let result = analyseImportExcelSheet(jsonData, productList);
//       if (result.message) {
//         showMessage(result.message);
//       } else {
//         showImportAnalysis(result);
//       }
//       // analyseSheetData(jsonData, productList);
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
//           "products",
//           productList,
//           import.meta.env.VITE_API_URL
//         );
//         if (result.success) {
//           setProductList(result.updatedList);
//           setFilteredProductList(result.updatedList);
//         }
//         showMessage(result.message);
//       }
//       if (recordsToBeUpdated.length > 0) {
//         result = await recordsUpdateBulk(
//           recordsToBeUpdated,
//           "products",
//           productList,
//           import.meta.env.VITE_API_URL
//         );
//         if (result.success) {
//           setProductList(result.updatedList);
//           setFilteredProductList(result.updatedList);
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
//         filteredList={filteredUserList}
//         mainList={userList}
//         showInList={showInList}
//         onListClick={handleListClick}
//         onAddEntityClick={handleAddEntityClick}
//         onSearchKeyUp={handleSearchKeyUp}
//         onExcelFileUploadClick={handleExcelFileUploadClick}
//         onClearSelectedFile={handleClearSelectedFile}
//       />
//       {filteredUserList.length == 0 && userList.length != 0 && (
//         <div className="text-center">Nothing to show</div>
//       )}
//       {userList.length == 0 && <div className="text-center">List is empty</div>}
//       {(action == "add" || action == "update") && (
//         <div className="row">
//           <AdminUserForm
//             userSchema={userSchema}
//             userValidations={userValidations}
//             emptyUser={emptyUser}
//             roleList={roleList}
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
//       {action == "list" && filteredUserList.length != 0 && (
//         <div className="row  my-2 mx-auto p-1">
//           <div className="col-1">
//             <a
//               href="#"
//               onClick={() => {
//                 handleSrNoClick();
//               }}
//             ></a>
//           </div>
//           {action == "list" && filteredUserList.length != 0 && (
//             <CheckBoxHeaders
//               showInList={showInList}
//               onListCheckBoxClick={handleListCheckBoxClick}
//             />
//           )}
//         </div>
//       )}
//       {action == "list" && filteredUserList.length != 0 && (
//         <div className="row   my-2 mx-auto  p-1">
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
//       {action == "list" &&
//         filteredUserList.length != 0 &&
//         filteredUserList.map((e, index) => (
//           <Entity
//             entity={e}
//             key={index + 1}
//             index={index}
//             sortedField={sortedField}
//             direction={direction}
//             listSize={filteredUserList.length}
//             selectedEntity={selectedEntity}
//             showInList={showInList}
//             VITE_API_URL={import.meta.env.VITE_API_URL}
//             onEditButtonClick={handleEditButtonClick}
//             onDeleteButtonClick={handleDeleteButtonClick}
//             onToggleText={handleToggleText}
//           />
//         ))}
//     </>
//   );
// }
