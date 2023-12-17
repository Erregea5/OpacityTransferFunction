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

function getOptions(normalization){
  return {
    maintainAspectRatio:false,
    events: [],
    plugins: {
      legend: {display: false},
      title: {display: false}
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
    },
    //onHover:(ev,elements,chart)=>console.log(ev)
  };
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

function updateGradient(chart,Gradient,normalization){
  const getGradient=setGradient(Gradient,chart.data.labels,chart.data.datasets[0].data,normalization);
  chart.data.datasets[0].backgroundColor=(context)=>{
    const {ctx, chartArea} = context.chart;
    if (!chartArea) 
      return;
    return getGradient(ctx, chartArea);
  }
  chart.update(); 
}

function setGradient(palette,pointX,pointY,{offset,scale}){
  if(!palette||palette.length===0)
    palette=[{offset:1,color:'rgb(0,0,0)'}];
  let width, height, gradient;
  return (ctx, chartArea)=>{
    const chartWidth = chartArea.right - chartArea.left;
    const chartHeight = chartArea.bottom - chartArea.top;
    if (!gradient || width !== chartWidth || height !== chartHeight) {
      width = chartWidth;
      height = chartHeight;
      gradient = ctx.createLinearGradient(chartArea.right, 0, chartArea.left, 0);

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
        while(i<pointX.length){
          const pointOffset=(pointX[i]-offset.x)*invScale.x;
          if(pointOffset>palette[j+1].offset)
            break;
          if(pointOffset===palette[j+1].offset)
            next=false;
          const t=(pointOffset-palette[j].offset)/(palette[j+1].offset-palette[j].offset);
          const color=colors[j].map((val,idx)=>val*(1-t)+colors[j+1][idx]*(t));
          const cssColor='rgba('+color[0]+','+color[1]+','+color[2]+','+((pointY[i]-offset.y)*invScale.y)+')';

          gradient.addColorStop(1-pointOffset, cssColor);
          i++;
        }
      }
    }

    return gradient;
  }
}

function addPoint(chart,x,y,index){
  index=index||indexToInsert(chart.data.labels,x);
  if(chart.data.labels[index]!==x||chart.data.datasets[0].data[index]!==y){
    chart.data.labels.splice(index,0,x);
    chart.data.datasets[0].data.splice(index,0,y);
    chart.update();
    return true;
  }
  return false;
}

function removePoint(chart,x,y,index){
  if(!index){
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
  }
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

function init(chart,gradient,{offset,scale},onUpdate,coords,showDotted){
  if(!chart)
    return;
  const canvas=chart.canvas;
  const ctx=canvas.getContext('2d');
  let activeIndex = null;
  let leftBound=offset.x,rightBound=offset.x+scale.x;
  let e=200*scale.x*scale.y/(chart.chartArea.width*chart.chartArea.height);
  let x,y;
  
  const updateArgs=(ev,type,x,y)=>{
    return {
      type:type,//'pointerUp'|'pointerDown'|'addPoint'|'removePoint'
      event:ev,//PointerEvent
      point:{x:x,y:y},
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
      updateGradient(chart,gradient,{offset,scale});
      if(showDotted) drawDotted(ctx,x,y,offset,scale,chart.chartArea)
    };
  };
  canvas.onpointerdown=(ev)=>{
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
        removePoint(chart,x,y,index+min.i);
        updateGradient(chart,gradient,{offset,scale});
        onUpdate(updateArgs(ev,'removePoint',x,y));
        return;
      }
      activeIndex = index+min.i;
      leftBound = chart.data.labels[activeIndex-1]||offset.x;
      rightBound = chart.data.labels[activeIndex+1]||offset.x+scale.x;
      canvas.onpointermove = onPointerMove;
      updateGradient(chart,gradient,{offset,scale});
      if(showDotted) drawDotted(ctx,chart.data.labels[index+min.i],chart.data.datasets[0].data[index+min.i],offset,scale,chart.chartArea);
      onUpdate(updateArgs(ev,'pointerDown',x,y));
      return;
    }
    addPoint(chart,x,y,index);
    updateGradient(chart,gradient,{offset,scale});
    if(showDotted) drawDotted(ctx,x,y,offset,scale,chart.chartArea);
    onUpdate(updateArgs(ev,'addPoint',x,y));
  };
  canvas.onpointerup=(ev)=>{
    const x=chart.data.labels[activeIndex],
      y=chart.data.datasets[0].data[activeIndex];
    activeIndex = null;
    canvas.onpointermove = null;
    onUpdate(updateArgs(ev,'pointerUp',x,y));
  };
  canvas.onmousemove=canvas.onmouseover=(ev)=>{
    ({x,y}=getPos(ev,chart.chartArea,offset,scale));
    coords.func({x,y});
  } 
}

function Coordinates({setter,style}){
  const [pos,setPos]=useState({x:0,y:0});
  setter.func=setPos;
  return <div style={style}>{pos.x.toFixed(3)}, {pos.y.toFixed(3)}</div>;
}

export default function InteractiveLinePlot({InitialPoints,Gradient,UpdateCallBack,ShowDottedLines,ShowCoordinates,CoordinatesStyle}){
  const Points=InitialPoints;
  if(!InitialPoints)
    InitialPoints=[{x:0,y:0},{x:1,y:1}];
  else
    InitialPoints.sort((a,b)=>a.x-b.x);
  const normalization=normalizedData(InitialPoints);
  
  const [chart,setChart]=useState(null);
  const [state]=useState({
    points:0,
    gradient:Gradient,
    canvas:<Line 
      ref={ref=>setChart(ref)} 
      options={getOptions(normalization)} 
      data={{
          labels: InitialPoints.map(val=>val.x),
          datasets: [{
            data: InitialPoints.map(val=>val.y),
            pointRadius: 6, radius: 6, pointHoverRadius: 6,
            borderColor: 'rgb(0, 0, 0)', fill: true
          }]
        }}
    />
  });

  const coords={func:()=>{}};
  if(chart){
    init(chart,Gradient,normalization,UpdateCallBack,coords,ShowDottedLines);
    if(state.points!==Points){
      chart.data.labels=InitialPoints.map(val=>val.x);
      chart.data.datasets[0].data=InitialPoints.map(val=>val.y);
      chart.options=getOptions(normalization);
      updateGradient(chart,Gradient,normalization);
    }
    else if(state.gradient!==Gradient)
      updateGradient(chart,Gradient,normalization);
    state.points=Points;
    state.gradient=Gradient;
  }

  return <>
    {ShowCoordinates?<Coordinates setter={coords} style={CoordinatesStyle}/>:null}
    <div ref={div=>{
      if(!div)
        return;
      div.style={position:'relative',width:'100%'};
      if(ShowCoordinates)
        div.style.height='calc(100% - '+(div.offsetTop-div.parentNode.offsetTop)+'px)';
      else
        div.style.height='100%';
    }} onContextMenu={(e)=> e.preventDefault()}>
      {state.canvas}
    </div> 
  </>;
}