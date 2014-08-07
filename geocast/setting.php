
<body>

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
            <br>
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
            <br>
            <input type="button" value="Show Boundary" id="boundary"
                   onClick="showBoundary('false')"/>
            
             
            
        </div>
    </div>
</div>

</body>
