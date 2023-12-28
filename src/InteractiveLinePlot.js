import React, { useState } from 'react';
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
import { Line } from 'react-chartjs-2';
import { ChromePicker } from 'react-color'

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

function getOptions(normalization,plugin,pluginOptions){
  const options={
    maintainAspectRatio:false,
    events: [],
    plugins: {
      legend: {display: false},
      title: {display: false},
    },
    animation: {duration: 0},
    scales: {
      x: {
        display: false,
        min:normalization.offset.x,max:normalization.offset.x+normalization.scale.x,
        type: 'linear'
      },
      y: {
        display: false,
        min:normalization.offset.y,max:normalization.offset.y+normalization.scale.y,
      }
    }
  };
  if(plugin)
    options.plugins[plugin.id]=pluginOptions;
  
  return options;
}

function normalizedData(initialPoints){
  const offset={
    x:initialPoints[0].x,
    y:Math.min(...initialPoints.map(val=>val.y))
  };
  const scale={
    x:Math.max(...initialPoints.map(val=>val.x))-offset.x,
    y:Math.max(...initialPoints.map(val=>val.y))-offset.y
  };
  if(scale.x===0)scale.x=1;
  if(scale.y===0)scale.y=1;
  return {offset,scale};
}

function updateGradient(chart,Gradient,normalization,setOpacity,toUpdate){
  const getGradient=setGradient(Gradient,chart.data.labels,chart.data.datasets[0].data,normalization,setOpacity);
  if(setOpacity){
    chart.data.datasets[0].backgroundColor=(context)=>{
      const {ctx, chartArea} = context.chart;
      if (!chartArea) 
        return;
      return getGradient(ctx, chartArea);
    }
  }
  else
    toUpdate.getGradient=getGradient;
  chart.update(); 
}

function setGradient(palette,pointsX,pointsY,{offset,scale},setOpacity){
  if(!palette||palette.length===0)
    palette=[{offset:1,color:'rgb(0,0,0)'}];
  let width, height, gradient;
  let addGradientColors;
  if(setOpacity)
    addGradientColors=()=>{
      const colors=palette.map(val=>{
        if(val.color.charAt(0)==='#')
          return [
            parseInt(val.color.substring(1,3) ,16),
            parseInt(val.color.substring(3,5) ,16),
            parseInt(val.color.substring(5,7) ,16)
          ]
        const arr=val.color.match(/[.?\d]+/g);
        if(arr.length===4) arr.pop();
        return arr;
      });
      const invScale={x:1/scale.x,y:1/scale.y};
      let i=0,next=true;
      for(let j=0;j<palette.length;j++){
        if(next)
          gradient.addColorStop(1-palette[j].offset, palette[j].color);
        next=true;
        while(i<pointsX.length){
          const pointOffset=(pointsX[i]-offset.x)*invScale.x;
          if(j+1===palette.length||pointOffset>palette[j+1].offset)
            break;
          if(pointOffset===palette[j+1].offset)
            next=false;
          const t=(pointOffset-palette[j].offset)/(palette[j+1].offset-palette[j].offset);
          const color=colors[j].map((val,idx)=>val*(1-t)+colors[j+1][idx]*(t));
          const cssColor='rgba('+color[0]+','+color[1]+','+color[2]+','+((pointsY[i]-offset.y)*invScale.y)+')';
          //console.log(pointOffset,palette,pointsX)
          gradient.addColorStop(1-pointOffset, cssColor);
          i++;
        }
      }
    };
  else
    addGradientColors=()=>{
      for(let j=0;j<palette.length;j++)
        gradient.addColorStop(1-palette[j].offset, palette[j].color);
      
    }

  return (ctx, chartArea)=>{
    const chartWidth = chartArea.right - chartArea.left;
    const chartHeight = chartArea.bottom - chartArea.top;
    if (!gradient || width !== chartWidth || height !== chartHeight) {
      width = chartWidth;
      height = chartHeight;
      gradient = ctx.createLinearGradient(chartArea.right, 0, chartArea.left, 0);
      addGradientColors();
    }

    return gradient;
  }
}

