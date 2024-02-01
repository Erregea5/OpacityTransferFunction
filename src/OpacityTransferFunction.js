import React, { useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend,
} from "chart.js";
import { Line, Scatter } from "react-chartjs-2";
import { ChromePicker } from "react-color";
import { cssColorToRGB, setGradient, updateGradient } from "./GradientUtils";
import { normalizedData, getOptions, chartInit, sync } from "./ChartUtils";
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend
);

const GradientPointHeight = 0.001;

/**
 * Component to pick color of gradient
 * @param {Object} param
 * @param {Array<{offset,color}>} param.Gradient
 * @param {*} param.colorState
 * @param {*} param.updateColors
 */
function ColorPicker({ Gradient, colorState, updateColors }) {
  const [color, setColor] = useState("rgb(100,100,100)");
  const [index, setIndex] = useState(-1);
  colorState.index = index;
  colorState.setIndex = setIndex;
  if (index < 0) return <div></div>;
  return (
    <div style={{ position: "absolute", zIndex: 2 }}>
      <ChromePicker
        color={color}
        onChange={(color) => {
          Gradient[index].color =
            "rgb(" + color.rgb.r + "," + color.rgb.g + "," + color.rgb.b + ")";
          setColor(Gradient[index].color);
          updateColors();
        }}
      />
    </div>
  );
}

/**
 * Component to add, move, and remove points to gradient
 * @param {Object} param
 * @param {Array<{offset,color}>} param.Gradient
 * @param {import('react-chartjs-2/dist/types').ChartJSOrUndefined} param.lineChart
 * @param {{scale,offset}} param.lineNorm
 */
