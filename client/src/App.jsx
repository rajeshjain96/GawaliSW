import "./App.css";
import MainPage from "./components/MainPage";
import axios from "axios";
import { Route, BrowserRouter as Router, Routes, useParams, useSearchParams } from "react-router-dom";
import SampleForm from "./components/sampleForm";
import Resources from "./components/Resources";
import AdminEnquiryFiles from "./components/AdminEnquiryFiles";
import AdminEnquiryRemarks from "./components/AdminEnquiryRemarks";
import ClientResources from "./components/ClientResources";
import Bills from "./components/Bills";
import BillShare from "./components/BillShare";

const BillShareRouteWrapper = () => {
  const { userId } = useParams();
  const [searchParams] = useSearchParams();
  const month = searchParams.get('month');
  const year = searchParams.get('year');

  return (
    <BillShare
      billId={userId}
      selectedMonth={month}
      selectedYear={year}
      onClose={() => window.history.back()}
    />
  );
};

const BillsRouteWrapper = () => {
  const { year, month } = useParams(); 
  const today = new Date();
  const defaultMonth = (today.getMonth() + 1).toString().padStart(2, "0");
  const defaultYear = today.getFullYear().toString();

  return (
    <Bills
      initialYear={year || defaultYear}   
      initialMonth={month || defaultMonth}  
    />
  );
};

function App() {
  axios.defaults.withCredentials = true; 

  return (
    <>
      <Router>
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/sampleForm" element={<SampleForm />} />
          <Route path="/ClientResources" element={<ClientResources />} />
          <Route
            path="/AdminEnquiryRemarks"
            element={<AdminEnquiryRemarks />}
          />
          <Route path="/AdminEnquiryFiles" element={<AdminEnquiryFiles />} />
          <Route path="/resources" element={<Resources />} />
          <Route path="/bills/:year/:month" element={<BillsRouteWrapper />} />
          <Route path="/bills" element={<BillsRouteWrapper />} />
          <Route path="/bills/share/:userId" element={<BillShareRouteWrapper />} />

        </Routes>
      </Router>
    </>
  );
}
export default App;