/**
 * https://sites.google.com/site/gmapicons/
 */

var DATASET_URL = 'http://ubriela.cloudapp.net/dataset/';
var GEOCAST_URL = 'http://ubriela.cloudapp.net/geocast/';
var PARAM_URL = 'http://ubriela.cloudapp.net/param/';
var UPDATE_URL = 'http://ubriela.cloudapp.net/update/';

var map = null;
var infoWindow;
var isIE;
var obj;

google.maps.event.addDomListener(window, 'load', init);
var allMarkers = [];

var cellPolygons = new Array();
var cells = new Array();
// var polygon = new Array();

var cellIdx = -1;
var json = "blank";

var datasetIdx = 0;
var bounds = new Array();
var boundRect;
var delayTime = 100;

var heatmapLayers = new Array();
var dataLocs = new Array();

var phoenix = new google.maps.LatLng(37.72822, -122.40297);

var movingWorker = false;

var iter_count = 0;

/**
 * This function is called when the homepage is loaded
 */
function load() {

	/* map options */
	var mapDiv = document.getElementById('map_canvas');
	var mapOptions = {
		scrollwheel : true,
		scaleControl : true,
		zoom : 12,
		center : phoenix,
		mapTypeId : google.maps.MapTypeId.ROADMAP,

		mapTypeControl : true,
		mapTypeControlOptions : {
			style : google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
			position : google.maps.ControlPosition.TOP_RIGHT
		},
		panControl : true,
		panControlOptions : {
			position : google.maps.ControlPosition.TOP_RIGHT
		},
		zoomControl : true,
		zoomControlOptions : {
			style : google.maps.ZoomControlStyle.DEFAULT,
			position : google.maps.ControlPosition.TOP_RIGHT
		},
		scaleControl : true,
		scaleControlOptions : {
			position : google.maps.ControlPosition.BOTTOM_RIGHT
		},
		streetViewControl : true,
		streetViewControlOptions : {
			position : google.maps.ControlPosition.TOP_RIGHT
		}
	};
	map = new google.maps.Map(mapDiv, mapOptions);

	/* map click event */
	google.maps.event.addListener(map, 'click', function(event) {

		var touch_point = new google.maps.LatLng(event.latLng.lat(),
				event.latLng.lng());
		var marker = new google.maps.Marker({
			position : touch_point,
			icon : 'res/images/mm_20_red.png'
		});
		drawATask(marker, map, event.latLng.lat() + ',' + event.latLng.lng());
	});

	/* init datasets */
	for (i = 0; i < $datasets.names.length; i++) {
		dataLocs[i] = [];
		loadDataset(dataLocs[i], i)
		var pointArray = new google.maps.MVCArray(dataLocs[i]);
		heatmapLayers[i] = new google.maps.visualization.HeatmapLayer({
			data : pointArray
		});
	}

	$('#jqxdropdown_dataset').trigger('change');
	// toggleHeatmap();

	var interval = setInterval(mobilitySimulation, 3000);
}

function loadStats() {
	$('#label_worker_count').text($datasets.worker_counts[datasetIdx]);
	$('#label_mtd').text($datasets.mtds[datasetIdx]);
	$('#label_area').text($datasets.areas[datasetIdx]);
	$('#label_pearson_skewness').text($datasets.pearson_skewness[datasetIdx]);
}

function set_delay() {
	var input_delay = latlng = document.forms["GUI_delay"]["delay"].value;
	if (isNaN(input_delay)) {
		alert("Invalid input");
	} else {
		delayTime = parseFloat(input_delay);
	}

}

/*
 * GeoCast_Query takes as parametter the url which is used to retrieve a json
 * file containning information of the geocast query
 */
