import { useEffect } from "react";

export default function ChangeQtyModal({
  user,
  qty,
  onQtyChange,
  onSave,
  onClose,
}) {
  useEffect(() => {
    document.body.style.overflowY = "hidden";
    return () => {
      document.body.style.overflowY = "scroll";
    };
  }, []);

  return (
    <>
      <div className="modal-wrapper" onClick={onClose}></div>
      <div className="modal-container">
        <div className="text-bigger d-flex justify-content-between bg-primary text-white mb-3 p-2">
          <div>Change Delivered Quantity</div>
          <div onClick={onClose}>
            <i className="bi bi-x-square"></i>
          </div>
        </div>

        <div className="text-center my-3">
          <div>
            <strong>Name:</strong> {user?.name}
          </div>
          <div className="my-3">
            <label htmlFor="deliveredQty">Delivered Qty (Liters):</label>
            <input
              type="number"
              className="form-control w-50 mx-auto mt-2"
              id="deliveredQty"
              value={qty}
              onChange={onQtyChange}
              min="0"
              step="0.25"
            />
          </div>
        </div>

        <div className="text-center my-4">
          <button className="btn btn-success mx-2" onClick={onSave}>
            Save
          </button>
          <button className="btn btn-danger mx-2" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </>
  );
}