function addPoint(chart,x,y,index){
  if(index===undefined)
    index=indexToInsert(chart.data.labels,x);
  if(chart.data.labels[index]!==x&&chart.data.labels[index+1]!==x){
    chart.data.labels.splice(index,0,x);
    chart.data.datasets[0].data.splice(index,0,y);
    chart.update();
    return true;
  }
  return false;
}

function removePoint(chart,x,y,index){
  if(index===undefined){
    index=indexToInsert(chart.data.labels,x);
    if(chart.data.labels[index]!==x||chart.data.datasets[0].data[index]!==y)
      return false;
  }
  chart.data.labels.splice(index,1);
  chart.data.datasets[0].data.splice(index,1);
  chart.update();
  return true;
}

function indexToInsert(arr,x){
  let low = 0,
      high = arr.length;

  while (low < high) {
      let mid = (low + high) >>> 1;
      if (arr[mid] < x) low = mid + 1;
      else high = mid;
  }
  return low;
}

function getPos(ev,area,offset,scale){
  const eventDoc = (ev.target && ev.target.ownerDocument) || document;
  const doc = eventDoc.documentElement;
  const body = eventDoc.body;
  const pageX = ev.clientX + ((doc && doc.scrollLeft) || (body && body.scrollLeft) || 0) - ((doc && doc.clientLeft) || (body && body.clientLeft) || 0);
  const pageY = ev.clientY + ((doc && doc.scrollTop)  || (body && body.scrollTop)  || 0) - ((doc && doc.clientTop)  || (body && body.clientTop)  || 0);
  const offsetX = area.left+ev.srcElement.offsetLeft;
  const offsetY = ev.srcElement.offsetTop+area.bottom;
  return {
    x:(pageX-offsetX)*scale.x/area.width + offset.x,
    y:(offsetY-pageY)*scale.y/area.height + offset.y
  };
}

function drawDotted(ctx,x,y,offset,scale,area){
  x=(x-offset.x)/scale.x*area.width+area.left;
  y=(1-(y-offset.y)/scale.y)*area.height+area.top+5;
  ctx.strokeStyle='black';
  const dy=area.height/50;
  while(y<area.bottom){
    ctx.beginPath();
    ctx.moveTo(x,y);
    ctx.lineTo(x,Math.min(y+dy,area.bottom));
    ctx.stroke();
    y+=dy*2;
  }
}

