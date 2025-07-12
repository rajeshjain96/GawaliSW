import { useEffect, useState } from "react";
import { fieldValidate } from "../external/vite-sdk";
import "../formstyles.css";
export default function AdminAreaForm(props) {
  let [area, setArea] = useState("");
  let [errorArea, setErrorArea] = useState(props.areaValidations);
  let [flagFormInvalid, setFlagFormInvalid] = useState(false);
  let { action } = props;
  let { selectedEntity } = props;
  let { productList } = props;
  let { areaSchema } = props;
  let [singleFileList, setSingleFileList] = useState(
    getSingleFileListFromAreaSchema()
  );
  function getSingleFileListFromAreaSchema() {
    let list = [];
    areaSchema.forEach((e, index) => {
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
  }, []);
  function init() {
    let { action } = props;
    if (action === "add") {
      setArea(props.emptyArea);
    } else if (action === "update") {
      // in edit mode, keep the update button enabled at the beginning
      setFlagFormInvalid(false);
      setArea(props.areaToBeEdited);
    }
  }
  function handleTextFieldChange(event) {
    let name = event.target.name;
    setArea({ ...area, [name]: event.target.value });
    let message = fieldValidate(event, errorArea);
    let errArea = { ...errorArea };
    errorArea[`${name}`].message = message;
    setErrorArea(errArea);
  }
  function handleBlur(event) {
    let name = event.target.name;
    let message = fieldValidate(event, errorArea);
    let errArea = { ...errorArea };
    errorArea[`${name}`].message = message;
    setErrorArea(errArea);
  }
  function handleFocus(event) {
    setFlagFormInvalid(false);
  }
  function checkAllErrors() {
    for (let field in errorArea) {
      if (errorArea[field].message !== "") {
        return true;
      } //if
    } //for
    let errArea = { ...errorArea };
    let flag = false;
    for (let field in area) {
      if (errorArea[field] && area[field] == "") {
        flag = true;
        errArea[field].message = "Required...";
      } //if
    } //for
    if (flag) {
      setErrorArea(errArea);
      return true;
    }
    return false;
  }
  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (checkAllErrors()) {
      setFlagFormInvalid(true);
      return;
    }
    setFlagFormInvalid(false);
    if (action == "update") {
      // There might be files in this form, add those also
      let pr = { ...area };
      for (let i = 0; i < singleFileList.length; i++) {
        let fAName = singleFileList[i].fileAttributeName;
        if (pr[fAName + "New"]) {
          // image is modified
          // if field-name is image, temporarily in "imageNew" field, new file-name is saved.
          pr[fAName] = pr[fAName + "New"];
          delete pr[fAName + "New"];
        }
      } //for
      setArea(pr);
      props.onFormSubmit(pr);
    } else if (action == "add") {
      props.onFormSubmit(area);
    }
  };
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
                value={area.name}
                onChange={handleTextFieldChange}
                onBlur={handleBlur}
                onFocus={handleFocus}
                placeholder="Enter the area"
              />
            </div>
            <div className="">
              {errorArea.name.message ? (
                <span className="text-danger">
                  {errorArea.name.message}
                </span>
              ) : null}
            </div>
          </div>
          <div className="col-6 my-2">
            <div className="text-bold my-1">
              <label>Description</label>
            </div>
            <div className="px-0">
              <input
                type="text"
                className="form-control"
                name="description"
                value={area.description}
                onChange={handleTextFieldChange}
                onBlur={handleBlur}
                onFocus={handleFocus}
                placeholder="Enter Description"
              />
            </div>
            <div className="">
              {errorArea.description.message ? (
                <span className="text-danger">
                  {errorArea.description.message}
                </span>
              ) : null}
            </div>
          </div>
          <div className="col-12">
            <button className="btn btn-primary" type="submit">
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
