/**
 * recalculate gradient of chart
 * @param {import('react-chartjs-2/dist/types').ChartJSOrUndefined} chart 
 * @param {Array<{offset,color}>} Gradient 
 * @param {{offset,scale}} normalization 
 * @param {Boolean} setOpacity 
 * @param {{getGradient}} toUpdate Optional 
 */
function updateGradient(chart,Gradient,normalization,setOpacity,toUpdate){
  const {getGradient,gradientPoints}=setGradient(Gradient,chart.data.labels,chart.data.datasets[0].data,normalization,setOpacity);
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
  return gradientPoints;
}

/**
 * calculates gradient and opacity based off of gradient and points
 * @param {Array<{offset,color}>} palette 
 * @param {Array<Number>} pointsX 
 * @param {Array<Number>} pointsY 
 * @param {{offset,scale}} normalization 
 * @param {Boolean} setOpacity 
 * @returns function that sets the gradient of the canvas context and list of points in gradient
 */
function setGradient(palette,pointsX,pointsY,{offset,scale},setOpacity){
  if(!palette||palette.length===0)
    palette=[{offset:1,color:'rgb(0,0,0)'}];
  let width, height, gradient;
  let gradientPoints=[];

  if(setOpacity){
    const colors=palette.map(val=>cssColorToRGB(val.color));
    const invScale={x:1/scale.x,y:1/scale.y};
    let i=0;
    for(let j=0;j<palette.length;j++){
      if(i<pointsX.length){
        const prev=i===0?{x:pointsX[0],y:pointsY[0]}:{x:pointsX[i-1],y:pointsY[i-1]};
        const cur=i===pointsX.length?{x:pointsX[i-1],y:pointsY[i-1]}:{x:pointsX[i],y:pointsY[i]};

        const pointOffset=(palette[j].offset*scale.x)+offset.x;
        const t=(cur.x-prev.x)===0?0:(pointOffset-prev.x)/(cur.x-prev.x);
        const alpha=(prev.y*(1-t)+cur.y*t)*invScale.y;
        const color=cssColorToRGB(palette[j].color);
        const cssColor='rgba('+color[0]+','+color[1]+','+color[2]+','+alpha+')';
        
        gradientPoints.push({offset:palette[j].offset, color:cssColor});
      }
      else
        gradientPoints.push(palette[j]);
      while(i<pointsX.length){
        const pointOffset=(pointsX[i]-offset.x)*invScale.x;
        if(j+1===palette.length||pointOffset>palette[j+1].offset)
          break;

        const t=(pointOffset-palette[j].offset)/(palette[j+1].offset-palette[j].offset);
        const color=colors[j].map((val,idx)=>val*(1-t)+colors[j+1][idx]*(t));
        const cssColor='rgba('+color[0]+','+color[1]+','+color[2]+','+((pointsY[i]-offset.y)*invScale.y)+')';

        gradientPoints.push({offset:pointOffset, color:cssColor});
        i++;
      }
    }
  }
  else
    gradientPoints=palette;

  /**
   * 
   * @param {CanvasRenderingContext2D} ctx 
   * @param {import('chart.js').ChartArea} chartArea 
   * @returns 
   */
  const getGradient=(ctx, chartArea)=>{
    const chartWidth = chartArea.right - chartArea.left;
    const chartHeight = chartArea.bottom - chartArea.top;
    if (!gradient || width !== chartWidth || height !== chartHeight) {
      width = chartWidth;
      height = chartHeight;
      gradient = ctx.createLinearGradient(chartArea.right, 0, chartArea.left, 0);
      gradientPoints.forEach(colorPoint=>gradient.addColorStop(1-colorPoint.offset, colorPoint.color))
    }

    return gradient;
  };
  return {getGradient,gradientPoints};
}

/**
 * converts css color ex:'rgb(r,g,b)' to object
 * @param {String} color 
 * @returns {{r:Number,g:Number,b:Number}}
 */
function cssColorToRGB(color){
  if(color.charAt(0)==='#')
    return [
      parseInt(color.substring(1,3) ,16),
      parseInt(color.substring(3,5) ,16),
      parseInt(color.substring(5,7) ,16)
    ]
  const arr=color.match(/[.?\d]+/g);
  if(arr.length===4) arr.pop();
  return arr;
}

export {cssColorToRGB,setGradient,updateGradient};