function retrieveGeocastInfo(latlng, marker) {
	var url = GEOCAST_URL + $datasets.names[datasetIdx] + "/" + latlng;
	$.ajax(url).done(function(data) {

		if (data === "blank")
			alert("Crowdsourcing service is now unavailable");
		else {
			obj = JSON.parse(data);
			if (obj.hasOwnProperty('error')) {
				alert("The selected location is outside of the dataset");
			} else {
				drawGeocastRegion();
				drawNotifiedWorkers();
				if (marker) {
					fitBounds(marker)
					marker.setMap(map);
					allMarkers.push(marker);
				}
			}
		}
	});
}

/**
 * Draw all notified workers with markers
 */
function drawNotifiedWorkers() {
	for (var i = 0; i < obj.notified_workers.no_workers; i++) {
		var latlng = new google.maps.LatLng(obj.notified_workers.x_coords[i],
				obj.notified_workers.y_coords[i]);

		drawANotifiedWorker(latlng, map, 'res/images/mm_20_yellow.png');
	}

	/* if the task is performed, draw the performed worker */
	if (obj.is_performed) {
		var latlng = new google.maps.LatLng(obj.volunteer_worker.location[0],
				obj.volunteer_worker.location[1]);

		drawANotifiedWorker(latlng, map, 'res/images/mm_20_green.png');

		var dist = google.maps.geometry.spherical.computeDistanceBetween(
				new google.maps.LatLng(obj.spatial_task.location[0],
						obj.spatial_task.location[1]), latlng);

		dist = Number(dist.toFixed(0));

		/* notify */
		$("#notification").notify(
				"This task is performed by a worker of distance " + dist
						+ " metres :)\n" + "The number of notified workers: "
						+ obj.notified_workers.no_workers, "success");
	} else {
		/* notify */
		$("#notification").notify(
				"This task is NOT performed :(\n"
						+ "The number of notified workers: "
						+ obj.notified_workers.no_workers, "error");
	}
}

/**
 * Draw a single notified worker
 * 
 * @param latlng
 * @param map
 * @param icon
 * @returns distance to task
 */
function drawANotifiedWorker(latlng, map, icon) {
	var marker = new google.maps.Marker({
		map : map,
		position : latlng,
		icon : icon
	});

	// marker.setMap(map);
	// add marker
	allMarkers.push(marker);

	/* for each notified worker, add click event notification */
	var infoWindow = new google.maps.InfoWindow();

	var dist = 0;
	google.maps.event.addListener(marker, 'mouseover', function(event) {
		var formatted_lat = Number(latlng.lat()).toFixed(6);
		var formatted_lng = Number(latlng.lng()).toFixed(6);
		dist = google.maps.geometry.spherical.computeDistanceBetween(
				new google.maps.LatLng(obj.spatial_task.location[0],
						obj.spatial_task.location[1]), latlng);

		dist = Number(dist.toFixed(0));

		var info = 'Worker info: ';
		info += '<table><tr><td><b>Latitude</td><td align="right">'
				+ formatted_lat;
		info += '</td></tr><tr><td><b>Longitude</b></td><td align="right">'
				+ formatted_lng;
		info += '</td></tr><tr><td><b>Distance (m)</b></td><td align="right">'
				+ dist;
		info += '</td></tr></table>';
		;

		infoWindow.setContent(info);
		infoWindow.setPosition(event.latLng);

		infoWindow.open(map);
	});

	// setTimeout(function () { infoWindow.close(); }, 4000);

	google.maps.event.addListener(marker, 'mouseout', function() {
		infoWindow.close(map, marker);
	});

	return dist;
}

/*
 * Overlay_GeoCast_Region is to visualize how geocast cells are chosen by
 * iteratively overlay polygons on map. This function used setInterval to
 * repeatedly add cell after specific amount of miliseconds
 */
function drawGeocastRegion() {

	var i = -1;
	var interval = setInterval(function() {
		drawGeocastCell(i);
		i++;
		if (i >= obj.geocast_query.x_min_coords.length)
			clearInterval(interval);
	}, delayTime);

	/**
	 * Draw the bounding circle of geocast region
	 */

	if ($('#checkShowBoundingCircle').is(":checked"))
		drawBoundingCircle();
}

