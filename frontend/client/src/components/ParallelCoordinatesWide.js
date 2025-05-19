import {useRef, useEffect, useState} from 'react';
import * as d3 from 'd3';
import AxisVerticalWide from './AxisVerticalWide';
import Dash from './Dash';
import AxisBottomWide from './AxisBottomWide';

const MARGIN = { top: 60, right: 40, bottom: 30, left: 250 };


const ParallelCoordinateWide = ({ data, width, height, FROM_VARIABLES, TO_VARIABLES, START, END, setV1, shadedArea }) => {
  const boundsWidth = width - MARGIN.right - MARGIN.left;
  const boundsHeight = height - MARGIN.top - MARGIN.bottom;
  const v = Array.from({ length: TO_VARIABLES }, (_, index) => index);
  const variables = v.slice(FROM_VARIABLES, TO_VARIABLES + 1);

  // Compute scales
  // const xScale = d3.scalePoint().range([0, boundsWidth]).domain(variables).padding(0);
  const xScale = d3.scaleLinear().domain([0, 1000]).range([0, boundsWidth]);
  let yScales = {};
  variables.forEach(variable => {
    yScales[variable] = d3.scaleLinear().range([boundsHeight, 0]).domain([0, 1]);
  });

  const lineGenerator = d3.line();
  const allLines = data.map((series, i) => {
    const allCoordinates = variables.map(variable => {
      const yScale = yScales[variable];
      const x = xScale(variable) ?? 0;
      const y = yScale(series["probabilities"][variable.toString()]);
      return [x, y];
    });
    const d = lineGenerator(allCoordinates);
    return d ? <path key={i} d={d} stroke="skyblue" fill="none" /> : null;
  });

  const allAxes = variables.map((variable, i) => (
    <g key={i} transform={`translate(${xScale(variable)},0)`}>
      <AxisVerticalWide yScale={yScales[variable]} pixelsPerTick={40} name={variable} />
    </g>
  ));

  const svgRef = useRef(null);
  const [rectX, setRectX] = useState(MARGIN.left + START);
  const rectWidth = 31 + (shadedArea - 20);
  const rectHeight = 80;
  const rectY = 50;
  let isDragging = false;
  

  useEffect(() => {
    const svg = d3.select(svgRef.current);

    // Set up smooth transition for the rectangle
    svg.selectAll('#myRect').remove();
    svg.append('rect')
      .attr('id', 'myRect')
      .attr('y', rectY)
      .attr('width', rectWidth)
      .attr('height', rectHeight)
      .attr('fill', 'grey')
      .attr('opacity', 0.5)
      .attr('x', rectX)
      .style('transition', 'x 0.3s ease') // Add smooth transition
      .call(d3.drag()
        .on("start", dragStarted)
        .on("drag", dragging)
        .on("end", dragEnded)
      );
  }, [rectX, rectWidth]);

  const dragStarted = () => {
    isDragging = true;
  };

  const dragging = (event) => {
    if (isDragging) {
      const newX = Math.max(MARGIN.left, Math.min(boundsWidth + MARGIN.left - rectWidth, event.x));
      setRectX(newX);
    }
  };

  const dragEnded = () => {
    isDragging = false; 
  };

  console.log(Math.ceil((rectX - MARGIN.left) / 1.51))
  setV1((rectX - MARGIN.left) / 1.51)

  return (
    <svg ref={svgRef} width={width} height={height}>
      <g
        width={boundsWidth}
        height={boundsHeight}
        transform={`translate(${MARGIN.left},${MARGIN.top})`}
      >
        {allLines}
        {allAxes}
        <AxisBottomWide xScale={xScale} width={boundsWidth} height={boundsHeight} />
      </g>
    </svg>
    
  );
};


export default ParallelCoordinateWide;



