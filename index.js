const express = require("express");
const https = require("https");
const cors = require("cors");
const PaytmChecksum = require("paytmchecksum");

const app = express();
app.use(cors());
app.use(express.json());

const PAYTM_MID = process.env.PAYTM_MID;
const PAYTM_KEY = process.env.PAYTM_KEY;
const PAYTM_HOST = "securegw-stage.paytm.in";
const WEBSITE = "WEBSTAGING";

app.get("/", (req, res) => {
  res.send("Backend running ✅");
});

app.post("/generateTxnToken", async (req, res) => {

  const amount = req.body.amount;

  if (!amount) {
    return res.json({ success: false, message: "Amount missing" });
  }

  const orderId = "ORDER_" + Date.now();

  const body = {
    requestType: "Payment",
    mid: PAYTM_MID,
    websiteName: WEBSITE,
    orderId: orderId,
    callbackUrl: `https://${PAYTM_HOST}/theia/paytmCallback?ORDER_ID=${orderId}`,
    txnAmount: {
      value: amount.toString(),
      currency: "INR"
    },
    userInfo: {
      custId: "CUST_" + Date.now()
    }
  };

  const checksum = await PaytmChecksum.generateSignature(
    JSON.stringify(body),
    PAYTM_KEY
  );

  const paytmParams = {
    body: body,
    head: { signature: checksum }
  };

  const postData = JSON.stringify(paytmParams);

  const options = {
    hostname: PAYTM_HOST,
    port: 443,
    path: `/theia/api/v1/initiateTransaction?mid=${PAYTM_MID}&orderId=${orderId}`,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": postData.length
    }
  };

  const request = https.request(options, (response) => {
    let data = "";

    response.on("data", (chunk) => {
      data += chunk;
    });

    response.on("end", () => {
      const result = JSON.parse(data);

      res.json({
        success: true,
        orderId: orderId,
        txnToken: result.body.txnToken
      });
    });
  });

  request.write(postData);
  request.end();
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});