/**
 * Draw bounding circle
 */
function drawBoundingCircle() {
	var center = new google.maps.LatLng(obj.bounding_circle[0],
			obj.bounding_circle[1]);
	var radius = obj.bounding_circle[2];
	var circleOptions = {
		strokeColor : '#FF0000',
		strokeOpacity : 0.6,
		strokeWeight : 1,
		fillColor : '#FF0000',
		fillOpacity : 0.2,
		map : map,
		center : center,
		radius : radius * 100000
	};

	// Add the circle for this city to the map.
	var cityCircle = new google.maps.Circle(circleOptions);

	// Add a listener for the click event to show hop count.
	var infoWindow = new google.maps.InfoWindow();
	google.maps.event.addListener(cityCircle, 'click', function(event) {
		var info = '<table><tr><td><b>Hop count</b></td><td>' + obj.hop_count
				+ '</td><tr><td><b>Notified workers</b></td><td>'
				+ obj.notified_workers.no_workers + '</td></tr></table>';
		infoWindow.setContent(info);
		infoWindow.setPosition(event.latLng);

		infoWindow.open(map);

		setTimeout(function() {
			infoWindow.close();
		}, 4000);
	});

	allMarkers.push(cityCircle);
}

/*
 * add_geocast_cell is to add a specific cell in the list. It takes as a
 * parameter a number i indicating the order of the cell in the cell list. The
 * eventlistenr at the bottom of the function is to display a cell info whenever
 * it is clicked. This is called within the Overlay_GeoCast_Region function
 */
function drawGeocastCell(i) {
	polygon = new Array();

	var point0 = new google.maps.LatLng(obj.geocast_query.x_min_coords[i],
			obj.geocast_query.y_min_coords[i]);
	polygon[0] = point0;

	var point1 = new google.maps.LatLng(obj.geocast_query.x_min_coords[i],
			obj.geocast_query.y_max_coords[i]);
	polygon[1] = point1;

	var point2 = new google.maps.LatLng(obj.geocast_query.x_max_coords[i],
			obj.geocast_query.y_max_coords[i]);
	polygon[2] = point2;

	var point3 = new google.maps.LatLng(obj.geocast_query.x_max_coords[i],
			obj.geocast_query.y_min_coords[i]);
	polygon[3] = point3;

	polygon[4] = point0;

	cellIdx += 1;
	cells[cellIdx] = polygon;
	cellPolygons[cellIdx] = new google.maps.Polygon({
		path : cells[cellIdx],
		strokeColor : "#0000FF",
		strokeOpacity : 0.8,
		strokeWeight : 2,
		fillColor : "#0000FF",
		fillOpacity : 0.1
	});
	cellPolygons[cellIdx].setMap(map);

	// Add a listener for the click event to show cell info.
	var infoWindow = new google.maps.InfoWindow();
	google.maps.event
			.addListener(
					cellPolygons[cellIdx],
					'click',
					function(event) {
						var info = 'Adding Order: ' + (i + 1);
						info += '<table  border="1"><tr><td><b>Cell utility</td><td align="right">'
								+ obj.geocast_query.utilities[i][0];
						info += '</td></tr><tr><td><b>Current utility</b></td><td align="right">'
								+ obj.geocast_query.utilities[i][1];
						info += '</td></tr><tr><td><b>Current compactness</b></td><td align="right">'
								+ obj.geocast_query.compactnesses[i];
						info += '</td></tr><tr><td><b>Distance to task (km)</b></td><td align="right">'
								+ obj.geocast_query.distances[i];
						info += '</td></tr><tr><td><b>Area (&#x33a2;)</b></td><td align="right">'
								+ obj.geocast_query.areas[i];
						info += '</td></tr><tr><td><b>Noisy worker count</b></td><td align="right">'
								+ obj.geocast_query.worker_counts[i]
						info += '</td></tr></table>';
						;

						infoWindow.setContent(info);
						infoWindow.setPosition(event.latLng);

						infoWindow.open(map);

						setTimeout(function() {
							infoWindow.close();
						}, 4000);
					});

}

