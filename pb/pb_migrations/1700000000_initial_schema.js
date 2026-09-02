/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const snapshot = [
    {
      "id": "companies_col_01",
      "name": "companies",
      "type": "base",
      "system": false,
      "schema": [
        {
          "name": "name",
          "type": "text",
          "required": true,
          "unique": false
        },
        {
          "name": "type",
          "type": "select",
          "required": true,
          "options": {
            "maxSelect": 1,
            "values": ["logistics", "ngo", "delivery", "government", "other"]
          }
        },
        {
          "name": "billing_status",
          "type": "select",
          "required": true,
          "options": {
            "maxSelect": 1,
            "values": ["trial", "active", "overdue", "cancelled"]
          }
        },
        {
          "name": "plan",
          "type": "select",
          "required": true,
          "options": {
            "maxSelect": 1,
            "values": ["starter", "growth", "fleet"]
          }
        }
      ],
      "listRule": "@request.auth.id != '' && (@request.auth.role = 'wekode_ops' || @request.auth.company = id)",
      "viewRule": "@request.auth.id != '' && (@request.auth.role = 'wekode_ops' || @request.auth.company = id)",
      "createRule": "@request.auth.role = 'wekode_ops'",
      "updateRule": "@request.auth.role = 'wekode_ops' || @request.auth.company = id",
      "deleteRule": "@request.auth.role = 'wekode_ops'"
    },
    {
      "id": "stations_col_001",
      "name": "stations",
      "type": "base",
      "system": false,
      "schema": [
        {
          "name": "name",
          "type": "text",
          "required": true
        },
        {
          "name": "brand",
          "type": "select",
          "required": true,
          "options": {
            "maxSelect": 1,
            "values": ["Puma", "Total", "OilCom", "Petroda", "Mount Meru", "Engen", "Other"]
          }
        },
        {
          "name": "latitude",
          "type": "number",
          "required": true
        },
        {
          "name": "longitude",
          "type": "number",
          "required": true
        },
        {
          "name": "district",
          "type": "text",
          "required": true
        },
        {
          "name": "city",
          "type": "select",
          "required": true,
          "options": {
            "maxSelect": 1,
            "values": ["Lilongwe", "Blantyre", "Mzuzu", "Zomba", "Kasungu", "Mangochi", "Salima"]
          }
        },
        {
          "name": "verified",
          "type": "bool",
          "required": false
        },
        {
          "name": "fuel_types",
          "type": "select",
          "required": false,
          "options": {
            "maxSelect": 2,
            "values": ["petrol", "diesel"]
          }
        },
        {
          "name": "contact_phone",
          "type": "text",
          "required": false
        },
        {
          "name": "latest_status",
          "type": "select",
          "required": false,
          "options": {
            "maxSelect": 1,
            "values": ["available", "low", "out", "unknown"]
          }
        },
        {
          "name": "latest_queue",
          "type": "select",
          "required": false,
          "options": {
            "maxSelect": 1,
            "values": ["none", "short", "medium", "long"]
          }
        },
        {
          "name": "latest_price_petrol",
          "type": "number",
          "required": false
        },
        {
          "name": "latest_price_diesel",
          "type": "number",
          "required": false
        },
        {
          "name": "last_reported_at",
          "type": "date",
          "required": false
        }
      ],
      "listRule": "",
      "viewRule": "",
      "createRule": "@request.auth.role = 'wekode_ops'",
      "updateRule": "@request.auth.role = 'wekode_ops' || @request.auth.id != ''",
      "deleteRule": "@request.auth.role = 'wekode_ops'"
    },
    {
      "id": "reports_col_0001",
      "name": "reports",
      "type": "base",
      "system": false,
      "schema": [
        {
          "name": "station",
          "type": "relation",
          "required": true,
          "options": {
            "collectionId": "stations_col_001",
            "cascadeDelete": false,
            "maxSelect": 1
          }
        },
        {
          "name": "status",
          "type": "select",
          "required": true,
          "options": {
            "maxSelect": 1,
            "values": ["available", "low", "out"]
          }
        },
        {
          "name": "fuel_type",
          "type": "select",
          "required": true,
          "options": {
            "maxSelect": 1,
            "values": ["petrol", "diesel", "both"]
          }
        },
        {
          "name": "queue_estimate",
          "type": "select",
          "required": false,
          "options": {
            "maxSelect": 1,
            "values": ["none", "short", "medium", "long"]
          }
        },
        {
          "name": "price",
          "type": "number",
          "required": false
        },
        {
          "name": "source",
          "type": "select",
          "required": true,
          "options": {
            "maxSelect": 1,
            "values": ["ussd", "whatsapp", "web", "verified_station"]
          }
        },
        {
          "name": "reporter_phone",
          "type": "text",
          "required": false
        },
        {
          "name": "confirmations",
          "type": "number",
          "required": false
        },
        {
          "name": "is_active",
          "type": "bool",
          "required": false
        }
      ],
      "listRule": "",
      "viewRule": "",
      "createRule": "",
      "updateRule": "@request.auth.role = 'wekode_ops'",
      "deleteRule": "@request.auth.role = 'wekode_ops'"
    },
    {
      "id": "vehicles_col_01",
      "name": "vehicles",
      "type": "base",
      "system": false,
      "schema": [
        {
          "name": "company",
          "type": "relation",
          "required": true,
          "options": {
            "collectionId": "companies_col_01",
            "cascadeDelete": true,
            "maxSelect": 1
          }
        },
        {
          "name": "plate",
          "type": "text",
          "required": true
        },
        {
          "name": "assigned_driver_name",
          "type": "text",
          "required": false
        },
        {
          "name": "assigned_driver_phone",
          "type": "text",
          "required": false
        },
        {
          "name": "fuel_card_id",
          "type": "text",
          "required": false
        },
        {
          "name": "fuel_type",
          "type": "select",
          "required": true,
          "options": {
            "maxSelect": 1,
            "values": ["petrol", "diesel"]
          }
        },
        {
          "name": "tank_capacity_litres",
          "type": "number",
          "required": false
        }
      ],
      "listRule": "@request.auth.id != '' && (@request.auth.role = 'wekode_ops' || @request.auth.company = company)",
      "viewRule": "@request.auth.id != '' && (@request.auth.role = 'wekode_ops' || @request.auth.company = company)",
      "createRule": "@request.auth.id != '' && (@request.auth.role = 'wekode_ops' || @request.auth.company = company)",
      "updateRule": "@request.auth.id != '' && (@request.auth.role = 'wekode_ops' || @request.auth.company = company)",
      "deleteRule": "@request.auth.id != '' && (@request.auth.role = 'wekode_ops' || @request.auth.company = company)"
    },
    {
      "id": "fuel_alloc_001",
      "name": "fuel_allocations",
      "type": "base",
      "system": false,
      "schema": [
        {
          "name": "company",
          "type": "relation",
          "required": true,
          "options": {
            "collectionId": "companies_col_01",
            "cascadeDelete": true,
            "maxSelect": 1
          }
        },
        {
          "name": "vehicle",
          "type": "relation",
          "required": true,
          "options": {
            "collectionId": "vehicles_col_01",
            "cascadeDelete": true,
            "maxSelect": 1
          }
        },
        {
          "name": "period_start",
          "type": "date",
          "required": true
        },
        {
          "name": "period_end",
          "type": "date",
          "required": true
        },
        {
          "name": "allocated_litres",
          "type": "number",
          "required": true
        },
        {
          "name": "consumed_litres",
          "type": "number",
          "required": false
        }
      ],
      "listRule": "@request.auth.id != '' && (@request.auth.role = 'wekode_ops' || @request.auth.company = company)",
      "viewRule": "@request.auth.id != '' && (@request.auth.role = 'wekode_ops' || @request.auth.company = company)",
      "createRule": "@request.auth.id != '' && (@request.auth.role = 'wekode_ops' || @request.auth.company = company)",
      "updateRule": "@request.auth.id != '' && (@request.auth.role = 'wekode_ops' || @request.auth.company = company)",
      "deleteRule": "@request.auth.id != '' && (@request.auth.role = 'wekode_ops' || @request.auth.company = company)"
    },
    {
      "id": "refuel_evt_001",
      "name": "refuel_events",
      "type": "base",
      "system": false,
      "schema": [
        {
          "name": "vehicle",
          "type": "relation",
          "required": true,
          "options": {
            "collectionId": "vehicles_col_01",
            "cascadeDelete": false,
            "maxSelect": 1
          }
        },
        {
          "name": "station",
          "type": "relation",
          "required": false,
          "options": {
            "collectionId": "stations_col_001",
            "cascadeDelete": false,
            "maxSelect": 1
          }
        },
        {
          "name": "litres",
          "type": "number",
          "required": true
        },
        {
          "name": "cost_mwk",
          "type": "number",
          "required": false
        },
        {
          "name": "reported_by_phone",
          "type": "text",
          "required": false
        },
        {
          "name": "odometer_km",
          "type": "number",
          "required": false
        }
      ],
      "listRule": "@request.auth.id != ''",
      "viewRule": "@request.auth.id != ''",
      "createRule": "",
      "updateRule": "@request.auth.id != ''",
      "deleteRule": "@request.auth.role = 'wekode_ops'"
    },
    {
      "id": "fraud_flags_01",
      "name": "fraud_flags",
      "type": "base",
      "system": false,
      "schema": [
        {
          "name": "vehicle",
          "type": "relation",
          "required": true,
          "options": {
            "collectionId": "vehicles_col_01",
            "cascadeDelete": true,
            "maxSelect": 1
          }
        },
        {
          "name": "flag_type",
          "type": "select",
          "required": true,
          "options": {
            "maxSelect": 1,
            "values": ["impossible_travel", "consumption_spike", "frequency_anomaly"]
          }
        },
        {
          "name": "severity",
          "type": "select",
          "required": true,
          "options": {
            "maxSelect": 1,
            "values": ["low", "medium", "high"]
          }
        },
        {
          "name": "detail",
          "type": "text",
          "required": true
        },
        {
          "name": "resolved",
          "type": "bool",
          "required": false
        }
      ],
      "listRule": "@request.auth.id != ''",
      "viewRule": "@request.auth.id != ''",
      "createRule": "@request.auth.id != ''",
      "updateRule": "@request.auth.id != ''",
      "deleteRule": "@request.auth.role = 'wekode_ops'"
    }
  ];

  return Daos(db).importCollections(snapshot, true);
}, (db) => {
  return null;
});
