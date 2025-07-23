import { useEffect, useState } from "react";
import ContentPage from "./ContentPage";
import LoginSignupPage from "./LoginSignupPage";
import axios from "axios";
import { BeatLoader } from "react-spinners";

export default function MainPage() {
  let [selectedEntity, setSelectedEntity] = useState("");
  let [user, setUser] = useState(""); 
  let [view, setView] = useState("home"); 
  let [flagLoad, setFlagLoad] = useState(false);
  let [message, setMessage] = useState("");
  let [selectedMenuIndex, setSelectedMenuIndex] = useState(-1);
  let [selectedEntityIndex, setSelectedEntityIndex] = useState(-1);

  let menus = [
    {
      name: "Manage",
      accessLevel: "D",
      entities: [
        // {
        //   name: "Products",
        //   singularName: "Product",
        //   addFacility: true,
        //   deleteFacility: true,
        //   editFacility: true,
        //   isReady: true,
        //   accessLevel: "D",
        // },
        // {
        //   name: "Enquiries",
        //   singularName: "Enquiry",
        //   addFacility: true,
        //   deleteFacility: true,
        //   editFacility: true,
        //   isReady: true,
        //   accessLevel: "D",
        // },
        {
          name: "Areas",
          singularName: "Area",
          addFacility: true,
          deleteFacility: true,
          editFacility: true,
          isReady: true,
          accessLevel: "A",
        },
        {
          name: "Customers",
          singularName: "Customer",
          addFacility: true,
          deleteFacility: true,
          editFacility: true,
          isReady: true,
          dbCollection: "users",
          accessLevel: "A",
        },
        {
          name: "DailyEntries",
          singularName: "DailyEntry",
          addFacility: false,
          deleteFacility: false,
          editFacility: false,
          isReady: true,
          dbCollection: "entries",
          accessLevel: "A",
        },
        {
          name: "Payments",
          singularName: "Payment",
          addFacility: false,
          deleteFacility: true,
          editFacility: true,
          isReady: true,
          dbCollection: "payments",
          accessLevel: "A",
        },
        {
          name: "Bills",
          singularName: "Bill",
          addFacility: true,
          deleteFacility: false,
          editFacility: false,
          isReady: true,
          dbCollection: "bills",
          accessLevel: "A",
        },
      ],
    },
    {
      name: "Settings",
      accessLevel: "A",
      entities: [
        {
          name: "Users",
          singularName: "User",
          dbCollection: "users",
          addFacility: true,
          deleteFacility: true,
          editFacility: true,
          accessLevel: "A",
        },
        {
          name: "Roles",
          singularName: "Role",
          dbCollection: "roles",
          addFacility: true,
          deleteFacility: true,
          editFacility: true,
          accessLevel: "A",
        },
        {
          name: "MilkRates",
          singularName: "MilkRate",
          dbCollection: "roles",
          addFacility: true,
          deleteFacility: true,
          editFacility: false,
          accessLevel: "A",
        },
      ],
    },
    {
      accessLevel: "D",
      name: "Reports",
      entities: [
        {
          name: "Activity Report",
          singularName: "Activity",
          dbCollection: "activities",
          addFacility: false,
          deleteFacility: true,
          editFacility: true,
          accessLevel: "A",
        },
      ],
    },
  ];

  useEffect(() => {
    setSession();
  }, []);

  async function setSession() {
    setFlagLoad(true);
    try {
      let response = await axios.get(
        import.meta.env.VITE_API_URL + "/specials/welcome"
      );
      if (response.data.role != "new" && response.data.role != "guest") {
        setUser(response.data);
      }
    } catch (error) {
      showMessage("Something went wrong, refresh the page");
    }
    setFlagLoad(false);
  }

  function showMessage(message) {
    setMessage(message);
    window.setTimeout(() => {
      setMessage("");
    }, 3000);
  }

  function handleEntityClick(selectedIndex) {
    if (!user) {
      showMessage("Please log in to access this option.");
      return;
    }

    console.log(menus[selectedMenuIndex].entities[selectedIndex].name);

    if (
      selectedEntity.name ==
      menus[selectedMenuIndex].entities[selectedIndex].name
    ) {
      setSelectedMenuIndex(-1);
      setSelectedEntityIndex(-1);
      setView("home");
      return;
    }
    setSelectedEntityIndex(selectedIndex);
    setSelectedEntity(menus[selectedMenuIndex].entities[selectedIndex]);
    setView("content");
  }

  function handleSideBarMenuClick(index) {
    if (!user) {
      showMessage("Please log in to access menu options.");
      return;
    }

    if (selectedMenuIndex == index) {
      setSelectedMenuIndex(-1);
    } else {
      setSelectedMenuIndex(index);
    }
    setSelectedEntityIndex(-1);
    setSelectedEntity("");
  }

  function handleLogInSignupButtonClick() {
    setView("loginSignup");
  }

  async function setLoggedinUser(loggedinUser) {
    setView("home");
    setUser(loggedinUser);
  }

  function handleSignoutClick() {
    setUser("");
    setView("home");
    axios.post(import.meta.env.VITE_API_URL + "/users/signout");
  }

  function handleCloseLoginSignupPageClose() {
    setView("home");
  }

  function handleBackToHome() {
    setView("home");
    setSelectedMenuIndex(-1); 
    setSelectedEntityIndex(-1); 
    setSelectedEntity(""); 
  }

  if (flagLoad) {
    return (
      <div className="my-5 text-center">
        <BeatLoader size={24} color={"blue"} />
      </div>
    );
  }

  return (
    <>
      {message && (
        <div className="text-center bg-danger text-white w-50 mx-auto mb-2 p-1">
          {message.toUpperCase()}
        </div>
      )}
      {view === "home" ? (
        <div className="d-flex flex-column align-items-center justify-content-center min-vh-100 bg-gradient-primary-light p-3">
          <div className="col-lg-5 col-md-7 col-sm-9 p-4 bg-white rounded-3 shadow-lg text-center animate__animated animate__fadeInDown">
            
            {user && (
              <div className="mb-4 fs-5 text-dark">
                Welcome, <span className="fw-semibold text-success">{user.name}</span>!
              </div>
            )}

            <div className="mb-5 d-flex justify-content-center flex-wrap">
              {!user && (
                <button
                  className="btn btn-primary btn-lg px-4 me-3 shadow-sm animate__animated animate__pulse animate__infinite" // Added animation
                  onClick={handleLogInSignupButtonClick}
                >
                  Login / Signup
                </button>
              )}
              {user && (
                <button
                  className="btn btn-outline-danger btn-lg px-4 shadow-sm"
                  onClick={handleSignoutClick}
                >
                  Signout
                </button>
              )}
            </div>

            <ul className="list-unstyled text-start">
              {menus.map((menu, menuIndex) => (
                <li key={menuIndex} className="mb-3">
                  <button
                    className={`btn w-100 text-start py-3 fs-5 d-flex align-items-center justify-content-between ${
                      selectedMenuIndex === menuIndex ? "btn-info text-white shadow-sm" : "btn-outline-primary menu-btn-hover" // Added custom class for hover
                    }`}
                    onClick={() => handleSideBarMenuClick(menuIndex)}
                    disabled={!user}
                  >
                    <span>{menu.name}</span>
                    <span className="ms-auto">
                      {selectedMenuIndex === menuIndex ? (
                        <i className="bi bi-chevron-up"></i> 
                      ) : (
                        <i className="bi bi-chevron-down"></i> 
                      )}
                    </span>
                  </button>
                  {selectedMenuIndex === menuIndex && (
                    <ul className="list-unstyled ps-4 mt-2 border-start border-primary ms-2 pt-2 pb-1 rounded-sm bg-light animate__animated animate__fadeInLeft"> {/* Added animation */}
                      {menu.entities.map((entity, entityIndex) => (
                        <li key={entityIndex} className="mb-2">
                          <button
                            className={`btn w-100 text-start btn-md ${
                              selectedEntityIndex === entityIndex
                                ? "btn-secondary text-white shadow-sm"
                                : "btn-outline-dark menu-btn-hover" 
                            }`}
                            onClick={() => handleEntityClick(entityIndex)}
                            disabled={!user}
                          >
                            {entity.name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div className="container-fluid py-4">
          {view === "loginSignup" && !user && (
            <LoginSignupPage
              setLoggedinUser={setLoggedinUser}
              onCloseLoginSignupPageClose={handleCloseLoginSignupPageClose}
              onBack={handleBackToHome}
            />
          )}

          {view === "content" && (
            <ContentPage
              selectedEntity={selectedEntity}
              user={user}
              onBack={handleBackToHome}
            />
          )}
        </div>
      )}
    </>
  );
}