/*
 * The following function is to specify action to be performed when an event
 * happened on a marker.
 * 
 * When a marker is clicked, the geocast_query for the task the marker represent
 * will be issued and visuallized on map
 */
function drawATask(marker, map, html) {

	json = "blank";
	var infoWindow = new google.maps.InfoWindow;
	google.maps.event.addListener(marker, 'mouseover', function() {
		infoWindow.setContent(html);
		infoWindow.setPosition(event.latLng);
		infoWindow.open(map, marker);

		setTimeout(function() {
			infoWindow.close();
		}, 4000);
	});

	// google.maps.event.addListener(marker, 'mouseout', function() {
	// infoWindow.close(map, marker);
	// });

	latlng = marker.position.lat() + "," + marker.position.lng();
	retrieveGeocastInfo(latlng, marker);

	// var center = new google.maps.LatLng(marker.position.lat(),
	// marker.position
	// .lng());
}

function fitBounds(marker) {
	var radius = obj.bounding_circle[2];
	var bounds = new google.maps.LatLngBounds(new google.maps.LatLng(
			marker.position.lat() - radius, marker.position.lng() - radius),
			new google.maps.LatLng(marker.position.lat() + radius,
					marker.position.lng() + radius));

	map.fitBounds(bounds);
}

/*
 * Show_Boundary is to show/hide boundary of the dataset
 */
function toggleBoundary(showBound) {
	var button = document.getElementById("boundary");

	if (button.value == "Show Boundary" || showBound == true) {
		button.value = "Hide Boundary";
		boundRect = new google.maps.Rectangle({
			bounds : bounds,
			fillOpacity : 0,
			strokeColor : "#FF0000",
			strokeOpacity : 1,
			strokeWeight : 1

		});
		map.fitBounds(bounds);

		// boundary
		var vertices = [
				new google.maps.LatLng(bounds.getSouthWest().lat(), bounds
						.getSouthWest().lng()),
				new google.maps.LatLng(bounds.getSouthWest().lat(), bounds
						.getNorthEast().lng()),
				new google.maps.LatLng(bounds.getNorthEast().lat(), bounds
						.getNorthEast().lng()),
				new google.maps.LatLng(bounds.getNorthEast().lat(), bounds
						.getSouthWest().lng()),
				new google.maps.LatLng(bounds.getSouthWest().lat(), bounds
						.getSouthWest().lng()), ];
		boundary = new google.maps.Polyline({
			path : vertices,
			strokeColor : "#FF0000",
			strokeOpacity : 0.8,
			strokeWeight : 2
		});
		boundary.setMap(map);

		// info
		infoWindow = new google.maps.InfoWindow();
		google.maps.event.addListener(boundary, 'click',
				function(event) {
					var boundaryinfo = '<table><tr><td>Dataset:</td><td>'
							+ $datasets.names[datasetIdx]
							+ '</td><tr><td>#Workers:</td><td>'
							+ $datasets.worker_counts[datasetIdx]
							+ '</td><tr></table>';
					infoWindow.setContent(boundaryinfo);
					infoWindow.setPosition(event.latLng);
					infoWindow.open(map);
				});

		setTimeout(function() {
			infoWindow.close();
		}, 4000);

	} else {
		button.value = "Show Boundary";
		boundary.setMap(null);
	}

}

/*
 * This is for 1first function: input coordinates to a text box, hit button and
 * visualize Query function is trigerred when the GeoCastQuery button is
 * clicked. It takes the coordinate input by the users and then visualize
 * geocast query for task at that specific location
 */
