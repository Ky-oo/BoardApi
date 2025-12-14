var express = require("express");
var router = express.Router();

router.get("/", function (req, res, next) {
  res.json({
    title:
      "Bienvenue sur BoardApi. Merci de lire le README.md pour plus d'informations.",
  });
});

module.exports = router;
