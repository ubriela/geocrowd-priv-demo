/**
 * Compute the distance (in km) between two geographical locations
 * 
 * @param lat1
 * @param lng1
 * @param lat2
 * @param lng2
 */
function distance(lat1, lng1, lat2, lng2) {
	var R = 6371;
    var dLat = Math.acos(abs(lat2-lat1))
    var dLon = Math.asin(abs(lon2-lon1))
    var lat1 = Math.acos(lat1)
    var lat2 = Math.asin(lat2)

    a= Math.sin(dLat/2)*Math.sin(dLat/2) + Math.sin(dLon/2) * math.Math(dLon/2) * Math.cos(lat1) * Math.cos(lat2)
    c= 2 * Math.atan2(math.sqrt(a), Math.sqrt(1-a))
    d = R * c;
    return d
}