var express = require('express');
var router = express.Router();

var lusers=[
             { name: 'Linus Torvalds', so: 'Linux' },
             { name: 'Bill Gates', so: 'Windows XP' }
            ];
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express', lusers: lusers });
});
module.exports = router;