function GradientSelector({
  Gradient,
  lineChart,
  lineTableState,
  lineNorm,
  gradientSelectorState,
  hasGradientTable,
  hasSync,
}) {
  const normalization = {
    offset: { x: 0, y: 0 },
    scale: { x: 1, y: GradientPointHeight * 2 },
  };
  const [state] = useState({
    reloadNext: true,
    usingPicker: false,
    getGradient: setGradient(Gradient, [], [], normalization, false)
      .getGradient,
    gradient: Gradient,
    tableState: { setSize: () => {}, setChange: () => {} },
  });
  const colorState = {};
  console.log("render gradient", colorState.index);
  const updateColors = () => {
    updateGradient(lineChart, Gradient, lineNorm, true);
    updateGradient(chart, Gradient, normalization, false, state);
  };
  const openColorPicker = (idx) => {
    state.reloadNext = false;
    colorState.setIndex(idx);
    state.usingPicker = true;
  };
  const closeColorPicker = () => {
    state.reloadNext = false;
    colorState.setIndex(-1);
    state.usingPicker = false;
  };
  const onUpdate = (ev) => {
    switch (ev.type) {
      case "pointerMove":
        state.tableState.setChange(state.tableState.change + 1);
        Gradient[ev.index].offset = ev.point.x;
        updateColors();
        //if(state.usingPicker)
        //closeColorPicker();
        return;
      case "pointerDown":
        if (state.usingPicker && ev.index === colorState.index)
          closeColorPicker();
        else openColorPicker(ev.index);
        return;
      case "pointerUp":
        if (ev.index !== undefined) {
          ev.pointsY[ev.index] = GradientPointHeight;
          ev.chart.update();
          break;
        }
        return;
      case "addPoint":
        state.tableState.setSize(state.tableState.size + 1);
        Gradient.splice(ev.index, 0, {
          offset: ev.point.x,
          color: "rgb(220,220,120)",
        });
        openColorPicker(ev.index);
        break;
      case "removePoint":
        state.tableState.setSize(state.tableState.size - 1);
        Gradient.splice(ev.index, 1);
        ev.index--;
        closeColorPicker();
        break;
    }
    ev.pointsY[ev.index || 0] = GradientPointHeight;
    updateColors();
    console.log(ev.type, ...Gradient);
    ev.chart.update();
  };
  const plugin = {
    id: "backgroundColor",
    beforeDraw: (chart, args, options) => {
      const { ctx, chartArea } = chart;
      ctx.save();
      ctx.globalCompositeOperation = "destination-over";
      ctx.fillStyle = state.getGradient(ctx, chartArea);
      ctx.fillRect(0, 0, chart.width, chart.height);
      ctx.restore();
    },
  };

  const [chart, setChart] = useState(null);
  const [selector] = useState(
    <Scatter
      ref={(ref) => setChart(ref)}
      options={getOptions(normalization, plugin, {})}
      data={{
        labels: Gradient.map((val) => val.offset),
        datasets: [
          {
            data: Gradient.map(() => GradientPointHeight),
            pointRadius: 6,
            radius: 6,
            pointHoverRadius: 6,
            borderColor: "rgb(0, 0, 0)",
          },
        ],
      }}
      plugins={[plugin]}
    />
  );
  const [table] = useState(
    <DummyTable
      chart={chart}
      tableState={state.tableState}
      normalization={normalization}
      Gradient={Gradient}
      setOpacity={false}
      toUpdate={state}
    />
  );
  console.log(table, selector);

  if (chart && (state.reloadNext || Gradient !== state.gradient)) {
    chartInit(
      chart,
      Gradient,
      normalization,
      onUpdate,
      { setPos: () => {} },
      false,
      false,
      state,
      0.1 / chart.width
    );
    if (Gradient !== state.gradient) {
      chart.data.labels = Gradient.map((val) => val.offset);
      chart.data.datasets[0].data = Gradient.map(() => GradientPointHeight);
    }
    state.gradient = Gradient;
    updateGradient(chart, Gradient, normalization, false, state);
  }

  state.reloadNext = true;
  return (
    <>
      {selector}
      <ColorPicker
        Gradient={Gradient}
        colorState={colorState}
        updateColors={updateColors}
      />
      <div
        ref={(ref) => {
          console.log(ref, gradientSelectorState);
          if (ref) {
            ref.style.position = "absolute";
            if (gradientSelectorState.offset)
              ref.style.left = gradientSelectorState.offset;
            else
              gradientSelectorState.setOffset = (offset) => {
                console.log("succ", ref.style, offset);
                ref.style.left = offset + "px";
              };
          }
        }}
      >
        {chart && hasGradientTable && (
          <DummyTable
            chart={chart}
            tableState={state.tableState}
            normalization={normalization}
            Gradient={Gradient}
            setOpacity={false}
            toUpdate={state}
          />
        )}
        {hasSync ? (
          <button
            ref={(ref) => {
              if (!ref) return;
              const dad = ref.parentElement;
              ref.style.position = "absolute";
              ref.style.left = "100%";
              ref.style.top = "0%";
              console.log(dad.offsetWidth);
            }}
            onClick={() => {
              sync(lineChart, chart, lineNorm, normalization, Gradient);
              updateColors();
              state.tableState.setSize(Gradient.length);
              lineTableState.setSize(Gradient.length);
            }}
          >
            sync
          </button>
        ) : (
          <div></div>
        )}
      </div>
    </>
  );
}

/**
 * displays x y value of mouse on chart
 * @param {Object} param
 * @param {*} param.coordinateState
 * @param {*} param.style
 */
function Coordinates({ coordinateState, style }) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  coordinateState.setPos = setPos;
  return (
    <div style={style}>
      {pos.x.toFixed(3)}, {pos.y.toFixed(3)}
    </div>
  );
}

/**
 * table that is synced to chart data
 * @param {Object} param
 * @param {import('react-chartjs-2/dist/types').ChartJSOrUndefined} param.chart
 * @param {*} param.tableState
 * @param {{offset,scale}} param.normalization
 * @param {Array<{offset,color}>} param.Gradient
 * @param {Boolean} param.setOpacity
 * @param {Function} param.toUpdate
 */
