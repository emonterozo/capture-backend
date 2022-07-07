const express = require("express");
const bodyParser = require("body-parser");
const mysql = require("mysql");
const bcrypt = require("bcrypt");
const CONFIG = require("./config/config");
const jwt = require("jsonwebtoken");
const { verifyToken } = require("./middleware/authorization");

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const port = process.env.PORT || 3000;
const saltRounds = 10;

const secretKey = process.env.SECRET_KEY || CONFIG.SECRET_KEY;

const connection = mysql.createConnection({
  host: process.env.HOST || CONFIG.HOST,
  user: process.env.USER || CONFIG.USER,
  password: process.env.PASSWORD || CONFIG.PASSWORD,
  database: process.env.DATABASE || CONFIG.DATABASE,
  port: process.env.PORT || CONFIG.PORT,
});

app.post("/register", (req, res) => {
  const { first_name, last_name, username, password } = req.body;

  bcrypt.genSalt(saltRounds, function (err, salt) {
    bcrypt.hash(password, salt, function (err, hash) {
      const queryString = `INSERT INTO users (first_name, last_name, username, password) VALUES ("${first_name}", "${last_name}", "${username}", "${hash}")`;
      connection.query(queryString, function (err, result) {
        if (err) {
          res.status(200).json({ data: "", error: "Username already exists" });
        } else {
          const queryString = `SELECT * FROM users WHERE username = "${username}"`;
          connection.query(queryString, function (err, result, fields) {
            const token = jwt.sign({ id: result[0].id }, secretKey, {
              expiresIn: 86400, // expires in 24 hours
            });
            res.status(200).json({
              data: {
                ...result[0],
                token,
              },
              error: "",
            });
          });
        }
      });
    });
  });
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const queryString = `SELECT * FROM users WHERE username = "${username}"`;
  connection.query(queryString, function (err, result, fields) {
    if (err) {
      res.sendStatus(500);
    } else {
      if (result.length > 0) {
        bcrypt.compare(
          password,
          result[0].password,
          function (err, passwordResult) {
            if (passwordResult) {
              const token = jwt.sign({ id: result[0].id }, secretKey, {
                expiresIn: 86400, // expires in 24 hours
              });
              res.status(200).json({
                data: {
                  ...result[0],
                  token,
                },
                error: "",
              });
            } else {
              res.status(200).json({ data: "", error: "Invalid credentials" });
            }
          }
        );
      } else {
        res.status(200).json({ data: "", error: "User does not exist" });
      }
    }
  });
});

app.post("/add_place", verifyToken, (req, res) => {
  const {
    place_name,
    description,
    images,
    latitude,
    longitude,
    address,
    added_by,
  } = req.body;

  const queryString = `INSERT INTO places (place_name, description, images, latitude, longitude, address, added_by) VALUES ("${place_name}", "${description}", "${images
    .split(" ")
    .join("")}", "${latitude}", "${longitude}", "${address}", ${added_by})`;
  connection.query(queryString, function (err) {
    if (err) {
      res.sendStatus(500);
    } else {
      res.sendStatus(200);
    }
  });
});

app.get("/places", verifyToken, (req, res) => {
  let data = [];

  const queryString =
    "SELECT  places.*, users.first_name, users.last_name FROM places INNER JOIN users ON users.id=places.added_by";
  connection.query(queryString, function (err, result, fields) {
    if (err) {
      res.sendStatus(500);
    } else {
      result.map((result) => {
        const images = result.images.slice(1, result.images.length - 1);
        data.push({
          images: images.split(","),
          place_name: result.place_name,
          description: result.description,
          latitude: result.latitude,
          longitude: result.longitude,
          address: result.address,
          timestamp: result.timestamp,
          added_by: `${result.first_name} ${result.last_name}`,
        });
      });
      res.json(data);
    }
  });
});

app.post("/upload", verifyToken, (req, res) => {
  const { data } = req.body;

  const parseData = JSON.parse(data);
  console.log(parseData);

  const sql =
    "INSERT INTO places (place_name,description,images, latitude, longitude, address, timestamp, added_by) VALUES ?";
  const insert_data = parseData.reduce((a, i) => [...a, Object.values(i)], []);

  connection.query(sql, [insert_data], function (err) {
    if (err) {
      res.sendStatus(500);
    } else {
      res.sendStatus(200);
    }
  });
});

app.listen(port, () => {
  console.log(`Capture-backend app listening on port ${port}`);
});
