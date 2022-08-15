// Based on simple canvas network visualization by Mike Bostock
// source: https://bl.ocks.org/mbostock/ad70335eeef6d167bc36fd3c04378048

function vis(new_controls) {

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
       "max_link_weight_percentile": 1}

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


  var init_x = (document.documentElement || document.body.parentNode || document.body).scrollLeft;

  var init_y = (document.documentElement || document.body.parentNode || document.body).scrollTop;

  // Network functions
  // -----------------

  function dragsubject() {
    return simulation.find(zoomScaler.invert(d3.event.x), zoomScaler.invert(d3.event.y), 20);
  }

  function dragstarted() {
    console.log("dragstarted")
    if (!controls['freeze_nodes']) simulation.alphaTarget(0.3);
    simulation.restart();
    d3.event.subject.fx = d3.event.subject.x;
    d3.event.subject.fy = d3.event.subject.y;
  }

  function dragged() {

    const x = (document.documentElement || document.body.parentNode || document.body).scrollLeft - init_x;
    const y = (document.documentElement || document.body.parentNode || document.body).scrollTop - init_y;

    console.log("dragged")
    d3.event.subject.fx = zoomScaler.invert(event.clientX - (canvasOffsetX - x));
    d3.event.subject.fy = zoomScaler.invert(event.clientY - (canvasOffsetY - y));
    if (controls['freeze_nodes']) simulation.restart();
  }

  function dragended() {
    console.log("dragended")
    if (!controls['freeze_nodes']) simulation.alphaTarget(0);
    d3.event.subject.fx = null;
    d3.event.subject.fy = null;
  }

  function drawLink(d) {
    var thisLinkWidth = valIfValid(d.weight, 1) ** (controls['link_width_variation']) * linkWidthNorm * controls['link_width'];
    context.beginPath();
    context.moveTo(zoomScaler(d.source.x), zoomScaler(d.source.y));
    context.lineTo(zoomScaler(d.target.x), zoomScaler(d.target.y));
    context.lineWidth = thisLinkWidth * controls['zoom'];
    context.stroke();
  }

  function drawNode(d) {
    // Node
    var thisNodeSize = valIfValid(d.size, 1) ** (controls['node_size_variation']) * nodeSizeNorm * controls['node_size'];
    context.beginPath();
    context.moveTo(zoomScaler(d.x) + thisNodeSize * (controls['zoom'] + (controls['zoom'] - 1)), zoomScaler(d.y));
    context.arc(zoomScaler(d.x), zoomScaler(d.y), thisNodeSize * (controls['zoom'] + (controls['zoom'] - 1)), 0, 2 * Math.PI);
    context.fillStyle = computeNodeColor(d);
    context.fill();
    context.stroke();
  }

  function drawText(d) {
    if (controls['display_node_labels'] || d.id == hoveredNode || selectedNodes.includes(d.id)) {
      var thisNodeSize = valIfValid(d.size, 1) ** (controls['node_size_variation']) * nodeSizeNorm * controls['node_size'];
      context.font = clip(thisNodeSize * controls['zoom'] * 2, 10, 20) + "px Helvetica";
      context.fillStyle = "white"; //controls['node_label_color'] //
      context.strokeStyle = "black";
      context.lineWidth = Math.max(3, Math.min(d.size, 2));
      context.strokeText(d.id, zoomScaler(d.x), zoomScaler(d.y));
      context.fillText(d.id, zoomScaler(d.x), zoomScaler(d.y));
    }
  }


  // Key events //
  // ---------- //

  var shiftDown = false
  window.onkeydown = function() {
    if (window.event.keyCode == 16) {
      shiftDown = true;
    }
  }
  window.onkeyup = function() {
    shiftDown = false;
  }

  var hoveredNode;
  var selectedNodes = [];
  var xy;
  d3.select(canvas).on("mousemove", function() {
    if (!controls['display_node_labels']) {
      xy = d3.mouse(this)
      hoveredNode = simulation.find(zoomScaler.invert(xy[0]), zoomScaler.invert(xy[1]), 20)
      if (typeof (hoveredNode) != 'undefined') {
        hoveredNode = hoveredNode.id;
      }
      simulation.restart();
    }
  })

  canvas.addEventListener("mousedown", function() {
    if (typeof (hoveredNode) != 'undefined') {
      if (selectedNodes.includes(hoveredNode)) {
        selectedNodes.splice(selectedNodes.indexOf(hoveredNode), 1)
      } else {
        selectedNodes.push(hoveredNode)
      }
      simulation.restart();
    }
  }, true)

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

  // Utility functions //
  // ----------------- //

  // The zoomScaler converts a simulation coordinate (what we don't see) to a
  // canvas coordinate (what we do see), and zoomScaler.invert does the opposite.
  zoomScaler = d3.scaleLinear().domain([0, width]).range([width * (1 - controls['zoom']), controls['zoom'] * width])

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

  function handleURL() {
    if (controls['file_path'].endsWith(".json")) {
      d3.json(controls['file_path'], function(error, _graph) {
        if (error) {
          Swal.fire({ text: "File not found", type: "error" })
          return false
        }
        restartIfValidJSON(_graph);
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

    // Reset all thresholds ...
    // commented this out because it overwrites the predefined values in `config`
    // controls["min_link_weight_percentile"] = 0
    // controls["max_link_weight_percentile"] = 1

    // Run the restart if all of this was OK
    restart();
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
        let domainScalerY = d3.scaleLinear().domain([d3.min(yVals), d3.max(yVals)]).range([width * 0.15, width * (1 - 0.15)])
        masterGraph.nodes.forEach((d, i) => {
          d['x'] = zoomScaler.invert(domainScalerX(d.x))
          d['y'] = zoomScaler.invert(domainScalerY(d.y))
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
      maxNodeSize = d3.max(d3.values(masterNodeStrengths))
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
}