function DummyTable({
  chart,
  tableState,
  normalization,
  Gradient,
  setOpacity,
  toUpdate,
  nextTableState,
}) {
  const { scale, offset } = normalization;
  const e1 = scale.x / chart.chartArea.width;
  const [size, setSize] = useState(chart.data.labels.length);
  const [change, setChange] = useState(0);
  tableState.setSize = setSize;
  tableState.size = size;
  tableState.change = change;
  tableState.setChange = setChange;
  console.log(normalization);

  const onChange = (ev, func) => {
    func(Math.min(Math.max(ev.target.value, ev.target.min), ev.target.max));
    chart.update();
    setChange(change - 1);
    updateGradient(chart, Gradient, normalization, setOpacity, toUpdate);
  };

  return (
    <div>
      <div>size: {size}</div>
      <table
        ref={(ref) => {
          if (ref && nextTableState) {
            if (nextTableState.setOffset)
              nextTableState.setOffset(ref.offsetLeft + ref.offsetWidth);
            else nextTableState.offset = ref.offsetLeft + ref.offsetWidth;
          }
        }}
      >
        <thead>
          <tr>
            <th>x</th>
            {setOpacity ? (
              <th>y</th>
            ) : (
              <>
                <th>r</th>
                <th>g</th>
                <th>b</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {chart ? (
            chart.data.datasets[0].data.map((val, idx) => (
              <tr key={idx}>
                <td>
                  <input
                    type="number"
                    id={idx + "+"}
                    onChange={(ev) =>
                      onChange(ev, (val) => (chart.data.labels[idx] = val))
                    }
                    value={chart.data.labels[idx]}
                    step={0.001}
                    min={(chart.data.labels[idx - 1] || offset.x) + e1}
                    max={
                      (chart.data.labels[idx + 1] || offset.x + scale.x) - e1
                    }
                  />
                </td>
                {setOpacity ? (
                  <td>
                    <input
                      type="number"
                      id={idx + "-"}
                      onChange={(ev) =>
                        onChange(
                          ev,
                          (val) => (chart.data.datasets[0].data[idx] = val)
                        )
                      }
                      value={val}
                      step={0.001}
                      min={offset.y}
                      max={offset.y + scale.y}
                    />
                  </td>
                ) : (
                  cssColorToRGB(Gradient[idx].color).map((pixel, i, arr) => (
                    <td key={idx + "*" + i}>
                      <input
                        type="number"
                        id={idx + "-" + i}
                        onChange={(ev) =>
                          onChange(ev, (val) => {
                            switch (i) {
                              case 0:
                                Gradient[idx].color =
                                  "rgb(" +
                                  val +
                                  "," +
                                  arr[1] +
                                  "," +
                                  arr[2] +
                                  ")";
                                break;
                              case 1:
                                Gradient[idx].color =
                                  "rgb(" +
                                  arr[0] +
                                  "," +
                                  val +
                                  "," +
                                  arr[2] +
                                  ")";
                                break;
                              case 2:
                                Gradient[idx].color =
                                  "rgb(" +
                                  arr[0] +
                                  "," +
                                  arr[1] +
                                  "," +
                                  val +
                                  ")";
                            }
                          })
                        }
                        value={pixel}
                        min={0}
                        max={255}
                      />
                    </td>
                  ))
                )}
              </tr>
            ))
          ) : (
            <tr></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Opacity Transfer function
 * @param {Object} param
 * @param {Array<{x,y}>} param.InitialPoints
 * @param {Array<{color,offset}>} param.Gradient
 * @param {Function} param.UpdateCallBack
 * @param {Boolean} param.ShowDottedLines
 * @param {Boolean} param.ShowCoordinates
 * @param {*} param.CoordinatesStyle
 * @param {*} param.UserData
 * @param {Boolean} param.HasGradientSelector
 * @param {Boolean} param.HasDataTable
 * @param {Boolean} param.HasSync
 * @param {Boolean} param.HasGradientTable
 * @param {Number} param.DistanceBetweenPoints
 */
export default function OpacityTransferFunction({
  InitialPoints,
  Gradient,
  UpdateCallBack,
  ShowDottedLines,
  ShowCoordinates,
  CoordinatesStyle,
  UserData,
  HasGradientSelector,
  DistanceBetweenPoints,
  HasDataTable,
  HasGradientTable,
  HasSync,
}) {
  console.log("render plot");
  const Points = InitialPoints;
  if (InitialPoints) InitialPoints.sort((a, b) => a.x - b.x);
  else InitialPoints = [];

  if (UserData) UserData.sort((a, b) => a.x - b.x);

  if (Gradient) Gradient.sort((a, b) => a.offset - b.offset);

  const normalization = UserData
    ? normalizedData(UserData)
    : normalizedData(InitialPoints);
  if (!Points || InitialPoints[0].x > normalization.offset.x)
    InitialPoints.splice(0, 0, {
      x: normalization.offset.x,
      y: normalization.offset.y,
    });
  if (
    !Points ||
    InitialPoints[InitialPoints.length - 1].x <
      normalization.offset.x + normalization.scale.x
  )
    InitialPoints.push({
      x: normalization.offset.x + normalization.scale.x,
      y: normalization.offset.y + normalization.scale.y,
    });

  const labels = UserData
    ? InitialPoints.map((val) =>
        Math.max(
          Math.min(val.x, normalization.scale.x + normalization.offset.x),
          normalization.offset.x
        )
      )
    : InitialPoints.map((val) => val.x);
  const data = UserData
    ? InitialPoints.map((val) =>
        Math.max(
          Math.min(val.y, normalization.scale.y + normalization.offset.y),
          normalization.offset.y
        )
      )
    : InitialPoints.map((val) => val.y);
  const options = getOptions(normalization);

  const [chart, setChart] = useState(null);
  const [state] = useState({
    points: 0,
    gradient: Gradient,
    canvas: (
      <Line
        ref={(ref) => setChart(ref)}
        options={options}
        data={{
          labels,
          datasets: [
            {
              data,
              pointRadius: 6,
              radius: 6,
              pointHoverRadius: 6,
              borderColor: "rgb(0, 0, 0)",
              fill: true,
            },
          ],
        }}
      />
    ),
  });

  const gradientSelectorState = {};
  const coordinateState = { setPos: () => {} };
  const tableState = { setSize: () => {}, setChange: () => {} };
  const onUpdate = (ev) => {
    if (ev.type === "pointerMove") tableState.setChange(tableState.change + 1);
    else if (ev.type === "addPoint") tableState.setSize(tableState.size + 1);
    else if (ev.type === "removePoint") tableState.setSize(tableState.size - 1);
    UpdateCallBack(ev);
  };

  if (chart) {
    chartInit(
      chart,
      Gradient,
      normalization,
      onUpdate,
      coordinateState,
      ShowDottedLines,
      true,
      null,
      DistanceBetweenPoints
    );
    if (state.points !== Points) {
      chart.data.labels = labels;
      chart.data.datasets[0].data = data;
      chart.options = options;
      updateGradient(chart, Gradient, normalization, true);
    } else if (state.gradient !== Gradient)
      updateGradient(chart, Gradient, normalization, true);

    state.points = Points;
    state.gradient = Gradient;
  }

  return (
    <>
      {ShowCoordinates ? (
        <Coordinates
          coordinateState={coordinateState}
          style={CoordinatesStyle}
        />
      ) : null}
      <div
        ref={(div) => {
          if (!div) return;
          div.style.height = ShowCoordinates
            ? "calc(100% - " +
              (div.offsetTop - div.parentNode.offsetTop) +
              "px)"
            : "100%";
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div style={{ height: "85%" }}>{state.canvas}</div>
        <div style={{ height: "15%" }}>
          {HasGradientSelector ? (
            <GradientSelector
              Gradient={Gradient}
              lineChart={chart}
              lineNorm={normalization}
              lineTableState={tableState}
              gradientSelectorState={gradientSelectorState}
              hasGradientTable={HasGradientTable}
              hasSync={HasSync}
            />
          ) : (
            <div></div>
          )}
        </div>
        {chart && HasDataTable ? (
          <DummyTable
            chart={chart}
            tableState={tableState}
            normalization={normalization}
            Gradient={Gradient}
            setOpacity={true}
            nextTableState={gradientSelectorState}
          />
        ) : (
          <div></div>
        )}
      </div>
    </>
  );
}