function drawTestTask() {
	latlng = document.forms["input"]["coordinate"].value;
	latlng = latlng.split(" ").join("");

	var lat_lng = latlng.split(",");
	if (lat_lng.length == 2 // check if the input containt exact 2 parts
			// seperated by ","
			&& !isNaN(lat_lng[0]) && !isNaN(lat_lng[1]) // check if 2 parts are
			// numeric
			&& lat_lng[0] >= -90 && lat_lng[0] <= 90 // check range of
			// lattitude
			&& lat_lng[1] >= -180 && lat_lng[0] <= 180) { // check range of
		// longitude
		retrieveGeocastInfo(latlng);

		var coor = document.forms["input"]["coordinate"].value;
		var lat_lng = coor.split(",");
		var task_point = new google.maps.LatLng(lat_lng[0], lat_lng[1]);
		var marker = new google.maps.Marker({
			map : map,
			position : task_point,
			icon : 'res/images/mm_20_red.png'
		});
		drawATask(marker, map, document.forms["input"]["coordinate"].value);
		marker.setMap(map);
		allMarkers.push(marker);
		map.panTo(task_point);
	} else {
		alert("Invalid input");
	}

}

/*
 * this is for the 2nd function: select a task from dropdown list, hit button
 * and visuallize Visualize_Task_Seleclted is triggered when user click on
 * Visualize button after choosing a coordinate from a dropdown list. The
 * function will then visualize geocast query for task at the selected location
 */
function drawSelectedTask(latlng) {
	var lat_lng = latlng.split(",");
	var task_point = new google.maps.LatLng(lat_lng[0], lat_lng[1]);
	var marker = new google.maps.Marker({
		position : task_point,
		icon : 'res/images/mm_20_red.png'
	});
	drawATask(marker, map, document.forms["input"]["coordinate"].value);
	map.panTo(task_point);
}

/**
 * Clear all object on map
 */
function clearMap() {
	for (var n = 0; n < allMarkers.length; n++)
		allMarkers[n].setMap(null);
	allMarkers = [];

	for (var n = 0; n < cellPolygons.length; n++)
		cellPolygons[n].setMap(null);
	cellPolygons = [];

	cellIdx = -1;
}

/**
 * Publish data with parameters
 * 
 * rebuild = 1 --> recreate PSD
 */
function publishData() {
	var dataset = $('#jqxdropdown_datasetsx').val();
	var privacy_budget = $('#jqxdropdown_privacy_budget').val()
	var budget_param = $('#jqxdropdown_budget_parameter').val();
	var granularity = $('#jqxdropdown_granularity').val();

	$.ajax({
		url : PARAM_URL,
		data : "dataset=" + dataset + "&eps=" + privacy_budget + "&percent="
				+ budget_param + "&localness=" + granularity + "&rebuild=1",
		type : "GET",
		dataType : "json",
		success : callbackpublishData
	});

	$("#jqxdropdown_datasetsx").notify(
			"The dataset was published successfully.", "success");
}

function callbackpublishData(responseJSON) {

}

/**
 * Update algorithm' parameters
 */
function updateParams() {
	var heuristic = $('#jqxdropdown_heuristic').val();
	var subcell = $('#jqxdropdown_subcell').val();
	var eu = $('#jqxdropdown_expected_utility').val();
	var ar = $('#jqxdropdown_acceptance_rate').val();
	var mar = $('#jqxdropdown_maximum_acceptance_rate').val();
	var range = $('#jqxdropdown_wireless_range').val();

	$.ajax({
		url : PARAM_URL,
		data : "heuristic=" + heuristic + "&subcell=" + subcell + "&utl=" + eu
				+ "&arf=" + ar + "&mar=" + mar + "&range=" + range
				+ "&rebuild=0",
		type : "GET",
		dataType : "json",
		success : callbackUpdateParams
	});

	$("#jqxdropdown_acceptance_rate").notify(
			"The parameters were updated successfully.", "success");
}

