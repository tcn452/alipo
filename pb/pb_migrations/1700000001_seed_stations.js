/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const stationsCollection = db.findCollectionByNameOrId("stations");

  const initialStations = [
    // Lilongwe Stations
    {
      id: "stat_llw_001",
      name: "Puma Energy Area 47",
      brand: "Puma",
      latitude: -13.9572,
      longitude: 33.7915,
      district: "Lilongwe City",
      city: "Lilongwe",
      verified: true,
      fuel_types: ["petrol", "diesel"],
      contact_phone: "+265888000101",
      latest_status: "available",
      latest_queue: "short",
      latest_price_petrol: 2530,
      latest_price_diesel: 2734,
      last_reported_at: new Date().toISOString()
    },
    {
      id: "stat_llw_002",
      name: "TotalEnergies City Centre",
      brand: "Total",
      latitude: -13.9712,
      longitude: 33.7845,
      district: "Lilongwe City",
      city: "Lilongwe",
      verified: true,
      fuel_types: ["petrol", "diesel"],
      contact_phone: "+265888000102",
      latest_status: "available",
      latest_queue: "medium",
      latest_price_petrol: 2530,
      latest_price_diesel: 2734,
      last_reported_at: new Date().toISOString()
    },
    {
      id: "stat_llw_003",
      name: "Petroda Kanengo Industrial",
      brand: "Petroda",
      latitude: -13.8821,
      longitude: 33.7741,
      district: "Lilongwe City",
      city: "Lilongwe",
      verified: true,
      fuel_types: ["petrol", "diesel"],
      contact_phone: "+265888000103",
      latest_status: "low",
      latest_queue: "long",
      latest_price_petrol: 2530,
      latest_price_diesel: 2734,
      last_reported_at: new Date().toISOString()
    },
    {
      id: "stat_llw_004",
      name: "OilCom Old Town (Paul Kagame)",
      brand: "OilCom",
      latitude: -13.9845,
      longitude: 33.7689,
      district: "Lilongwe City",
      city: "Lilongwe",
      verified: true,
      fuel_types: ["petrol", "diesel"],
      contact_phone: "+265888000104",
      latest_status: "out",
      latest_queue: "none",
      latest_price_petrol: 2530,
      latest_price_diesel: 2734,
      last_reported_at: new Date().toISOString()
    },
    {
      id: "stat_llw_005",
      name: "Mount Meru Area 10",
      brand: "Mount Meru",
      latitude: -13.9450,
      longitude: 33.8050,
      district: "Lilongwe City",
      city: "Lilongwe",
      verified: false,
      fuel_types: ["petrol", "diesel"],
      contact_phone: "+265888000105",
      latest_status: "available",
      latest_queue: "none",
      latest_price_petrol: 2530,
      latest_price_diesel: 2734,
      last_reported_at: new Date().toISOString()
    },
    {
      id: "stat_llw_006",
      name: "Puma Gateway Mall",
      brand: "Puma",
      latitude: -13.9780,
      longitude: 33.7720,
      district: "Lilongwe City",
      city: "Lilongwe",
      verified: true,
      fuel_types: ["petrol", "diesel"],
      contact_phone: "+265888000106",
      latest_status: "available",
      latest_queue: "short",
      latest_price_petrol: 2530,
      latest_price_diesel: 2734,
      last_reported_at: new Date().toISOString()
    },

    // Blantyre Stations
    {
      id: "stat_bt_001",
      name: "TotalEnergies Chichiri",
      brand: "Total",
      latitude: -15.7981,
      longitude: 35.0254,
      district: "Blantyre City",
      city: "Blantyre",
      verified: true,
      fuel_types: ["petrol", "diesel"],
      contact_phone: "+265888000201",
      latest_status: "available",
      latest_queue: "short",
      latest_price_petrol: 2530,
      latest_price_diesel: 2734,
      last_reported_at: new Date().toISOString()
    },
    {
      id: "stat_bt_002",
      name: "Puma Ginnery Corner",
      brand: "Puma",
      latitude: -15.7925,
      longitude: 35.0118,
      district: "Blantyre City",
      city: "Blantyre",
      verified: true,
      fuel_types: ["petrol", "diesel"],
      contact_phone: "+265888000202",
      latest_status: "low",
      latest_queue: "long",
      latest_price_petrol: 2530,
      latest_price_diesel: 2734,
      last_reported_at: new Date().toISOString()
    },
    {
      id: "stat_bt_003",
      name: "Petroda Limbe (Churchill Road)",
      brand: "Petroda",
      latitude: -15.8150,
      longitude: 35.0530,
      district: "Blantyre City",
      city: "Blantyre",
      verified: true,
      fuel_types: ["petrol", "diesel"],
      contact_phone: "+265888000203",
      latest_status: "available",
      latest_queue: "medium",
      latest_price_petrol: 2530,
      latest_price_diesel: 2734,
      last_reported_at: new Date().toISOString()
    },
    {
      id: "stat_bt_004",
      name: "OilCom Clock Tower Blantyre CBD",
      brand: "OilCom",
      latitude: -15.7865,
      longitude: 35.0062,
      district: "Blantyre City",
      city: "Blantyre",
      verified: false,
      fuel_types: ["petrol", "diesel"],
      contact_phone: "+265888000204",
      latest_status: "out",
      latest_queue: "none",
      latest_price_petrol: 2530,
      latest_price_diesel: 2734,
      last_reported_at: new Date().toISOString()
    },

    // Mzuzu Stations
    {
      id: "stat_mzu_001",
      name: "Puma Mzuzu CBD",
      brand: "Puma",
      latitude: -11.4589,
      longitude: 34.0152,
      district: "Mzuzu City",
      city: "Mzuzu",
      verified: true,
      fuel_types: ["petrol", "diesel"],
      contact_phone: "+265888000301",
      latest_status: "available",
      latest_queue: "short",
      latest_price_petrol: 2530,
      latest_price_diesel: 2734,
      last_reported_at: new Date().toISOString()
    }
  ];

  for (const st of initialStations) {
    try {
      const record = new Record(stationsCollection);
      record.setId(st.id);
      record.set("name", st.name);
      record.set("brand", st.brand);
      record.set("latitude", st.latitude);
      record.set("longitude", st.longitude);
      record.set("district", st.district);
      record.set("city", st.city);
      record.set("verified", st.verified);
      record.set("fuel_types", st.fuel_types);
      record.set("contact_phone", st.contact_phone);
      record.set("latest_status", st.latest_status);
      record.set("latest_queue", st.latest_queue);
      record.set("latest_price_petrol", st.latest_price_petrol);
      record.set("latest_price_diesel", st.latest_price_diesel);
      record.set("last_reported_at", st.last_reported_at);
      db.saveRecord(record);
    } catch (e) {
      console.log("Migration station insert error / exists:", e);
    }
  }
}, (db) => {
  return null;
});
