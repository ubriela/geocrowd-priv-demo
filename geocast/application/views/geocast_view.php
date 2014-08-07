<script>
    var $datasets = <?php echo json_encode($datasets); ?>;
</script>

<body onload="load()">

    <div>
        <p>
            <label for="dataset">Select dataset:</label>
        </p>
        <ol id="dataset">
            <?php
            //log_message('error', var_export($datasets->names, True));
            if ($datasets) {
                echo '<li class="ui-widget-content" value="0">' . $datasets->names[0] . '</li>' . "\n";
                for ($i = 1; $i < count($datasets->names); $i++) {
                    echo '<li class="ui-widget-content" value="' . $i . '">' . $datasets->names[$i] . '</li>' . "\n";
                }
            }
            ?>
        </ol>
    </div>
    <div id="map_canvas"></div>

    <div id="panel">
        <input type="button" onclick="toggleHeatmap()" id ="heatmap" value="Show Heatmap"/>
    </div>

    <div id="tabs">
        <ul>
            <p>
                <b>Geocast Queries</b>
            </p>
            <li><a href="#tabs-2">Test</a></li>
            <li><a href="#tabs-1">History</a></li>

        </ul>

        <div id="tabs-1">
            <div id="auto-row" colspan="1">
            </div>
            <button type="button" value="Clear map" id="clear_map"
                    onClick="clearMap()">Clear Map</button>

        </div>

        <div id="tabs-2">
            <form name="input" action="geocast_view.php"
                  onsubmit="drawTestTask();
                          return false">
                Task (lat,lng) <input type="text" name="coordinate"><br>
                <button type="submit" value="Submit">Submit</button>
            </form>
            <input type="button" value="Show Boundary" id="boundary"
                   onClick="showBoundary('false')"/>            
        </div>

    </div>

    <div id="tabs_setting">
        <ul>
            <p>
                <b>Settings</b>
            </p>
            <li><a href="#tabs_setting-1">Algorithms</a></li>
            <li><a href="#tabs_setting-2">GUI</a></li>


        </ul>

        <div id="tabs_setting-1">
            Algorithms: <div id='jqxdropdownalgos'>
            </div>
            Ars: <div id='jqxdropdownars'>
            </div>
            Mars: <div id='jqxdropdownmars'>
            </div>
            Us: <div id='jqxdropdownus'>
            </div>
            Heuristics: <div id='jqxdropdownheuristic'>
            </div>
            Subcells: <div id='jqxdropdownsubcell'>
            </div>
            <input type="button" value="Update_Algorithm" id="Update_Algorithm"
                   onClick="Update_Algorithm()"/>
        </div>

        <div id="tabs_setting-2">
            <form name="GUI_delay" action="geocast_view.php"
                  onsubmit="set_delay();
                          return false">
                Delay (In Seconds) <input type="text" style="width: 100px; padding: 2px"
                                              name="delay"><br>
                <button type="submit" value="Submit">Update</button>
            </form>

        </div>

    </div>


</div>

</body>
