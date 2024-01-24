import React, {useState} from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend
} from 'chart.js';
import {Line,Scatter} from 'react-chartjs-2';
import {ChromePicker} from 'react-color';
import {cssColorToRGB,setGradient,updateGradient} from './GradientUtils';
import {normalizedData,getOptions,chartInit} from './ChartUtils';
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

const GradientPointHeight=.001;

/**
 * Component to pick color of gradient
 * @param {Object} param 
 * @param {Array<{offset,color}>} param.Gradient 
 * @param {*} param.colorState 
 * @param {*} param.updateColors 
 */
function ColorPicker({Gradient,colorState,updateColors}){
  const [color,setColor]=useState('rgb(100,100,100)');
  const [index,setIndex]=useState(-1);
  colorState.index=index;
  colorState.setIndex=setIndex;
  if(index<0)
    return <div></div>;
  return <ChromePicker color={color} onChange={color=>{
    Gradient[index].color='rgb('+color.rgb.r+','+color.rgb.g+','+color.rgb.b+')';
    setColor(Gradient[index].color);
    updateColors();
  }}/>;
}

/**
 * Component to add, move, and remove points to gradient
 * @param {Object} param 
 * @param {Array<{offset,color}>} param.Gradient 
 * @param {import('react-chartjs-2/dist/types').ChartJSOrUndefined} param.lineChart 
 * @param {{scale,offset}} param.lineNorm 
 */
function GradientSelector({Gradient,lineChart,lineNorm}){
  const normalization={offset:{x:0,y:0},scale:{x:1,y:GradientPointHeight*2}};
  const [state]=useState({
    reloadNext:true,
    usingPicker:false,
    getGradient:setGradient(Gradient,[],[],normalization,false).getGradient,
    gradient:Gradient
  });
  const colorState={};
  const tableState={};
  console.log('render gradient',colorState.index);
  const updateColors=()=>{
    updateGradient(lineChart,Gradient,lineNorm,true);
    updateGradient(chart,Gradient,normalization,false,state);
  };
  const openColorPicker=idx=>{
    state.reloadNext=false;
    colorState.setIndex(idx);
    state.usingPicker=true;
  };
  const closeColorPicker=()=>{
    state.reloadNext=false;
    colorState.setIndex(-1);
    state.usingPicker=false;
  };
  const onUpdate=ev=>{
    switch(ev.type){ 
      case 'pointerMove': 
        tableState.setChange(tableState.change+1);
        Gradient[ev.index].offset=ev.point.x;
        updateColors();
        //if(state.usingPicker)
          //closeColorPicker();
        return;
      case 'pointerDown': 
        openColorPicker(ev.index);
        return;
      case 'pointerUp':
        if(ev.index!==undefined){
          ev.pointsY[ev.index]=GradientPointHeight;
          ev.chart.update();
          break;
        }
        return;
      case 'addPoint':
        tableState.setSize(tableState.size+1);
        Gradient.splice(ev.index,0,{offset:ev.point.x,color:'rgb(220,220,120)'});
        openColorPicker(ev.index);
        break;
      case 'removePoint':
        tableState.setSize(tableState.size-1);
        Gradient.splice(ev.index,1);
        ev.index--;
        closeColorPicker();
        break;
    }
    ev.pointsY[ev.index||0]=GradientPointHeight;
    updateColors();
    console.log(ev.type,...Gradient)
    ev.chart.update();
  };
  const plugin = {
    id: 'backgroundColor',
    beforeDraw: (chart, args, options) => {
      const {ctx, chartArea} = chart;
      ctx.save();
      ctx.globalCompositeOperation = 'destination-over';
      ctx.fillStyle = state.getGradient(ctx,chartArea);
      ctx.fillRect(0, 0, chart.width, chart.height);
      ctx.restore();
    }
  };

  const [chart,setChart]=useState(null);
  const [selector]=useState(<Scatter 
    ref={ref=>setChart(ref)} 
    options={getOptions(normalization,plugin,{})} 
    data={{ 
      labels: Gradient.map(val=>val.offset),
      datasets: [{
        data: Gradient.map(()=>GradientPointHeight),
        pointRadius: 6, radius: 6, pointHoverRadius: 6,
        borderColor: 'rgb(0, 0, 0)'
      }]
    }}
    plugins={[plugin]}
  />);
  
  
  if(chart&&(state.reloadNext||Gradient!==state.gradient)){
    chartInit(chart,Gradient,normalization,onUpdate,{setPos:()=>{}},false,false,state,.1/chart.width);
    if(Gradient!==state.gradient){
      chart.data.labels=Gradient.map(val=>val.offset);
      chart.data.datasets[0].data=Gradient.map(()=>GradientPointHeight);
    }
    state.gradient=Gradient;
    updateGradient(chart,Gradient,normalization,false,state);
  }
  
  state.reloadNext=true;
  
  return <>
    {selector} 
    {chart?<DummyTable chart={chart} tableState={tableState} normalization={normalization} Gradient={Gradient} setOpacity={false} toUpdate={state}/>:<div></div>}
    <ColorPicker Gradient={Gradient} colorState={colorState} updateColors={updateColors}/>
  </>;
}