function init(chart,gradient,{offset,scale},onUpdate,coordinateState,showDotted,setOpacity,gradientState,e){
  if(!chart)
    return;
  const canvas=chart.canvas;
  const ctx=canvas.getContext('2d');
  const e1=scale.x/chart.chartArea.width;
  e=e||Math.max(scale.x,scale.y)/Math.min(chart.chartArea.width,chart.chartArea.height); 
  let activeIndex = null;
  let leftBound=offset.x+e1,rightBound=offset.x+scale.x-e1;
  let x,y;

  const updateArgs=(ev,type,index,x_,y_)=>{
    return {
      type:type,//'pointerUp'|'pointerDown'|'addPoint'|'removePoint'|'pointerMove'
      event:ev,//PointerEvent
      point:{x:x_||x,y:y_||y},
      index:index||activeIndex,
      pointsX:chart.data.labels,
      pointsY:chart.data.datasets[0].data,
      chart:chart,
      addPoint:addPoint
    };
  };
  
  const onPointerMove=(ev)=>{
    if (activeIndex != null) {
      x=Math.min(Math.max(x,leftBound),rightBound);
      chart.data.labels[activeIndex]=x;
      chart.data.datasets[0].data[activeIndex]=y;
      onUpdate(updateArgs(ev,'pointerMove'));
      updateGradient(chart,gradient,{offset,scale},setOpacity,gradientState);
      if(showDotted) drawDotted(ctx,x,y,offset,scale,chart.chartArea);
    };
  };
  canvas.onpointerdown=(ev)=>{
    if(!x)({x,y}=getPos(ev,chart.chartArea,offset,scale));
    let index=indexToInsert(chart.data.labels,x);
    let min={val:1000,i:-2};
    for(let i=-1;i<2;i++){
      const dist2=(chart.data.labels[index+i]-x)**2+(chart.data.datasets[0].data[index+i]-y)**2;
      if(dist2<Math.min(min.val,e))
        min={val:dist2,i:i};
    }

    if(min.i!==-2){
      if(ev.button===2){
        activeIndex=null;
        canvas.onpointermove=null;
        if(removePoint(chart,x,y,index+min.i)){
          onUpdate(updateArgs(ev,'removePoint',index+min.i));
          updateGradient(chart,gradient,{offset,scale},setOpacity,gradientState);
        }
        return;
      }
      activeIndex = index+min.i;
      leftBound = (chart.data.labels[activeIndex-1]||offset.x)+e1;
      rightBound = (chart.data.labels[activeIndex+1]||offset.x+scale.x)-e1;
      canvas.onpointermove = onPointerMove;
      onUpdate(updateArgs(ev,'pointerDown'));
      updateGradient(chart,gradient,{offset,scale},setOpacity,gradientState);
      if(showDotted) drawDotted(ctx,chart.data.labels[index+min.i],chart.data.datasets[0].data[index+min.i],offset,scale,chart.chartArea);
      return;
    }
    if(x<offset.x||x>offset.x+scale.x)
        return;
    if(addPoint(chart,x,y,index)){
      onUpdate(updateArgs(ev,'addPoint',index));
      updateGradient(chart,gradient,{offset,scale},setOpacity,gradientState);
      if(showDotted) drawDotted(ctx,x,y,offset,scale,chart.chartArea);
    }
  };
  canvas.onpointerup=(ev)=>{
    const x=chart.data.labels[activeIndex],
      y=chart.data.datasets[0].data[activeIndex];
    const index=activeIndex;
    activeIndex = null;
    canvas.onpointermove = null;
    onUpdate(updateArgs(ev,'pointerUp',index,x,y));
  };
  canvas.onmousemove=canvas.onmouseenter=(ev)=>{
    ({x,y}=getPos(ev,chart.chartArea,offset,scale));
    coordinateState.setPos({x,y});
  };
  canvas.onresize=()=>e=200*scale.x*scale.y/(chart.chartArea.width*chart.chartArea.height);
}

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

function GradientSelector({Gradient,lineChart,lineNorm}){
  const height=.001;
  const normalization={offset:{x:0,y:0},scale:{x:1,y:height*2}};
  const [state]=useState({
    reloadNext:true,
    usingPicker:false,
    getGradient:setGradient(Gradient,[],[],normalization,false),
    gradient:Gradient
  });
  const colorState={};
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
          ev.pointsY[ev.index]=height;
          ev.chart.update();
          break;
        }
        return;
      case 'addPoint':
        //if(ev.pointsX)
        Gradient.splice(ev.index,0,{offset:ev.point.x,color:'rgb(220,220,120)'});
        openColorPicker(ev.index);
        break;
      case 'removePoint':
        Gradient.splice(ev.index,1);
        ev.index--;
        closeColorPicker();
        break;
    }
    ev.pointsY[ev.index||0]=height;
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
  const [selector]=useState(<Line 
    ref={ref=>setChart(ref)} 
    options={getOptions(normalization,plugin,{})} 
    data={{ 
      labels: Gradient.map(val=>val.offset),
      datasets: [{
        data: Gradient.map(()=>height),
        pointRadius: 6, radius: 6, pointHoverRadius: 6,
        borderColor: 'rgb(0, 0, 0)'
      }]
    }}
    plugins={[plugin]}
  />);
  
  
  if(chart&&(state.reloadNext||Gradient!==state.gradient)){
    init(chart,Gradient,normalization,onUpdate,{setPos:()=>{}},false,false,state,.1/chart.width);
    if(Gradient!==state.gradient){
      chart.data.labels=Gradient.map(val=>val.offset);
      chart.data.datasets[0].data=Gradient.map(()=>height);
    }
    state.gradient=Gradient;
    updateGradient(chart,Gradient,normalization,false,state);
  }
  
  state.reloadNext=true;
  
  return <>{selector} <ColorPicker Gradient={Gradient} colorState={colorState} updateColors={updateColors}/></>;
}

