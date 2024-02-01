import { updateGradient } from "./GradientUtils";

const GradientPointHeight = 0.001;

/**
 * gets the offset from zero of the data and the range of the data
 * @param {Array<{x:Number,y:Number}>} initialPoints
 * @returns {{offset: {x: number,y: number},scale: {x: number,y: number}}}
 */
function normalizedData(initialPoints) {
  const offset = {
    x: initialPoints[0].x,
    y: Math.min(...initialPoints.map((val) => val.y)),
  };
  const scale = {
    x: Math.max(...initialPoints.map((val) => val.x)) - offset.x,
    y: Math.max(...initialPoints.map((val) => val.y)) - offset.y,
  };
  if (scale.x === 0) scale.x = 1;
  if (scale.y === 0) scale.y = 1;
  return { offset, scale };
}

/**
 * Binary Search
 * @param {Array} arr Sorted array to binary search through
 * @param {Number} x Value to search for
 * @returns {Number} index of value or of where value would be
 */
function indexToInsert(arr, x) {
  let low = 0,
    high = arr.length;

  while (low < high) {
    let mid = (low + high) >>> 1;
    if (arr[mid] < x) low = mid + 1;
    else high = mid;
  }
  return low;
}

/**
 * get position from window on chart
 * @param {Event} ev
 * @param {import('chart.js').ChartArea} area
 * @param {{x,y}} offset
 * @param {{x,y}} scale
 * @returns {{x:number,y:number}}
 */
function getPos(ev, area, offset, scale) {
  const eventDoc = (ev.target && ev.target.ownerDocument) || document;
  const doc = eventDoc.documentElement;
  const body = eventDoc.body;
  const pageX =
    ev.clientX +
    ((doc && doc.scrollLeft) || (body && body.scrollLeft) || 0) -
    ((doc && doc.clientLeft) || (body && body.clientLeft) || 0);
  const pageY =
    ev.clientY +
    ((doc && doc.scrollTop) || (body && body.scrollTop) || 0) -
    ((doc && doc.clientTop) || (body && body.clientTop) || 0);
  const offsetX = area.left + ev.target.offsetLeft;
  const offsetY = ev.target.offsetTop + area.bottom;
  return {
    x: ((pageX - offsetX) * scale.x) / area.width + offset.x,
    y: ((offsetY - pageY) * scale.y) / area.height + offset.y,
  };
}

/**
 * creates the options for a ChartJS chart
 * @param {{scale,offset}} normalization
 * @param {Object} plugin Optional plugins
 * @param {Object} pluginOptions Optional
 * @returns ChartJS options
 */
function getOptions(normalization, plugin, pluginOptions) {
  const options = {
    maintainAspectRatio: false,
    events: [],
    plugins: {
      legend: { display: false },
      title: { display: false },
    },
    animation: { duration: 0 },
    scales: {
      x: {
        display: false,
        min: normalization.offset.x,
        max: normalization.offset.x + normalization.scale.x,
        type: "linear",
      },
      y: {
        display: false,
        min: normalization.offset.y,
        max: normalization.offset.y + normalization.scale.y,
      },
    },
  };
  if (plugin) options.plugins[plugin.id] = pluginOptions;

  return options;
}

/**
 * attempts to add a point to chart
 * @param {import('react-chartjs-2/dist/types').ChartJSOrUndefined} chart
 * @param {Number} x x value of point to remove
 * @param {Number} y y value of point to remove
 * @param {Number} index Optional
 * @returns true on success
 */
function addPoint(chart, x, y, index) {
  if (index === undefined) index = indexToInsert(chart.data.labels, x);
  if (chart.data.labels[index] !== x && chart.data.labels[index + 1] !== x) {
    chart.data.labels.splice(index, 0, x);
    chart.data.datasets[0].data.splice(index, 0, y);
    chart.update();
    return true;
  }
  return false;
}

/**
 * attempts to remove a point from chart
 * @param {import('react-chartjs-2/dist/types').ChartJSOrUndefined} chart
 * @param {Number} x x value of point to remove
 * @param {Number} y y value of point to remove
 * @param {Number} index Optional
 * @returns true on success
 */
