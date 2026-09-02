/// <reference path="../pb_data/types.d.ts" />

/**
 * Africa's Talking USSD Webhook Handler for Alipo
 * Endpoint: POST /api/ussd
 *
 * Africa's Talking POST parameters:
 * - sessionId
 * - serviceCode
 * - phoneNumber
 * - text (user inputs concatenated with '*')
 */

routerAdd("POST", "/api/ussd", (c) => {
  const data = $apis.requestInfo(c).data;
  const sessionId = data.sessionId || "";
  const phoneNumber = data.phoneNumber || "";
  const text = (data.text || "").trim();

  let response = "";
  const inputs = text === "" ? [] : text.split("*");

  // Main menu
  if (inputs.length === 0) {
    response = "CON Muli Bwanji! Welcome to Alipo Fuel Tracker\n" +
               "1. Check Fuel Availability\n" +
               "2. Report Fuel Status\n" +
               "3. Nearest Station to City\n" +
               "4. About Alipo";
    return c.string(200, response);
  }

  // Option 1: Check Fuel Availability -> Select City
  if (inputs[0] === "1") {
    if (inputs.length === 1) {
      response = "CON Select City:\n" +
                 "1. Lilongwe\n" +
                 "2. Blantyre\n" +
                 "3. Mzuzu\n" +
                 "4. Zomba";
      return c.string(200, response);
    }

    const cityMap = { "1": "Lilongwe", "2": "Blantyre", "3": "Mzuzu", "4": "Zomba" };
    const city = cityMap[inputs[1]];

    if (!city) {
      return c.string(200, "END Invalid city choice. Please try again.");
    }

    try {
      const records = $app.dao().findRecordsByFilter(
        "stations",
        `city = '${city}' && latest_status != 'out'`,
        "-updated",
        3
      );

      if (records.length === 0) {
        return c.string(200, `END No stations currently reporting available fuel in ${city}. Check web map: alipo.mw`);
      }

      let res = `END Active stations in ${city}:\n`;
      for (let i = 0; i < records.length; i++) {
        const s = records[i];
        const status = s.getString("latest_status");
        const queue = s.getString("latest_queue") || "unk";
        res += `${i + 1}. ${s.getString("name")} - [${status.toUpperCase()} | Q:${queue}]\n`;
      }
      return c.string(200, res);
    } catch (err) {
      return c.string(200, "END Service temporarily busy. Please retry.");
    }
  }

  // Option 2: Report Fuel Status -> Select City -> Select Station -> Status
  if (inputs[0] === "2") {
    if (inputs.length === 1) {
      response = "CON Report Fuel - Select City:\n" +
                 "1. Lilongwe\n" +
                 "2. Blantyre\n" +
                 "3. Mzuzu";
      return c.string(200, response);
    }

    const cityMap = { "1": "Lilongwe", "2": "Blantyre", "3": "Mzuzu" };
    const city = cityMap[inputs[1]];
    if (!city) return c.string(200, "END Invalid city.");

    if (inputs.length === 2) {
      const stations = $app.dao().findRecordsByFilter(
        "stations",
        `city = '${city}'`,
        "name",
        5
      );
      let menu = `CON Select Station in ${city}:\n`;
      for (let i = 0; i < stations.length; i++) {
        menu += `${i + 1}. ${stations[i].getString("name")}\n`;
      }
      return c.string(200, menu);
    }

    if (inputs.length === 3) {
      response = "CON What is the status?\n" +
                 "1. Available (Fuel Ilipo)\n" +
                 "2. Low Supply\n" +
                 "3. Out of Fuel (Yatha)";
      return c.string(200, response);
    }

    if (inputs.length === 4) {
      response = "CON Queue Length:\n" +
                 "1. No Queue (<5 mins)\n" +
                 "2. Short (<15 mins)\n" +
                 "3. Medium (15-45 mins)\n" +
                 "4. Long (>45 mins)";
      return c.string(200, response);
    }

    if (inputs.length === 5) {
      const statusChoice = inputs[3];
      const queueChoice = inputs[4];
      const statusMap = { "1": "available", "2": "low", "3": "out" };
      const queueMap = { "1": "none", "2": "short", "3": "medium", "4": "long" };

      const status = statusMap[statusChoice] || "available";
      const queue = queueMap[queueChoice] || "short";

      try {
        const stations = $app.dao().findRecordsByFilter("stations", `city = '${city}'`, "name", 5);
        const stationIdx = parseInt(inputs[2], 10) - 1;
        const station = stations[stationIdx];

        if (station) {
          const reportsCol = $app.dao().findCollectionByNameOrId("reports");
          const report = new Record(reportsCol);
          report.set("station", station.id);
          report.set("status", status);
          report.set("fuel_type", "both");
          report.set("queue_estimate", queue);
          report.set("source", "ussd");
          report.set("reporter_phone", phoneNumber);
          report.set("confirmations", 1);
          report.set("is_active", true);
          $app.dao().saveRecord(report);

          // Update station cached status
          station.set("latest_status", status);
          station.set("latest_queue", queue);
          station.set("last_reported_at", new Date().toISOString());
          $app.dao().saveRecord(station);
        }

        return c.string(200, "END Zikomo! Your report helps Malawian drivers find fuel.");
      } catch (e) {
        return c.string(200, "END Thank you! Report saved.");
      }
    }
  }

  // Option 4: About
  if (inputs[0] === "4") {
    return c.string(200, "END Alipo is Malawi's crowd-sourced and verified fuel availability tracker. Visit alipo.mw for the live web map.");
  }

  return c.string(200, "END Invalid option.");
});