function Coordinates({coordinateState,style}){
  const [pos,setPos]=useState({x:0,y:0});
  coordinateState.setPos=setPos;
  return <div style={style}>{pos.x.toFixed(3)}, {pos.y.toFixed(3)}</div>;
}

function DummyTable({chart,tableState,normalization:{scale,offset}}){
  const e1=scale.x/chart.chartArea.width;
  const [size,setSize]=useState(chart.data.labels.length);
  const [change,setChange]=useState(0);
  tableState.setSize=setSize;
  tableState.size=size;
  tableState.change=change;
  tableState.setChange=setChange;
  return <div style={{position:'absolute',left:300+'px'}}>
  <div>size: {size}</div>
  <table>
    <thead>
      <tr><th>x</th><th>y</th></tr>
    </thead>
    <tbody>
      {chart?chart.data.datasets[0].data.map((val,idx)=>
        <tr key={idx}>
          <td>
            <input type='number' id={idx+'+'} onChange={ev=>{
              console.log(ev)
              chart.data.labels[idx]=Math.min(Math.max(ev.target.value,ev.target.min),ev.target.max);
              chart.update();
              setChange(change-1);
            }} value={chart.data.labels[idx]} step={.001} min={(chart.data.labels[idx-1]||offset.x)+e1} max={(chart.data.labels[idx+1]||offset.x+scale.x)-e1}/>
          </td>
          <td>
            <input type='number' id={idx+'-'} onChange={ev=>{
              chart.data.datasets[0].data[idx]=Math.min(Math.max(ev.target.value,ev.target.min),ev.target.max);
              chart.update();
              setChange(change-1);
            }} value={val} step={.001} min={offset.y} max={offset.y+scale.y}/>
          </td>
        </tr>):<tr></tr>}
    </tbody>
  </table>
  </div>;
}

export default function InteractiveLinePlot({
  InitialPoints,Gradient,UpdateCallBack,
  ShowDottedLines,ShowCoordinates,CoordinatesStyle,
  Bounds,HasGradientSelector,DistanceBetweenPoints
}){
  console.log('render plot');
  const Points=InitialPoints;
  if(!InitialPoints)
    InitialPoints=[{x:0,y:0},{x:1,y:1}];
  else{
    InitialPoints.sort((a,b)=>a.x-b.x);
  }
  if(Gradient)
    Gradient.sort((a,b)=>a.offset-b.offset);
  
  const normalization=Bounds?{
    offset:{
      x:Bounds.lower.x||0,
      y:Bounds.lower.y||0
    },
    scale:{
      x:(Bounds.upper.x-Bounds.lower.x)||1,
      y:(Bounds.upper.y-Bounds.lower.y)||1
    }
    }:normalizedData(InitialPoints);
  
  const labels=Bounds?InitialPoints.map(val=>Math.max(Math.min(val.x,Bounds.upper.x),Bounds.lower.x)):InitialPoints.map(val=>val.x);
  const data=Bounds?InitialPoints.map(val=>Math.max(Math.min(val.y,Bounds.upper.y),Bounds.lower.y)):InitialPoints.map(val=>val.y);
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
    init(chart,Gradient,normalization,onUpdate,coordinateState,ShowDottedLines,true,null,DistanceBetweenPoints);
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
      {chart?<DummyTable chart={chart} tableState={tableState} normalization={normalization}/>:<div></div>}
    </div> 
  </>;
}