function removePoint(chart, x, y, index) {
  if (index === undefined) {
    index = indexToInsert(chart.data.labels, x);
    if (
      chart.data.labels[index] !== x ||
      chart.data.datasets[0].data[index] !== y
    )
      return false;
  }
  chart.data.labels.splice(index, 1);
  chart.data.datasets[0].data.splice(index, 1);
  chart.update();
  return true;
}

/**
 * draws dotted lines on context under point
 * @param {CanvasRenderingContext2D} ctx
 * @param {Number} x
 * @param {Number} y
 * @param {{x,y}} offset
 * @param {{x,y}} scale
 * @param {import('chart.js').ChartArea} area
 */
function drawDotted(ctx, x, y, offset, scale, area) {
  x = ((x - offset.x) / scale.x) * area.width + area.left;
  y = (1 - (y - offset.y) / scale.y) * area.height + area.top + 5;
  ctx.strokeStyle = "black";
  const dy = area.height / 50;
  while (y < area.bottom) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, Math.min(y + dy, area.bottom));
    ctx.stroke();
    y += dy * 2;
  }
}

/**
 *
 * @param {import('react-chartjs-2/dist/types').ChartJSOrUndefined} chart1
 * @param {import('react-chartjs-2/dist/types').ChartJSOrUndefined} chart2
 * @param {{scale,offset}} norm1
 * @param {{scale,offset}} norm2
 * @param {Array<{color,offset}>} gradient
 */
function sync(chart1, chart2, norm1, norm2, gradient) {
  const e = 0.01;
  const mid1 = norm1.offset.y + norm1.scale.y / 2;
  const mid2 = norm2.offset.y + norm2.scale.y / 2;

  const old1 = chart1.data.labels;
  const old2 = chart2.data.labels;
  const oldy1 = chart1.data.datasets[0].data;
  const oldy2 = chart2.data.datasets[0].data;
  const oldGrad = gradient.map((c) => c);
  gradient.length = 0;

  const newx = [];
  const newy1 = [];
  const newy2 = [];

  let i1 = 0,
    i2 = 0;
  const pos1 = () => (old1[i1] - norm1.offset.x) / norm1.scale.x;
  const pos2 = () => (old2[i2] - norm2.offset.x) / norm2.scale.x;
  const add1 = (pos) => {
    newx.push(pos);
    newy1.push(oldy1[i1]);
    newy2.push(mid2);
    gradient.push({ offset: pos, color: "rgb(99,99,99)" });
    i1++;
  };
  const add2 = (pos) => {
    newx.push(pos);
    newy1.push(mid1);
    newy2.push(oldy2[i2]);
    gradient.push(oldGrad[i2]);
    i2++;
  };
  while (i1 < old1.length && i2 < old2.length) {
    const x1 = pos1();
    const x2 = pos2();
    if (Math.abs(x1 - x2) < e) {
      const x = (x1 + x2) / 2;
      newx.push(x);
      newy1.push(oldy1[i1]);
      newy2.push(oldy2[i2]);
      gradient.push({ offset: x, color: oldGrad[i2].color });
      i1++;
      i2++;
    } else if (x1 < x2) add1(x1);
    else add2(x2);
  }
  while (i1 < old1.length) add1();
  while (i2 < old2.length) add2();

  chart1.data.labels = newx.map((x) => x * norm1.scale.x + norm1.offset.x);
  chart2.data.labels = newx.map((x) => x * norm2.scale.x + norm2.offset.x);
  chart1.data.datasets[0].data = newy1;
  chart2.data.datasets[0].data = newy2;
  chart1.update();
  chart2.update();
}

/**
 * sets up event listeners of chart
 * @param {import('react-chartjs-2/dist/types').ChartJSOrUndefined} chart
 * @param {Array<{offset,color}>} gradient
 * @param {*} normalization
 * @param {Function} onUpdate
 * @param {*} coordinateState
 * @param {Boolean} showDotted
 * @param {Boolean} setOpacity
 * @param {*} gradientState
 * @param {Number} e
 */
