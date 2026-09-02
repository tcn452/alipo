/// <reference path="../pb_data/types.d.ts" />

/**
 * Smart Dispatch Recommendation Logic (Phase 2, Spec §8)
 * Endpoint: GET /api/dispatch
 * Params:
 *  - lat: vehicle latitude
 *  - lng: vehicle longitude
 *  - fuel_type: "petrol" | "diesel" (optional)
 *  - radius_km: number (default 25)
 */

function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

routerAdd("GET", "/api/dispatch", (c) => {
  const lat = parseFloat(c.queryParam("lat") || "-13.97");
  const lng = parseFloat(c.queryParam("lng") || "33.78");
  const fuelType = c.queryParam("fuel_type") || "petrol";
  const radiusKm = parseFloat(c.queryParam("radius_km") || "25");

  try {
    const stations = $app.dao().findRecordsByFilter(
      "stations",
      "latest_status != 'out'",
      "-verified"
    );

    const scoredStations = [];

    const queueWeights = {
      "none": 10,
      "short": 25,
      "medium": 45,
      "long": 90
    };

    for (let s of stations) {
      const sLat = s.getFloat("latitude");
      const sLng = s.getFloat("longitude");
      const distance = calculateDistanceKm(lat, lng, sLat, sLng);

      if (distance <= radiusKm) {
        const queue = s.getString("latest_queue") || "short";
        const isVerified = s.getBool("verified");
        const status = s.getString("latest_status");

        // Lower score is better
        let score = distance * 2 + (queueWeights[queue] || 30);
        if (isVerified) score -= 10;
        if (status === "low") score += 20;

        scoredStations.push({
          id: s.id,
          name: s.getString("name"),
          brand: s.getString("brand"),
          city: s.getString("city"),
          district: s.getString("district"),
          latitude: sLat,
          longitude: sLng,
          distance_km: Math.round(distance * 10) / 10,
          status: status,
          queue: queue,
          verified: isVerified,
          price_petrol: s.getInt("latest_price_petrol"),
          price_diesel: s.getInt("latest_price_diesel"),
          score: Math.max(0, Math.round(score))
        });
      }
    }

    // Sort by best score (lowest score = highest recommendation)
    scoredStations.sort((a, b) => a.score - b.score);

    // Return top 3 fallbacks
    const recommendations = scoredStations.slice(0, 3);

    return c.json(200, {
      origin: { lat, lng },
      fuel_type: fuelType,
      recommendations: recommendations,
      total_found: scoredStations.length
    });
  } catch (err) {
    return c.json(500, { error: err.message });
  }
});
