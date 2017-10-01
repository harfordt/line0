var express = require('express');
var router = express.Router();


router.get('/manageclass', function(req, res, next) {
  res.render('manageclass', { title: 'Manage a class' });
});
module.exports = router;
