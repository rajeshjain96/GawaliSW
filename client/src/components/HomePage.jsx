import { useEffect, useState } from "react";
import axios from "axios";

export default function HomePage(props) {
  // const imageFileName = "mobico"; // No longer needed if not using image
  // let [fileCount, setFileCount] = useState(0); // No longer needed if not using image
  let { user } = props;

  // You can remove this useEffect if you are completely removing image logic
  // useEffect(() => {
  //   getCountOfImageFiles();
  // }, []);

  // You can remove this function if you are completely removing image logic
  // async function getCountOfImageFiles() {
  //   let response = await axios.get(
  //     import.meta.env.VITE_API_URL + "/files/count/" + imageFileName
  //   );
  //   let fc = response.data.count;
  //   setFileCount(fc);
  // }

  return (
    <>
      {/* This welcome message can stay, it won't affect the layout of the sidebar */}
      {user && (
        <div className="text-center text-primary">Welcome {user.name}</div>
      )}

      {/* Remove the entire carousel div and its contents */}
      {/*
      <div className="w-50 mx-auto my-1">
        <div
          id="carouselExampleAutoplaying"
          className="carousel slide"
          data-bs-ride="carousel"
        >
          <div className="carousel-inner">
            {new Array(fileCount).fill(0).map((e, index) => (
              <div className="carousel-item active" key={index}>
                <img
                  src={
                    import.meta.env.VITE_API_URL +
                    "/uploadedImages/" +
                    imageFileName +
                    (index + 1) +
                    ".jpg"
                  }
                  className="d-block w-100"
                  alt="..."
                />
              </div>
            ))}
          </div>
          <button
            className="carousel-control-prev"
            type="button"
            data-bs-target="#carouselExampleAutoplaying"
            data-bs-slide="prev"
          >
            <span
              className="carousel-control-prev-icon"
              aria-hidden="true"
            ></span>
            <span className="visually-hidden">Previous</span>
          </button>
          <button
            className="carousel-control-next"
            type="button"
            data-bs-target="#carouselExampleAutoplaying"
            data-bs-slide="next"
          >
            <span
              className="carousel-control-next-icon"
              aria-hidden="true"
            ></span>
            <span className="visually-hidden">Next</span>
          </button>
        </div>
      </div>
      */}
      {/* Add any other desired content for your home page here, excluding the image */}
      <div className="text-center mt-5">
        <h3>Select an option from the sidebar to get started.</h3>
      </div>
    </>
  );
}















// import { useEffect, useState } from "react";

// import axios from "axios";

// export default function HomePage(props) {
//   const imageFileName = "mobico";
//   let [fileCount, setFileCount] = useState(0);
//   let { user } = props;
//   useEffect(() => {
//     getCountOfImageFiles();
//   }, []);
//   async function getCountOfImageFiles() {
//     let response = await axios.get(
//       import.meta.env.VITE_API_URL + "/files/count/" + imageFileName
//     );
//     let fc = response.data.count;
//     setFileCount(fc);
//   }
//   return (
//     <>
//       {user && (
//         <div className="text-center text-primary">Welcome {user.name}</div>
//       )}
//       <div className="w-50 mx-auto my-1">
//         <div
//           id="carouselExampleAutoplaying"
//           className="carousel slide"
//           data-bs-ride="carousel"
//         >
//           <div className="carousel-inner">
//             {new Array(fileCount).fill(0).map((e, index) => (
//               <div className="carousel-item active" key={index}>
//                 <img
//                   src={
//                     import.meta.env.VITE_API_URL +
//                     "/uploadedImages/" +
//                     imageFileName +
//                     (index + 1) +
//                     ".jpg"
//                   }
//                   className="d-block w-100"
//                   alt="..."
//                 />
//               </div>
//             ))}
//           </div>
//           <button
//             className="carousel-control-prev"
//             type="button"
//             data-bs-target="#carouselExampleAutoplaying"
//             data-bs-slide="prev"
//           >
//             <span
//               className="carousel-control-prev-icon"
//               aria-hidden="true"
//             ></span>
//             <span className="visually-hidden">Previous</span>
//           </button>
//           <button
//             className="carousel-control-next"
//             type="button"
//             data-bs-target="#carouselExampleAutoplaying"
//             data-bs-slide="next"
//           >
//             <span
//               className="carousel-control-next-icon"
//               aria-hidden="true"
//             ></span>
//             <span className="visually-hidden">Next</span>
//           </button>
//         </div>
//       </div>
//     </>
//   );
// }
