var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var expressValidator = require('express-validator');
var mustacheExpress = require('mustache-express'); // templating

var mysql = require('mysql');
var bcrypt = require('bcrypt'); // for encrypting passwords


var index = require('./routes/index');
var users = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));

app.engine('mustache', mustacheExpress());
//app.set('view engine', 'jade');
app.set('view engine', 'mustache');

// connect to mysql database
var con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "line0"
});






// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(expressValidator()); // Add this after the bodyParser middlewares!
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', index);
//app.use('/index', index);
app.use('/users', users);
// app.use('/register', register);





app.use('/login', function (req, res) {

    var email = req.body.email;
    var password = req.body.password;
    console.log(email);
    console.log(password);

    var get_pwd_hash = `SELECT password FROM staff WHERE email='${email}';`;
    con.query(get_pwd_hash, function (err, result) {
        if (err) {
            console.error('error connecting: ' + err.stack);
            return;
        }
        console.log(result);
        if (result.length == 0) {
            //email not in database
            console.log('No+user+exists');
        } 
        else if (result.length > 1) {
            console.log('something wrong, more than one result?')
        } 
        else {
            // Load hash from your password DB.
            console.log("ME:" + result[0].password);
            bcrypt.compare(password, result[0].password, function (err, res) {
                //res = true if password verifies
                if (res) {
                    
                    console.log('ME: :PASSWORD CORRECT');
                } 
                else {
                    //password incorrect
                }
            });
        }
    });
    res.redirect('/');
});



app.use('/manageclass', function (req, res) {
    if (!req.session.user) {
        res.redirect('/');
    } else {
        res.render('/manageclass');
    }
});



app.use('/register', function (req, res) {
    res.render('register', {
        title: 'Register'
    });
});



app.use('/newstaff', function (req, res) {
    console.log('oh yeah, have some banana');
    var firstname = req.body.firstname;
    var lastname = req.body.lastname;
    var username = req.body.username;
    var email = req.body.email;
    var department = req.body.department;
    var password = req.body.password;
    var password2 = req.body.passwordagain;
    //var now=new Date().toISOString().slice(0, 19).replace('T', ' ');
    if (password != password2) {
        console.log("passwords don't match");
    }
    console.log(firstname);
    console.log(lastname);
    console.log(username);
    console.log(email);
    console.log(department);
    console.log(password);
    console.log(password2);
    //connect to the database and insert
    var hashed_password = "";
    bcrypt.hash(password, 10, function (err, hash) {
        hashed_password = hash;
        console.log("hashed: " + hashed_password);
        var insert = `INSERT INTO staff (id, firstname, lastname, username, email, password, department) VALUES (NULL, '${firstname}', '${lastname}', '${username}', '${email}', '${hashed_password}', '${department}');`;
        console.log(insert);
        con.query(insert, function (err, result) {
            if (err) {
                console.error('error connecting: ' + err.stack);
                return;
            }
            console.log("1 record inserted");
        });
    });
    res.redirect('/register');
});


// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;
