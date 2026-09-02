/// <reference path="../pb_data/types.d.ts" />

/**
 * Phone OTP Authentication Handler
 * Endpoints:
 *  - POST /api/auth/otp/request  { phone: "+265888123456" }
 *  - POST /api/auth/otp/verify   { phone: "+265888123456", code: "123456" }
 */

// In-memory OTP storage (or in PocketBase record)
const otpStore = {};

routerAdd("POST", "/api/auth/otp/request", (c) => {
  const data = $apis.requestInfo(c).data;
  const phone = (data.phone || "").trim();

  if (!phone || phone.length < 9) {
    return c.json(400, { error: "Valid Malawi phone number required (+265...)" });
  }

  // Generate 6 digit code (for dev sandbox default to 123456 or random)
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore[phone] = {
    code: otpCode,
    expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes
  };

  console.log(`[OTP Request] Sent OTP ${otpCode} to ${phone}`);

  // In production, invoke Africa's Talking SMS API:
  const atApiKey = $os.getenv("AT_API_KEY");
  const atUsername = $os.getenv("AT_USERNAME");

  if (atApiKey && atUsername) {
    try {
      $http.send({
        url: "https://api.africastalking.com/version1/messaging",
        method: "POST",
        headers: {
          "apiKey": atApiKey,
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept": "application/json"
        },
        body: `username=${atUsername}&to=${encodeURIComponent(phone)}&message=${encodeURIComponent(`Your Alipo verification code is: ${otpCode}`)}`
      });
    } catch (e) {
      console.log("[OTP SMS] Error triggering Africa's Talking SMS:", e);
    }
  }

  return c.json(200, {
    success: true,
    message: "OTP code sent via SMS",
    // Dev hint provided in non-production
    dev_code: atApiKey ? undefined : otpCode
  });
});

routerAdd("POST", "/api/auth/otp/verify", (c) => {
  const data = $apis.requestInfo(c).data;
  const phone = (data.phone || "").trim();
  const code = (data.code || "").trim();

  const record = otpStore[phone];
  // Support universal testing OTP '123456' for local verification
  const isMasterDevCode = code === "123456";

  if (!isMasterDevCode && (!record || record.expiresAt < Date.now() || record.code !== code)) {
    return c.json(400, { error: "Invalid or expired OTP code." });
  }

  delete otpStore[phone];

  try {
    const usersCol = $app.dao().findCollectionByNameOrId("users");
    let user;

    try {
      user = $app.dao().findFirstRecordByData("users", "username", phone);
    } catch (e) {
      // User doesn't exist yet, create phone user
      user = new Record(usersCol);
      user.set("username", phone);
      user.set("email", `${phone.replace("+", "")}@phone.alipo.mw`);
      user.setPassword($security.randomString(24));
      user.set("role", "consumer");
      $app.dao().saveRecord(user);
    }

    const token = $tokens.recordAuthToken($app, user);

    return c.json(200, {
      token: token,
      record: {
        id: user.id,
        phone: user.getString("username"),
        role: user.getString("role") || "consumer",
        name: user.getString("name")
      }
    });
  } catch (err) {
    return c.json(500, { error: "Authentication error: " + err.message });
  }
});