function callbackUpdateParams(responseJSON) {

	if (responseJSON === "blank")
		alert("Crowdsourcing service is now unavailable");
	else {
		var response = JSON.parse(responseJSON);
		if (response.hasOwnProperty('error')) {
		} else {
			$("#jqxdropdown_acceptance_rate").notify(
					"The parameters were updated successfully.", "success");
		}
	}
}

/**
 * The task tab on left
 * 
 * @returns {undefined}
 */
$(function() {
	$("#tabs_query").tabs();
});
$(function() {
	$("#tabs_setting").tabs();
});
$(function() {
	$("#tabs_dataset").tabs();
});

/*******************************************************************************
 * create table to store history task list
 * 
 * @returns {undefined}
 */
function init() {
	completeTable = document.createElement("table");
	completeTable.setAttribute("class", "popupBox");
	completeTable.setAttribute("style", "display: true");
	autoRow = document.getElementById("auto-row");
	autoRow.appendChild(completeTable);

	retrieveHistoryTasks();
}

/**
 * query history task, call geocast/tasks function
 * 
 * @returns {undefined}
 */
function retrieveHistoryTasks() {
	$.ajax({
		url : 'index.php/geocast/tasks',
		data : 'dataset=' + $datasets.names[datasetIdx],
		type : "GET",
		dataType : "xml",
		success : callbackTasks
	});
}

// populate spreadsheet
function callbackTasks(responseXML) {

	// right table
	clearTable();
	parseTasksFromXML(responseXML);
}

function clearTable() {
	if (completeTable.getElementsByTagName("tr").length > 0) {
		completeTable.style.display = 'none';
		for (loop = completeTable.childNodes.length - 1; loop >= 0; loop--) {
			completeTable.removeChild(completeTable.childNodes[loop]);
		}
	}
}

/**
 * get lat/lng pairs from xml file
 * 
 * @param {type}
 *            responseXML
 */
function parseTasksFromXML(responseXML) {

	// no matches returned
	if (responseXML === null) {
		return false;
	} else {

		var tasks = responseXML.getElementsByTagName("tasks")[0];

		if (tasks.childNodes.length > 0) {
			completeTable.setAttribute("bordercolor", "black");
			completeTable.setAttribute("border", "1");
			var max = 7;
			if (tasks.childNodes.length <= 7)
				max = tasks.childNodes.length;
			for (loop = 0; loop < max; loop++) {
				var task = tasks.childNodes[loop];
				var lat = task.getElementsByTagName("lat")[0].childNodes[0].nodeValue;
				var lng = task.getElementsByTagName("lng")[0].childNodes[0].nodeValue;
				appendTask(lat, lng)
			}
		}
	}
}

/**
 * append a task to task table
 * 
 * @param {type}
 *            lat
 * @param {type}
 *            lng
 * @returns {undefined}
 */
function appendTask(lat, lng) {

	var row;
	var cell;
	var linkElement;

	if (isIE) {
		completeTable.style.display = 'block';
		row = completeTable.insertRow(completeTable.rows.length);
		cell = row.insertCell(0);
	} else {
		completeTable.style.display = 'table';
		row = document.createElement("tr");
		cell = document.createElement("td");
		row.appendChild(cell);
		completeTable.appendChild(row);
	}

	cell.className = "popupCell";

	linkElement = document.createElement("a");
	linkElement.className = "popupItem";
	linkElement.setAttribute("href", "javascript:drawSelectedTask('" + lat
			+ "," + lng + "')");
	linkElement.setAttribute("onClick", "changeLinkColor(this)");
	var formatted_lat = Number(lat).toFixed(6);
	var formatted_lng = Number(lng).toFixed(6);
	linkElement.appendChild(document.createTextNode(formatted_lat + ","
			+ formatted_lng));
	cell.appendChild(linkElement);
}

var currentLink = null;
/**
 * change color of a task link when click on it
 * 
 * @param {type}
 *            link
 * @returns {undefined}
 */
