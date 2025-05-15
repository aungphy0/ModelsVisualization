import React, { useState } from 'react';
import axios from 'axios';
import "./RunModels.css";

const RunModels = () => {
  const [selectedModels] = useState(["runMnasnet0_5", "runMobile", "runShuffle", "runSqueezenet1_0", "runSqueezenet1_1", "runAlex"]); 
  const [loading, setLoading] = useState(false);

  const [checkRunning, setCheckRunning] = useState(false);

  const runModels = async () => {
    setLoading(true); // Start loading

    try {
      // Run models with a slight delay between requests
      for (let model of selectedModels) {
        await axios.get(`http://127.0.0.1:5000/${model}`, {
          params: {
            data: './uploads_images',
            truth: './uploads_truth',
          },
        });
        console.log(`Model ${model} completed.`);
        await new Promise((resolve) => setTimeout(resolve, 500)); // 500ms delay
      }

      console.log("All models are done!");
      setCheckRunning(true);

    } catch (error) {
      console.error('Error running models:', error);
    } finally {
      setLoading(false); // Stop loading
    }
  };

  return (
    <div className="container">
      <button className="run-button" onClick={runModels} disabled={loading}>
        {loading ? 'Running Models...' : 'Run All Models'}
      </button>
      
      {/* Conditional rendering for loading visual */}
      {loading ? (
        <div className="spinner"></div>
      ) : (
        <div className="completion-message"> </div>
      )}
      <div> {checkRunning ? "All models completed!" : " "} </div>
    </div>
  );
};

// const RunModels = () => {
//     const [selectedModels] = useState([
//       "runMnasnet0_5",
//       "runMobile",
//       "runShuffle",
//       "runSqueezenet1_0",
//       "runSqueezenet1_1",
//       "runAlex",
//     ]);
//     const [loading, setLoading] = useState(false);
//     const [completed, setCompleted] = useState(false);
  
//     const runModels = async () => {
//       setLoading(true); // Start loading
//       setCompleted(false); // Reset completion state
  
//       try {
//         // Run models with a slight delay between requests
//         for (let model of selectedModels) {
//           await axios.get(`http://127.0.0.1:5000/${model}`, {
//             params: {
//               data: "./uploads_images",
//               truth: "./uploads_truth",
//             },
//           });
//           console.log(`Model ${model} completed.`);
//           await new Promise((resolve) => setTimeout(resolve, 500)); // 500ms delay
//         }
  
//         console.log("All models are done!");
//         setCompleted(true); // Mark as completed
  
//       } catch (error) {
//         console.error("Error running models:", error);
//       } finally {
//         setLoading(false); // Stop loading
//       }
//     };
  
//     return (
//       <div className="container">
//         <button className="run-button" onClick={runModels} disabled={loading}>
//           {loading ? "Running Models..." : "Run All Models"}
//         </button>
  
//         {/* Conditional rendering */}
//         {loading && <div className="spinner"></div>}
//         {!loading && completed && <div className="completion-message">All models completed!</div>}
//       </div>
//     );
//   };

export default RunModels;