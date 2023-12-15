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
  Legend,
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
    },
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

function getData(initialPoints, getGradient) {
  return {
    labels: initialPoints.map(val=>val.x),
    datasets: [{
      data: initialPoints.map(val=>val.y),
      pointRadius: 6,
      borderColor: 'rgb(0, 0, 0)',
      backgroundColor: function(context) {
        const {ctx, chartArea} = context.chart;
        if (!chartArea) 
          return;
        return getGradient(ctx, chartArea);
      },
      fill: true
    }]
  }
}

function setGradient(palette){
  if(!palette||palette.length===0)
    return ()=>'rgb(53, 162, 235)';
  let width, height, gradient;
  return (ctx, chartArea)=>{
    const chartWidth = chartArea.right - chartArea.left;
    const chartHeight = chartArea.bottom - chartArea.top;
    if (!gradient || width !== chartWidth || height !== chartHeight) {
      width = chartWidth;
      height = chartHeight;
      gradient = ctx.createLinearGradient(chartArea.right, 0, chartArea.left, 0);
      
      for(let color of palette)
        gradient.addColorStop(color.offset, color.color);
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

function getPos(ev,chartArea,offset,scale){
  const eventDoc = (ev.target && ev.target.ownerDocument) || document;
  const doc = eventDoc.documentElement;
  const body = eventDoc.body;
  const pageX = ev.clientX + ((doc && doc.scrollLeft) || (body && body.scrollLeft) || 0) - ((doc && doc.clientLeft) || (body && body.clientLeft) || 0);
  const pageY = ev.clientY + ((doc && doc.scrollTop)  || (body && body.scrollTop)  || 0) - ((doc && doc.clientTop)  || (body && body.clientTop)  || 0);

  return {
    x:(pageX-(chartArea.left+ev.srcElement.parentNode.offsetLeft))*scale.x/chartArea.width + offset.x,
    y:((ev.srcElement.parentNode.offsetTop+chartArea.bottom)-pageY)*scale.y/chartArea.height + offset.y
  }
}

function init(chart,{offset,scale},onUpdate){
  if(!chart)
    return;
  const canvas=chart.canvas;
  let activeIndex = null;
  let leftBound=offset.x,rightBound=offset.x+scale.x;
  let e=.0002*scale.x*scale.y;

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
    ev.preventDefault();
    if (activeIndex != null) {
      let {x,y}=getPos(ev,chart.chartArea,offset,scale);
      x=Math.min(Math.max(x,leftBound),rightBound);
      
      chart.data.labels[activeIndex]=x;
      chart.data.datasets[0].data[activeIndex]=y;
      chart.update();
    };
  };
  canvas.onpointerdown = (ev)=>{
    ev.preventDefault();
    const {x,y}=getPos(ev,chart.chartArea,offset,scale);

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
        onUpdate(updateArgs(ev,'removePoint',x,y));
        return;
      }
      activeIndex = index+min.i;
      leftBound = chart.data.labels[activeIndex-1]||offset.x;
      rightBound = chart.data.labels[activeIndex+1]||offset.x+scale.x;
      canvas.onpointermove = onPointerMove;
      onUpdate(updateArgs(ev,'pointerDown',x,y));
      return;
    }
    addPoint(chart,x,y,index);
    onUpdate(updateArgs(ev,'addPoint',x,y));
  };
  canvas.onpointerup = (ev)=>{
    ev.preventDefault();
    const x=chart.data.labels[activeIndex],
      y=chart.data.datasets[0].data[activeIndex];
    activeIndex = null;
    canvas.onpointermove = null;
    onUpdate(updateArgs(ev,'pointerUp',x,y));
  };
}

function InteractiveLinePlot({InitialPoints,Gradient,UpdateCallBack}){
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
    onUpdate:UpdateCallBack,
    canvas:<Line 
      ref={ref=>setChart(ref)} 
      options={getOptions(normalization)} 
      data={getData(InitialPoints, setGradient(Gradient))}
    />
  });
  
  if(chart){
    init(chart,normalization,UpdateCallBack);
    if(state.points!==Points){
      chart.data=getData(InitialPoints, setGradient(Gradient));
      chart.options=getOptions(normalization);
      chart.update();
    }
    else if(state.gradient!==Gradient){
      const getGradient=setGradient(Gradient);
      chart.data.datasets[0].backgroundColor=(context)=>{
        const {ctx, chartArea} = context.chart;
        if (!chartArea) 
          return;
        return getGradient(ctx, chartArea);
      };
      chart.update(); 
    }
    state.points=Points;
    state.gradient=Gradient;
  }

  return <div onContextMenu={(e)=> e.preventDefault()} style={{position:'relative',width:'100%',height:'100%'}}>{state.canvas}</div>;
}

export default function App() {
  const [palette,setPalette]=useState([
    { offset: '0.00', color: 'rgb(238, 241, 11)' },
    { offset: '0.49', color: 'rgb(215, 128, 37)' },
    { offset: '1.00', color: 'rgb(126, 32, 207)' }
  ]);
  const [points,setPoints]=useState([
    {x:2,y:3},
    {x:10,y:10}
  ]);
  const onUpdate=e=>{};
  const randColor=()=>'rgb('+Math.random()*255+', '+Math.random()*255+', '+Math.random()*255+')';
  const randPoint=()=>{return {x:Math.random()*255, y:Math.random()*255}};
  return (<>
    <button onClick={()=>setPalette([
        { offset: '0.00', color: randColor()},
        { offset: '0.49', color: randColor()},
        { offset: '1.00', color: randColor()}
      ])}>New Color</button>
    <button onClick={()=>{
      const n=Math.random()*6;
      const newPoints=[];
      for(let i=0;i<n;i++)
        newPoints.push(randPoint());
      console.log('new points',newPoints); 
      setPoints(newPoints);
    }}>New Points</button>
    
    <div style={{height:'900px'}}><InteractiveLinePlot InitialPoints={points} Gradient={palette} UpdateCallBack={onUpdate}/></div>
    <div style={{width:'200px'}}><InteractiveLinePlot InitialPoints={points} Gradient={palette} UpdateCallBack={onUpdate}/></div>
  </>);
}