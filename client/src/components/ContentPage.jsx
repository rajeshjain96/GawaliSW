import AdminAreas from "./AdminAreas";
import AdminDailyEntry from "./AdminDailyEntry";
import AdminProducts from "./AdminProducts";
import AdminReportActivities from "./AdminReportActivities";
import AdminRoles from "./AdminRoles";
import AdminUsers from "./AdminUsers";
import AdminPayments from "./AdminPayments";
import BackButton from "./BackButton";
import MilkRates from "./MilkRates";
import AdminBills from "./AdminBills";
import AdminCustomers from "./AdminCustomers";

export default function ContentPage(props) {
  let { selectedEntity } = props;
  let { flagToggleButton, onBack } = props;
  let { user } = props;
  return (
    <>
      <div className="text-center">
        <BackButton onBack={onBack} />
      </div>
      {selectedEntity.isReady == false && (
        <h5 className="text-center">Work in Progress !</h5>
      )}
      {selectedEntity.name == "Products" && (
        <AdminProducts
          selectedEntity={selectedEntity}
          flagToggleButton={flagToggleButton}
        />
      )}
      {selectedEntity.name == "Areas" && (
        <AdminAreas
          selectedEntity={selectedEntity}
          flagToggleButton={flagToggleButton}
          user={user}
        />
      )}
      {selectedEntity.name == "Quotations" && (
        <AdminQuotations
          selectedEntity={selectedEntity}
          flagToggleButton={flagToggleButton}
        />
      )}
      {selectedEntity.name == "Users" && (
        <AdminUsers
          selectedEntity={selectedEntity}
          flagToggleButton={flagToggleButton}
        />
      )}

      {/* added by rutuja */}
      {selectedEntity.name == "Customers" && (
        <AdminCustomers
          selectedEntity={selectedEntity}
          flagToggleButton={flagToggleButton}
        />
      )}
      {selectedEntity.name == "DailyEntries" && (
        <AdminDailyEntry
          selectedEntity={selectedEntity}
          flagToggleButton={flagToggleButton}
        />
      )}
      {selectedEntity.name == "Payments" && (
        <AdminPayments
          selectedEntity={selectedEntity}
          flagToggleButton={flagToggleButton}
        />
      )}
      {/* {selectedEntity.name == "Calculations" && (
        <Calculations
          selectedEntity={selectedEntity}
          flagToggleButton={flagToggleButton}
        />
      )} */}
      {selectedEntity.name == "Bills" && (
        <AdminBills
          selectedEntity={selectedEntity}
          flagToggleButton={flagToggleButton}
        />
      )}
      {selectedEntity.name == "MilkRates" && (
        <MilkRates
          selectedEntity={selectedEntity}
          flagToggleButton={flagToggleButton}
        />
      )}
      {/* till here */}

      {selectedEntity.name == "Roles" && (
        <AdminRoles
          selectedEntity={selectedEntity}
          flagToggleButton={flagToggleButton}
        />
      )}
      {selectedEntity.name == "Activity Report" && (
        <AdminReportActivities
          selectedEntity={selectedEntity}
          flagToggleButton={flagToggleButton}
        />
      )}
    </>
  );
}
