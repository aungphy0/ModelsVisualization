import * as d3 from 'd3';
import AxisVertical from './AxisVertical';
import { useEffect, useState } from 'react';

const MARGIN = { top: 60, right: 40, bottom: 30, left: 250 };

const ParallelCoordinatePlot = ({data, width, height, FROM_VARIABLES, TO_VARIABLES, setImg, model }) => {



  const boundsWidth = width - MARGIN.right - MARGIN.left;
  const boundsHeight = height - MARGIN.top - MARGIN.bottom;
  // const variables = Array.from({length: VARIABLES}, (_, index) => index); //Creates an array from 0 to VARIABLES
  const v = Array.from({length: TO_VARIABLES}, (_, index) => index);
  const variables = v.slice(FROM_VARIABLES, TO_VARIABLES);

  // Compute a xScale: spread all Y axis along the chart width
  const xScale = d3
    .scalePoint()
    .range([0, boundsWidth])
    .domain(variables)
    .padding(0);

  // Compute the yScales: 1 scale per variable
  let yScales = {};
  variables.forEach((variable) => {
    yScales[variable] = d3
      .scaleLinear()
      .range([boundsHeight, 0])
      .domain([0, 1]);
  });


  // Compute lines
  const lineGenerator = d3.line();

  const allLines = data.map((series, i) => {
    const allCoordinates = variables.map((variable) => {
      const yScale = yScales[variable];
      const x = xScale(variable) ?? 0;
      const y = yScale(series["probabilities"][variable.toString()]);
      const coordinate = [x, y];
      return coordinate;
    });

    const d = lineGenerator(allCoordinates);

    if (!d) {
      return <></>;
    }
                                                                  
    return (
      <path
        key={i}
        d={d}
        stroke="skyblue"
        fill="none"
        style={{
          cursor: 'pointer',
          transition: 'stroke-width 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.target.style.strokeWidth = '3px'; // Highlight the line on hover
          e.target.style.stroke = 'darkblue'; // Optional: Change stroke color
        }}
        onMouseLeave={(e) => {
          e.target.style.strokeWidth = '1px'; // Revert stroke width
          e.target.style.stroke = 'skyblue'; // Revert stroke color
        }}
        onClick={() => {
          setImg(series["name"]); // Set image on click
        }}
      >
      {/* Tooltip with the series name */}
        <title>
          Actual: {series.actual}  <br></br>
          Predicted: {series.predicted}
        </title>
      </path>

      
    );

  });

  // Compute Axes
  const allAxes = variables.map((variable, i) => {
    const yScale = yScales[variable];
    return (
      <g key={i} transform={"translate(" + xScale(variable) + ",0)"}>
        <AxisVertical yScale={yScale} pixelsPerTick={40} name={variable} model={model} />
      </g>
    );
  });

  return (
    <svg width={width} height={height}>
      <g
        width={boundsWidth}
        height={boundsHeight}
        transform={`translate(${[MARGIN.left, MARGIN.top].join(",")})`}
      >
        {allLines}
        {allAxes}
      </g>
    </svg>
    
  );
}

export default ParallelCoordinatePlot;