import { useState } from "react";
import OpacityTransferFunction from "./OpacityTransferFunction";
import { ChromePicker } from "react-color";

export default function App() {
  const [palette, setPalette] = useState([
    { offset: 0.0, color: "rgb(240, 241, 211)" },
    { offset: 0.49, color: "rgb(215, 12, 37)" },
    { offset: 1.0, color: "rgb(12, 32, 207)" },
  ]);
  const [points, setPoints] = useState([
    { x: -1, y: 10 },
    { x: 0.5, y: 0 },
    { x: 10, y: 10 },
  ]);
  const onUpdate = (e) => {};
  const randColor = () =>
    "rgb(" +
    Math.random() * 255 +
    ", " +
    Math.random() * 255 +
    ", " +
    Math.random() * 255 +
    ")";
  const randPoint = () => {
    return { x: Math.random(), y: Math.random() };
  };

  return (
    <>
      <button
        onClick={() =>
          setPalette([
            { offset: 0.0, color: randColor() },
            { offset: 0.49, color: randColor() },
            { offset: 1.0, color: randColor() },
          ])
        }
      >
        New Color
      </button>
      <button
        onClick={() => {
          const n = Math.random() * 6;
          const newPoints = [];
          for (let i = 0; i < n; i++) newPoints.push(randPoint());
          console.log("new points", newPoints);
          setPoints(newPoints);
        }}
      >
        New Points
      </button>

      <div style={{ height: "200px" }}>
        <OpacityTransferFunction
          InitialPoints={points}
          Gradient={palette}
          UpdateCallBack={onUpdate}
          CoordinatesStyle={{ color: "blue", fontSize: 20 }}
          UserData={[
            { x: 12, y: 1 },
            { x: 0, y: 0 },
          ]}
          HasGradientSelector={true}
          HasSync={true}
          HasGradientTable={true}
          HasDataTable={true}
          ShowCoordinates={true}
          ShowDottedLines={true}
        />
      </div>
      {/* <div style={{height:'200px', marginTop:'300px'}}>
      <InteractiveLinePlot 
        InitialPoints={points} 
        Gradient={palette} 
        UpdateCallBack={onUpdate} 
        ShowDottedLines={true} 
        ShowCoordinates={true}
        Bounds={{upper:{x:20,y:1},lower:{x:-20,y:0}}}
        HasGradientSelector={true}
      />
    </div> */}
    </>
  );
}
