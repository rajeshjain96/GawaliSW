import { useEffect, useState } from "react";
import { fieldValidate } from "../external/vite-sdk";
import "../formstyles.css";
import { SingleFileUpload } from "../external/vite-sdk";

export default function AdminDailyEntryForm(props) {
  let [user, setUser] = useState({});
  let [errorUser, setErrorUser] = useState(props.entryValidations);
  let [flagFormInvalid, setFlagFormInvalid] = useState(false);
  let { action } = props;
  let { selectedEntity } = props;
  let { categoryList } = props;
  let { entrySchema } = props;
  let [singleFileList, setSingleFileList] = useState(
    getSingleFileListFromEntrySchema()
  );
  function getSingleFileListFromEntrySchema() {
    let list = [];
    entrySchema.forEach((e, index) => {
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
    //setUser(props.emptyEntry);
  }, []);
  function init() {
    let { action } = props;
    if (action === "add") {
      // emptyEntry.category = props.categoryToRetain;
      // emptyEntry.categoryId = props.categoryIdToRetain;
      setUser(props.emptyEntry);
    } else if (action === "update") {
      // in edit mode, keep the update button enabled at the beginning
      setFlagFormInvalid(false);
      setUser(props.userToBeEdited);
    }
  }
  function handleTextFieldChange(event) {
    let name = event.target.name;
    setUser({ ...user, [name]: event.target.value });
    let message = fieldValidate(event, errorUser);
    let errEntry = { ...errorUser };
    errorUser[`${name}`].message = message;
    setErrorUser(errEntry);
  }
  function handleBlur(event) {
    let name = event.target.name;
    let message = fieldValidate(event, errorUser);
    let errEntry = { ...errorUser };
    errorUser[`${name}`].message = message;
    setErrorUser(errEntry);
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
  
    let errEntry = { ...errorUser };
    let flag = false;
  
    for (let field in user) {
      if (["role"].includes(field)) continue;
  
      if (errorUser[field] && user[field] == "") {
        flag = true;
        errEntry[field].message = "Required...";
      }
    }
  
    if (flag) {
      console.log("⛔ Error object after validation:", errEntry); // <-- add this
      setErrorUser(errEntry);
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

//   function handleFileChange(selectedFile, fileIndex, message) {
//     setFlagFormInvalid(false);
//     if (action == "add") {
//       // add datesuffix to file-name
//       const timestamp = Date.now();
//       const ext = selectedFile.name.split(".").pop();
//       const base = selectedFile.name.replace(/\.[^/.]+$/, "");
//       const newName = `${base}-${timestamp}.${ext}`;
//       // Create a new File object with the new name
//       const renamedFile = new File([selectedFile], newName, {
//         type: selectedFile.type,
//         lastModified: selectedFile.lastModified,
//       });
//       setUser({
//         ...user,
//         ["file" + fileIndex]: renamedFile,
//         [singleFileList[fileIndex].fileAttributeName]: newName,
//       });
//       let errEntry = { ...errorUser };
//       errEntry[singleFileList[fileIndex].fileAttributeName].message = message;
//       setErrorUser(errEntry);
//       // setErrorUser({ ...errorUser, message: message });
//     }
//   }
//   function handleFileRemove(selectedFile, fileIndex, message) {
//     if (action == "add") {
//       setFlagFormInvalid(false);
//       setUser({
//         ...user,
//         [singleFileList[fileIndex].fileAttributeName]: "",
//       });
//       let errEntry = { ...errorUser };
//       errEntry[singleFileList[fileIndex].fileAttributeName].message = message;
//       setErrorUser(errEntry);
//     } else if (action == "update") {
//       let newFileName = "";
//       if (selectedFile) {
//         newFileName = selectedFile.name;
//       } else {
//         // user selected a new file but then deselected
//         newFileName = "";
//       }
//       setUser({
//         ...user,
//         ["file" + fileIndex]: selectedFile,
//         [singleFileList[fileIndex].fileAttributeName + "New"]: newFileName,
//       });
//       let errEntry = { ...errorUser };
//       errEntry[singleFileList[fileIndex].fileAttributeName].message = message;
//       setErrorUser(errEntry);
//     }
//   }
//   function handleFileChangeUpdateMode(selectedFile, fileIndex, message) {
//     let newFileName = "";
//     if (selectedFile) {
//       newFileName = selectedFile.name;
//     } else {
//       // user selected a new file but then deselected
//       newFileName = "";
//     }
//     setUser({
//       ...user,
//       // file: file,
//       ["file" + fileIndex]: selectedFile,
//       [singleFileList[fileIndex].fileAttributeName + "New"]: newFileName,
//       // [singleFileList[fileIndex].fileAttributeName]: selectedFile.name,
//     });
//     let errEntry = { ...errorUser };
//     errEntry[singleFileList[fileIndex].fileAttributeName].message = message;
//     setErrorUser(errEntry);
//   }
//   function handleCancelChangeImageClick() {
//     if (action == "update") {
//       let fl = [...singleFileList];
//       fl[fileIndex]["newFileName"] = "";
//       fl[fileIndex]["newFile"] = "";
//       setSingleFileList(fl);
//     }
//   }
//   function handleSelectCategoryChange(event) {
//     let index = event.target.selectedIndex; // get selected index, instead of selected value
//     var optionElement = event.target.childNodes[index];
//     var selectedCategoryId = optionElement.getAttribute("id");
//     let category = event.target.value.trim();
//     let categoryId = selectedCategoryId;
//     setUser({ ...user, category: category, categoryId: categoryId });
//   }

//   let optionsCategory = categoryList.map((category, index) =>
//     category.rating != 1 ? (
//       <option value={category.name} key={index} id={category._id}>
//         {category.name}
//       </option>
//     ) : null
//   );

  return (
    <div className="p-2">
      <form className="text-thick p-4" onSubmit={handleFormSubmit}>
        {/* row starts */}
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
                value={user.name  || ""}
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
          {/* <div className="col-6 my-2">
            <div className="text-bold my-1">
              <label>Email-ID</label>
            </div>
            <div className="px-0">
              <input
                type="email"
                className="form-control"
                name="emailId"
                value={user.emailId || ""}
                onChange={handleTextFieldChange}
                onBlur={handleBlur}
                onFocus={handleFocus}
                placeholder="Enter emailId : "
              />
            </div>
            <div className="">
              {errorUser.emailId.message ? (
                <span className="text-danger">
                  {errorUser.emailId.message}
                </span>
              ) : null}
            </div>
          </div> */}
          {/* change from here */}
              {/* Mobile Number */}
{/* <div className="col-6 my-2">
  <div className="text-bold my-1">
    <label>Mobile Number</label>
  </div>
  <input
    type="text"
    className="form-control"
    name="mobileNumber"
    value={user.mobileNumber  || ""}
    onChange={handleTextFieldChange}
    onBlur={handleBlur}
    onFocus={handleFocus}
    placeholder="Enter 10-digit mobile number"
  />
  {errorUser.mobileNumber.message && (
    <span className="text-danger">{errorUser.mobileNumber.message}</span>
  )}
</div> */}

{/* Address */}
{/* <div className="col-6 my-2">
  <div className="text-bold my-1">
    <label>Address</label>
  </div>
  <input
    type="text"
    className="form-control"
    name="address"
    value={user.address || ""}
    onChange={handleTextFieldChange}
    onBlur={handleBlur}
    onFocus={handleFocus}
    placeholder="Enter address"
  />
  {errorUser.address.message && (
    <span className="text-danger">{errorUser.address.message}</span>
  )}
</div> */}



{/* Status */}
{/* <div className="col-6 my-2">
  <div className="text-bold my-1">
    <label>Status</label>
  </div>
  <div className="px-0">
    <select
      className="form-control"
      name="status"
      value={user.status || "active"}
      onChange={handleTextFieldChange}
      onBlur={handleBlur}
      onFocus={handleFocus}
    >
      <option value="">Select Status</option>
      <option value="active">Active</option>
      <option value="inactive">Inactive</option>
    </select>
  </div>
  <div className="">
    {errorUser.status?.message && (
      <span className="text-danger">{errorUser.status.message}</span>
    )}
  </div>
</div> */}

{/* Daily Quantity */}
<div className="col-6 my-2">
  <div className="text-bold my-1">
    <label>Daily Milk Quantity (Litres)</label>
  </div>
  <input
    type="text"
    className="form-control"
    name="daily_qty"
    value={user.daily_qty || ""}
    onChange={handleTextFieldChange}
    onBlur={handleBlur}
    onFocus={handleFocus}
    placeholder="e.g., 1.5"
  />
  {errorUser.daily_qty.message && (
    <span className="text-danger">{errorUser.daily_qty.message}</span>
  )}
</div>

{/* Area */}
{/* <div className="col-6 my-2">
  <div className="text-bold my-1">
    <label>Area</label>
  </div>
  <input
    type="text"
    className="form-control"
    name="area"
    value={user.area || ""}
    onChange={handleTextFieldChange}
    onBlur={handleBlur}
    onFocus={handleFocus}
    placeholder="e.g., Hadapsar"
  />
  {errorUser.area.message && (
    <span className="text-danger">{errorUser.area.message}</span>
  )}
</div> */}

{/* Start Date */}
{/* <div className="col-6 my-2">
  <div className="text-bold my-1">
    <label>Start Date</label>
  </div>
  <input
    type="date"
    className="form-control"
    name="start_date"
    value={user.start_date || ""}
    onChange={handleTextFieldChange}
    onBlur={handleBlur}
    onFocus={handleFocus}
  />
  {errorUser.start_date.message && (
    <span className="text-danger">{errorUser.start_date.message}</span>
  )}
</div> */}

          {/* till here */}
          {/* <div className="col-6 my-2">
            <div className="text-bold my-1">
              <label>Final Price</label>
            </div>
            <div className="px-0">
              <input
                type="text"
                className="form-control"
                name="finalPrice"
                value={user.finalPrice || ""}
                onChange={handleTextFieldChange}
                onBlur={handleBlur}
                onFocus={handleFocus}
                placeholder="Enter discounted price in Rs."
              />
            </div>
            <div className="">
              {errorUser.finalPrice.message ? (
                <span className="text-danger">
                  {errorUser.finalPrice.message}
                </span>
              ) : null}
            </div>
          </div> */}
          {/* <div className="col-12 my-2">
            <div className="text-bold my-1">
              <label>Information</label>
            </div>
            <div className="px-0">
              <textarea
                className="form-control"
                name="info"
                style={{ height: "300px" }}
                rows={5}
                // cols={20}
                value={user.info || ""}
                onChange={handleTextFieldChange}
                onBlur={handleBlur}
                onFocus={handleFocus}
                placeholder="Enter information"
              ></textarea>
            </div>
            <div className="">
              {errorUser.info.message ? (
                <span className="text-danger">{errorUser.info.message}</span>
              ) : null}
            </div>
          </div> */}
          {/* <div className="col-12 my-2">
            <div className="text-bold my-1">
              <label>Customer Image</label>
            </div>
            <SingleFileUpload
              action={action}
              singleFileList={singleFileList}
              name="customerImage"
              fileName={user.customerImage}
              VITE_API_URL={import.meta.env.VITE_API_URL}
              onFileChange={handleFileChange}
              onFileChangeUpdateMode={handleFileChangeUpdateMode}
              onCancelChangeImageClick={handleCancelChangeImageClick}
              onFileRemove={handleFileRemove}
            />
            <div className="">
              {errorUser.customerImage.message ? (
                <span className="text-danger">
                  {errorUser.customerImage.message}
                </span>
              ) : null}
            </div>
          </div> */}
          {/* <div className="col-6 my-2">
            <div className="text-bold my-1">
              <label>Category</label>
            </div>
            <div className="px-0">
              <select
                className="form-control"
                name="category"
                value={user.category  || ""}
                onChange={handleSelectCategoryChange}
                onBlur={handleBlur}
                onFocus={handleFocus}
              >
                <option> Select Category </option>
                {optionsCategory}
              </select>
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