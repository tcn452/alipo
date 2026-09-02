/// <reference path="../pb_data/types.d.ts" />

/**
 * Report Decay Cron Job
 * Runs every 10 minutes to evaluate report freshness.
 * Per spec §5:
 * - available / low TTL: 3 hours
 * - out TTL: 6 hours
 */

cronAdd("report_decay_job", "*/10 * * * *", () => {
  const now = new Date();
  const threeHoursAgo = new Date(now.getTime() - (3 * 60 * 60 * 1000)).toISOString();
  const sixHoursAgo = new Date(now.getTime() - (6 * 60 * 60 * 1000)).toISOString();

  try {
    // 1. Expire 'available' and 'low' reports older than 3 hours
    const staleAvailable = $app.dao().findRecordsByFilter(
      "reports",
      `is_active = true && (status = 'available' || status = 'low') && created < '${threeHoursAgo}'`
    );

    for (let r of staleAvailable) {
      r.set("is_active", false);
      $app.dao().saveRecord(r);
    }

    // 2. Expire 'out' reports older than 6 hours
    const staleOut = $app.dao().findRecordsByFilter(
      "reports",
      `is_active = true && status = 'out' && created < '${sixHoursAgo}'`
    );

    for (let r of staleOut) {
      r.set("is_active", false);
      $app.dao().saveRecord(r);
    }

    console.log(`[Decay Cron] Successfully processed: ${staleAvailable.length + staleOut.length} stale reports.`);
  } catch (err) {
    console.log("[Decay Cron] Error running decay job:", err);
  }
});

// Rate limiting hook before creating reports (§5 / §11)
onRecordBeforeCreateRequest((e) => {
  const phone = e.record.getString("reporter_phone");
  const stationId = e.record.getString("station");

  if (!phone || phone.trim() === "") {
    return; // Allow anonymous web submissions without phone rate-limit block
  }

  const tenMinutesAgo = new Date(Date.now() - (10 * 60 * 1000)).toISOString();

  try {
    const recent = $app.dao().findRecordsByFilter(
      "reports",
      `reporter_phone = '${phone}' && station = '${stationId}' && created > '${tenMinutesAgo}'`,
      "-created",
      1
    );

    if (recent.length > 0) {
      throw new BadRequestError("You have already submitted a report for this station recently. Please wait 10 minutes.");
    }
  } catch (err) {
    if (err instanceof BadRequestError) throw err;
  }
}, "reports");
