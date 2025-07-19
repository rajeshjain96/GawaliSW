import AdminAreas from "./AdminAreas";
import AdminDailyEntry from "./AdminDailyEntry";
// import AdminCustomers from "./AdminCustomers";
import AdminEnquiries from "./AdminEnquiries";
import AdminProducts from "./AdminProducts";
import AdminQuotations from "./AdminQuotations";
import AdminReportActivities from "./AdminReportActivities";
import AdminRoles from "./AdminRoles";
import AdminUsers from "./AdminUsers";
import Customers from "./Customers"
import Payments from "./Payments";
import Calculations from "./Caculations"

export default function ContentPage(props) {
  let { selectedEntity } = props;
  let { flagToggleButton } = props;
  let { user } = props;
  return (
    <>
      {selectedEntity.isReady == false && (
        <h5 className="text-center">Work in Progress !</h5>
      )}
      {selectedEntity.name == "Products" && (
        <AdminProducts
          selectedEntity={selectedEntity}
          flagToggleButton={flagToggleButton}
        />
      )}
      {selectedEntity.name == "Enquiries" && (
        <AdminEnquiries
          selectedEntity={selectedEntity}
          flagToggleButton={flagToggleButton}
          user={user}
        />
      )}
      {/* {selectedEntity.name == "Customers" && (
        <AdminCustomers
          selectedEntity={selectedEntity}
          flagToggleButton={flagToggleButton}
        />
      )} */}
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
        <Customers
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
        <Payments
          selectedEntity={selectedEntity}
          flagToggleButton={flagToggleButton}
        />
      )}
       {selectedEntity.name == "Calculations" && (
        <Calculations
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