import React, { useEffect, useState, useMemo } from "react";
import Modal from "react-modal";

import alexnetData from "../classMappingDataset/misclassify_alexnet.json";
import mobilenetData from "../classMappingDataset/misclassify_mobilenet.json";
import shufflenetData from "../classMappingDataset/misclassify_shufflenet.json";
import squeeze1_0Data from "../classMappingDataset/misclassify_squeeze1_0.json";
import squeeze1_1Data from "../classMappingDataset/misclassify_squeeze1_1.json";
import mnasnet0_5Data from "../classMappingDataset/misclassify_mnasnet0_5.json";

const TICK_LENGTH = 3;

Modal.setAppElement("#root"); // Required for accessibility

const AxisVertical = ({ yScale, pixelsPerTick, name, model }) => {
  const [classMap, setClassMap] = useState({});
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [matches, setMatches] = useState([]);
  
  const [theModel, setTheModel] = useState();

  useEffect(() => {
    switch(model) {
      case "fetchAlex":
        setTheModel(alexnetData);
        break;
      case "fetchMobile":
        setTheModel(mobilenetData);
        break;
      case "fetchShuffle":
        setTheModel(shufflenetData);
        break;
      case "fetchSqueezenet1_0":
        setTheModel(squeeze1_0Data);
        break;
      case "fetchSqueezenet1_1":
        setTheModel(squeeze1_1Data);
        break;
      case "fetchMnasnet0_5":
        setTheModel(mnasnet0_5Data);
        break;
      default:
        setTheModel(alexnetData);
        break;
    }
  }, [model]);  // Depend on 'model' so it updates when the model changes


  useEffect(() => {
    fetch("http://127.0.0.1:5000/api/classes")
      .then((response) => response.json())
      .then((data) => {
        const classes = data[0];
        const map = classes.reduce((acc, className, index) => {
          acc[index] = className; // Map each class name to its index
          return acc;
        }, {});
        setClassMap(map); // Set the classMap state with the constructed map
      })
      .catch((error) => console.error("Error fetching class names:", error));
  }, []);

  const range = yScale.range();
  const ticks = useMemo(() => {
    const height = range[0] - range[1];
    return yScale.ticks(Math.floor(height / pixelsPerTick)).map(value => ({
      value,
      yOffset: yScale(value),
    }));
  }, [yScale, pixelsPerTick, range]);

  const handleClick = () => {
    // Filter items where predicted equals the class and probability >= 0.15
    const filteredMatches = theModel
      .filter(
        (item) =>
          // classMap[name] === item.predicted && item.max_prob >= 0.15
          (item.predicted === classMap[name] && item.actual === classMap[name] && item.max_prob >= 0.15) || // TP
          (item.predicted === classMap[name] && item.actual !== classMap[name] && item.max_prob >= 0.15) || // FP
          (item.predicted !== classMap[name] && item.actual === classMap[name] && item.max_prob >= 0.15)    // TN
      )
      .sort((a, b) => b.max_prob - a.max_prob) // Sort by probability descending
      .slice(0, 5); // Take top 5
    setMatches(filteredMatches);
    setModalIsOpen(true);
  };

  const { matchCount, tpCount, fpCount, tnCount, fnCount } = useMemo(() => {
    if (Array.isArray(theModel)) {
      const tp = theModel.filter(
        item =>
          item.predicted === classMap[name] &&
          item.actual === classMap[name] &&
          item.max_prob >= 0.15
      );
      const fp = theModel.filter(
        item =>
          item.predicted === classMap[name] &&
          item.actual !== classMap[name] &&
          item.max_prob >= 0.15
      );
      const tn = theModel.filter(
        item =>
          item.predicted !== classMap[name] &&
          item.actual === classMap[name] &&
          item.max_prob >= 0.15
      );
      // const fn = theModel.filter(
      //   item =>
      //     item.predicted !== classMap[name] &&
      //     item.actual !== classMap[name] &&
      //     item.max_prob >= 0.15
      // );
      const count = tp.length + fp.length + tn.length;
      return { matchCount: count, tpCount: tp.length, fpCount: fp.length, tnCount: tn.length };
    } else {
      return { matchCount: 0, tpCount: 0, fpCount: 0 , tnCount: 0 };
    }
  }, [theModel, classMap, name]);

  return (
    <>
      <text
        x={0}
        y={-25}
        style={{ fontSize: "14px", textAnchor: "middle", fill: "black" }}
        onClick={handleClick}
      >
        {name}
        {/* Tooltip displaying the class name */}
        <title>Class: {classMap[name]}
        {"\nTotal Predictions: " + matchCount}
        {"\nTrue Positives (TP): " + tpCount}
        {"\nFalse Positives (FP): " + fpCount}
        {"\nTrue Negatives (TN): " + tnCount}
        {/* {"\nFalse Negatives (FN): " + fnCount} */}
        {(() => {
          // Ensure theModel is defined and is an array before filtering
          if (Array.isArray(theModel)) {
            // Find all matching entries in the JSON file with threshold 0.15
            const matches = theModel
              .filter(
                (item) =>
                  classMap[name] === item.predicted && item.max_prob >= 0.15 || classMap[name] === item.actual && item.max_prob >= 0.15
              )
              .sort((a, b) => b.max_prob - a.max_prob) // Sort by probability descending
              .slice(0, 5); // Take top 5

            return matches.length > 0
              ? matches
                  .map(
                    (match, index) =>
                      `\n###:\nActual: ${match.actual}\nPredicted: ${match.predicted}\nValue: ${match.max_prob}\nImages: ${match.image}`
                  )
                  .join("\n")
              : `\nNo matches found.`;
          } else {
            // Handle the case where theModel is undefined or not an array
            return `\nError: Model data is not available or invalid.`;
          }
        })()}
          
             
        </title>
      </text>
      <line x1={0} x2={0} y1={range[0]} y2={range[1]} stroke="black" strokeWidth={0.5} />
      {ticks.map(({ value, yOffset }) => (
        <g key={value} transform={`translate(0,${yOffset})`} shapeRendering="crispEdges">
          <line x1={-TICK_LENGTH} x2={0} stroke="black" strokeWidth={0.5} />
          <text
            x={-10}
            dy="0.32em"
            style={{ fontSize: "10px", textAnchor: "end" }}
          >
            {value}
            {/* Optionally, you can also show tooltips for each tick value */}
            <title>{value}</title>
          </text>
        </g>
      ))}

      {/* Modal for displaying matches */}
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={() => setModalIsOpen(false)}
        contentLabel="Matches Modal"
        style={{
          overlay: { backgroundColor: "rgba(0, 0, 0, 0.5)" },
          content: { top: "10%", left: "10%", right: "10%", bottom: "10%" },
        }}
      >
        <div>
          <h2>Class: {classMap[name]}</h2>
          <button onClick={() => setModalIsOpen(false)}>Close</button>
          {matches.length > 0 ? (
            <>
              <h3>True Positives (TP)</h3>
              <ul>
                {matches
                  .filter(match => (match.actual === classMap[name] && match.predicted === classMap[name]))
                  .map((match, index) => (
                    <li key={index} style={{ marginBottom: "20px" }}>
                      <p><strong>Actual:</strong> {match.actual}</p>
                      <p><strong>Predicted:</strong> {match.predicted}</p>
                      <p><strong>Probability:</strong> {match.max_prob}</p>
                      <p><strong>Images:</strong></p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                        {match.image.map((img, imgIndex) => (
                          <img
                            key={imgIndex}
                            src={`http://127.0.0.1:5000/uploads/${img}`} // Replace with your actual image folder path
                            alt={match.actual}
                            style={{
                              width: "80px",
                              height: "80px",
                              objectFit: "cover",
                              border: "1px solid #ccc",
                              borderRadius: "5px",
                            }}
                          />
                        ))}
                      </div>
                    </li>
                  ))}
              </ul>
              <h3>False Positives (FP)</h3>
              <ul>
                {matches
                  .filter(match => (match.actual !== classMap[name] && match.predicted === classMap[name]))
                  .map((match, index) => (
                    <li key={index} style={{ marginBottom: "20px" }}>
                      <p><strong>Actual:</strong> {match.actual}</p>
                      <p><strong>Predicted:</strong> {match.predicted}</p>
                      <p><strong>Probability:</strong> {match.max_prob}</p>
                      <p><strong>Images:</strong></p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                        {match.image.map((img, imgIndex) => (
                          <img
                            key={imgIndex}
                            src={`http://127.0.0.1:5000/uploads/${img}`} // Replace with your actual image folder path
                            alt={match.actual}
                            style={{
                              width: "80px",
                              height: "80px",
                              objectFit: "cover",
                              border: "1px solid #ccc",
                              borderRadius: "5px",
                            }}
                          />
                        ))}
                      </div>
                    </li>
                  ))}
              </ul>
              <h3>True Negatives (TN)</h3>
              <ul>
                {matches
                  .filter(match => (match.predicted !== classMap[name] && match.actual === classMap[name]))
                  .map((match, index) => (
                    <li key={index} style={{ marginBottom: "20px" }}>
                      <p><strong>Actual:</strong> {match.actual}</p>
                      <p><strong>Predicted:</strong> {match.predicted}</p>
                      <p><strong>Probability:</strong> {match.max_prob}</p>
                      <p><strong>Images:</strong></p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                        {match.image.map((img, imgIndex) => (
                          <img
                            key={imgIndex}
                            src={`http://127.0.0.1:5000/uploads/${img}`} // Replace with your actual image folder path
                            alt={match.actual}
                            style={{
                              width: "80px",
                              height: "80px",
                              objectFit: "cover",
                              border: "1px solid #ccc",
                              borderRadius: "5px",
                            }}
                          />
                        ))}
                      </div>
                    </li>
                  ))}
              </ul>
            </>
          ) : (
            <p>No matches found.</p>
          )}
        </div>
      </Modal>
    </>
  );
};

export default AxisVertical;
