// Based on simple canvas network visualization by Mike Bostock
// source: https://bl.ocks.org/mbostock/ad70335eeef6d167bc36fd3c04378048


function vis(new_controls, data) {

  // Canvas //
  // ------ //

  var canvas = document.querySelector("canvas");
  var parentdiv = document.getElementsByClassName("canvas_container")[0];
  canvas.width = parentdiv.offsetWidth;
  canvas.height = parentdiv.offsetHeight;

  window.onresize = function() {
    canvasOffsetX = canvas.getBoundingClientRect().x;
    canvasOffsetY = canvas.getBoundingClientRect().y;
  }
  window.onresize()

  let context = canvas.getContext("2d");
  let width = canvas.width;
  let height = canvas.height;


  // Retina canvas rendering
  var devicePixelRatio = window.devicePixelRatio || 1
  d3.select(canvas)
    .attr("width", width * devicePixelRatio)
    .attr("height", height * devicePixelRatio)
    .style("width", width + "px")
    .style("height", height + "px").node()
  context.scale(devicePixelRatio, devicePixelRatio)

  // Simulation //
  // ---------- //

  // Control variables

  window.data = data;

  window.controls = {"zoom": 0.65,
       "node_charge": -80,
       "node_gravity": 0.06,
       "link_distance": 0.1,
       "link_distance_variation": 1,
       "node_collision": true,
       "wiggle_nodes": true,
       "freeze_nodes": false,
       "node_fill_color": "#79aaa0",
       "node_stroke_color": "#555555",
       "node_label_color": "#000000",
       "display_node_labels": false,
       "label_size": 3,
       "scale_node_size_by_strength": true,
       "node_size": 22,
       "node_stroke_width": 0.95,
       "node_size_variation": 0.5,
       "link_color": "#7c7c7c",
       "link_width": 0.2,
       "link_alpha": 0.25,
       "link_width_variation": 0.5,
       "display_singleton_nodes": true,
       "min_link_weight_percentile": 0,
       "max_link_weight_percentile": 1,
       "direct_requirements": false
  }

  // Overwrite default controls with inputted controls
  d3.keys(new_controls).forEach(key => {
    controls[key] = new_controls[key];
  });


  // Force layout
  var simulation = d3.forceSimulation()
    .force("link", d3.forceLink()
      .id(d => d.id)
      .distance(controls['link_distance'])
    )
    .force("charge", d3.forceManyBody().strength(+controls['node_charge']))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("collide", d3.forceCollide(0).radius(d => controls['node_collision'] * computeNodeRadii(d)))
    .force("x", d3.forceX(width / 2)).force("y", d3.forceY(height / 2));
  simulation.force("x").strength(+controls['node_gravity']);
  simulation.force("y").strength(+controls['node_gravity']);

  // Start
  handleURL(controls['file_path']);

  function ticked() {

    // draw
    context.clearRect(0, 0, width, height);
    context.strokeStyle = controls['link_color'];
    context.globalAlpha = controls['link_alpha'];
    context.globalCompositeOperation = "destination-over";
    graph.links.forEach(drawLink);
    context.globalAlpha = 1.0
    context.strokeStyle = controls['node_stroke_color'];
    context.lineWidth = controls['node_stroke_width'] < 1e-3 ? 1e-9 : controls['node_stroke_width'] * controls['zoom'];
    context.globalCompositeOperation = "source-over";
    graph.nodes.forEach(drawNode);
    graph.nodes.forEach(drawText);
    drawDepartment();
  }

  // Restart simulation
  function restart() {
    // Start simulation
    simulation
      .nodes(graph.nodes)
      .on("tick", ticked);

    simulation.force("link")
      .links(graph.links);

    d3.select(canvas)
      .call(d3.drag()
        .container(canvas)
        .subject(dragsubject)
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

    if (nodePositions || controls['freeze_nodes']) {
      simulation.alpha(0).restart();
    } else {
      simulation.alpha(1).restart();
    }
  }

  function simulationSoftRestart(){
    if (!controls['freeze_nodes']){
      simulation.restart();
    } else {
      ticked();
    }
  }

  var init_x = (document.documentElement || document.body.parentNode || document.body).scrollLeft;
  var init_y = (document.documentElement || document.body.parentNode || document.body).scrollTop;
  let initRender = true;

  // Network functions
  // -----------------

  function dragsubject() {
    return simulation.find(zoomScalerX.invert(d3.event.x), zoomScalerY.invert(d3.event.y), 20);
  }

  function dragstarted() {
    // console.log("dragstarted")
    if (!controls['freeze_nodes']) simulation.alphaTarget(1);
    simulation.restart();
    d3.event.subject.fx = d3.event.subject.x;
    d3.event.subject.fy = d3.event.subject.y;
  }

  function dragged() {

    const x = (document.documentElement || document.body.parentNode || document.body).scrollLeft - init_x;
    const y = (document.documentElement || document.body.parentNode || document.body).scrollTop - init_y;

    // console.log("dragged")
    d3.event.subject.fx = zoomScalerX.invert(event.clientX - (canvasOffsetX - x));
    d3.event.subject.fy = zoomScalerY.invert(event.clientY - (canvasOffsetY - y));
    if (controls['freeze_nodes']) simulation.restart();
  }

  function dragended() {
    // console.log("dragended")
    if (!controls['freeze_nodes']) simulation.alphaTarget(0);
    d3.event.subject.fx = null;
    d3.event.subject.fy = null;
  }

  function drawLink(d) {
    var thisLinkWidth = valIfValid(d.weight, 1) ** (controls['link_width_variation']) * linkWidthNorm * controls['link_width'];
    const edgeString = d.source.id + '_' + d.target.id
    if (inEdges.has(edgeString)) {
      context.strokeStyle = '#FF0000';
      context.fillStyle = '#FF0000';
    } else if (outEdges.has(edgeString)) {
      context.strokeStyle = '#0000FF';
      context.fillStyle = '#0000FF';
    } else {
      context.strokeStyle = controls['link_color']
      context.fillStyle = controls['link_color']
      if (inNodes.size !== 0 || outNodes.size !== 0) return // Remove this later
    }
    context.lineWidth = thisLinkWidth * controls['zoom'];

    let p1 = {'x': zoomScalerX(d.source.x), 'y': zoomScalerY(d.source.y)}
    let p2 = {'x': zoomScalerX(d.target.x), 'y': zoomScalerY(d.target.y)}
    var thisNodeSize = valIfValid(d.target.size, 1) ** (controls['node_size_variation']) * nodeSizeNorm * controls['node_size'];
    arrow(p1, p2, thisLinkWidth*2*controls['zoom'], thisNodeSize * (controls['zoom'] + (controls['zoom'] - 1)))// d.target.radius)
  }

  function arrow(p1, p2, size, r) {
    var angle = Math.atan2((p2.y - p1.y) , (p2.x - p1.x));
    var hyp = Math.sqrt((p2.x - p1.x) * (p2.x - p1.x) + (p2.y - p1.y) * (p2.y - p1.y));

    context.save();
    context.translate(p1.x, p1.y);
    context.rotate(angle);

    // line
    context.beginPath();
    context.moveTo(0, 0);
    context.lineTo(hyp - (2*size+r), 0);
    context.stroke();

    // triangle
    context.beginPath();
    context.lineTo(hyp - (2*size+r), size);
    context.lineTo(hyp - r, 0);
    context.lineTo(hyp - (2*size+r), -size);
    context.fill();

    context.restore();
  }

  function drawNode(d) {
    // Node
    var thisNodeSize = valIfValid(d.size, 1) ** (controls['node_size_variation']) * nodeSizeNorm * controls['node_size'];
    if (d.id === centralNode[centralNode.length - 1]) context.strokeStyle = '#FF0000'
    else context.strokeStyle = controls['node_stroke_color']

    if ((inNodes.size !== 0 || outNodes.size !== 0) && !inNodes.has(d.id) && !outNodes.has(d.id)) {
      return
    }
    context.beginPath();
    context.moveTo(zoomScalerX(d.x) + thisNodeSize * (controls['zoom'] + (controls['zoom'] - 1)), zoomScalerY(d.y));
    context.arc(zoomScalerX(d.x), zoomScalerY(d.y), thisNodeSize * (controls['zoom'] + (controls['zoom'] - 1)), 0, 2 * Math.PI);
    context.fillStyle = computeNodeColor(d);
    context.fill();
    context.stroke();
  }

  function drawText(d) {
    if (controls['display_node_labels'] || d.id === hoveredNode || selectedNodes.includes(d.id)) {
      context.font = 5*controls['label_size'] + "px Helvetica";
      context.fillStyle = "white";
      context.strokeStyle = "black";
      context.lineWidth = controls['label_size'];
      context.strokeText(d.id + ': ' + data[d.id][`${settings['language']} title`], zoomScalerX(d.x), zoomScalerY(d.y));
      context.fillText(d.id + ': ' + data[d.id][`${settings['language']} title`], zoomScalerX(d.x), zoomScalerY(d.y));
    }
  }

  function drawDepartment() {
    if (hoveredNode === undefined) return;
    context.font = "16px Helvetica"
    context.fillStyle = "white";
    context.strokeStyle = "black";
    context.lineWidth = 3;
    context.textAlign = "right";
    const txt = data[hoveredNode]['department']
    const txtWidth = context.measureText(txt).width
    context.strokeText(txt, canvas.offsetWidth/2-20+txtWidth/2, 20);
    context.fillText(txt, canvas.offsetWidth/2-20+txtWidth/2, 20);
    context.lineWidth = controls['node_stroke_width'] < 1e-3 ? 1e-9 : controls['node_stroke_width'];
    context.beginPath();
    context.moveTo(canvas.offsetWidth/2-40-txtWidth/2 + 8, 15);
    context.arc(canvas.offsetWidth/2-40-txtWidth/2, 15, 8, 0, 2 * Math.PI);
    context.fillStyle = hoveredNodeColor;
    context.fill();
    context.stroke();
    context.lineWidth = controls['node_stroke_width'] < 1e-3 ? 1e-9 : controls['node_stroke_width'] * controls['zoom'];
    context.textAlign = "left";
  }

  // Key events //
  // ---------- //

  var cntrlIsPressed = false;

  let hoveredNode;
  let hoveredNodeColor;
  let selectedNodes = [];
  let xy;
  let centralNode = [undefined];
  let inEdges = new Set();
  let outEdges = new Set();
  let inNodes = new Set();
  let outNodes = new Set();
  let pathEdges = new Set();
  let mainGraph;

  function resetGraph() {
    centralNode = [undefined];
    inEdges = new Set();
    outEdges = new Set();
    inNodes = new Set();
    outNodes = new Set();
    restartIfValidJSON(mainGraph)
    //inputtedCharge(controls['node_charge'])
    //inputtedGravity(controls['node_gravity'])
    gui.revert()
  }

  d3.select(canvas).on("mousemove", function() {
    if (isDown) {
      xy = d3.mouse(this)
      handleMouseMove(xy);
      simulation.restart();
    } else {
      xy = d3.mouse(this)
      hoveredNode = simulation.find(zoomScalerX.invert(xy[0]), zoomScalerY.invert(xy[1]), 20)
      if (typeof (hoveredNode) != 'undefined') {
        hoveredNodeColor = computeNodeColor(hoveredNode)
        hoveredNode = hoveredNode.id;
      }
      simulation.restart();
    }
  })

  d3.select(canvas).on("mousedown", function() {
    if (typeof (hoveredNode) == 'undefined') {
      handleMouseDown(d3.mouse(this));
    }
  }, true)

  d3.select(canvas).on('click', function() {
    if (typeof (hoveredNode) != 'undefined') {
      if (selectedNodes.includes(hoveredNode)) {
        selectedNodes.splice(selectedNodes.indexOf(hoveredNode), 1)
        pathEdges = new Set()
      } else {
        selectedNodes.push(hoveredNode);
        if (centralNode.length > 1) findPathEdges();
      }
      if (cntrlIsPressed) {
        window.open(`https://kurser.dtu.dk/course/${hoveredNode}`, '_blank');
      }
      simulation.restart();
    }
  }, true)

  d3.select(canvas).on('dblclick', function() {
    if (typeof (hoveredNode) != 'undefined') {
      createSubGraph(hoveredNode)
    }
  }, true)

  d3.select(canvas).on('wheel', function() {
    let e = d3.event
    e.preventDefault();
    const delta = Math.sign(e.deltaY);
    window.controls['zoom'] = Math.min(5, Math.max(0.6, window.controls['zoom'] - delta*0.05));
    calculate_zoomScalers(netPanningX, netPanningY)
    if (!controls['display_node_labels']) {
      xy = d3.mouse(this);
      hoveredNode = simulation.find(zoomScalerX.invert(xy[0]), zoomScalerY.invert(xy[1]), 20)
      if (typeof (hoveredNode) != 'undefined') {
        hoveredNodeColor = computeNodeColor(hoveredNode)
        hoveredNode = hoveredNode.id;
      }
    }
    simulation.restart();
  });

  // Events for panning in canvas
  let isDown = false;
  let startPanX, startPanY;
  // the accumulated horizontal(X) & vertical(Y) panning the user has done in total
  let netPanningX = 0;
  let netPanningY = 0;

  canvas.addEventListener("mouseup", function() {
    // clear the isDragging flag
    isDown = false;
  })

  canvas.addEventListener("mouseout", function() {
    // clear the isDragging flag
    isDown = false;
    hoveredNode = undefined
  })

  function handleMouseDown(mousePos){
    // calc the starting mouse X,Y for the drag
    startPanX=mousePos[0]
    startPanY=mousePos[1]

    // set the isDragging flag
    isDown=true;
  }

  function handleMouseMove(mousePos){

    // only do this code if the mouse is being dragged
    if(!isDown){return;}

    // dx & dy are the distance the mouse has moved since
    // the last mousemove event
    let dx=mousePos[0]-startPanX;
    let dy=mousePos[1]-startPanY;

    // reset the vars for next mousemove
    startPanX=mousePos[0];
    startPanY=mousePos[1];

    // accumulate the net panning done
    netPanningX+=dx;
    netPanningY+=dy;
    calculate_zoomScalers(netPanningX, netPanningY)
  }


  document.body.addEventListener('keydown', function(e) {
    switch (e.key) {
      case "Escape":
        resetGraph()
        break
      case "Backspace":
        if (centralNode.length > 2) {
          centralNode.pop()
          createSubGraph()
        } else if (centralNode.length === 2) {
          resetGraph()
        }
        break
      case "Control":
        cntrlIsPressed = true;
        break
    }
  });

  document.body.addEventListener('keyup', function(e) {
    cntrlIsPressed = false;
  });

  function createSubGraph(id=undefined) {
    if (id !== undefined) {
      centralNode.push(id);
    }

    if (!selectedNodes.includes(centralNode[centralNode.length - 1])) selectedNodes.push(centralNode[centralNode.length - 1])

    // Remove labels no longer in graph
    selectedNodes = selectedNodes.filter(item => (inNodes.has(item) || outNodes.has(item)))

    // Create sub-graph
    findSubGraph();
    buildSubGraph();
    calculateGraphControls();

    netPanningX = 0;
    netPanningY = 0;
    calculate_zoomScalers(netPanningX, netPanningY)
    simulation.restart();
  }

  function findPathEdges() {
    pathEdges = new Set();
    let Qin = [centralNode[centralNode.length - 1]];
    
  }

  function findSubGraph() {
    inEdges = new Set();
    inNodes = new Set();
    let Qin = [centralNode[centralNode.length - 1]];
    inNodes.add(centralNode[centralNode.length - 1]);
    while (Qin.length > 0) {
      let currentNode = Qin.shift()
      data[currentNode].ins.forEach(function (inNode, index) {
        if (!inNodes.has(inNode)) {
          inNodes.add(inNode);
          if (!window.controls['direct_requirements']) {
            Qin.push(inNode)
          }
        }
        inEdges.add(inNode + '_' + currentNode);
      })
    }
    outEdges = new Set();
    outNodes = new Set();
    let Qout = [centralNode[centralNode.length - 1]];
    while (Qout.length > 0) {
      let currentNode = Qout.shift()
      if (data[currentNode].outs.length > 0) {
        data[currentNode].outs.forEach(function (outNode, index) {
          if (!outNodes.has(outNode)) {
            outNodes.add(outNode);
            Qout.push(outNode)
          }
          outEdges.add(currentNode + '_' + outNode);
        })
      }
    }
  }

  function buildSubGraph() {
    if (controls['file_path'].endsWith(".json")) {
      d3.json(controls['file_path'], function (error, _graph) {
        if (error) {
          Swal.fire({text: "File not found", type: "error"})
          return false
        }
        _graph.links = _graph.links.filter(item => {
          const edgeString = item.source + '_' + item.target;
          return (outEdges.has(edgeString) || inEdges.has(edgeString))
        });
        _graph.nodes = _graph.nodes.filter(item => (inNodes.has(item.id) || outNodes.has(item.id)))
        restartIfValidJSON(_graph)
        // inputtedCharge(0.5*_graph.nodes.length - 500)
        // inputtedGravity(Math.min(1.3, 0.005*_graph.nodes.length))
      })
    }
  }

  function calculateGraphControls(g) {
    console.log(g)
    if (typeof g !== undefined && inNodes.size === 0 && outNodes.size === 0) {
      controls['node_charge'] = -90;
      controls['node_gravity'] = 0.1;
      controls['link_distance'] = 30;
      controls['zoom'] = Math.max(0.8, 3 - g.nodes.length * 0.04);
      controls['node_size'] = Math.min(40, 6 + g.nodes.length * 0.04)
      console.log(g.nodes.length, controls['zoom'])
    } else {
      controls['node_charge'] = -90;
      controls['node_gravity'] = 0.1;
      controls['link_distance'] = 30;
      controls['zoom'] = Math.max(0.8 , 3 - (inNodes.size + outNodes.size) * 0.04);
      controls['node_size'] = Math.min(40, 6 + (inNodes.size + outNodes.size) * 0.04)
      console.log(inNodes.size, outNodes.size, controls['zoom'])
    }
  }

  // Parameter controls //
  // ------------------ //

  // Hack to enable titles (https://stackoverflow.com/a/29563786/3986879)
  var eachController = function(fnc) {
    for (var controllerName in dat.controllers) {
      if (dat.controllers.hasOwnProperty(controllerName)) {
        fnc(dat.controllers[controllerName]);
      }
    }
  }

  var setTitle = function(v) {
    // __li is the root dom element of each controller
    if (v) {
      this.__li.setAttribute('title', v);
    } else {
      this.__li.removeAttribute('title')
    }
    return this;
  };

  eachController(function(controller) {
    if (!controller.prototype.hasOwnProperty('title')) {
      controller.prototype.title = setTitle;
    }
  });

  // Titles
  var title1_1 = "Zoom: Zoom in or out"
  var title1_2 = "Language: Either danish or english"
  var title1_3 = "Singleton nodes: Whether or not to show links that have zero degree"
  var title1_4 = "Direct requirements: Only show the direct requirements"
  var title2_1 = "Charge: Each node has negative charge and thus repel one another (like electrons). The more negative this charge is, the greater the repulsion"
  var title2_2 = "Gravity: Push the nodes more or less towards the center of the canvas"
  var title2_3 = "Link distance: The optimal link distance that the force layout algorithm will try to achieve for each link"
  var title2_5 = "Collision: Make it harder for nodes to overlap"
  var title2_6 = "Wiggle: Increase the force layout algorithm temperature to make the nodes wiggle. Useful for big networks that need some time for the nodes to settle in the right positions"
  var title2_7 = "Freeze: Set force layout algorithm temperature to zero, causing the nodes to freeze in their position."
  var title3_4 = "Display labels: Whether to show labels or not"
  var title3_6 = "Size: Change the size of all nodes"
  var title3_7 = "Stroke width: Change the width of the ring around nodes"
  var title3_8 = "Size variation: Tweak the node size scaling function. Increase to make big nodes bigger and small nodes smaller. Useful for highlighting densely connected nodes."
  var title4_2 = "Width: Change the width of all links"
  var title4_3 = "Alpha: How transparent links should be. Useful in large dense networks"

  // settings
  let settings = {
    "language": "danish"
  }

// Control panel
  let gui = new dat.GUI({ autoPlace: false });
  let customContainer = document.getElementsByClassName('controls_container')[0];
  gui.width = customContainer.offsetWidth;
  gui.closed = false;
  customContainer.appendChild(gui.domElement);
  gui.remember(controls);


  // Display
  var f1 = gui.addFolder('Display'); f1.open();
  f1.add(controls, 'zoom', 0.6, 5).name('Zoom').onChange(function(v) { inputtedZoom(v) }).title(title1_1).listen();
  //f1.add(settings, 'language', ['danish', 'english']).name('Language').onChange(function(v) { inputtedLanguage(v) }).title(title1_2);
  f1.add(controls, 'display_singleton_nodes', true).name('Singleton nodes').onChange(function(v) { inputtedShowSingletonNodes(v) }).title(title1_3);
  f1.add(controls, 'direct_requirements', true).name('Direct requirements').onChange(function(v) { inputtedDirectRequirements(v) }).title(title1_4)

  // Physics
  var f2 = gui.addFolder('Physics'); f2.open();
  f2.add(controls, 'node_charge', -100, 0).name('Charge').onChange(function(v) { inputtedCharge(v) }).title(title2_1).listen();
  f2.add(controls, 'node_gravity', 0, 1).name('Gravity').onChange(function(v) { inputtedGravity(v) }).title(title2_2).listen();
  f2.add(controls, 'link_distance', 0.1, 50).name('Link distance').onChange(function(v) { inputtedDistance(v) }).title(title2_3).listen();
  f2.add(controls, 'node_collision', false).name('Collision').onChange(function(v) { inputtedCollision(v) }).title(title2_5);
  f2.add(controls, 'wiggle_nodes', false).name('Wiggle').onChange(function(v) { inputtedReheat(v) }).listen().title(title2_6);
  f2.add(controls, 'freeze_nodes', false).name('Freeze').onChange(function(v) { inputtedFreeze(v) }).listen().title(title2_7);

  // Nodes
  var f3 = gui.addFolder('Nodes'); f3.open();
  f3.add(controls, 'node_size', 0, 50).name('Size').onChange(function(v) { inputtedNodeSize(v) }).title(title3_6).listen();
  f3.add(controls, 'node_stroke_width', 0, 10).name('Stroke width').onChange(function(v) { inputtedNodeStrokeSize(v) }).title(title3_7);
  f3.add(controls, 'node_size_variation', 0., 3.).name('Size variation').onChange(function(v) { inputtedNodeSizeExponent(v) }).title(title3_8).listen();
  //f3.add(controls, 'label_size', 0.5, 5).name('Label size').onChange(function(v) { inputtedLabelSize(v) }).title(title3_3);
  f3.add(controls, 'display_node_labels', false).name('Display labels').onChange(function(v) { inputtedShowLabels(v) }).title(title3_4);
  //f3.add(controls, 'scale_node_size_by_strength', false).name('Size by strength').onChange(function(v) { inputtedNodeSizeByStrength(v) }).title(title3_5);

  // Links
  var f4 = gui.addFolder('Links'); f4.open();
  f4.add(controls, 'link_width', 0.01, 30).name('Width').onChange(function(v) { inputtedLinkWidth(v) }).title(title4_2);
  f4.add(controls, 'link_alpha', 0, 1).name('Alpha').onChange(function(v) { inputtedLinkAlpha(v) }).title(title4_3);

  // Utility functions //
  // ----------------- //
  // The zoomScaler converts a simulation coordinate (what we don't see) to a
  // canvas coordinate (what we do see), and zoomScaler.invert does the opposite.
  function calculate_zoomScalers(offsetX=0, offsetY=0) {
    zoomScalerX = d3.scaleLinear().domain([0, width]).range([offsetX + width * (1 - controls['zoom']), offsetX +  controls['zoom'] * width])
    zoomScalerY = d3.scaleLinear().domain([0, height]).range([offsetY + height * (1 - controls['zoom']), offsetY + controls['zoom'] * height])
  }

  let zoomScalerX = d3.scaleLinear().domain([0, width]).range([width * (1 - controls['zoom']), controls['zoom'] * width])
  let zoomScalerY = d3.scaleLinear().domain([0, height]).range([height * (1 - controls['zoom']), controls['zoom'] * height])

  function computeNodeRadii(d) {
    var thisNodeSize = nodeSizeNorm * controls['node_size'];
    if (d.size) {
      thisNodeSize *= (d.size) ** (controls['node_size_variation']);
    }
    return thisNodeSize
  }

  function computeNodeColor(d) {
    if (d.color) {
      return d.color;
    } else if (d.group) {
      return activeSwatch[d.group];
    } else {
      return controls['node_fill_color'];
    }
  }

  // Handle input data //
  // ----------------- //
  let init_render = true;

  function handleURL() {
    if (controls['file_path'].endsWith(".json")) {
      d3.json(controls['file_path'], function (error, _graph) {
        if (error) {
          Swal.fire({text: "File not found", type: "error"})
          return false
        }
        mainGraph = _graph;
        if (!init_render) calculateGraphControls(_graph)
        else init_render = false
        centralNode = [undefined];
        inEdges = new Set();
        outEdges = new Set();
        inNodes = new Set();
        outNodes = new Set();
        restartIfValidJSON(_graph);
        let courses = graph.nodes.map(n => n.id + ': ' + data[n.id][`${settings['language']} title`]);
        autocomplete(document.getElementById("course_search"), courses);
      })
    }
  }


  function restartIfValidJSON(masterGraph) {
    // Check for 'nodes' and 'links' lists
    if (!masterGraph.nodes || masterGraph.nodes.length == 0) {
      Swal.fire({ text: "Dataset does not have a key 'nodes'", type: "error" })
      return false
    }
    if (!masterGraph.links) {
      Swal.fire({ text: "Dataset does not have a key 'links'", type: "warning" })
    }

    // Check that node and link objects are formatted right
    for (var d of masterGraph.links) {
      if (!d3.keys(d).includes("source") || !d3.keys(d).includes("target")) {
        Swal.fire({ text: "Found objects in 'links' without 'source' or 'target' key.", type: "error" });
        return false;
      }
    }

    // Check that 'links' and 'nodes' data are congruent
    var nodesNodes = masterGraph.nodes.map(d => { return d.id });
    var nodesNodesSet = new Set(nodesNodes)
    var linksNodesSet = new Set()
    masterGraph.links.forEach(l => {
      linksNodesSet.add(l.source); linksNodesSet.add(l.source.id)  // Either l.source or l.source.id will be null
      linksNodesSet.add(l.target); linksNodesSet.add(l.target.id)  // so just add both and remove null later (same for target)
    }); linksNodesSet.delete(undefined)

    if (nodesNodesSet.size == 0) {
      Swal.fire({ text: "No nodes found.", type: "error" })
      return false;
    }
    if (nodesNodes.includes(null)) {
      Swal.fire({ text: "Found items in node list without 'id' key.", type: "error" });
      return false;
    }
    if (nodesNodes.length != nodesNodesSet.size) {
      Swal.fire({ text: "Found multiple nodes with the same id.", type: "error" });
      return false;
    }
    if (nodesNodesSet.size < linksNodesSet.size) {
      Swal.fire({ text: "Found nodes referenced in 'links' which are not in 'nodes'.", type: "error" });
      return false;
    }

    // Check that attributes are indicated consistently in both nodes and links
    countWeight = masterGraph.links.filter(n => { return 'weight' in n }).length
    if (0 < countWeight & countWeight < masterGraph.links.length) {
      Swal.fire({ text: "Found links with and links without 'weight' attribute", type: "error" });
      return false;
    } else if (countWeight == 0) {
      masterGraph.links.forEach(l => { l.weight = 1; })
    }
    var countGroup = masterGraph.nodes.filter(n => { return 'group' in n }).length
    if (0 < countGroup & countGroup < masterGraph.nodes.length) {
      Swal.fire({ text: "Found nodes with and nodes without 'group' attribute", type: "error" });
      return false;
    }
    countSize = masterGraph.nodes.filter(n => { return 'size' in n }).length

    if (0 < countSize & countSize < masterGraph.nodes.length) {
      Swal.fire({ text: "Found nodes with and nodes without 'size' attribute", type: "error" });
      return false;
    }
    else if (countSize == 0) {
      masterGraph.nodes.forEach(n => { n.size = 1; })
    }

    // Reference graph (is never changed)
    window.masterGraph = masterGraph

    // Size and weight norms, colors and degrees
    computeMasterGraphGlobals();

    // Check for really weak links
    if (minLinkWeight < 1e-9) {
      Swal.fire({ text: "Found links with weight < 1e-9. This may cause trouble with precision.", type: "warning" });
    }

    // Active graph that d3 operates on
    window.graph = _.cloneDeep(masterGraph)

    // Container for part of the network which are not in `graph` (for faster thresholding)
    window.negativeGraph = { 'nodes': [], 'links': [] }

    // If 'scale_node_size_by_strength' is toggled, then node sizes need to follow computed degrees
    if (controls['scale_node_size_by_strength']) {
      if (controls['display_singleton_nodes']){
        graph.nodes.forEach(n => { n.size = nodeStrengths[n.id] > 0.0 ? nodeStrengths[n.id] : minNonzeroNodeSize })
      } else {
        graph.nodes.forEach(n => { n.size = nodeStrengths[n.id] })
      }
    }

    if (initRender) {
      initRender = false;
    }

    // Reset all thresholds ...
    // commented this out because it overwrites the predefined values in `config`
    // controls["min_link_weight_percentile"] = 0
    // controls["max_link_weight_percentile"] = 1

    // Run the restart if all of this was OK
    restart();
  }

  function inputtedCourse(v) {
    searchedNode = mainGraph.nodes.filter(item => item.id === v)
    if (searchedNode.length > 0) createSubGraph(v)
  }


  function inputtedCharge(v) {
    console.log('Updated Charge to', v)
    simulation.force("charge").strength(+v);
    simulation.alpha(1).restart();
    if (controls['freeze_nodes']) controls['freeze_nodes'] = false;
  }

  function inputtedGravity(v) {
    console.log('Updated Gravity to', v)
    simulation.force("x").strength(+v);
    simulation.force("y").strength(+v);
    simulation.alpha(1).restart();
    if (controls['freeze_nodes']) controls['freeze_nodes'] = false;
  }

  function inputtedDirectRequirements(v) {
    if (centralNode[centralNode.length - 1] !== undefined) {
      createSubGraph()
    }
  }

  function inputtedDistance(v) {
    if (isWeighted && linkWeightOrder.length > 1 && controls['link_distance_variation'] > 0) {
      simulation.force("link").distance(d => {
        return (1 - getPercentile(d.weight, linkWeightOrder)) ** controls['link_distance_variation'] * v
      });
    } else {
      simulation.force("link").distance(v);
    }
    simulation.alpha(1).restart();
    if (controls['freeze_nodes']) controls['freeze_nodes'] = false;
  }

  function inputtedCollision(v) {
    simulation.force("collide").radius(function(d) { return controls['node_collision'] * computeNodeRadii(d) });
    if (!controls['freeze_nodes'])
      simulation.alpha(1)

    simulationSoftRestart();
  }

  function inputtedReheat(v) {
    simulation.alpha(0.5);
    simulation.alphaTarget(v).restart();
    if (v) controls['freeze_nodes'] = !v;
  }

  function inputtedFreeze(v) {
    if (v) {
      controls['wiggle_nodes'] = !v
      simulation.alpha(0);
    } else {
      simulation.alpha(0.3).alphaTarget(0).restart();
      nodePositions = false;
    }
  }

  function inputtedShowLabels(v) {
    selectedNodes = [];
    simulationSoftRestart();
  }

  function inputtedShowSingletonNodes(v) {
    if (v) {
      graph['nodes'].push(...negativeGraph.nodes)
      negativeGraph['nodes'] = []
    } else if (!v) {
      graph['nodes'] = graph.nodes.filter(n => {
        var keepNode = nodeStrengths[n.id] >= minLinkWeight;
        if (!keepNode) negativeGraph['nodes'].push(n);
        return keepNode;
      })
    }
    restart();
    simulationSoftRestart();
  }

/*  function inputtedNodeSizeByStrength(v) {
    recomputeNodeNorms();
    if (v) {
        if (controls['display_singleton_nodes']){
          graph.nodes.forEach(n => { n.size = nodeStrengths[n.id] > 0.0 ? nodeStrengths[n.id] : minNonzeroNodeSize })
          negativeGraph.nodes.forEach(n => { n.size = nodeStrengths[n.id] > 0.0 ? nodeStrengths[n.id] : minNonzeroNodeSize })
        } else {
          graph.nodes.forEach(n => { n.size = nodeStrengths[n.id] })
          negativeGraph.nodes.forEach(n => { n.size = nodeStrengths[n.id] })
        }
    } else if (!v) {
      graph.nodes.forEach(n => { n.size = valIfValid(findNode(masterGraph, n).size, 1) })
      negativeGraph.nodes.forEach(n => { n.size = valIfValid(findNode(masterGraph, n).size, 1) })
    }
    simulationSoftRestart();
  }*/

  function inputtedLinkWidth(v) {
    simulationSoftRestart();
  }

  function inputtedLinkAlpha(v) {
    simulationSoftRestart();
  }

  function inputtedNodeSize(v) {
    if (controls['node_collision']) {
      simulation.force("collide").radius(function(d) { return computeNodeRadii(d) })
      if (!controls['freeze_nodes'])
        simulation.alpha(1);
    }

    simulationSoftRestart();
  }

  function inputtedNodeStrokeSize(v) {
    simulationSoftRestart();
  }

  function inputtedNodeSizeExponent(v) {
    nodeSizeNorm = 1 / maxNodeSize ** (controls['node_size_variation'])
    if (controls['node_collision']) {
      simulation.force("collide").radius(function(d) { return computeNodeRadii(d) })
      if (!controls['freeze_nodes'])
        simulation.alpha(1);
    }

    simulationSoftRestart();
  }

  function inputtedZoom(v) {
    calculate_zoomScalers(netPanningX, netPanningY)
    simulationSoftRestart();
  }

  function inputtedLanguage(v) {
    simulationSoftRestart();
  }

  // Various utilities
  // -----------------

  function computeMasterGraphGlobals() {

    // Check for initial node positions
    nodePositions = true
    for (var d of masterGraph.nodes) {
      if (!d3.keys(d).includes("x") && !d3.keys(d).includes("y")) {
        nodePositions = false; break;
      }
    }

    if (nodePositions) {

      // Rescale node positions to fit nicely inside of canvas depending on xlim or rescale properties.
      if (masterGraph.rescale || ((!masterGraph.hasOwnProperty('rescale') && !masterGraph.hasOwnProperty('xlim')))) {
        let xVals = []; let yVals = [];
        masterGraph.nodes.forEach(d => { xVals.push(d.x); yVals.push(d.y) })
        let domainScalerX = d3.scaleLinear().domain([d3.min(xVals), d3.max(xVals)]).range([width * 0.15, width * (1 - 0.15)])
        let domainScalerY = d3.scaleLinear().domain([d3.min(yVals), d3.max(yVals)]).range([height * 0.15, height * (1 - 0.15)])
        masterGraph.nodes.forEach((d, i) => {
          d['x'] = zoomScalerX.invert(domainScalerX(d.x))
          d['y'] = zoomScalerY.invert(domainScalerY(d.y))
        })
      }
      nodePositions = false;
      //controls['freeze_nodes'] = true;
    }

    // Check to see if it is weighted
    isWeighted = countWeight > 0

    // Sort out node colors
    var nodeGroups = new Set(masterGraph.nodes.filter(n => 'group' in n).map(n => { return n.group }))
    activeSwatch = {};
    for (let g of nodeGroups) {
      if (validColor(g)) {
        activeSwatch[g] = getHexColor(g);
      } else {
        activeSwatch[g] = randomColor();
      }
    }
    window.referenceSwatch = _.cloneDeep(activeSwatch)
    window.referenceColor = controls['node_fill_color']

    // Immutable node degree (unless strength is toggled)
    masterNodeStrengths = {}; masterGraph.nodes.map(n => masterNodeStrengths[n.id] = 0)
    masterNodeDegrees = {}; masterGraph.nodes.map(n => masterNodeDegrees[n.id] = 0)
    masterGraph.links.forEach(l => {
      masterNodeStrengths[l.source] += valIfValid(l.weight, 1);
      masterNodeStrengths[l.target] += valIfValid(l.weight, 1);
      masterNodeDegrees[l.source] += 1;
      masterNodeDegrees[l.target] += 1;
    });

    // Degree dicrionary to keep track of ACTIVE degrees after thresholds are applied
    nodeStrengths = _.cloneDeep(masterNodeStrengths)

    // Compute node size and link width norms
    recomputeNodeNorms();
    recomputeLinkNorms();
  }

  function recomputeNodeNorms() {
    // Compute node size norms
    if (controls['scale_node_size_by_strength']) {
      maxNodeSize = Math.max(d3.max(d3.values(masterNodeStrengths)), 1)
      let all_strengths = d3.values(masterNodeStrengths)
      all_strengths.sort();
      let i = -1;
      do {
        ++i;
      } while (all_strengths[i] == 0.0);
      minNonzeroNodeSize = all_strengths[i];
    } else {
      maxNodeSize = d3.max(masterGraph.nodes.map(n => valIfValid(n.size, 0)));  // Nodes are given size if they don't have size on load
      minNonzeroNodeSize = maxNodeSize;
    }
    nodeSizeNorm = 1 / maxNodeSize ** (controls['node_size_variation'])
  }

  function recomputeLinkNorms() {
    linkWeightOrder = removeConsecutiveDuplicates(masterGraph.links.map(l => valIfValid(l.weight, 1)).sort((a, b) => a - b))
    minLinkWeight = linkWeightOrder[0]
    maxLinkWeight = linkWeightOrder[linkWeightOrder.length - 1]
    linkWidthNorm = 1 / maxLinkWeight ** controls['link_width_variation']
  }


  function validColor(stringToTest) {
    // https://stackoverflow.com/a/16994164/3986879
    var image = document.createElement("img");
    image.style.color = "rgb(0, 0, 0)";
    image.style.color = stringToTest;
    if (image.style.color !== "rgb(0, 0, 0)") { return true; }
    image.style.color = "rgb(255, 255, 255)";
    image.style.color = stringToTest;
    return image.style.color !== "rgb(255, 255, 255)";
  }

  function getHexColor(colorStr) {
    /// https://stackoverflow.com/a/24366628/3986879
    var a = document.createElement('div');
    a.style.color = colorStr;
    var colors = window.getComputedStyle(document.body.appendChild(a)).color.match(/\d+/g).map(function(a) { return parseInt(a, 10); });
    document.body.removeChild(a);
    return (colors.length >= 3) ? '#' + (((1 << 24) + (colors[0] << 16) + (colors[1] << 8) + colors[2]).toString(16).substr(1)) : false;
  }

  function clip(val, lower, upper) {
    if (val < lower) {
      return lower
    } else if (val > upper) {
      return upper
    } else {
      return val
    }
  }

  function valIfValid(v, alt) {
    // Use this instead of (v || alt) which won't work when v is 0
    if (typeof(v) == "number") return v;
    if (typeof(v) == "string") return v;
    return alt;
  }

  function randomColor() {
    let col = "#"
    for (i of d3.range(3)){
      let num = Math.floor(Math.random() * 255).toString(16)
      col += ("0" + num).slice(-2)
    }
    return col
  }

  function removeConsecutiveDuplicates(a) {
    return a.filter((item, pos, arr) => pos === 0 || item !== arr[pos-1])
  }

  function autocomplete(inp, arr) {
    /*the autocomplete function takes two arguments,
    the text field element and an array of possible autocompleted values:*/
    var currentFocus;
    /*execute a function when someone writes in the text field:*/
    inp.addEventListener("input", function(e) {
        var a, b, i, val = this.value;
        /*close any already open lists of autocompleted values*/
        closeAllLists();
        if (!val || val.length < 2) { return false;}
        currentFocus = -1;
        /*create a DIV element that will contain the items (values):*/
        a = document.createElement("DIV");
        a.setAttribute("id", this.id + "autocomplete-list");
        a.setAttribute("class", "autocomplete-items");
        /*append the DIV element as a child of the autocomplete container:*/
        this.parentNode.appendChild(a);
        /*for each item in the array...*/
        for (i = 0; i < arr.length; i++) {
            const match = arr[i].toUpperCase().search(val.toUpperCase())
            /*check if the item starts with the same letters as the text field value:*/
            if (match !== -1) {
                /*create a DIV element for each matching element:*/
                b = document.createElement("DIV");
                /*make the matching letters bold:*/
                b.innerHTML = arr[i].substr(0, match);
                b.innerHTML += "<strong>" + arr[i].substr(match, val.length) + "</strong>";
                b.innerHTML += arr[i].substr(match + val.length);
                /*insert a input field that will hold the current array item's value:*/
                b.innerHTML += "<input type='hidden' value='" + arr[i] + "'>";
                /*execute a function when someone clicks on the item value (DIV element):*/
                b.addEventListener("click", function(e) {
                    /*insert the value for the autocomplete text field:*/
                    inp.value = this.getElementsByTagName("input")[0].value;
                    inputtedCourse(inp.value.substring(0, 5))
                    /*close the list of autocompleted values,
                    (or any other open lists of autocompleted values:*/
                    closeAllLists();
                });
            a.appendChild(b);
            }
        }
    });
    /*execute a function presses a key on the keyboard:*/
    inp.addEventListener("keydown", function(e) {
        var x = document.getElementById(this.id + "autocomplete-list");
        if (x) x = x.getElementsByTagName("div");
        if (e.keyCode === 40) {
            /*If the arrow DOWN key is pressed,
            increase the currentFocus variable:*/
            currentFocus++;
            /*and and make the current item more visible:*/
            addActive(x);
        } else if (e.keyCode === 38) { //up
            /*If the arrow UP key is pressed,
            decrease the currentFocus variable:*/
            currentFocus--;
            /*and and make the current item more visible:*/
            addActive(x);
        } else if (e.keyCode === 13) {
            /*If the ENTER key is pressed, prevent the form from being submitted,*/
            e.preventDefault();
            if (currentFocus > -1) {
            /*and simulate a click on the "active" item:*/
                if (x) x[currentFocus].click();
            } else {
              inputtedCourse(this.value)
            }
        } else if (e.keyCode === 27) {
          /*If ESCAPE key is pressed, prevent propagation so the network is not updated*/
            this.blur()
            canvas.click()
            e.stopPropagation()
        } else if (e.keyCode === 8) {
          /*If BACKSPACE key is pressed, prevent propagation so the network is not reset*/
            e.stopPropagation()
        }
    });
    function addActive(x) {
    /*a function to classify an item as "active":*/
    if (!x) return false;
    /*start by removing the "active" class on all items:*/
    removeActive(x);
    if (currentFocus >= x.length) currentFocus = 0;
    if (currentFocus < 0) currentFocus = (x.length - 1);
        /*add class "autocomplete-active":*/
        x[currentFocus].classList.add("autocomplete-active");
    }
    function removeActive(x) {
        /*a function to remove the "active" class from all autocomplete items:*/
        for (var i = 0; i < x.length; i++) {
          x[i].classList.remove("autocomplete-active");
        }
    }
    function closeAllLists(elmnt) {
        /*close all autocomplete lists in the document,
        except the one passed as an argument:*/
        var x = document.getElementsByClassName("autocomplete-items");
        for (var i = 0; i < x.length; i++) {
            if (elmnt != x[i] && elmnt != inp) {
                x[i].parentNode.removeChild(x[i]);
            }
        }
    }
    /*execute a function when someone clicks in the document:*/
    document.addEventListener("click", function (e) {
        closeAllLists(e.target);
    });
  }
}