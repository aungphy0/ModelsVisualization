import { useMemo } from "react";
import * as d3 from 'd3';


const AxisBottomWide = ({ xScale, width, height, ticks = 11 }) => {
    const tickValues = d3.range(0, 1100, 100); // Generate tick values: 0, 100, ..., 1000
  
    return (
      <g transform={`translate(0, ${height})`}>
        {/* Draw the axis line */}
        <line x1={0} x2={width} y1={0} y2={0} stroke="black" strokeWidth={0.5} />
  
        {/* Draw ticks and labels */}
        {tickValues.map((value, i) => {
          const x = xScale(value); // Normalize value to scale domain [0, 1]
          return (
            <g key={i} transform={`translate(${x}, 0)`}>
              {/* Tick line */}
              <line y1={0} y2={6} stroke="black" strokeWidth={0.5} />
              {/* Tick label */}
              <text
                y={15}
                textAnchor="middle"
                fontSize="11px"
                alignmentBaseline="hanging"
              >
                {value}
              </text>
            </g>
          );
        })}
      </g>
    );
  };

  export default AxisBottomWide;