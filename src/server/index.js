const express = require("express");
const functions = require("firebase-functions");
const axios = require("axios");
const app = express();
const port = 3000;
require("dotenv").config();

const NODE_ENV = process.env.NODE_ENV;
const REDIRECT_URI = process.env.REDIRECT_URI;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

app.get("/api/login", (req, res) => {
  let baseUrl = "https://access.line.me/oauth2/v2.1/authorize";
  const params = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    state: "hoge",
    scope: "profile openid",
  });
  const url = new URL(`${baseUrl}?${params}`);
  res.redirect(301, url.href);
});

app.get("/api/callback", (req, res) => {
  (async () => {
    try {
      const issueAccessToken = await axios
        .post(
          "https://api.line.me/oauth2/v2.1/token",
          {
            grant_type: "authorization_code",
            code: req.query.code,
            redirect_uri: REDIRECT_URI,
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
          },
          {
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
          },
        )
        .catch((err) => {
          console.log(err);
          throw new Error("Failed to issue access token" + err.message);
        });
      const getUserProfile = await axios
        .get("https://api.line.me/v2/profile", {
          headers: {
            Authorization: "Bearer " + issueAccessToken.data.access_token,
          },
        })
        .catch((err) => {
          throw new Error("Failed to get user profile" + err.message);
        });
      res.writeHead(200, {
        "Content-Type": "application/json",
      });
      console.log(issueAccessToken.data);
      res.write("profile: " + JSON.stringify(getUserProfile.data));
      res.write("\nidToken: " + JSON.stringify(issueAccessToken.data.id_token));
      res.end();
    } catch (err) {
      res.writeHead(500, {
        "Content-Type": "text/plain",
      });
      console.log(err);
      res.write("Error");
      res.end();
    }
  })();
});

app.get("/api/*", (req, res) => {
  res.write("Error");
  res.end();
});

if (NODE_ENV === "development") {
  app.listen(port, () => {
    console.log("development mode");
    console.log(`Example app listening on port ${port}`);
  });
} else {
  exports.app = functions
    .runWith({
      secrets: ["CLIENT_ID", "CLIENT_SECRET"],
    })
    .https.onRequest(app);
}
