
# Design

There is only one component which is exposed to the user. This is the Opacity transfer function. This component has many optional subcomponents, the default is that it contains only the interactive line plot.

The interactivity of the line plot and gradient scatter plot is a very simple state machine that keeps track of what is the active index. Selected points on the graph are calculated by taking the screen coordinate, normalizing, then scaling.

Chart.js takes care of the construction of the plots. To keep the color uniform in the gradient scatter plot, a predraw function is passed to Chart.js to draw the gradient.

The Gradient is calculated by taking simple linear interpolation between gradient and data points. When calculating the gradient, a gradient array and a canvas-context linear gradient is created.

I use a clever hack in my components to update subcomponents by initializing a subcomponent state object in the component and passing it to the subcomponent where the output of useState is pushed into the object.

# Meetings

## Meeting #1 12/9

### Tasks:

- create interactive line plot like the one on paraview

- make add point, remove point, and move point functionality

  

### Notes:

- paraview component is inspiration

  

## Conversation with Nguyen 12/15

### Tasks:

- Add optional dashed line under point and coordinates above graph.

- Gradient opacity should depend on height of point

  

### Additional Work:

- Added prop to specify style of coordinates

- Improved distance from point threshold by making it dependent on chart area

- Seperated test from component

  

## Meeting #2 12/19

### Tasks:

- fix out of bounds bug

- implement gradient picker

- implement table that is synchronized with values in chart

- added bounds prop

  

## Meeting #3 1/4

### Tasks:

- write code and work documentation

- fix gradient bug when line point reaches zero

- new 'UserData' prop which we calculate bounds for

- change updatecallback input

- start with initial points at ends and make their x value static

  

## Meeting #4 1/25

### Tasks:

- hide colorpicker on user click of color point

- make sync button to sync color and line points by taking union

- table should not have fixed position

- bug hunt

- make video of component and write big picture overview of system

  

# References

- https://stackoverflow.com/questions/63898706/how-to-paint-specific-area-of-chartjs

- https://stackoverflow.com/questions/11225912/make-div-height-occupy-parent-remaining-height

- https://stackoverflow.com/questions/17354163/dynamically-update-values-of-a-chartjs-chart

- https://stackoverflow.com/questions/43757979/chart-js-drag-points-on-linear-chart

- https://stackoverflow.com/questions/38593123/how-to-hide-y-axis-line-in-chartjs

- https://stackoverflow.com/questions/21389341/disable-animation-with-charts-js

- https://stackoverflow.com/questions/46335014/html-canvas-how-to-color-area-under-a-line-graph

- https://www.chartjs.org/docs/latest/

- https://www.npmjs.com/package/react-color