function changeLinkColor(link) {
	if (currentLink !== null) {
		currentLink.style.color = link.style.color; // You may put any color you
		// want
		currentLink.style.fontWeight = link.style.fontWeight;
		;
	}
	link.style.color = 'blue';
	link.style.fontWeight = 'bold';
	currentLink = link;
}

/*
 * read workerlocation from .dat file to draw heatmap
 */
function loadDataset(output, idx) {
	var txtFile;
	if (window.XMLHttpRequest) {// code for IE7+, Firefox, Chrome, Opera, Safari
		txtFile = new XMLHttpRequest();
	} else {// code for IE6, IE5
		txtFile = new ActiveXObject("Microsoft.XMLHTTP");
	}
	txtFile.open("GET", "index.php/geocast/load_dataset?name="
			+ $datasets.names[idx], false);
	txtFile.send();
	var txtDoc = txtFile.responseText;
	var lines = txtDoc.split("\n");

	for (var i = 0; i < lines.length; i++) {
		var coordinate = lines[i].split("\t");
		output[i] = new google.maps.LatLng(parseFloat(coordinate[0]),
				parseFloat(coordinate[1]));
	}
}

/**
 * Disable/enable heatmap
 */
function toggleHeatmap() {
	heatmapLayers[datasetIdx].setMap(heatmapLayers[datasetIdx].getMap() ? null
			: map);

	var button = document.getElementById("heatmap");
	if (button.value === "Show Heatmap")
		button.value = "Hide Heatmap";
	else
		button.value = "Show Heatmap";
}

/**
 * All workers move in randomly direction, North, South, East, West (e.g., 10km
 * in every second)
 */

function startSimulation() {
	movingWorker = true;
}

function stopSimulation() {
	iter_count = 0;
	movingWorker = false;

	/* upload */
	dataLocs
	$.ajax({
		url : UPDATE_URL,
		data : "dataset=" + dataLocs,
		type : "GET",
		dataType : "text",
		success : callbackStopSimulation
	});
}

function callbackStopSimulation() {

}

function mobilitySimulation() {

	if (!movingWorker)
		return;
	/* update locations in dataLocs */
	for (i = 0; i < dataLocs[datasetIdx].length; i++) {
		var latlng = dataLocs[datasetIdx][i];
		randomWalk(latlng, 2);
		dataLocs[datasetIdx][i] = latlng;
	}

	heatmapLayers[datasetIdx] = new google.maps.visualization.HeatmapLayer({
		data : new google.maps.MVCArray(dataLocs[datasetIdx])
	});

	/* clear heatmap */
	heatmapLayers[datasetIdx].setMap(heatmapLayers[datasetIdx].getMap() ? null
			: map);

	iter_count++;
	$('#label_iter_count').text(iter_count + " iterations");
	$('#label_iter_count').css({
		'position' : 'absolute',
		'left' : $('progressbar').position.left,
		'top' : $('progressbar').position.top
	});
}

/**
 * Random walk to either north/south/east/west
 * 
 * @param value
 * @param step
 */
function randomWalk(latlng, step) {
	var lat = latlng.lat();
	var lng = latlng.lng();

	var rand = Math.random() - 0.5;

	var new_lat = lat + rand * step;
	new_lat = Math.max(new_lat, bounds.getSouthWest().lat());
	new_lat = Math.min(new_lat, bounds.getNorthEast().lat());

	var new_lng = lng + rand * step;
	new_lng = Math.max(new_lng, bounds.getSouthWest().lng());
	new_lng = Math.min(new_lng, bounds.getNorthEast().lng());

	latlng = new google.maps.LatLng(new_lat, new_lng);
}

