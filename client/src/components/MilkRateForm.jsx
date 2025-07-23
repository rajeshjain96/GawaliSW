import { useEffect, useState } from "react";
import { fieldValidate } from "../external/vite-sdk";
import "../formstyles.css";

export default function MilkRateForm(props) {
  let [milkrate, setMilkRate] = useState({});
  let [errorMilkRate, setErrorMilkRate] = useState({
    rate: { message: "" },
    from: { message: "" },
  });
  let [flagFormInvalid, setFlagFormInvalid] = useState(false);
  let { action } = props;
  let { selectedEntity } = props;

  useEffect(() => {
    window.scroll(0, 0);
    init();
  }, []);

  function init() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0'); 
    const day = String(today.getDate()).padStart(2, '0');
    const todayFormatted = `${year}-${month}-${day}`;

    let { action } = props;
    if (action === "add") {
      setMilkRate({ rate: "", from: todayFormatted });
      setErrorMilkRate({
        rate: { message: "" },
        from: { message: "" },
      });
    } else if (action === "update") {
      setFlagFormInvalid(false);
      setMilkRate({
        rate: props.milkrateToBeEdited.rate || "",
        from: props.milkrateToBeEdited.from || todayFormatted,
      });
      setErrorMilkRate({
        rate: { message: "" },
        from: { message: "" },
      });
    }
  }

  function handleFieldChange(event) {
    let name = event.target.name;
    let value = event.target.value;
    setMilkRate((prevMilkrate) => ({ ...prevMilkrate, [name]: value }));

    let errMilkRateCopy = { ...errorMilkRate };
    let message = "";

    if (name === "rate") {
      if (!value) {
        message = "Rate is required.";
      } else if (isNaN(parseFloat(value))) {
        message = "Rate must be a number.";
      } else if (parseFloat(value) <= 0) {
        message = "Rate must be greater than zero.";
      }
      errMilkRateCopy.rate.message = message;
    } else if (name === "from") {
      if (!value) {
        message = "From Date is required.";
      }
      errMilkRateCopy.from.message = message;
    }

    setErrorMilkRate(errMilkRateCopy);
  }

  function handleBlur(event) {
    handleFieldChange(event); 
  }

  function handleFocus(event) {
    setFlagFormInvalid(false);
  }

  function checkAllErrors() {
    let hasErrors = false;
    let errMilkRateCopy = {
      rate: { message: "" },
      from: { message: "" },
    }; 

    if (!milkrate.rate) {
      errMilkRateCopy.rate.message = "Rate is required.";
      hasErrors = true;
    } else if (isNaN(parseFloat(milkrate.rate))) {
      errMilkRateCopy.rate.message = "Rate must be a number.";
      hasErrors = true;
    } else if (parseFloat(milkrate.rate) <= 0) {
      errMilkRateCopy.rate.message = "Rate must be greater than zero.";
      hasErrors = true;
    }

 
   if (!milkrate.from) {
      errMilkRateCopy.from.message = "From Date is required.";
      hasErrors = true;
    }

    setErrorMilkRate(errMilkRateCopy);
    return hasErrors;
  }

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (checkAllErrors()) {
      setFlagFormInvalid(true);
      return;
    }
    setFlagFormInvalid(false);

    const dataToSubmit = {
        rate: milkrate.rate,
        from: milkrate.from,
    };
    props.onFormSubmit(dataToSubmit); 
  };

  return (
    <div className="p-2">
      <form className="text-thick p-4" onSubmit={handleFormSubmit}>
        <div className="form-group row align-items-center">

          {/* --- Rate Field --- */}
          <div className="col-md-6 my-2"> {/* Adjusted column size */}
            <div className="text-bold my-1">
              <label>Rate</label>
            </div>
            <input
              type="number"
              className="form-control"
              name="rate"
              value={milkrate.rate || ""}
              onChange={handleFieldChange}
              onBlur={handleBlur}
              onFocus={handleFocus}
              placeholder="Enter Rate"
            />
            {errorMilkRate.rate?.message && (
              <span className="text-danger">{errorMilkRate.rate.message}</span>
            )}
          </div>

          {/* --- From Date Field --- */}
          <div className="col-md-6 my-2"> {/* Adjusted column size */}
            <div className="text-bold my-1">
              <label>From Date</label>
            </div>
            <input
              type="date"
              className="form-control"
              name="from"
              value={milkrate.from || ""}
              onChange={handleFieldChange}
              onBlur={handleBlur}
              onFocus={handleFocus}
            />
            {errorMilkRate.from?.message && (
              <span className="text-danger">{errorMilkRate.from.message}</span>
            )}
          </div>

          {/* --- Submit Button --- */}
          <div className="col-12 mt-4">
            <button
              className="btn btn-primary"
              type="submit"
            >
              {(action + " " + selectedEntity.singularName).toUpperCase()}
            </button>{" "}
            &nbsp;{" "}
            <span className="text-danger">
              {" "}
              {flagFormInvalid ? "Please fix the errors above." : ""}
            </span>
          </div>
        </div>
      </form>
    </div>
  );
}