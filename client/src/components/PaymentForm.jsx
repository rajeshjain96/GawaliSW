import { useEffect, useState } from "react";
import { fieldValidate } from "../external/vite-sdk";
import "../formstyles.css";

export default function PaymentForm(props) {
  let [payment, setPayment] = useState({});
  let [originalCumulativePaidAmount, setOriginalCumulativePaidAmount] = useState(0);

  let [errorPayment, setErrorPayment] = useState(props.paymentValidations);
  let [flagFormInvalid, setFlagFormInvalid] = useState(false);
  let { action } = props;
  let { selectedEntity } = props;
  let { paymentSchema } = props;

  useEffect(() => {
    window.scroll(0, 0);
    init();
  }, [props.action, props.userToBeEdited]);

  function init() {
    let { action } = props;
    if (action === "add") {
      setPayment({ ...props.emptyPayment, paidAmount: null, payment_mode: "Cash" }); // Default to Cash for new additions
      setOriginalCumulativePaidAmount(0);
      setErrorPayment(props.paymentValidations);
    } else if (action === "update") {
      setFlagFormInvalid(false);
      
      const paidAmountForForm = props.userToBeEdited.paidAmount === 0 ? null : props.userToBeEdited.paidAmount;
      const paymentModeForForm = props.userToBeEdited.payment_mode || "Cash"; // Default to Cash if not set
      setPayment({ ...props.userToBeEdited, paidAmount: paidAmountForForm, payment_mode: paymentModeForForm }); 
      setOriginalCumulativePaidAmount(parseFloat(props.userToBeEdited.paidAmount) || 0);

      const initialErrorState = {};
      for (const key in props.paymentValidations) {
          initialErrorState[key] = { ...props.paymentValidations[key], message: "" };
      }
      setErrorPayment(initialErrorState);
    }
  }

  function handleTextFieldChange(event) {
    let name = event.target.name;
    let value = event.target.value;

    const currentFieldSchema = paymentSchema.find(f => f.attribute === name);
    const isNumberField = (currentFieldSchema && currentFieldSchema.type === 'normal' && (
                           currentFieldSchema.attribute === 'totalDelivered' ||
                           currentFieldSchema.attribute === 'totalMonthlyAmount' ||
                           currentFieldSchema.attribute === 'paidAmount' ||
                           currentFieldSchema.attribute === 'balanceAmount'));
    
    let newValueParsed;
    if (name === 'paidAmount' && value === "") {
        newValueParsed = null;
    } else if (isNumberField) {
        newValueParsed = parseFloat(value) || 0;
    } else {
        newValueParsed = value;
    }

    let updatedPayment = { ...payment, [name]: newValueParsed };

    const currentTotalMonthlyAmount = parseFloat(updatedPayment.totalMonthlyAmount) || 0;
    const newAmountEnteredInPaidField = parseFloat(updatedPayment.paidAmount) || 0;
    
    const effectiveCumulativePaidAmount = originalCumulativePaidAmount + newAmountEnteredInPaidField;
    
    updatedPayment.balanceAmount = currentTotalMonthlyAmount - effectiveCumulativePaidAmount;

    setPayment(updatedPayment);

    let message = fieldValidate(event, props.paymentValidations);
    let errPayment = { ...errorPayment };
    errPayment[`${name}`].message = message;
    setErrorPayment(errPayment);
  }

  // New handler for radio button change
  function handleRadioButtonChange(event) {
    const { name, value } = event.target;
    setPayment({ ...payment, [name]: value });
    let errPayment = { ...errorPayment };
    if (errPayment[name]) {
      errPayment[name].message = "";
    }
    setErrorPayment(errPayment);
  }

  function handleBlur(event) {
    let name = event.target.name;
    let message = fieldValidate(event, props.paymentValidations);
    let errPayment = { ...errorPayment };
    errPayment[`${name}`].message = message;
    setErrorPayment(errPayment);
  }

  function handleFocus(event) {
    setFlagFormInvalid(false);
    let name = event.target.name;
    let errPayment = { ...errorPayment };
    if (errPayment[name] && errPayment[name].message) {
        errPayment[name].message = "";
        setErrorPayment(errPayment);
    }
  }

  function checkAllErrors() {
    let formHasErrors = false;
    const newErrorPayment = {};
    for (const key in props.paymentValidations) {
        newErrorPayment[key] = { ...props.paymentValidations[key], message: "" };
    }

    paymentSchema.forEach((field) => {
        const attribute = field.attribute;
        if (attribute === "name") return;

        const inputType = (field.type === 'normal' && (
                            field.attribute === 'totalDelivered' ||
                            field.attribute === 'totalMonthlyAmount' ||
                            field.attribute === 'paidAmount' ||
                            field.attribute === 'balanceAmount')) ? 'number' : 'text';

        const fieldValue = payment[attribute];
        const validationRule = props.paymentValidations[attribute];

        if (validationRule) {
            let message = "";
            if (attribute === 'paidAmount') {
                if (fieldValue !== null && isNaN(parseFloat(fieldValue))) {
                    message = "Enter a valid number.";
                }
            } else if (attribute === 'payment_mode') { // Specific validation for payment_mode
                if (!fieldValue || fieldValue.trim() === "") { // Ensure a mode is selected
                    message = "Required...";
                }
            }
            else if (
                (inputType === 'number' && (fieldValue === null || fieldValue === undefined || fieldValue === "")) ||
                (inputType !== 'number' && (fieldValue === "" || fieldValue === null || fieldValue === undefined || String(fieldValue).trim() === ""))
            ) {
                message = "Required...";
            } else {
                const dummyEvent = { target: { name: attribute, value: fieldValue } };
                message = fieldValidate(dummyEvent, props.paymentValidations);
            }

            if (message !== "") {
                formHasErrors = true;
                newErrorPayment[attribute].message = message;
            }
        }
    });

    setErrorPayment(newErrorPayment);
    return formHasErrors;
  }

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (checkAllErrors()) {
      setFlagFormInvalid(true);
      return;
    }
    setFlagFormInvalid(false);

    const finalPaymentData = { ...payment };
    
    const newAmountEntered = parseFloat(finalPaymentData.paidAmount) || 0;
    finalPaymentData.paidAmount = originalCumulativePaidAmount + newAmountEntered;
    
    finalPaymentData.balanceAmount = (parseFloat(finalPaymentData.totalMonthlyAmount) || 0) - finalPaymentData.paidAmount;

    if (finalPaymentData.paidAmount === null || isNaN(finalPaymentData.paidAmount)) {
        finalPaymentData.paidAmount = 0;
    }

    props.onFormSubmit(finalPaymentData);
  };

  const renderFormFields = () => {
    return paymentSchema.map((field, index) => {
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
                  value={payment.name || ""}
                  readOnly
                  disabled
                />
              </div>
            </div>
        );
      }

      // Render Payment Mode as radio buttons
      if (field.attribute === "payment_mode") {
        return (
          <div className="col-6 my-2" key={field.attribute}>
            <div className="text-bold my-1">
              <label>Payment Mode</label>
            </div>
            <div className="px-0">
              <div className="form-check form-check-inline">
                <input
                  className="form-check-input"
                  type="radio"
                  name="payment_mode"
                  id="paymentModeCash"
                  value="Cash"
                  checked={payment.payment_mode === "Cash"}
                  onChange={handleRadioButtonChange}
                  onBlur={handleBlur}
                  onFocus={handleFocus}
                />
                <label className="form-check-label" htmlFor="paymentModeCash">Cash</label>
              </div>
              <div className="form-check form-check-inline">
                <input
                  className="form-check-input"
                  type="radio"
                  name="payment_mode"
                  id="paymentModeOnline"
                  value="Online"
                  checked={payment.payment_mode === "Online"}
                  onChange={handleRadioButtonChange}
                  onBlur={handleBlur}
                  onFocus={handleFocus}
                />
                <label className="form-check-label" htmlFor="paymentModeOnline">Online</label>
              </div>
            </div>
            <div className="">
              {errorPayment[field.attribute]?.message ? (
                <span className="text-danger">
                  {errorPayment[field.attribute].message}
                </span>
              ) : null}
            </div>
          </div>
        );
      }

      // General rendering for other input fields
      const inputType =
        field.type === "normal" &&
        (field.attribute === "totalDelivered" ||
          field.attribute === "totalMonthlyAmount" ||
          field.attribute === "paidAmount" ||
          field.attribute === "balanceAmount")
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
                  field.attribute === 'paidAmount'
                    ? (payment[field.attribute] === null || payment[field.attribute] === undefined ? "" : payment[field.attribute])
                    : payment[field.attribute] === null || payment[field.attribute] === undefined
                      ? (inputType === "number" ? 0 : "")
                      : payment[field.attribute]
              }
              onChange={handleTextFieldChange}
              onBlur={handleBlur}
              onFocus={handleFocus}
              placeholder={`Enter ${field.attribute
                .replace(/([A-Z])/g, " $1")
                .toLowerCase()}`}
              {...(field.attribute === 'balanceAmount' ? { readOnly: true, disabled: true } : {})}
              {...(isTextArea ? { rows: 5, style: { height: "150px" } } : {})}
            />
          </div>
          <div className="">
            {errorPayment[field.attribute]?.message ? (
              <span className="text-danger">
                {errorPayment[field.attribute].message}
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
            <button
              className="btn btn-primary"
              type="submit"
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