function chartInit(
  chart,
  gradient,
  { offset, scale },
  onUpdate,
  coordinateState,
  showDotted,
  setOpacity,
  gradientState,
  e
) {
  if (!chart) return;

  const canvas = chart.canvas;
  const ctx = canvas.getContext("2d");
  const e0 =
    e ||
    Math.max(scale.x, scale.y) /
      Math.min(chart.chartArea.width, chart.chartArea.height);
  const e1 = scale.x / chart.chartArea.width;
  let activeIndex = null;
  let leftBound = offset.x + e1,
    rightBound = offset.x + scale.x - e1;
  let x, y;

  const updateArgs = (type, index, x_, y_) => {
    return {
      type,
      chart,
      point: { x: x_ !== undefined ? x_ : x, y: y_ !== undefined ? y_ : y },
      index: index !== undefined ? index : activeIndex,
      pointsX: chart.data.labels,
      pointsY: chart.data.datasets[0].data,
      gradientPoints: updateGradient(
        chart,
        gradient,
        { offset, scale },
        setOpacity,
        gradientState
      ),
    };
  };

  const onPointerMove = (ev) => {
    if (activeIndex != null) {
      if (activeIndex === 0 || activeIndex === chart.data.labels.length - 1)
        x = chart.data.labels[activeIndex];
      else {
        x = Math.min(Math.max(x, leftBound), rightBound);
        chart.data.labels[activeIndex] = x;
      }
      chart.data.datasets[0].data[activeIndex] = y;
      onUpdate(updateArgs("pointerMove"));
      if (showDotted) drawDotted(ctx, x, y, offset, scale, chart.chartArea);
    }
  };
  canvas.onpointerdown = (ev) => {
    if (!x) ({ x, y } = getPos(ev, chart.chartArea, offset, scale));
    let index = indexToInsert(chart.data.labels, x);
    let min = { val: 1000, i: -2 };
    for (let i = -1; i < 2; i++) {
      const dist2 =
        (chart.data.labels[index + i] - x) ** 2 +
        (chart.data.datasets[0].data[index + i] - y) ** 2;
      if (dist2 < Math.min(min.val, e0)) min = { val: dist2, i: i };
    }

    if (min.i !== -2) {
      if (ev.button === 2) {
        activeIndex = null;
        canvas.onpointermove = null;

        if (
          index + min.i !== 0 &&
          index + min.i !== chart.data.labels.length - 1
        )
          if (removePoint(chart, x, y, index + min.i))
            onUpdate(updateArgs("removePoint", index + min.i));

        return;
      }
      activeIndex = index + min.i;
      leftBound = (chart.data.labels[activeIndex - 1] || offset.x) + e1;
      rightBound =
        (chart.data.labels[activeIndex + 1] || offset.x + scale.x) - e1;
      canvas.onpointermove = onPointerMove;
      onUpdate(updateArgs("pointerDown"));
      if (showDotted)
        drawDotted(
          ctx,
          chart.data.labels[index + min.i],
          chart.data.datasets[0].data[index + min.i],
          offset,
          scale,
          chart.chartArea
        );
      return;
    }
    if (x < offset.x || x > offset.x + scale.x) return;
    if (addPoint(chart, x, y, index)) {
      onUpdate(updateArgs("addPoint", index));
      if (showDotted) drawDotted(ctx, x, y, offset, scale, chart.chartArea);
    }
  };
  canvas.onpointerup = (ev) => {
    const x_ = chart.data.labels[activeIndex],
      y_ = chart.data.datasets[0].data[activeIndex];
    const index = activeIndex;
    activeIndex = null;
    canvas.onpointermove = null;
    onUpdate(updateArgs("pointerUp", index, x_, y_));
  };
  canvas.onmousemove = canvas.onmouseenter = (ev) => {
    ({ x, y } = getPos(ev, chart.chartArea, offset, scale));
    if (!setOpacity) y = GradientPointHeight;
    coordinateState.setPos({ x, y });
  };
  canvas.onresize = () =>
    (e0 =
      e ||
      Math.max(scale.x, scale.y) /
        Math.min(chart.chartArea.width, chart.chartArea.height));
}

export { normalizedData, getOptions, chartInit, sync };
