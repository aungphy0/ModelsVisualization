import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import * as d3 from "d3";
import PropTypes from "prop-types";

const TwoMThouMatrix = ({
  classDatasets,
  imageMappingDatasets, // New prop
  classes,
  goToDash,
  graphSize,
}) => {
  // First declare all state variables
  const [useImageMapping, setUseImageMapping] = useState(false);
  const [hoveredCell, setHoveredCell] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [counts, setCounts] = useState({});
  const [metrics, setMetrics] = useState({});
  const [selectedCells, setSelectedCells] = useState([]);
  const [selectionMode, setSelectionMode] = useState(false); // New state
  const [hoverImages, setHoverImages] = useState([]); // New state for fetched images
  const [selectedImages, setSelectedImages] = useState([]); // New state variable to store selected images
  const [cumulativeMetrics, setCumulativeMetrics] = useState({});

  // Then initialize refs after state declarations
  const svgRefs = useRef(
    new Array(
      (useImageMapping ? imageMappingDatasets : classDatasets).length + 1
    ).fill(null)
  );

  // 1. Add separate refs for Overall Metrics and Cumulative Metrics
  const overallMetricsChartRef = useRef(null);
  const cumulativeMetricsChartRef = useRef(null);

  // Consolidated highlight and stroke colors
  const colors = useMemo(
    () => ({
      original: {
        fill: "blue",
        stroke: "blue",
      },
      other: {
        fill: "purple",
        stroke: "purple",
      },
    }),
    []
  ); // Memoized to ensure stable reference

  // Add this helper function at the top of your component
  const hashCode = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash;
  };

  // Replace the jitter function with a seeded version
  const jitter = useCallback((value, range, seed) => {
    // Create a deterministic random number based on the seed
    const random = Math.abs(Math.sin(seed * 9999)) * range;
    return value + (random - range / 2);
  }, []);

  // Add useCallback to memoize handleMouseOver
  const handleMouseOver = useCallback(
    (event, d) => {
      if (d.images && Array.isArray(d.images)) {
        // Combined matrix cell with images and model names
        const imageData = [];
        d.images.forEach((imgObj) => {
          imgObj.images.forEach((imgName) => {
            imageData.push({
              url: `http://127.0.0.1:5000/uploads/${imgName}`,
              model: imgObj.model,
            });
          });
        });
        setHoverImages(imageData);
      } else if (d.image && Array.isArray(d.image)) {
        // Individual matrix cell
        const imageUrls = d.image.map((imgName) => ({
          url: `http://127.0.0.1:5000/uploads/${imgName}`,
          model: d.modelName || "",
        }));
        setHoverImages(imageUrls);
      } else {
        setHoverImages([]);
      }

      setHoveredCell({
        actual: d.actual,
        predicted: d.predicted,
        images: d.images || d.image || [],
        value: useImageMapping ? undefined : d.value, // Remove 'value' when Image Mapping is enabled
      });

      setTooltipPosition({
        x: event.pageX + 10,
        y: event.pageY + 10,
      });
    },
    [useImageMapping]
  );

  // Add new functions to handle Image Mapping color logic
  const getImageMapFillColor = (
    d,
    currentGridIndex,
    colors,
    selectedCells,
    selectedImages
  ) => {
    const cellKey = `${d.actual}-${d.predicted}`;

    // Check if the cell is selected in its own grid
    const isMainSelected = selectedCells.some(
      (c) =>
        c.gridIndex === currentGridIndex &&
        `${c.actual}-${c.predicted}` === cellKey
    );

    // Check if the cell corresponds to any selected image
    const isCorresponding =
      d.image && d.image.some((img) => selectedImages.includes(img));

    if (isMainSelected) {
      return colors.original.fill; // Blue for selected cell in its grid
    } else if (isCorresponding) {
      return colors.other.fill; // Purple for corresponding cells in other grids
    } else {
      return d.actual === d.predicted ? "green" : "red"; // Default colors
    }
  };

  const getImageMapStrokeColor = (
    d,
    currentGridIndex,
    colors,
    selectedCells,
    selectedImages
  ) => {
    const cellKey = `${d.actual}-${d.predicted}`;

    // Check if the cell is the main selected cell
    const isMainSelected = selectedCells.some(
      (c) =>
        c.gridIndex === currentGridIndex &&
        `${c.actual}-${c.predicted}` === cellKey
    );

    // Check if the cell corresponds to a selected image
    const isCorresponding =
      d.image && d.image.some((img) => selectedImages.includes(img));

    if (isMainSelected) {
      return colors.original.stroke; // Blue stroke for main selected cell
    } else if (isCorresponding) {
      return colors.other.stroke; // Purple stroke for corresponding cells
    } else {
      return "white"; // Default stroke color
    }
  };

  // Modify existing getFillColor to delegate to new functions when Image Mapping is enabled
  const getFillColor = (
    d,
    currentGridIndex,
    colors,
    useImageMapping,
    selectedCells,
    selectedImages,
    correctColorScale,
    incorrectColorScale,
    combinedCorrectColorScale, // Reverted scale
    combinedIncorrectColorScale // Reverted scale
  ) => {
    if (useImageMapping) {
      return getImageMapFillColor(
        d,
        currentGridIndex,
        colors,
        selectedCells,
        selectedImages
      );
    }

    // Existing logic for non-image mapping view
    const cellKey = `${d.actual}-${d.predicted}`;
    const isMainSelected = selectedCells.some(
      (c) =>
        c.gridIndex === currentGridIndex &&
        `${c.actual}-${c.predicted}` === cellKey
    );
    const isCorresponding = selectedCells.some(
      (c) =>
        c.gridIndex !== currentGridIndex &&
        `${c.actual}-${c.predicted}` === cellKey
    );

    if (isMainSelected) {
      return colors.original.fill; // Use blue for original grid selections
    } else if (isCorresponding) {
      return colors.other.fill; // Use purple for corresponding cells in other grids
    }

    if (currentGridIndex === -1) {
      // Combined matrix
      if (useImageMapping) {
        return d.actual === d.predicted ? "green" : "red";
      } else {
        return d.actual === d.predicted
          ? combinedCorrectColorScale
            ? combinedCorrectColorScale(Math.log(d.value + 1))
            : "green"
          : combinedIncorrectColorScale
          ? combinedIncorrectColorScale(Math.log(d.value + 1))
          : "red";
      }
    }

    if (useImageMapping) {
      return d.actual === d.predicted ? "green" : "red";
    } else {
      if (combinedCorrectColorScale && combinedIncorrectColorScale) {
        return d.actual === d.predicted
          ? combinedCorrectColorScale(Math.log(d.value + 1))
          : combinedIncorrectColorScale(Math.log(d.value + 1));
      }
      return d.actual === d.predicted
        ? correctColorScale
          ? correctColorScale(d.value)
          : "green"
        : incorrectColorScale
        ? incorrectColorScale(d.value)
        : "red";
    }
  };

  // Modify existing getStrokeColor to delegate to new functions when Image Mapping is enabled
  const getStrokeColor = (
    d,
    currentGridIndex,
    colors,
    selectedCells,
    useImageMapping,
    selectedImages
  ) => {
    if (useImageMapping) {
      return getImageMapStrokeColor(
        d,
        currentGridIndex,
        colors,
        selectedCells,
        selectedImages
      );
    }

    // Existing logic for non-image mapping view
    const cellKey = `${d.actual}-${d.predicted}`;
    const isMainSelected = selectedCells.some(
      (c) =>
        c.gridIndex === currentGridIndex &&
        `${c.actual}-${c.predicted}` === cellKey
    );
    const isCorresponding = selectedCells.some(
      (c) =>
        c.gridIndex !== currentGridIndex &&
        `${c.actual}-${c.predicted}` === cellKey
    );

    if (isMainSelected) {
      return colors.original.stroke; // Use blue stroke for original grid selections
    } else if (isCorresponding) {
      return colors.other.stroke; // Use purple stroke for corresponding cells in other grids
    }

    return "white";
  };

  // Update handleCellClick to toggle selection correctly
  const handleCellClick = useCallback(
    (event, d, gridIndex) => {
      const cellKey = `${d.actual}-${d.predicted}`;
      const isSelected = selectedCells.some(
        (c) =>
          c.gridIndex === gridIndex && `${c.actual}-${c.predicted}` === cellKey
      );

      if (isSelected) {
        // Deselect the clicked cell
        setSelectedCells((prev) =>
          prev.filter(
            (c) =>
              !(
                c.gridIndex === gridIndex &&
                `${c.actual}-${c.predicted}` === cellKey
              )
          )
        );
        // Remove associated images from selectedImages
        const imagesToRemove = d.image || [];
        setSelectedImages((prevSelectedImages) =>
          prevSelectedImages.filter((img) => !imagesToRemove.includes(img))
        );
        // Hide tooltip upon deselection
        setHoveredCell(null);
      } else {
        // Select the clicked cell
        let newSelectedCells = [
          ...selectedCells,
          { actual: d.actual, predicted: d.predicted, gridIndex },
        ];

        // Add associated images to selectedImages
        const imagesToAdd = d.image || [];
        const newImages = useImageMapping
          ? [
              ...new Set([
                ...selectedImages,
                ...imagesToAdd, // Changed from `${d.actual}-${img}`
              ]),
            ]
          : selectedImages;
        setSelectedImages(newImages);

        // Collect corresponding cells in other grids
        if (useImageMapping) {
          const correspondingCells = imageMappingDatasets
            .filter((dataset) => imagesToAdd.includes(dataset.mappingKey))
            .map((dataset, idx) => ({
              actual: dataset.actual,
              predicted: dataset.predicted,
              gridIndex: idx + 1, // Ensure gridIndex is correct
            }));

          // Add corresponding cells to selectedCells
          newSelectedCells = [...newSelectedCells, ...correspondingCells];
        }

        // Update selectedCells once after processing
        setSelectedCells(newSelectedCells);

        // Ensure tooltip remains visible after selection
        setHoveredCell({
          actual: d.actual,
          predicted: d.predicted,
          images: d.image || [],
          value: useImageMapping ? undefined : d.value,
        });
      }
    },
    [useImageMapping, selectedCells, imageMappingDatasets, selectedImages]
  );

  // Memoize handleMouseOver and handleCombinedCellClick
  const handleCombinedCellClick = useCallback(
    (event, d) => {
      handleCellClick(event, d, -1);
    },
    [handleCellClick]
  );

  // Fix: Update calculateClassCounts to use value directly
  const calculateClassCounts = useCallback(
    (data) => {
      const counts = {};
      const confusionMatrix = Array(classes.length)
        .fill(0)
        .map(() => Array(classes.length).fill(0));

      data.forEach((d) => {
        const actualIndex = classes.indexOf(d.actual);
        const predictedIndex = classes.indexOf(d.predicted);
        if (actualIndex !== -1 && predictedIndex !== -1) {
          // Accumulate counts
          confusionMatrix[actualIndex][predictedIndex] += d.value;

          const key = `${d.actual}-${d.predicted}`;
          if (counts[key]) {
            counts[key].count += d.value; // Accumulate the count
            counts[key].image = counts[key].image.concat(d.image || []); // Concatenate images
          } else {
            counts[key] = {
              count: d.value,
              image: d.image ? [...d.image] : [],
            };
          }
        }
      });

      return { counts, confusionMatrix };
    },
    [classes]
  );

  // Fix: Properly declare and complete calculateMetrics function
  const calculateMetrics = useCallback(
    (confusionMatrix) => {
      const metrics = {};
      let totalCorrect = 0;
      let total = 0;

      classes.forEach((cls, i) => {
        const TP = confusionMatrix[i][i];
        const FP = confusionMatrix.reduce(
          (sum, row, idx) => sum + (idx !== i ? row[i] : 0),
          0
        );
        const FN = confusionMatrix[i].reduce(
          (sum, val, idx) => sum + (idx !== i ? val : 0),
          0
        );

        const precision = TP / (TP + FP) || 0;
        const recall = TP / (TP + FN) || 0;
        const f1Score = (2 * (precision * recall)) / (precision + recall) || 0;

        metrics[cls] = { precision, recall, f1Score };

        totalCorrect += TP;
      });

      total = confusionMatrix.flat().reduce((sum, val) => sum + val, 0);

      const overallPrecision =
        classes.reduce((sum, cls) => sum + metrics[cls].precision, 0) /
        classes.length;
      const overallRecall =
        classes.reduce((sum, cls) => sum + metrics[cls].recall, 0) /
        classes.length;
      const overallF1Score =
        classes.reduce((sum, cls) => sum + metrics[cls].f1Score, 0) /
        classes.length;
      const accuracy = totalCorrect / total || 0;

      return { overallPrecision, overallRecall, overallF1Score, accuracy };
    },
    [classes]
  );

  // Fix: Update data points counting function to sum 'value' instead of images
  const getDataPointCount = useCallback((data) => {
    if (!data) return 0;
    return data.length; // Count each dictionary item as one data point
  }, []);

  // Fix: Update main useEffect for combined data processing
  useEffect(() => {
    const datasets = useImageMapping ? imageMappingDatasets : classDatasets; // Conditional datasets
    const individualData = {};
    let aggregatedConfusionMatrix = Array(classes.length)
      .fill(0)
      .map(() => Array(classes.length).fill(0));

    datasets.forEach((dataset, index) => {
      individualData[index] = dataset.data;
      const { confusionMatrix } = calculateClassCounts(dataset.data);
      const computedMetrics = calculateMetrics(confusionMatrix);
      setMetrics((prevMetrics) => ({
        ...prevMetrics,
        [index]: computedMetrics,
      }));

      // Aggregate confusion matrices for cumulative metrics
      confusionMatrix.forEach((row, i) => {
        row.forEach((value, j) => {
          aggregatedConfusionMatrix[i][j] += value;
        });
      });
    });

    // Calculate cumulative metrics
    const cumulativeComputedMetrics = calculateMetrics(
      aggregatedConfusionMatrix
    );
    setCumulativeMetrics(cumulativeComputedMetrics);

    // Aggregate combinedData by summing counts for each class combination
    const combinedDataMap = {};
    datasets.forEach((dataset, datasetIndex) => {
      dataset.data.forEach((d) => {
        const key = `${d.actual}-${d.predicted}`;
        if (!combinedDataMap[key]) {
          combinedDataMap[key] = {
            actual: d.actual,
            predicted: d.predicted,
            value: d.value,
            images: d.image
              ? [{ images: d.image, model: dataset.name }]
              : [],
          };
        } else {
          combinedDataMap[key].value += d.value;
          if (d.image) {
            combinedDataMap[key].images.push({
              images: d.image,
              model: dataset.name,
            });
          }
        }
      });
    });

    const combinedData = Object.values(combinedDataMap);

    setCounts({ ...individualData, combined: combinedData });

    // Calculate metrics after counts are set
    const { confusionMatrix } = calculateClassCounts(combinedData);
    const computedMetrics = calculateMetrics(confusionMatrix);
    setMetrics(computedMetrics);
  }, [
    classDatasets,
    imageMappingDatasets,
    useImageMapping,
    calculateClassCounts,
    calculateMetrics,
  ]);

  // Update SVG refs when datasets change
  useEffect(() => {
    // Only update the length if it changes
    if (
      svgRefs.current.length !==
      (useImageMapping ? imageMappingDatasets : classDatasets).length + 1
    ) {
      svgRefs.current = new Array(
        (useImageMapping ? imageMappingDatasets : classDatasets).length + 1
      ).fill(null);
    }
  }, [useImageMapping, imageMappingDatasets, classDatasets]);

  useEffect(() => {
    // Get current datasets based on mapping mode
    const currentDatasets = useImageMapping
      ? imageMappingDatasets
      : classDatasets;

    // Map over current datasets instead of classDatasets
    currentDatasets.forEach((dataset, index) => {
      // Updated from datasets

      // Calculate metrics for individual datasets
      const { confusionMatrix } = calculateClassCounts(dataset.data); // Fix: Use dataset.data
      const computedMetrics = calculateMetrics(confusionMatrix);
      setMetrics((prevMetrics) => ({
        ...prevMetrics,
        [index]: computedMetrics,
      }));

      // Adjust margins to accommodate labels
      const margin = { top: 0, right: 30, bottom: 50, left: 50 }; // Adjusted top margin to 0
      // Increase individual matrix size
      const width = graphSize * 1.2; // Increased from graphSize
      const height = graphSize * 1.2; // Reduced height
      const cellSize = (width - margin.left - margin.right) / classes.length;

      const svg = d3.select(svgRefs.current[index]);
      svg.selectAll("*").remove(); // Ensure all existing elements are cleared
      const g = svg
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

      const xScale = d3
        .scaleBand()
        .domain(classes)
        .range([0, width - margin.left - margin.right]);
      const yScale = d3
        .scaleBand()
        .domain(classes)
        .range([0, height - margin.top - margin.bottom]);

      // Separate data into correct and incorrect for color scaling
      const maxCount = d3.max(dataset.data, (d) => d.value) || 1; // Fix: Use dataset.data
      const correctColorScale = !useImageMapping
        ? d3
            .scaleSequential()
            .domain([0, maxCount])
            .interpolator(d3.interpolateGreens) // Use green color scale for correct
        : () => "green";
      const incorrectColorScale = !useImageMapping
        ? d3
            .scaleSequential()
            .domain([0, maxCount])
            .interpolator(d3.interpolateReds) // Use red color scale for incorrect
        : () => "red";

      // Determine highlight colors based on grid index
      const isOriginalGrid = index === 0;
      const currentHighlightCellColor = isOriginalGrid
        ? colors.original.fill
        : colors.other.fill;
      const currentHighlightPointColor = isOriginalGrid
        ? colors.original.fill
        : colors.other.fill;

      // Render rectangles with color based on correctness
      g.selectAll("rect")
        .data(dataset.data, (d) => `${d.actual}-${d.predicted}`) // Fix: Use dataset.data
        .join(
          (enter) =>
            enter
              .append("rect")
              .attr("x", (d) => xScale(d.predicted))
              .attr("y", (d) => yScale(d.actual))
              .attr("width", (d) =>
                d.actual === d.predicted ? cellSize * 1.5 : cellSize
              ) // Increase size for diagonal
              .attr("height", (d) =>
                d.actual === d.predicted ? cellSize * 1.5 : cellSize
              ) // Increase size for diagonal
              .attr("fill", (d) =>
                getFillColor(
                  d,
                  index, // Pass currentGridIndex
                  colors,
                  useImageMapping,
                  selectedCells,
                  selectedImages,
                  correctColorScale,
                  incorrectColorScale,
                  null, // combinedCorrectColorScale not needed here
                  null // combinedIncorrectColorScale not needed here
                )
              )
              .attr(
                "stroke",
                (d) =>
                  getStrokeColor(
                    d,
                    index,
                    colors,
                    selectedCells,
                    useImageMapping,
                    selectedImages
                  ) // Specify element type
              )
              .attr("stroke-width", (d) =>
                selectedCells.some(
                  (cell) =>
                    cell.actual === d.actual && cell.predicted === d.predicted
                )
                  ? 3
                  : 1
              )
              .attr("filter", (d) =>
                selectedCells.some(
                  (cell) =>
                    cell.actual === d.actual && cell.predicted === d.predicted
                )
                  ? "url(#glow)"
                  : "none"
              )
              .on("mouseover", (event, d) => handleMouseOver(event, d))
              .on("mouseout", () => {
                setHoveredCell(null);
              })
              .on("click", (event, d) => handleCellClick(event, d, index)), // Pass gridIndex
          (update) => update, // Handle updates if necessary
          (exit) => exit.remove() // Remove exiting elements
        );

      // Render circles with jitter effect to prevent overlap
      g.selectAll("circle")
        .data(dataset.data, (d) => `${d.actual}-${d.predicted}`) // Fix: Use dataset.data
        .join(
          (enter) =>
            enter
              .append("circle")
              // Use consistent seeds for x and y coordinates
              .attr("cx", (d) =>
                jitter(
                  xScale(d.predicted) + cellSize / 2,
                  3, // Reduced jitter range from 5 to 3
                  hashCode(`${d.actual}-${d.predicted}-x`)
                )
              )
              .attr("cy", (d) =>
                jitter(
                  yScale(d.actual) + cellSize / 2,
                  5,
                  hashCode(`${d.actual}-${d.predicted}-y`)
                )
              )
              .attr("r", 3) // Reduced radius
              .attr("fill", (d) =>
                getFillColor(
                  d,
                  index, // Pass currentGridIndex
                  colors,
                  useImageMapping,
                  selectedCells,
                  selectedImages,
                  correctColorScale,
                  incorrectColorScale,
                  null, // combinedCorrectColorScale not needed here
                  null // combinedIncorrectColorScale not needed here
                )
              )
              .attr(
                "stroke",
                (d) =>
                  getStrokeColor(
                    d,
                    index,
                    colors,
                    selectedCells,
                    useImageMapping,
                    selectedImages
                  ) // Specify element type
              )
              .attr("stroke-width", (d) =>
                selectedCells.some(
                  (cell) =>
                    cell.actual === d.actual && cell.predicted === d.predicted
                )
                  ? 3
                  : 1
              )
              .attr("filter", (d) =>
                selectedCells.some(
                  (cell) =>
                    cell.actual === d.actual && cell.predicted === d.predicted
                )
                  ? "url(#glow)"
                  : "none"
              )
              .on("mouseover", (event, d) => handleMouseOver(event, d))
              .on("mouseout", () => {
                setHoveredCell(null);
              })
              .on("click", (event, d) => handleCellClick(event, d, index)), // Pass gridIndex
          (update) => update,
          (exit) => exit.remove()
        );

      const xAxis = d3.axisBottom(xScale).tickSize(0).tickPadding(5);
      const yAxis = d3.axisLeft(yScale).tickSize(0).tickPadding(5);

      g.append("g")
        .attr(
          "transform",
          `translate(0, ${height - margin.top - margin.bottom})`
        )
        .call(xAxis)
        .selectAll("text")
        .remove();

      g.append("g").call(yAxis).selectAll("text").remove();

      g.append("text")
        .attr("text-anchor", "middle")
        .attr("x", (width - margin.left - margin.right) / 2)
        .attr("y", height - margin.top - margin.bottom + 25) // Moved closer to axis
        .text("Predicted Classes")
        .style("font-size", "12px");

      g.append("text")
        .attr("text-anchor", "middle")
        .attr("x", -(height - margin.top - margin.bottom) / 2)
        .attr("y", -25) // Moved closer to axis
        .attr("transform", "rotate(-90)")
        .text("Actual Classes")
        .style("font-size", "12px");

      // Add brushing functionality only if selectionMode is enabled
      if (selectionMode) {
        const brushBehavior = d3
          .brush()
          .extent([
            [0, 0],
            [
              width - margin.left - margin.right,
              height - margin.top - margin.bottom,
            ],
          ])
          .on("end", (event) => {
            if (!event.selection) return;

            const [[x0, y0], [x1, y1]] = event.selection;
            const selected = [];

            g.selectAll("rect").each((d) => {
              const x = xScale(d.predicted);
              const y = yScale(d.actual);
              if (
                x >= x0 &&
                x + cellSize <= x1 &&
                y >= y0 &&
                y + cellSize <= y1
              ) {
                selected.push(d);
              }
            });

            if (useImageMapping) {
              // Update selectedImages based on selected cells using functional state update
              const images = selected.flatMap((d) => d.image || []);
              setSelectedImages((prevSelectedImages) => [
                ...new Set([...prevSelectedImages, ...images]),
              ]);

              // Add main selected cells
              const mainSelectedCells = selected.map((d) => ({
                actual: d.actual,
                predicted: d.predicted,
                gridIndex: index, // Ensure gridIndex is correct
              }));

              // Add corresponding cells from imageMappingDatasets
              const correspondingSelectedCells = imageMappingDatasets
                .filter((dataset) => images.includes(dataset.mappingKey))
                .map((dataset, idx) => ({
                  actual: dataset.actual,
                  predicted: dataset.predicted,
                  gridIndex: idx + 1, // Ensure gridIndex is correct
                }));

              setSelectedCells((prevSelectedCells) => [
                ...prevSelectedCells,
                ...mainSelectedCells,
                ...correspondingSelectedCells,
              ]);
            } else {
              // Update selectedCells based on selection using functional state update
              const newSelectedCells = selected.map((d) => ({
                actual: d.actual,
                predicted: d.predicted,
                gridIndex: index, // Replace 'gridIndex' with 'index'
              }));
              setSelectedCells((prevSelectedCells) => [
                ...prevSelectedCells,
                ...newSelectedCells,
              ]);
            }

            // Clear the brush selection
            g.select(".brush").call(brushBehavior.move, null);
          });

        g.append("g").call(brushBehavior);
      }
    });

    // Combined matrix adjustments
    const combinedData = counts.combined;
    if (!combinedData) return;

    // Define isOriginalGrid for combined matrix
    const isOriginalGrid = false;

    // Adjust margins for combined matrix
    const margin = { top: 30, right: 30, bottom: 50, left: 50 };
    const width = graphSize * 2.2; // Increased from graphSize * 2
    const height = graphSize * 2.0; // Reduced height
    const cellSize = (width - margin.left - margin.right) / classes.length;

    const combinedSvg = d3.select(svgRefs.current[svgRefs.current.length - 1]);
    combinedSvg.selectAll("*").remove();
    const combinedG = combinedSvg
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("preserveAspectRatio", "xMidYMid meet")
      .append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Add glow filter to combined matrix
    const combinedDefs = combinedG.append("defs");

    const combinedFilter = combinedDefs.append("filter").attr("id", "glow");

    combinedFilter
      .append("feGaussianBlur")
      .attr("stdDeviation", "4")
      .attr("result", "coloredBlur");

    const combinedFeMerge = combinedFilter.append("feMerge");

    combinedFeMerge.append("feMergeNode").attr("in", "coloredBlur");
    combinedFeMerge.append("feMergeNode").attr("in", "SourceGraphic");

    const combinedXScale = d3
      .scaleBand()
      .domain(classes)
      .range([0, width - margin.left - margin.right]);
    const combinedYScale = d3
      .scaleBand()
      .domain(classes)
      .range([0, height - margin.top - margin.bottom]);

    // Define maxCombinedCount
    const maxCombinedCount = d3.max(combinedData, (d) => d.value) || 1;

    // Fix color frequencies in combined matrix
    const combinedCorrectColorScale = d3
      .scaleSequential()
      .domain([0, Math.log(maxCombinedCount + 1)]) // Apply logarithmic scale
      .interpolator(d3.interpolateGreens); // Use green color scale for correct

    const combinedIncorrectColorScale = d3
      .scaleSequential()
      .domain([0, Math.log(maxCombinedCount + 1)]) // Apply logarithmic scale
      .interpolator(d3.interpolateReds); // Use red color scale for incorrect

    // Determine highlight colors for combined grid (use purple)
    const currentHighlightCellColorCombined = colors.other.fill;
    const currentHighlightPointColorCombined = colors.other.fill;

    // Update fill attributes to use green for correct and red for wrong predictions
    combinedG
      .selectAll("rect")
      .data(combinedData) // Use combinedCounts
      .join(
        (enter) =>
          enter
            .append("rect") // Use 'rect' to enclose datapoints in rectangles
            .attr("x", (d) => combinedXScale(d.predicted))
            .attr("y", (d) => combinedYScale(d.actual))
            .attr("width", cellSize)
            .attr("height", cellSize)
            .attr("fill", (d) =>
              getFillColor(
                d,
                -1,
                colors,
                useImageMapping,
                selectedCells,
                selectedImages,
                combinedCorrectColorScale,
                combinedIncorrectColorScale,
                combinedCorrectColorScale,
                combinedIncorrectColorScale
              )
            )
            .attr("stroke", (d) =>
              getStrokeColor(
                d,
                -1,
                colors,
                selectedCells,
                useImageMapping,
                selectedImages
              )
            )
            .attr("stroke-width", (d) =>
              selectedCells.some(
                (cell) =>
                  cell.actual === d.actual && cell.predicted === d.predicted
              )
                ? 3
                : 1
            )
            .attr("filter", (d) =>
              selectedCells.some(
                (cell) =>
                  cell.actual === d.actual && cell.predicted === d.predicted
              )
                ? "url(#glow)"
                : "none"
            )
            .on("mouseover", (event, d) => handleMouseOver(event, d))
            .on("mouseout", (event, d) => {
              // Only hide tooltip if not in selection mode
              if (!selectionMode) {
                setHoveredCell(null);
              }
            })
            .on("click", (event, d) => handleCombinedCellClick(event, d)),
        (update) => update,
        (exit) => exit.remove()
      );

    // Add circles to the combined matrix
    combinedG
      .selectAll("circle")
      .data(combinedData, (d) => `${d.actual}-${d.predicted}`)
      .join(
        (enter) =>
          enter
            .append("g") // Wrap circles in a group
            .attr("class", "data-point-group")
            .each(function (d) {
              const group = d3.select(this);
              group
                .append("circle")
                .attr(
                  "cx",
                  jitter(
                    combinedXScale(d.predicted) + cellSize / 2,
                    3,
                    hashCode(`${d.actual}-${d.predicted}-x`)
                  )
                )
                .attr(
                  "cy",
                  jitter(
                    combinedYScale(d.actual) + cellSize / 2,
                    5,
                    hashCode(`${d.actual}-${d.predicted}-y`)
                  )
                )
                .attr("r", 3)
                .attr(
                  "fill",
                  getFillColor(
                    d,
                    -1,
                    colors,
                    useImageMapping,
                    selectedCells,
                    selectedImages,
                    combinedCorrectColorScale,
                    combinedIncorrectColorScale,
                    combinedCorrectColorScale,
                    combinedIncorrectColorScale
                  )
                )
                .attr(
                  "stroke",
                  getStrokeColor(
                    d,
                    -1,
                    colors,
                    selectedCells,
                    useImageMapping,
                    selectedImages
                  )
                )
                .attr(
                  "stroke-width",
                  selectedCells.some(
                    (cell) =>
                      cell.actual === d.actual && cell.predicted === d.predicted
                  )
                    ? 3
                    : 1
                )
                .attr(
                  "filter",
                  selectedCells.some(
                    (cell) =>
                      cell.actual === d.actual && cell.predicted === d.predicted
                  )
                    ? "url(#glow)"
                    : "none"
                )
                .on("mouseover", (event, d) => handleMouseOver(event, d))
                .on("mouseout", (event, d) => {
                  // Only hide tooltip if not in selection mode
                  if (!selectionMode) {
                    setHoveredCell(null);
                  }
                })
                .on("click", (event, d) => handleCombinedCellClick(event, d));

              // Check for overlapping data points and add arrows
              const overlapping =
                combinedData.filter(
                  (item) =>
                    item.actual === d.actual && item.predicted === d.predicted
                ).length > 1;

              if (overlapping) {
                group
                  .append("line")
                  .attr("x1", combinedXScale(d.predicted) + cellSize / 2)
                  .attr("y1", combinedYScale(d.actual) + cellSize / 2)
                  .attr("x2", combinedXScale(d.predicted) + cellSize / 2 + 10) // Example offset
                  .attr("y2", combinedYScale(d.actual) + cellSize / 2 - 10) // Example offset
                  .attr("stroke", "black")
                  .attr("marker-end", "url(#arrow)");
              }
            }),
        (update) => update,
        (exit) => exit.remove()
      );

    // Add arrow marker definition
    combinedG
      .append("defs")
      .append("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 0 10 10")
      .attr("refX", 5)
      .attr("refY", 5)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto-start-reverse")
      .append("path")
      .attr("d", "M 0 0 L 10 5 L 0 10 z")
      .attr("fill", "black");

    const combinedXAxis = d3
      .axisBottom(combinedXScale)
      .tickSize(0)
      .tickPadding(5);
    const combinedYAxis = d3
      .axisLeft(combinedYScale)
      .tickSize(0)
      .tickPadding(5);

    combinedG
      .append("g")
      .attr("transform", `translate(0, ${height - margin.top - margin.bottom})`)
      .call(combinedXAxis)
      .selectAll("text")
      .remove();

    combinedG.append("g").call(combinedYAxis).selectAll("text").remove();

    // combinedG
    //   .append("text")
    //   .attr("text-anchor", "middle")
    //   .attr("x", (width - margin.left - margin.right) / 2)
    //   .attr("y", height - margin.top - margin.bottom + 25)
    //   .text("Combined Predicted Classes")
    //   .style("font-size", "14px");

    // combinedG
    //   .append("text")
    //   .attr("text-anchor", "middle")
    //   .attr("x", -(height - margin.top - margin.bottom) / 2)
    //   .attr("y", -25)
    //   .attr("transform", "rotate(-90)")
    //   .text("Combined Actual Classes")
    //   .style("font-size", "14px");
  }, [
    counts,
    useImageMapping, // Add useImageMapping to dependencies
    imageMappingDatasets, // Add imageMappingDatasets to dependencies
    classDatasets,
    classes,
    graphSize,
    selectedCells,
    selectionMode,
    calculateClassCounts,
    calculateMetrics,
    handleCombinedCellClick,
    handleMouseOver,
    colors.original.fill, // Added dependency
    colors.original.stroke, // Added dependency
    colors.other.fill, // Added dependency
    colors.other.stroke, // Added dependency
    handleCellClick, // Added dependency
    jitter, // Added dependency
    selectedImages, // Add selectedImages to dependencies
  ]);

  // Add a new useEffect to handle deselection and ensure mapping consistency
  useEffect(() => {
    if (useImageMapping && selectedImages.length === 0) {
      // If no images are selected, clear mapped cells in other grids
      imageMappingDatasets.forEach((dataset, idx) => {
        setSelectedCells((prev) =>
          prev.filter((cell) => cell.gridIndex === 0 || cell.gridIndex !== idx)
        );
      });
    }
  }, [selectedImages, useImageMapping, imageMappingDatasets]);

  // 2. Modify the useEffect that renders the Overall Metrics bar chart
  useEffect(() => {
    if (!metrics || Object.keys(metrics).length === 0 || useImageMapping) return;

    // Select the Overall Metrics SVG element
    const svg = d3.select(overallMetricsChartRef.current);
    svg.selectAll("*").remove(); // Clear previous renders

    const margin = { top: 20, right: 30, bottom: 60, left: 50 }; // Increased bottom margin for legend
    const width = 800 - margin.left - margin.right; // Increased width
    const height = 500 - margin.top - margin.bottom; // Increased height

    const g = svg
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom + 50) // Adjusted height for legend
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Prepare data
    const models = classDatasets.map((dataset) => dataset.name);
    const metricsList = ["Precision", "Recall", "F1 Score", "Accuracy"];

    // Prepare data array
    const data = [];
    classDatasets.forEach((dataset, index) => {
      const modelMetrics = metrics[index];
      if (modelMetrics) {
        data.push(
          { model: dataset.name, metric: "Precision", value: modelMetrics.overallPrecision },
          { model: dataset.name, metric: "Recall", value: modelMetrics.overallRecall },
          { model: dataset.name, metric: "F1 Score", value: modelMetrics.overallF1Score },
          { model: dataset.name, metric: "Accuracy", value: modelMetrics.accuracy }
        );
      }
    });

    // Set up scales
    const x0 = d3.scaleBand()
      .domain(models)
      .range([0, width])
      .paddingInner(0.2); // Increased paddingInner for spacing between models

    const x1 = d3.scaleBand()
      .domain(metricsList)
      .range([0, x0.bandwidth()])
      .padding(0.1); // Increased padding for spacing between bars within a model

    const y = d3.scaleLinear()
      .domain([0, 1])
      .range([height, 0]);

    // Color scale for metrics
    const color = d3.scaleOrdinal()
      .domain(metricsList)
      .range(d3.schemeCategory10);

    // Add X axis
    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x0));

    // Add Y axis
    g.append("g")
      .call(d3.axisLeft(y).ticks(10, "%"));

    // Draw bars
    const nestedData = d3.groups(data, d => d.model);

    const barGroups = g.selectAll("g.layer")
      .data(nestedData)
      .enter()
      .append("g")
      .attr("class", "layer")
      .attr("transform", d => `translate(${x0(d[0])},0)`);

    barGroups.selectAll("rect")
      .data(d => d[1])
      .enter()
      .append("rect")
      .attr("class", d => `bar metric-${d.metric.replace(/\s+/g, '')}`)
      .attr("x", d => x1(d.metric))
      .attr("y", d => y(d.value))
      .attr("width", x1.bandwidth())
      .attr("height", d => height - y(d.value))
      .attr("fill", d => color(d.metric))
      .attr("opacity", 1)
      .on("mouseover", function(event, d) {
        const metricClass = `.metric-${d.metric.replace(/\s+/g, '')}`;
        d3.selectAll('.bar')
          .transition()
          .duration(200)
          .attr("opacity", 0.3);
        d3.selectAll(metricClass)
          .transition()
          .duration(200)
          .attr("opacity", 1);

        // Add value labels on top of all bars of the hovered metric
        g.selectAll(".value-label").remove(); // Remove existing labels
        data.filter(item => item.metric === d.metric).forEach((datum) => {
          g.append("text")
            .attr("class", "value-label")
            .attr("x", x0(datum.model) + x1(datum.metric) + x1.bandwidth() / 2)
            .attr("y", y(datum.value) - 5)
            .attr("text-anchor", "middle")
            .text(datum.value.toFixed(2));
        });
      })
      .on("mouseout", function() {
        d3.selectAll('.bar')
          .transition()
          .duration(200)
          .attr("opacity", 1);

        // Remove the value labels
        g.selectAll(".value-label").remove();
      });

    // Add color legend for metrics
    const legend = svg.selectAll(".legend")
      .data(metricsList)
      .enter()
      .append("g")
      .attr("class", "legend")
      .attr("transform", (d, i) => `translate(${margin.left + i * 120}, ${height + margin.top + margin.bottom - 20})`);

    legend.append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", 14)
      .attr("height", 14)
      .attr("fill", d => color(d));

    legend.append("text")
      .attr("x", 20)
      .attr("y", 12)
      .text(d => d);

  }, [metrics, classDatasets, useImageMapping]);

  // 3. Modify the return statement to include spacing and the new metrics chart
  return (
    <div style={{ padding: "20px", position: "relative" }}>
      <div
        style={{ marginBottom: "20px", textAlign: "center", fontSize: "12px" }}
      >
        {/* Removed the legend title */}
        {/* <h4>Legend</h4> */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <span
              style={{
                display: "inline-block",
                width: "13px", // Increased width
                height: "13px", // Increased height
                backgroundColor: colors.original.fill,
                border: `1px solid ${colors.original.stroke}`,
                borderRadius: "50%", // Make the box circular
              }}
            ></span>
            <span style={{ fontSize: "10px" }}>Selected Cell</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <span
              style={{
                display: "inline-block",
                width: "13px", // Increased width
                height: "13px", // Increased height
                backgroundColor: colors.other.fill,
                border: `1px solid ${colors.other.stroke}`,
                borderRadius: "50%", // Make the box circular
              }}
            ></span>
            <span style={{ fontSize: "10px" }}>Corresponding Cell</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <span
              style={{
                display: "inline-block",
                width: "13px", // Increased width
                height: "13px", // Increased height
                backgroundColor: "green",
                border: "1px solid white",
                borderRadius: "50%", // Make the box circular
              }}
            ></span>
            <span style={{ fontSize: "10px" }}>Correct Prediction</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <span
              style={{
                display: "inline-block",
                width: "13px", // Increased width
                height: "13px", // Increased height
                backgroundColor: "red",
                border: "1px solid white",
                borderRadius: "50%", // Make the box circular
              }}
            ></span>
            <span style={{ fontSize: "10px" }}>Incorrect Prediction</span>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center", // Added for vertical alignment
          marginBottom: "20px",
        }}
      >
        <button
          onClick={goToDash}
          style={{
            padding: "10px 20px",
            backgroundColor: "#2196F3",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          Go to Dashboard
        </button>
        <div style={{ display: "flex", alignItems: "center" }}>
          {" "}
          {/* Changed to flex */}
          <button
            onClick={() => setSelectionMode(!selectionMode)}
            style={{
              padding: "10px 20px",
              backgroundColor: selectionMode ? "#4CAF50" : "#f0f0f0",
              color: selectionMode ? "white" : "black",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
              marginRight: "10px",
            }}
          >
            {selectionMode
              ? "Disable Region Selection"
              : "Enable Region Selection"}
          </button>
          <button
            onClick={() => setUseImageMapping(!useImageMapping)}
            style={{
              padding: "10px 20px",
              backgroundColor: useImageMapping ? "#4CAF50" : "#f0f0f0",
              color: useImageMapping ? "white" : "black",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
              marginLeft: "10px",
            }}
          >
            {useImageMapping ? "Disable Image Mapping" : "Enable Image Mapping"}
          </button>
          {/* Moved Clear Selection button inside the button group */}
          <button
            onClick={() => {
              setSelectedCells([]); // Clear selected cells
              setSelectedImages([]); // Clear selected images
            }}
            style={{
              padding: "10px 20px",
              backgroundColor: "#ff4d4d",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
              marginLeft: "10px", // Added margin for spacing
            }}
          >
            Clear Selection
          </button>
        </div>
      </div>

      {hoveredCell && (
        <div
          style={{
            position: "absolute",
            top: tooltipPosition.y,
            left: tooltipPosition.x,
            backgroundColor: "rgba(255, 255, 255, 0.9)", // Slight transparency
            border: "1px solid #ccc",
            borderRadius: "8px",
            padding: "12px",
            zIndex: 1000,
            pointerEvents: "none",
            maxWidth: "250px",
            boxShadow: "0px 4px 12px rgba(0,0,0,0.15)",
            opacity: hoveredCell ? 1 : 0,
            transition: "opacity 0.3s ease-in-out",
          }}
        >
          <div>{`Actual: ${hoveredCell.actual}`}</div>
          <div>{`Predicted: ${hoveredCell.predicted}`}</div>
          {!useImageMapping && hoveredCell.value !== undefined && (
            <div>{`Value: ${hoveredCell.value}`}</div>
          )}
          {hoverImages.length > 0 ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
              {hoverImages.map((imgData, index) => (
                <div key={index} style={{ textAlign: "center" }}>
                  <img
                    src={imgData.url}
                    alt={`Image ${index + 1}`}
                    style={{ width: "75px", height: "auto", borderRadius: "5px" }}
                  />
                  <div style={{ fontSize: "10px" }}>{imgData.model}</div>
                </div>
              ))}
            </div>
          ) : (
            <div>No images available.</div>
          )}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "40px", // Increased gap between matrices
          margin: "0 0 20px 0", // Adjusted vertical margin to remove space above grids
        }}
      >
        {(useImageMapping ? imageMappingDatasets : classDatasets).map(
          (dataset, index) => (
            <div key={index} style={{ textAlign: "center" }}>
              <h4>{dataset.name}</h4>
              {!useImageMapping && metrics[index] && (
                <div style={{ marginBottom: "10px", fontSize: "12px" }}>
                  <p>
                    {`Precision: ${metrics[index].overallPrecision.toFixed(
                      2
                    )} | `}
                    {`Recall: ${metrics[index].overallRecall.toFixed(2)} | `}
                    {`F1 Score: ${metrics[index].overallF1Score.toFixed(2)} | `}
                    {`Accuracy: ${metrics[index].accuracy.toFixed(2)}`}
                  </p>
                </div>
              )}
              {/* Display number of data points */}
              <div style={{ marginBottom: "10px", fontSize: "14px" }}>
                {`Data Points: ${
                  getDataPointCount(dataset.data) // Use the counting function
                }`}
              </div>
              <svg
                ref={(el) => (svgRefs.current[index] = el)}
                width="100%"
                height={graphSize * 0.8} // Reduced height
              />
            </div>
          )
        )}
      </div>

      {!useImageMapping && (
        <div style={{ marginTop: "40px", textAlign: "center" }}>
          <h3>Combined Matrix</h3>
          {/* Display number of data points for combined matrix */}
          <div style={{ marginBottom: "10px", fontSize: "14px" }}>
            {`Total Data Points: ${
              (useImageMapping ? imageMappingDatasets : classDatasets).reduce(
                (sum, dataset) => sum + getDataPointCount(dataset.data),
                0
              ) // Use the counting function
            }`}
          </div>
          <svg
            ref={(el) => (svgRefs.current[svgRefs.current.length - 1] = el)}
            width="100%"
            height={graphSize * 1} // Reduced height
          />
          {/* Add spacing */}
          <div style={{ height: "40px" }}></div>
          {/* Add Metrics Bar Chart */}
          <h3>Overall Metrics</h3>
          <svg ref={overallMetricsChartRef}></svg>
        </div>
      )}
    </div>
  );
};

TwoMThouMatrix.propTypes = {
  classDatasets: PropTypes.array.isRequired, // Updated from datasets
  imageMappingDatasets: PropTypes.array.isRequired, // Ensure this prop is passed
  classes: PropTypes.array.isRequired,
  goToDash: PropTypes.func.isRequired,
  graphSize: PropTypes.number.isRequired,
};

export default TwoMThouMatrix;