$(document).ready(function() {
	// $('#jqxdropdown_dataset').addClass('ui-selected');

	var PrivacyBudgets = [ "1.0", "0.5", "0.2", "0.1" ];
	var BudgetParameters = [ "0.5", "0.4", "0.3", "0.2" ];
	var Granularities = [ "true", "false" ];

	$("#jqxdropdown_datasetsx").jqxDropDownList({
		source : $datasets.names2,
		selectedIndex : 0,
		width : '110px',
		height : '20px',
		autoDropDownHeight : true,
		theme : 'energyblue'
	});

	$("#jqxdropdown_dataset").jqxDropDownList({
		source : $datasets.names2,
		selectedIndex : 0,
		width : '110px',
		height : '20px',
		autoDropDownHeight : true,
		theme : 'energyblue'
	});

	$("#jqxdropdown_privacy_budget").jqxDropDownList({
		source : PrivacyBudgets,
		selectedIndex : 0,
		width : '110px',
		height : '20px',
		autoDropDownHeight : true,
		theme : 'energyblue'
	});
	$("#jqxdropdown_budget_parameter").jqxDropDownList({
		source : BudgetParameters,
		selectedIndex : 0,
		width : '110px',
		height : '20px',
		autoDropDownHeight : true,
		theme : 'energyblue'
	});
	$("#jqxdropdown_granularity").jqxDropDownList({
		source : Granularities,
		selectedIndex : 0,
		width : '110px',
		height : '20px',
		autoDropDownHeight : true,
		theme : 'energyblue'
	});

	var Heuristics = [ "hybrid", "utility", "compactness", "distance" ];
	var Subcells = [ "true", "false" ];
	var ExpectedUtilities = [ "0.9", "0.7", "0.6", "0.5" ];

	var AcceptanceRates = [ "linear", "zipf" ];
	var MaxAcceptanceRates = [ "0.1", "0.4", "0.7", "1.0" ];
	var WirelessRanges = [ "100", "70", "50", "25" ];

	$("#jqxdropdown_heuristic").jqxDropDownList({
		source : Heuristics,
		selectedIndex : 0,
		width : '130px',
		height : '20px',
		autoDropDownHeight : true,
		theme : 'energyblue'
	});

	$("#jqxdropdown_subcell").jqxDropDownList({
		source : Subcells,
		selectedIndex : 0,
		width : '100px',
		height : '20px',
		autoDropDownHeight : true,
		theme : 'energyblue'
	});

	$("#jqxdropdown_expected_utility").jqxDropDownList({
		source : ExpectedUtilities,
		selectedIndex : 0,
		width : '100px',
		height : '20px',
		autoDropDownHeight : true,
		theme : 'energyblue'
	});

	$("#jqxdropdown_acceptance_rate").jqxDropDownList({
		source : AcceptanceRates,
		selectedIndex : 0,
		width : '130px',
		height : '20px',
		autoDropDownHeight : true,
		theme : 'energyblue'
	});

	$("#jqxdropdown_maximum_acceptance_rate").jqxDropDownList({
		source : MaxAcceptanceRates,
		selectedIndex : 0,
		width : '100px',
		height : '20px',
		autoDropDownHeight : true,
		theme : 'energyblue'
	});

	$("#jqxdropdown_wireless_range").jqxDropDownList({
		source : WirelessRanges,
		selectedIndex : 0,
		width : '100px',
		height : '20px',
		autoDropDownHeight : true,
		theme : 'energyblue'
	});
});

/**
 * Select a dataset
 */
$(function() {
	$("#jqxdropdown_dataset").change(
			function() {
				var dataset = $('#jqxdropdown_dataset').val();
				datasetIdx = $datasets.names2.indexOf(dataset);
				var boundary = $datasets.boundaries[datasetIdx];
				boundary = boundary.split(",");

				bounds = new google.maps.LatLngBounds(new google.maps.LatLng(
						parseFloat(boundary[0]), parseFloat(boundary[1])),
						new google.maps.LatLng(parseFloat(boundary[2]),
								parseFloat(boundary[3])));

				toggleBoundary(true);
				retrieveHistoryTasks();
				loadStats();

				$("#jqxdropdown_dataset").notify(
						"Current dataset was updated.", "success");
			});
});