/**
 * displays x y value of mouse on chart
 * @param {Object} param 
 * @param {*} param.coordinateState 
 * @param {*} param.style 
 */
function Coordinates({coordinateState,style}){
  const [pos,setPos]=useState({x:0,y:0});
  coordinateState.setPos=setPos;
  return <div style={style}>{pos.x.toFixed(3)}, {pos.y.toFixed(3)}</div>;
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
function DummyTable({chart,tableState,normalization,Gradient,setOpacity,toUpdate}){
  const {scale,offset}=normalization;
  const e1=scale.x/chart.chartArea.width;
  const [size,setSize]=useState(chart.data.labels.length);
  const [change,setChange]=useState(0);
  tableState.setSize=setSize;
  tableState.size=size;
  tableState.change=change;
  tableState.setChange=setChange;

  const onChange=(ev,func)=>{
    func(Math.min(Math.max(ev.target.value,ev.target.min),ev.target.max));
    chart.update();
    setChange(change-1);
    updateGradient(chart,Gradient,normalization,setOpacity,toUpdate);
  };

  return <div style={{position:'absolute',left:setOpacity?300:900+'px'}}>
  <div>size: {size}</div>
  <table>
    <thead>
      <tr><th>x</th>{setOpacity?<th>y</th>:<><th>r</th><th>g</th><th>b</th></>}</tr>
    </thead>
    <tbody>
      {chart?chart.data.datasets[0].data.map((val,idx)=>
        <tr key={idx}>
          <td>
            <input type='number' id={idx+'+'} onChange={ev=>onChange(ev,val=>chart.data.labels[idx]=val)} 
            value={chart.data.labels[idx]} step={.001} min={(chart.data.labels[idx-1]||offset.x)+e1} 
            max={(chart.data.labels[idx+1]||offset.x+scale.x)-e1}/>
          </td>
          {setOpacity?<td>
            <input type='number' id={idx+'-'} onChange={ev=>onChange(ev,val=>chart.data.datasets[0].data[idx]=val)}
            value={val} step={.001} min={offset.y} max={offset.y+scale.y}/>
          </td>:
          cssColorToRGB(Gradient[idx].color).map((pixel,i,arr)=><td key={idx+'*'+i}>
            <input type='number' id={idx+'-'+i} onChange={ev=>onChange(ev,val=>{
              switch(i){
              case 0:
                Gradient[idx].color='rgb('+val+','+arr[1]+','+arr[2]+')';
                break;
              case 1:
                Gradient[idx].color='rgb('+arr[0]+','+val+','+arr[2]+')';
                break;
              case 2:
                Gradient[idx].color='rgb('+arr[0]+','+arr[1]+','+val+')';
              }
           })} value={pixel} min={0} max={255}/>
          </td>)
          }
        </tr>):<tr></tr>}
    </tbody>
  </table>
  </div>;
}

/**
 * Opacity Transfer function
 * @param {Object} param 
 * @param {Array} param.InitialPoints 
 * @param {Array} param.Gradient 
 * @param {Function} param.UpdateCallBack 
 * @param {Boolean} param.ShowDottedLines 
 * @param {Boolean} param.ShowCoordinates 
 * @param {Object} param.CoordinatesStyle 
 * @param {Object} param.UserData 
 * @param {Boolean} param.HasGradientSelector 
 * @param {Number} param.DistanceBetweenPoints 
 */
export default function OpacityTransferFunction({
  InitialPoints,Gradient,UpdateCallBack,
  ShowDottedLines,ShowCoordinates,CoordinatesStyle,
  UserData,HasGradientSelector,DistanceBetweenPoints
}){
  console.log('render plot');
  const Points=InitialPoints;
  if(!InitialPoints)
    InitialPoints=[{x:0,y:0},{x:1,y:1}];
  else
    InitialPoints.sort((a,b)=>a.x-b.x);
  
  if(UserData)
    UserData.sort((a,b)=>a.x-b.x);

  if(Gradient)
    Gradient.sort((a,b)=>a.offset-b.offset);
  
  const normalization=UserData?normalizedData(UserData):normalizedData(InitialPoints);
  if(!Points){
    InitialPoints.length=0;
    InitialPoints.push({x:normalization.offset.x,y:normalization.offset.y});
    InitialPoints.push({x:normalization.offset.x+normalization.scale.x,y:normalization.offset.y+normalization.scale.y});
  }
  const labels=UserData?
    InitialPoints.map(val=>Math.max(Math.min(val.x,normalization.scale.x+normalization.offset.x),normalization.offset.x))
    :InitialPoints.map(val=>val.x);
  const data=UserData?
    InitialPoints.map(val=>Math.max(Math.min(val.y,normalization.scale.y+normalization.offset.y),normalization.offset.y))
    :InitialPoints.map(val=>val.y);
  const options=getOptions(normalization);

  const [chart,setChart]=useState(null);
  const [state]=useState({
    points:0,
    gradient:Gradient,
    canvas:<Line 
      ref={ref=>setChart(ref)} 
      options={options} 
      data={{ 
          labels, datasets: [{
            data, pointRadius: 6, radius: 6, pointHoverRadius: 6,
            borderColor: 'rgb(0, 0, 0)', fill: true
          }]
        }}
    />
  });

  const coordinateState={};
  const tableState={};
  const onUpdate=(ev)=>{
    if(ev.type==='pointerMove')
      tableState.setChange(tableState.change+1);
    else if(ev.type==='addPoint')
      tableState.setSize(tableState.size+1);
    else if(ev.type==='removePoint')
      tableState.setSize(tableState.size-1);
    UpdateCallBack(ev);
  };

  if(chart){
    chartInit(chart,Gradient,normalization,onUpdate,coordinateState,ShowDottedLines,true,null,DistanceBetweenPoints);
    if(state.points!==Points){
      chart.data.labels=labels;
      chart.data.datasets[0].data=data;
      chart.options=options;
      updateGradient(chart,Gradient,normalization,true);
    }
    else if(state.gradient!==Gradient)
      updateGradient(chart,Gradient,normalization,true);
    
    state.points=Points;
    state.gradient=Gradient;
  }

  return <>
    {ShowCoordinates?<Coordinates coordinateState={coordinateState} style={CoordinatesStyle}/>:null}
    <div ref={div=>{
      if(!div)
        return;
      div.style={position:'relative',width:'100%'};
      if(ShowCoordinates)
        div.style.height='calc(100% - '+(div.offsetTop-div.parentNode.offsetTop)+'px)';
      else
        div.style.height='100%';
    }} onContextMenu={(e)=> e.preventDefault()}>
      <div style={{height:'85%'}}>
        {state.canvas}
      </div>
      <div style={{height:'15%'}}>
        {HasGradientSelector?<GradientSelector Gradient={Gradient} lineChart={chart} lineNorm={normalization}/>:<div></div>}
      </div>
      {chart?<DummyTable chart={chart} tableState={tableState} normalization={normalization} Gradient={Gradient} setOpacity={true}/> :<div></div>}
    </div> 
  </>;
}