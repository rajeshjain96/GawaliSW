import { useEffect, useState } from "react";
import { fieldValidate } from "../external/vite-sdk";
import "../formstyles.css";

export default function AdminBillForm(props) {
  let [bill, setBill] = useState({});
  let [errorBill, setErrorBill] = useState(props.billValidations);
  let [flagFormInvalid, setFlagFormInvalid] = useState(false);
  let { action } = props;
  let { selectedEntity } = props;
  let { billSchema } = props;

  useEffect(() => {
    window.scroll(0, 0);
    init();
  }, [props.action, props.userToBeEdited]);

  function init() {
    let { action } = props;
    if (action === "add") {
      setBill({ ...props.emptyBill });
      setErrorBill(props.billValidations);
    } else if (action === "update") {
      setFlagFormInvalid(false);
      setBill({ ...props.userToBeEdited });

      const initialErrorState = {};
      for (const key in props.billValidations) {
        initialErrorState[key] = { ...props.billValidations[key], message: "" };
      }
      setErrorBill(initialErrorState);
    }
  }

  function handleTextFieldChange(event) {
    let name = event.target.name;
    let value = event.target.value;

    const currentFieldSchema = billSchema.find((f) => f.attribute === name);
    const isNumberField =
      currentFieldSchema &&
      currentFieldSchema.type === "normal" &&
      (currentFieldSchema.attribute === "totalDelivered" ||
        currentFieldSchema.attribute === "totalMonthlyAmount");

    let newValueParsed;
    if (isNumberField) {
      newValueParsed = parseFloat(value) || 0;
    } else {
      newValueParsed = value;
    }

    let updatedBill = { ...bill, [name]: newValueParsed };
    setBill(updatedBill);

    let message = fieldValidate(event, props.billValidations);
    let errBill = { ...errorBill };
    errBill[`${name}`].message = message;
    setErrorBill(errBill);
  }

  function handleBlur(event) {
    let name = event.target.name;
    let message = fieldValidate(event, props.billValidations);
    let errBill = { ...errorBill };
    errBill[`${name}`].message = message;
    setErrorBill(errBill);
  }

  function handleFocus(event) {
    setFlagFormInvalid(false);
    let name = event.target.name;
    let errBill = { ...errorBill };
    if (errBill[name] && errBill[name].message) {
      errBill[name].message = "";
      setErrorBill(errBill);
    }
  }

  function checkAllErrors() {
    let formHasErrors = false;
    const newErrorBill = {};
    for (const key in props.billValidations) {
      newErrorBill[key] = { ...props.billValidations[key], message: "" };
    }

    billSchema.forEach((field) => {
      const attribute = field.attribute;
      if (attribute === "name") return;

      const inputType =
        field.type === "normal" &&
        (field.attribute === "totalDelivered" ||
          field.attribute === "totalMonthlyAmount")
          ? "number"
          : "text";

      const fieldValue = bill[attribute];
      const validationRule = props.billValidations[attribute];

      if (validationRule) {
        let message = "";
        if (
          (inputType === "number" &&
            (fieldValue === null ||
              fieldValue === undefined ||
              fieldValue === "")) ||
          (inputType !== "number" &&
            (fieldValue === "" ||
              fieldValue === null ||
              fieldValue === undefined ||
              String(fieldValue).trim() === ""))
        ) {
          message = "Required...";
        } else {
          const dummyEvent = { target: { name: attribute, value: fieldValue } };
          message = fieldValidate(dummyEvent, props.billValidations);
        }

        if (message !== "") {
          formHasErrors = true;
          newErrorBill[attribute].message = message;
        }
      }
    });

    setErrorBill(newErrorBill);
    return formHasErrors;
  }

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (checkAllErrors()) {
      setFlagFormInvalid(true);
      return;
    }
    setFlagFormInvalid(false);

    const finalBillData = { ...bill };
    props.onFormSubmit(finalBillData);
  };

  const renderFormFields = () => {
    return billSchema.map((field, index) => {
      if (field.attribute === "name") {
        return (
          <div className="col-6 my-2" key={field.attribute}>
            <div className="text-bold my-1">
              <label>Name</label>
            </div>
            <div className="px-0">
              <input
                type="text"
                className="form-control"
                name="name"
                value={bill.name || ""}
                readOnly
                disabled
              />
            </div>
          </div>
        );
      }

      const inputType =
        field.type === "normal" &&
        (field.attribute === "totalDelivered" ||
          field.attribute === "totalMonthlyAmount")
          ? "number"
          : "text";

      const isTextArea = field.type === "text-area";

      const InputComponent = isTextArea ? "textarea" : "input";

      return (
        <div className="col-6 my-2" key={field.attribute}>
          <div className="text-bold my-1">
            <label>
              {field.attribute
                .replace(/([A-Z])/g, " $1")
                .replace(/^./, (str) => str.toUpperCase())}
            </label>
          </div>
          <div className="px-0">
            <InputComponent
              type={inputType}
              className="form-control"
              name={field.attribute}
              value={
                bill[field.attribute] === null ||
                bill[field.attribute] === undefined
                  ? inputType === "number"
                    ? 0
                    : ""
                  : bill[field.attribute]
              }
              onChange={handleTextFieldChange}
              onBlur={handleBlur}
              onFocus={handleFocus}
              placeholder={`Enter ${field.attribute
                .replace(/([A-Z])/g, " $1")
                .toLowerCase()}`}
              {...(isTextArea ? { rows: 5, style: { height: "150px" } } : {})}
            />
          </div>
          <div className="">
            {errorBill[field.attribute]?.message ? (
              <span className="text-danger">
                {errorBill[field.attribute].message}
              </span>
            ) : null}
          </div>
        </div>
      );
    });
  };

  return (
    <div className="p-2">
      <form className="text-thick p-4" onSubmit={handleFormSubmit}>
        <div className="form-group row align-items-center">
          {renderFormFields()}

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

// import { useEffect, useState } from "react";
// import { fieldValidate } from "../external/vite-sdk";
// import "../formstyles.css";

// export default function BillForm(props) {
//   let [bill, setBill] = useState({});
//   let [errorBill, setErrorBill] = useState(props.billValidations);
//   let [flagFormInvalid, setFlagFormInvalid] = useState(false);
//   let { action } = props;
//   let { selectedEntity } = props;
//   let { billSchema } = props;

//   useEffect(() => {
//     window.scroll(0, 0);
//     init();
//   }, [props.action, props.userToBeEdited]);

//   function init() {
//     let { action } = props;
//     if (action === "add") {
//       setBill({ ...props.emptyBill, bill_mode: "Cash" });
//       setErrorBill(props.billValidations);
//     } else if (action === "update") {
//       setFlagFormInvalid(false);

//       const billModeForForm = props.userToBeEdited.bill_mode || "Cash";
//       setBill({ ...props.userToBeEdited, bill_mode: billModeForForm });

//       const initialErrorState = {};
//       for (const key in props.billValidations) {
//           initialErrorState[key] = { ...props.billValidations[key], message: "" };
//       }
//       setErrorBill(initialErrorState);
//     }
//   }

//   function handleTextFieldChange(event) {
//     let name = event.target.name;
//     let value = event.target.value;

//     const currentFieldSchema = billSchema.find(f => f.attribute === name);
//     const isNumberField = (currentFieldSchema && currentFieldSchema.type === 'normal' && (
//                                currentFieldSchema.attribute === 'totalDelivered' ||
//                                currentFieldSchema.attribute === 'totalMonthlyAmount'));

//     let newValueParsed;
//     if (isNumberField) {
//         newValueParsed = parseFloat(value) || 0;
//     } else {
//         newValueParsed = value;
//     }

//     let updatedBill = { ...bill, [name]: newValueParsed };
//     setBill(updatedBill);

//     let message = fieldValidate(event, props.billValidations);
//     let errBill = { ...errorBill };
//     errBill[`${name}`].message = message;
//     setErrorBill(errBill);
//   }

//   function handleRadioButtonChange(event) {
//     const { name, value } = event.target;
//     setBill({ ...bill, [name]: value });
//     let errBill = { ...errorBill };
//     if (errBill[name]) {
//       errBill[name].message = "";
//     }
//     setErrorBill(errBill);
//   }

//   function handleBlur(event) {
//     let name = event.target.name;
//     let message = fieldValidate(event, props.billValidations);
//     let errBill = { ...errorBill };
//     errBill[`${name}`].message = message;
//     setErrorBill(errBill);
//   }

//   function handleFocus(event) {
//     setFlagFormInvalid(false);
//     let name = event.target.name;
//     let errBill = { ...errorBill };
//     if (errBill[name] && errBill[name].message) {
//         errBill[name].message = "";
//         setErrorBill(errBill);
//     }
//   }

//   function checkAllErrors() {
//     let formHasErrors = false;
//     const newErrorBill = {};
//     for (const key in props.billValidations) {
//         newErrorBill[key] = { ...props.billValidations[key], message: "" };
//     }

//     billSchema.forEach((field) => {
//         const attribute = field.attribute;
//         if (attribute === "name") return;

//         const inputType = (field.type === 'normal' && (
//                                 field.attribute === 'totalDelivered' ||
//                                 field.attribute === 'totalMonthlyAmount')) ? 'number' : 'text';

//         const fieldValue = bill[attribute];
//         const validationRule = props.billValidations[attribute];

//         if (validationRule) {
//             let message = "";
//             if (attribute === 'bill_mode') {
//                 if (!fieldValue || fieldValue.trim() === "") {
//                     message = "Required...";
//                 }
//             } else if (
//                 (inputType === 'number' && (fieldValue === null || fieldValue === undefined || fieldValue === "")) ||
//                 (inputType !== 'number' && (fieldValue === "" || fieldValue === null || fieldValue === undefined || String(fieldValue).trim() === ""))
//             ) {
//                 message = "Required...";
//             } else {
//                 const dummyEvent = { target: { name: attribute, value: fieldValue } };
//                 message = fieldValidate(dummyEvent, props.billValidations);
//             }

//             if (message !== "") {
//                 formHasErrors = true;
//                 newErrorBill[attribute].message = message;
//             }
//         }
//     });

//     setErrorBill(newErrorBill);
//     return formHasErrors;
//   }

//   const handleFormSubmit = (e) => {
//     e.preventDefault();
//     if (checkAllErrors()) {
//       setFlagFormInvalid(true);
//       return;
//     }
//     setFlagFormInvalid(false);

//     const finalBillData = { ...bill };
//     props.onFormSubmit(finalBillData);
//   };

//   const renderFormFields = () => {
//     return billSchema.map((field, index) => {
//       if (field.attribute === "name") {
//         return (
//             <div className="col-6 my-2" key={field.attribute}>
//               <div className="text-bold my-1">
//                 <label>Name</label>
//               </div>
//               <div className="px-0">
//                 <input
//                   type="text"
//                   className="form-control"
//                   name="name"
//                   value={bill.name || ""}
//                   readOnly
//                   disabled
//                 />
//               </div>
//             </div>
//         );
//       }

//       if (field.attribute === "bill_mode") {
//         return (
//           <div className="col-6 my-2" key={field.attribute}>
//             <div className="text-bold my-1">
//               <label>Bill Mode</label>
//             </div>
//             <div className="px-0">
//               <div className="form-check form-check-inline">
//                 <input
//                   className="form-check-input"
//                   type="radio"
//                   name="bill_mode"
//                   id="billModeCash"
//                   value="Cash"
//                   checked={bill.bill_mode === "Cash"}
//                   onChange={handleRadioButtonChange}
//                   onBlur={handleBlur}
//                   onFocus={handleFocus}
//                 />
//                 <label className="form-check-label" htmlFor="billModeCash">Cash</label>
//               </div>
//               <div className="form-check form-check-inline">
//                 <input
//                   className="form-check-input"
//                   type="radio"
//                   name="bill_mode"
//                   id="billModeOnline"
//                   value="Online"
//                   checked={bill.bill_mode === "Online"}
//                   onChange={handleRadioButtonChange}
//                   onBlur={handleBlur}
//                   onFocus={handleFocus}
//                 />
//                 <label className="form-check-label" htmlFor="billModeOnline">Online</label>
//               </div>
//             </div>
//             <div className="">
//               {errorBill[field.attribute]?.message ? (
//                 <span className="text-danger">
//                   {errorBill[field.attribute].message}
//                 </span>
//               ) : null}
//             </div>
//           </div>
//         );
//       }

//       const inputType =
//         field.type === "normal" &&
//         (field.attribute === "totalDelivered" ||
//           field.attribute === "totalMonthlyAmount")
//           ? "number"
//           : "text";

//       const isTextArea = field.type === "text-area";

//       const InputComponent = isTextArea ? "textarea" : "input";

//       return (
//         <div className="col-6 my-2" key={field.attribute}>
//           <div className="text-bold my-1">
//             <label>
//               {field.attribute
//                 .replace(/([A-Z])/g, " $1")
//                 .replace(/^./, (str) => str.toUpperCase())}
//             </label>
//           </div>
//           <div className="px-0">
//             <InputComponent
//               type={inputType}
//               className="form-control"
//               name={field.attribute}
//               value={
//                   bill[field.attribute] === null || bill[field.attribute] === undefined
//                     ? (inputType === "number" ? 0 : "")
//                     : bill[field.attribute]
//               }
//               onChange={handleTextFieldChange}
//               onBlur={handleBlur}
//               onFocus={handleFocus}
//               placeholder={`Enter ${field.attribute
//                 .replace(/([A-Z])/g, " $1")
//                 .toLowerCase()}`}
//               {...(isTextArea ? { rows: 5, style: { height: "150px" } } : {})}
//             />
//           </div>
//           <div className="">
//             {errorBill[field.attribute]?.message ? (
//               <span className="text-danger">
//                 {errorBill[field.attribute].message}
//               </span>
//             ) : null}
//           </div>
//         </div>
//       );
//     });
//   };

//   return (
//     <div className="p-2">
//       <form className="text-thick p-4" onSubmit={handleFormSubmit}>
//         <div className="form-group row align-items-center">
//           {renderFormFields()}

//           <div className="col-12">
//             <button
//               className="btn btn-primary"
//               type="submit"
//             >
//               {(action + " " + selectedEntity.singularName).toUpperCase()}
//             </button>{" "}
//             &nbsp;{" "}
//             <span className="text-danger">
//               {" "}
//               {flagFormInvalid ? "Missing data.." : ""}
//             </span>
//           </div>
//         </div>
//       </form>
//     </div>
//   );
// }

// // import { useEffect, useState } from "react";
// // import { fieldValidate } from "../external/vite-sdk";
// // import "../formstyles.css";

// // export default function BillForm(props) {
// //   let [bill, setBill] = useState({});
// //   let [originalCumulativePaidAmount, setOriginalCumulativePaidAmount] = useState(0);

// //   let [errorBill, setErrorBill] = useState(props.billValidations);
// //   let [flagFormInvalid, setFlagFormInvalid] = useState(false);
// //   let { action } = props;
// //   let { selectedEntity } = props;
// //   let { billSchema } = props;

// //   useEffect(() => {
// //     window.scroll(0, 0);
// //     init();
// //   }, [props.action, props.userToBeEdited]);

// //   function init() {
// //     let { action } = props;
// //     if (action === "add") {
// //       setBill({ ...props.emptyBill, paidAmount: null, bill_mode: "Cash" }); // Default to Cash for new additions
// //       setOriginalCumulativePaidAmount(0);
// //       setErrorBill(props.billValidations);
// //     } else if (action === "update") {
// //       setFlagFormInvalid(false);

// //       const paidAmountForForm = props.userToBeEdited.paidAmount === 0 ? null : props.userToBeEdited.paidAmount;
// //       const billModeForForm = props.userToBeEdited.bill_mode || "Cash"; // Default to Cash if not set
// //       setBill({ ...props.userToBeEdited, paidAmount: paidAmountForForm, bill_mode: billModeForForm });
// //       setOriginalCumulativePaidAmount(parseFloat(props.userToBeEdited.paidAmount) || 0);

// //       const initialErrorState = {};
// //       for (const key in props.billValidations) {
// //           initialErrorState[key] = { ...props.billValidations[key], message: "" };
// //       }
// //       setErrorBill(initialErrorState);
// //     }
// //   }

// //   function handleTextFieldChange(event) {
// //     let name = event.target.name;
// //     let value = event.target.value;

// //     const currentFieldSchema = billSchema.find(f => f.attribute === name);
// //     const isNumberField = (currentFieldSchema && currentFieldSchema.type === 'normal' && (
// //                            currentFieldSchema.attribute === 'totalDelivered' ||
// //                            currentFieldSchema.attribute === 'totalMonthlyAmount' ||
// //                            currentFieldSchema.attribute === 'paidAmount' ||
// //                            currentFieldSchema.attribute === 'balanceAmount'));

// //     let newValueParsed;
// //     if (name === 'paidAmount' && value === "") {
// //         newValueParsed = null;
// //     } else if (isNumberField) {
// //         newValueParsed = parseFloat(value) || 0;
// //     } else {
// //         newValueParsed = value;
// //     }

// //     let updatedBill = { ...bill, [name]: newValueParsed };

// //     const currentTotalMonthlyAmount = parseFloat(updatedBill.totalMonthlyAmount) || 0;
// //     const newAmountEnteredInPaidField = parseFloat(updatedBill.paidAmount) || 0;

// //     const effectiveCumulativePaidAmount = originalCumulativePaidAmount + newAmountEnteredInPaidField;

// //     updatedBill.balanceAmount = currentTotalMonthlyAmount - effectiveCumulativePaidAmount;

// //     setBill(updatedBill);

// //     let message = fieldValidate(event, props.billValidations);
// //     let errBill = { ...errorBill };
// //     errBill[`${name}`].message = message;
// //     setErrorBill(errBill);
// //   }

// //   // New handler for radio button change
// //   function handleRadioButtonChange(event) {
// //     const { name, value } = event.target;
// //     setBill({ ...bill, [name]: value });
// //     let errBill = { ...errorBill };
// //     if (errBill[name]) {
// //       errBill[name].message = "";
// //     }
// //     setErrorBill(errBill);
// //   }

// //   function handleBlur(event) {
// //     let name = event.target.name;
// //     let message = fieldValidate(event, props.billValidations);
// //     let errBill = { ...errorBill };
// //     errBill[`${name}`].message = message;
// //     setErrorBill(errBill);
// //   }

// //   function handleFocus(event) {
// //     setFlagFormInvalid(false);
// //     let name = event.target.name;
// //     let errBill = { ...errorBill };
// //     if (errBill[name] && errBill[name].message) {
// //         errBill[name].message = "";
// //         setErrorBill(errBill);
// //     }
// //   }

// //   function checkAllErrors() {
// //     let formHasErrors = false;
// //     const newErrorBill = {};
// //     for (const key in props.billValidations) {
// //         newErrorBill[key] = { ...props.billValidations[key], message: "" };
// //     }

// //     billSchema.forEach((field) => {
// //         const attribute = field.attribute;
// //         if (attribute === "name") return;

// //         const inputType = (field.type === 'normal' && (
// //                             field.attribute === 'totalDelivered' ||
// //                             field.attribute === 'totalMonthlyAmount' ||
// //                             field.attribute === 'paidAmount' ||
// //                             field.attribute === 'balanceAmount')) ? 'number' : 'text';

// //         const fieldValue = bill[attribute];
// //         const validationRule = props.billValidations[attribute];

// //         if (validationRule) {
// //             let message = "";
// //             if (attribute === 'paidAmount') {
// //                 if (fieldValue !== null && isNaN(parseFloat(fieldValue))) {
// //                     message = "Enter a valid number.";
// //                 }
// //             } else if (attribute === 'bill_mode') { // Specific validation for bill_mode
// //                 if (!fieldValue || fieldValue.trim() === "") { // Ensure a mode is selected
// //                     message = "Required...";
// //                 }
// //             }
// //             else if (
// //                 (inputType === 'number' && (fieldValue === null || fieldValue === undefined || fieldValue === "")) ||
// //                 (inputType !== 'number' && (fieldValue === "" || fieldValue === null || fieldValue === undefined || String(fieldValue).trim() === ""))
// //             ) {
// //                 message = "Required...";
// //             } else {
// //                 const dummyEvent = { target: { name: attribute, value: fieldValue } };
// //                 message = fieldValidate(dummyEvent, props.billValidations);
// //             }

// //             if (message !== "") {
// //                 formHasErrors = true;
// //                 newErrorBill[attribute].message = message;
// //             }
// //         }
// //     });

// //     setErrorBill(newErrorBill);
// //     return formHasErrors;
// //   }

// //   const handleFormSubmit = (e) => {
// //     e.preventDefault();
// //     if (checkAllErrors()) {
// //       setFlagFormInvalid(true);
// //       return;
// //     }
// //     setFlagFormInvalid(false);

// //     const finalBillData = { ...bill };

// //     const newAmountEntered = parseFloat(finalBillData.paidAmount) || 0;
// //     finalBillData.paidAmount = originalCumulativePaidAmount + newAmountEntered;

// //     finalBillData.balanceAmount = (parseFloat(finalBillData.totalMonthlyAmount) || 0) - finalBillData.paidAmount;

// //     if (finalBillData.paidAmount === null || isNaN(finalBillData.paidAmount)) {
// //         finalBillData.paidAmount = 0;
// //     }

// //     props.onFormSubmit(finalBillData);
// //   };

// //   const renderFormFields = () => {
// //     return billSchema.map((field, index) => {
// //       if (field.attribute === "name") {
// //         return (
// //             <div className="col-6 my-2" key={field.attribute}>
// //               <div className="text-bold my-1">
// //                 <label>Name</label>
// //               </div>
// //               <div className="px-0">
// //                 <input
// //                   type="text"
// //                   className="form-control"
// //                   name="name"
// //                   value={bill.name || ""}
// //                   readOnly
// //                   disabled
// //                 />
// //               </div>
// //             </div>
// //         );
// //       }

// //       // Render Bill Mode as radio buttons
// //       if (field.attribute === "bill_mode") {
// //         return (
// //           <div className="col-6 my-2" key={field.attribute}>
// //             <div className="text-bold my-1">
// //               <label>Bill Mode</label>
// //             </div>
// //             <div className="px-0">
// //               <div className="form-check form-check-inline">
// //                 <input
// //                   className="form-check-input"
// //                   type="radio"
// //                   name="bill_mode"
// //                   id="billModeCash"
// //                   value="Cash"
// //                   checked={bill.bill_mode === "Cash"}
// //                   onChange={handleRadioButtonChange}
// //                   onBlur={handleBlur}
// //                   onFocus={handleFocus}
// //                 />
// //                 <label className="form-check-label" htmlFor="billModeCash">Cash</label>
// //               </div>
// //               <div className="form-check form-check-inline">
// //                 <input
// //                   className="form-check-input"
// //                   type="radio"
// //                   name="bill_mode"
// //                   id="billModeOnline"
// //                   value="Online"
// //                   checked={bill.bill_mode === "Online"}
// //                   onChange={handleRadioButtonChange}
// //                   onBlur={handleBlur}
// //                   onFocus={handleFocus}
// //                 />
// //                 <label className="form-check-label" htmlFor="billModeOnline">Online</label>
// //               </div>
// //             </div>
// //             <div className="">
// //               {errorBill[field.attribute]?.message ? (
// //                 <span className="text-danger">
// //                   {errorBill[field.attribute].message}
// //                 </span>
// //               ) : null}
// //             </div>
// //           </div>
// //         );
// //       }

// //       // General rendering for other input fields
// //       const inputType =
// //         field.type === "normal" &&
// //         (field.attribute === "totalDelivered" ||
// //           field.attribute === "totalMonthlyAmount" ||
// //           field.attribute === "paidAmount" ||
// //           field.attribute === "balanceAmount")
// //           ? "number"
// //           : "text";

// //       const isTextArea = field.type === "text-area";

// //       const InputComponent = isTextArea ? "textarea" : "input";

// //       return (
// //         <div className="col-6 my-2" key={field.attribute}>
// //           <div className="text-bold my-1">
// //             <label>
// //               {field.attribute
// //                 .replace(/([A-Z])/g, " $1")
// //                 .replace(/^./, (str) => str.toUpperCase())}
// //             </label>
// //           </div>
// //           <div className="px-0">
// //             <InputComponent
// //               type={inputType}
// //               className="form-control"
// //               name={field.attribute}
// //               value={
// //                   field.attribute === 'paidAmount'
// //                     ? (bill[field.attribute] === null || bill[field.attribute] === undefined ? "" : bill[field.attribute])
// //                     : bill[field.attribute] === null || bill[field.attribute] === undefined
// //                       ? (inputType === "number" ? 0 : "")
// //                       : bill[field.attribute]
// //               }
// //               onChange={handleTextFieldChange}
// //               onBlur={handleBlur}
// //               onFocus={handleFocus}
// //               placeholder={`Enter ${field.attribute
// //                 .replace(/([A-Z])/g, " $1")
// //                 .toLowerCase()}`}
// //               {...(field.attribute === 'balanceAmount' ? { readOnly: true, disabled: true } : {})}
// //               {...(isTextArea ? { rows: 5, style: { height: "150px" } } : {})}
// //             />
// //           </div>
// //           <div className="">
// //             {errorBill[field.attribute]?.message ? (
// //               <span className="text-danger">
// //                 {errorBill[field.attribute].message}
// //               </span>
// //             ) : null}
// //           </div>
// //         </div>
// //       );
// //     });
// //   };

// //   return (
// //     <div className="p-2">
// //       <form className="text-thick p-4" onSubmit={handleFormSubmit}>
// //         <div className="form-group row align-items-center">
// //           {renderFormFields()}

// //           <div className="col-12">
// //             <button
// //               className="btn btn-primary"
// //               type="submit"
// //             >
// //               {(action + " " + selectedEntity.singularName).toUpperCase()}
// //             </button>{" "}
// //             &nbsp;{" "}
// //             <span className="text-danger">
// //               {" "}
// //               {flagFormInvalid ? "Missing data.." : ""}
// //             </span>
// //           </div>
// //         </div>
// //       </form>
// //     </div>
// //   );
// // }
