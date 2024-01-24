# Meeting #1 12/9
## Tasks: 
- create interactive line plot like the one on paraview
- make add point, remove point, and move point functionality

## Notes:
- paraview component is inspiration

# Conversation with Nguyen 12/15
## Tasks:
- Add optional dashed line under point and coordinates above graph.
- Gradient opacity should depend on height of point

## Additional Work:
- Added prop to specify style of coordinates
- Improved distance from point threshold by making it dependent on chart area
- Seperated test from component

# Meeting #2 12/19
## Tasks:
- fix out of bounds bug 
- implement gradient picker
- implement table that is synchronized with values in chart
- added bounds prop

# Meeting #3 1/4
## Tasks:
- write code and work documentation
- fix gradient bug when line point reaches zero
- new 'UserData' prop which we calculate bounds for
- change updatecallback input
- start with initial points at ends and make their x value static


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
