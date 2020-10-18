"use strict";

var express = require("express");
var mongo = require("mongodb");
var mongoose = require("mongoose");
var bodyParser = require("body-parser");
const dns = require("dns");

var cors = require("cors");

var app = express();

// Basic Configuration
var port = process.env.PORT || 3000;

/** this project needs a db !! **/

// mongoose.connect(process.env.DB_URI);
mongoose.connect(
  process.env.MONGODB_URL,
  { useNewUrlParser: true, useUnifiedTopology: true },
  function(error) {
    // Do things once connected
    if (error) {
      console.log("Database error or database connection error " + error);
    }
    console.log("Database state is " + mongoose.connection.readyState);
  }
);

const urlSchema = mongoose.Schema({
  original_url: { type: String, required: true },
  short_url: Number
});

const urlModel = mongoose.model("urlModel", urlSchema, "urlshortener");

app.use(cors());

/** this project needs to parse POST bodies **/
// you should mount the body-parser here

app.use("/public", express.static(process.cwd() + "/public"));

var urlencodedParser = bodyParser.urlencoded({ extended: false });

app.get("/", function(req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

// your first API endpoint...
app.get("/api/hello", function(req, res) {
  res.json({ greeting: "hello API" });
});

app.post("/api/shorturl/new", urlencodedParser, (req, res) => {
  const url = req.body.url;
  let url_stripped = url.replace(/(^\w+:|^)\/\//, "");
  url_stripped = url_stripped.slice(0, url_stripped.indexOf("/"));
  if (url_stripped === url) res.send({ error: "invalid URL" });
  //check if inserted url exists
  dns.lookup(
    // url.slice(url.lastIndexOf("/") + 1, url.length)
    url_stripped,
    (err, address, family) => {
      if (address) {
        //console.log(address);

        //check database length
        urlModel.find({}, function(err, docs) {
          if (err) {
            console.log(err);
          } else {
            if (docs.length === 0) {
              saveURL(docs.length + 1);
              res.send({
                original_url: url,
                short_url: 1
              });
            } else {
              urlModel.find({ original_url: url }, function(err, found) {
                if (err) {
                  console.log(err);
                } else {
                  if (found.length === 0) {
                    saveURL(docs.length + 1);
                    res.send({ original_url: url, short_url: docs.length + 1 });
                  } else {
                    res.send({
                      original_url: url,
                      short_url: found[0]["short_url"]
                    });
                  }
                }
              });
            }
          }
        });

        //save new url - BEGIN
        const saveURL = length => {
          const newURL = new urlModel({ original_url: url, short_url: length });
          newURL.save(function(err, doc) {
            if (err) return console.error(err);
            console.log("URL " + url + " inserted successfully!");
          });
        };
        //save new url - END

        //res.send({ original_url: url, short_url: 1 });
      } else {
        res.send({ error: "invalid URL" });
      }
    }
  );
});

app.get("/api/shorturl/:shortcut", (req, res) => {
  const shortcut = req.params.shortcut;
  urlModel.find({ short_url: shortcut }, (err, result) => {
    if (err) {
      console.log(err);
    } else {
      if (result.length !== 0) {
        res.redirect(result[0]["original_url"]);
      } else {
        res.json({
          error: "No short URL found for the given input"
        });
      }
    }
  });
});

app.listen(port, function() {
  console.log("Node.js listening ...");
});
