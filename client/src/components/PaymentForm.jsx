import { useEffect, useState } from "react";
import { fieldValidate } from "../external/vite-sdk";
import "../formstyles.css";
import { SingleFileUpload } from "../external/vite-sdk";

export default function PaymentForm(props) {
  let [user, setUser] = useState({});
  let [errorUser, setErrorUser] = useState(props.paymentValidations);
  let [flagFormInvalid, setFlagFormInvalid] = useState(false);
  let { action } = props;
  let { selectedEntity } = props;
  let { categoryList } = props;
  let { paymentSchema } = props;
  let [singleFileList, setSingleFileList] = useState(
    getSingleFileListFromPaymentSchema()
  );
  function getSingleFileListFromPaymentSchema() {
    let list = [];
    paymentSchema.forEach((e, index) => {
      let obj = {};
      if (e.type == "singleFile") {
        obj["fileAttributeName"] = e.attribute;
        obj["allowedFileType"] = e.allowedFileType;
        obj["allowedSize"] = e.allowedSize;
        list.push(obj);
      }
    });
    return list;
  }
  useEffect(() => {
    window.scroll(0, 0);
    init();
    //setUser(props.emptyPayment);
  }, []);
  function init() {
    let { action } = props;
    if (action === "add") {
      // emptyPayment.category = props.categoryToRetain;
      // emptyPayment.categoryId = props.categoryIdToRetain;
      setUser(props.emptyPayment);
    } else if (action === "update") {
      // in edit mode, keep the update button enabled at the beginning
      setFlagFormInvalid(false);
      setUser(props.userToBeEdited);
    }
  }
  // function handleTextFieldChange(event) {
  //   let name = event.target.name;
  //   setUser({ ...user, [name]: event.target.value });
  //   let message = fieldValidate(event, errorUser);
  //   let errPayment = { ...errorUser };
  //   errorUser[`${name}`].message = message;
  //   setErrorUser(errPayment);
  // }
  function handleTextFieldChange(event) {
    let name = event.target.name;
    let value = event.target.value;
  
    let updatedUser = { ...user, [name]: value };
  
    if (name === "totalMonthlyAmount" || name === "paidAmount") {
      const total = parseFloat(updatedUser.totalMonthlyAmount || 0);
      const paid = parseFloat(updatedUser.paidAmount || 0);
      updatedUser.balanceAmount = (total - paid).toFixed(2);
    }
  
    setUser(updatedUser);
  
    let message = fieldValidate(event, errorUser);
    let errPayment = { ...errorUser };
    errorUser[`${name}`].message = message;
    setErrorUser(errPayment);
  }
  
  function handleBlur(event) {
    let name = event.target.name;
    let message = fieldValidate(event, errorUser);
    let errPayment = { ...errorUser };
    errorUser[`${name}`].message = message;
    setErrorUser(errPayment);
  }
  function handleFocus(event) {
    setFlagFormInvalid(false);
  }

  // function checkAllErrors() {
  //   for (let field in errorUser) {
  //     if (errorUser[field].message !== "") {
  //       return true;
  //     } //if
  //   } //for
  //   let errProduct = { ...errorUser };
  //   let flag = false;

  //   // for (let field in user) {
  //   //   if (errorUser[field] && user[field] == "") {
  //   //     flag = true;
  //   //     errProduct[field].message = "Required...";
  //   //   } //if
  //   // } //for
  //   for (let field in user) {
  //     // Skip fields not shown in form
  //     // if (["status", "role"].includes(field)) continue;
  //     if (["role"].includes(field)) continue;

  //     if (errorUser[field] && user[field] == "") {
  //       flag = true;
  //       errProduct[field].message = "Required...";
  //     }
  //   }

  //   if (flag) {
  //     setErrorUser(errProduct);
  //     return true;
  //   }
  //   return false;
  // }
  function checkAllErrors() {
    console.log("▶️ User object:", user);
    console.log("▶️ Error object before validation:", errorUser);

    for (let field in errorUser) {
      if (errorUser[field].message !== "") {
        return true;
      }
    }

    let errPayment = { ...errorUser };
    let flag = false;

    for (let field in user) {
      if (["role"].includes(field)) continue;

      if (errorUser[field] && user[field] == "") {
        flag = true;
        errPayment[field].message = "Required...";
      }
    }

    if (flag) {
      console.log("⛔ Error object after validation:", errPayment); // <-- add this
      setErrorUser(errPayment);
      return true;
    }

    return false;
  }

  const handleFormSubmit = (e) => {
    e.preventDefault();
    // for dropdown, data is to be modified
    // first check whether all entries are valid or not
    if (checkAllErrors()) {
      setFlagFormInvalid(true);
      return;
    }
    setFlagFormInvalid(false);
    if (action == "update") {
      // There might be files in this form, add those also
      let pr = { ...user };
      for (let i = 0; i < singleFileList.length; i++) {
        let fAName = singleFileList[i].fileAttributeName;
        if (pr[fAName + "New"]) {
          // image is modified
          // if field-name is image, temporarily in "imageNew" field, new file-name is saved.
          pr[fAName] = pr[fAName + "New"];
          delete pr[fAName + "New"];
        }
      } //for
      setUser(pr);
      props.onFormSubmit(pr);
    } else if (action == "add") {
      console.log("📝 Submitting form with data:", user);
      props.onFormSubmit(user);
    }
  };
  function handleFileChange(selectedFile, fileIndex, message) {
    setFlagFormInvalid(false);
    if (action == "add") {
      // add datesuffix to file-name
      const timestamp = Date.now();
      const ext = selectedFile.name.split(".").pop();
      const base = selectedFile.name.replace(/\.[^/.]+$/, "");
      const newName = `${base}-${timestamp}.${ext}`;
      // Create a new File object with the new name
      const renamedFile = new File([selectedFile], newName, {
        type: selectedFile.type,
        lastModified: selectedFile.lastModified,
      });
      setUser({
        ...user,
        ["file" + fileIndex]: renamedFile,
        [singleFileList[fileIndex].fileAttributeName]: newName,
      });
      let errPayment = { ...errorUser };
      errPayment[singleFileList[fileIndex].fileAttributeName].message = message;
      setErrorUser(errPayment);
      // setErrorUser({ ...errorUser, message: message });
    }
  }
  function handleFileRemove(selectedFile, fileIndex, message) {
    if (action == "add") {
      setFlagFormInvalid(false);
      setUser({
        ...user,
        [singleFileList[fileIndex].fileAttributeName]: "",
      });
      let errPayment = { ...errorUser };
      errPayment[singleFileList[fileIndex].fileAttributeName].message = message;
      setErrorUser(errPayment);
    } else if (action == "update") {
      let newFileName = "";
      if (selectedFile) {
        newFileName = selectedFile.name;
      } else {
        // user selected a new file but then deselected
        newFileName = "";
      }
      setUser({
        ...user,
        ["file" + fileIndex]: selectedFile,
        [singleFileList[fileIndex].fileAttributeName + "New"]: newFileName,
      });
      let errPayment = { ...errorUser };
      errPayment[singleFileList[fileIndex].fileAttributeName].message = message;
      setErrorUser(errPayment);
    }
  }
  function handleFileChangeUpdateMode(selectedFile, fileIndex, message) {
    let newFileName = "";
    if (selectedFile) {
      newFileName = selectedFile.name;
    } else {
      // user selected a new file but then deselected
      newFileName = "";
    }
    setUser({
      ...user,
      // file: file,
      ["file" + fileIndex]: selectedFile,
      [singleFileList[fileIndex].fileAttributeName + "New"]: newFileName,
      // [singleFileList[fileIndex].fileAttributeName]: selectedFile.name,
    });
    let errPayment = { ...errorUser };
    errPayment[singleFileList[fileIndex].fileAttributeName].message = message;
    setErrorUser(errPayment);
  }
  function handleCancelChangeImageClick() {
    if (action == "update") {
      let fl = [...singleFileList];
      fl[fileIndex]["newFileName"] = "";
      fl[fileIndex]["newFile"] = "";
      setSingleFileList(fl);
    }
  }
  function handleSelectCategoryChange(event) {
    let index = event.target.selectedIndex; // get selected index, instead of selected value
    var optionElement = event.target.childNodes[index];
    var selectedCategoryId = optionElement.getAttribute("id");
    let category = event.target.value.trim();
    let categoryId = selectedCategoryId;
    setUser({ ...user, category: category, categoryId: categoryId });
  }

  let optionsCategory = categoryList.map((category, index) =>
    category.rating != 1 ? (
      <option value={category.name} key={index} id={category._id}>
        {category.name}
      </option>
    ) : null
  );

  return (
    <div className="p-2">
      <form className="text-thick p-4" onSubmit={handleFormSubmit}>
        {/* row starts */}
        {/* name */}
        <div className="form-group row align-items-center">
          <div className="col-6 my-2">
            <div className="text-bold my-1">
              <label>Name</label>
            </div>
            <div className=" px-0">
              <input
                type="text"
                className="form-control"
                name="name"
                value={user.name || ""}
                onChange={handleTextFieldChange}
                onBlur={handleBlur}
                onFocus={handleFocus}
                placeholder="Enter Customer name"
              />
            </div>
            <div className="">
              {errorUser.name.message ? (
                <span className="text-danger">{errorUser.name.message}</span>
              ) : null}
            </div>
          </div>

          {/* total milk delivered */}
          <div className="col-6 my-2">
            <div className="text-bold my-1">
              <label>Total Milk Delivered</label>
            </div>
            <div className=" px-0">
              <input
                type="text"
                className="form-control"
                name="totalDelivered"
                value={user.totalDelivered || ""}
                onChange={handleTextFieldChange}
                onBlur={handleBlur}
                onFocus={handleFocus}
                placeholder="Enter Total milk delivered qty"
              />
            </div>
            <div className="">
              {errorUser.totalDelivered.message ? (
                <span className="text-danger">
                  {errorUser.totalDelivered.message}
                </span>
              ) : null}
            </div>
          </div>

          {/* bill amount */}
          <div className="col-6 my-2">
            <div className="text-bold my-1">
              <label>Monthly Bill Amount</label>
            </div>
            <div className=" px-0">
              <input
                type="text"
                className="form-control"
                name="totalMonthlyAmount"
                value={user.totalMonthlyAmount || ""}
                onChange={handleTextFieldChange}
                onBlur={handleBlur}
                onFocus={handleFocus}
                placeholder="Enter Monthly Bill Amount"
              />
            </div>
            <div className="">
              {errorUser.totalMonthlyAmount.message ? (
                <span className="text-danger">
                  {errorUser.totalMonthlyAmount.message}
                </span>
              ) : null}
            </div>
          </div>

          {/* Paid amount */}
          <div className="col-6 my-2">
            <div className="text-bold my-1">
              <label>Paid Amount</label>
            </div>
            <div className=" px-0">
              <input
                type="text"
                className="form-control"
                name="paidAmount"
                value={user.paidAmount || ""}
                onChange={handleTextFieldChange}
                onBlur={handleBlur}
                onFocus={handleFocus}
                placeholder="Enter Amount Paid"
              />
            </div>
            <div className="">
              {errorUser.paidAmount.message ? (
                <span className="text-danger">
                  {errorUser.paidAmount.message}
                </span>
              ) : null}
            </div>
          </div>

          {/* Mode of Payment */}
          {/* <div className="col-6 my-2">
            <div className="text-bold my-1">
              <label>Mode of Payment</label>
            </div>
            <div className="px-0">
              <select
                name="modeOfPayment"
                className="form-select"
                value={user.modeOfPayment || "Cash"}
                onChange={handleTextFieldChange}
                onBlur={handleBlur}
                onFocus={handleFocus}
              >
                <option value="Cash">Cash</option>
                <option value="Online">Online</option>
              </select>
            </div>
            <div className="">
              {errorUser.modeOfPayment?.message && (
                <span className="text-danger">
                  {errorUser.modeOfPayment.message}
                </span>
              )}
            </div>
          </div> */}

          <div className="col-12">
            <button
              className="btn btn-primary"
              type="submit"
              // disabled={flagFormInvalid}
            >
              {(action + " " + selectedEntity.singularName).toUpperCase()}
            </button>{" "}
            &nbsp;{" "}
            <span className="text-danger">
              {" "}
              {flagFormInvalid ? "Missing data.." : ""}
            </span>
          </div>
        </div>
      </form>
    </div>
  );
}
