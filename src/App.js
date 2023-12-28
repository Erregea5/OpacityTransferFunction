import { useState } from "react";
import InteractiveLinePlot from "./InteractiveLinePlot";
import { ChromePicker } from 'react-color'

export default function App() {
  const [palette,setPalette]=useState([
    { offset: 0.00, color: 'rgb(240, 241, 211)' },
    { offset: 0.49, color: 'rgb(215, 12, 37)' },
    { offset: 1.00, color: 'rgb(12, 32, 207)' }
  ]);
  const [points,setPoints]=useState([
    {x:-1,y:10},
    {x:.5,y:0},
    {x:10,y:10}
  ]);
  const onUpdate=e=>{};
  const randColor=()=>'rgb('+Math.random()*255+', '+Math.random()*255+', '+Math.random()*255+')';
  const randPoint=()=>{return {x:Math.random(), y:Math.random()}};

  return (<>
    <button onClick={()=>setPalette([
        { offset: 0.00, color: randColor()},
        { offset: 0.49, color: randColor()},
        { offset: 1.00, color: randColor()}
      ])}>New Color</button>
    <button onClick={()=>{
      const n=Math.random()*6;
      const newPoints=[];
      for(let i=0;i<n;i++)
        newPoints.push(randPoint());
      console.log('new points',newPoints); 
      setPoints(newPoints);
    }}>New Points</button>
    
    <div style={{height:'200px'}}>
      <InteractiveLinePlot 
        InitialPoints={points} 
        Gradient={palette}
        UpdateCallBack={onUpdate} 
        ShowDottedLines={true} 
        ShowCoordinates={true} 
        CoordinatesStyle={{color:'blue',fontSize:20}}
        Bounds={{upper:{x:1,y:1},lower:{x:0,y:0}}}
        HasGradientSelector={true}
      />
    </div>
    {/* <div style={{width:'200px', height:'200px'}}>
      <InteractiveLinePlot 
        InitialPoints={points} 
        Gradient={palette} 
        UpdateCallBack={onUpdate} 
        ShowDottedLines={true} 
        ShowCoordinates={true}
      />
    </div> */}
  </>);
}