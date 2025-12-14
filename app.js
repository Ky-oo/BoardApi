var createError = require("http-errors");
var express = require("express");
var path = require("path");
var indexRouter = require("./routes/index");
var userRouter = require("./routes/user");
var organisationRouter = require("./routes/organisation");
var activityRouter = require("./routes/activity");
var chatRouter = require("./routes/chat");
var chatMessageRouter = require("./routes/chatmessage");

const dotenv = require("dotenv");
dotenv.config({
  path: process.env.NODE_ENV === "production" ? ".env" : ".env.local",
});

require("./model");

var app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));

app.use("/", indexRouter);
app.use("/users", userRouter);
app.use("/organisations", organisationRouter);
app.use("/activities", activityRouter);
app.use("/chats", chatRouter);
app.use("/chatmessages", chatMessageRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  res.status(err.status || 500).json({ error: res.locals.message });
});

module.exports = app;
