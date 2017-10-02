var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var expressValidator = require('express-validator');
var mustacheExpress = require('mustache-express'); // templating
var session = require('express-session');
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


/*************************/
/* All the session stuff */
/*************************/

app.use(session({
    key: 'user_sid',
    secret: 'banana',
    resave: false,
    saveUninitialized: false,
    cookie: {
        expires: 600000
    }
}));
app.use(function (req, res, next) {
    if (!req.session.firstname) {
        req.session.firstname = "";
    }
    next();
});
// This middleware will check if user's cookie is still saved in browser and user is not set, then automatically log the user out.
// This usually happens when you stop your express server after login, your cookie still remains saved in the browser.
//app.use((req, res, next) => {
//    if (req.cookies.user_sid && !req.session.username) {
//        res.clearCookie('user_sid');        
//    }
//    next();
//});


// middleware function to check for logged-in users
var sessionChecker = (req, res, next) => {
    if (req.session.username && req.cookies.user_sid) {
        res.redirect('/manageclass');
    } else {
        next();
    }
};

/*****************/
/* DB connection */
/*****************/
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

// route for Home-Page
app.get('/', sessionChecker, (req, res) => {
    if (req.session.username && req.cookies.user_sid) {
        res.redirect('/manageclass');
    }
    res.render('index');
});

//app.use('/index', index);
app.use('/users', users);
// app.use('/register', register);





app.use('/login', sessionChecker, function (req, res) {
    /*
        issue: asyncronous or whatever, stuff happened in funny order but I think I sussed it now
        
        1) if the user is logged in, redirect them to the manaclass page
        2) use form data to verify the user
        2b) if user doesn't exist, more than 1 same email, or password incorrrect, redirect
        3) store user details in session (probably not ideal but easy for now?)
        4) redirect to manageclass
    */
    if (req.session.username && req.cookies.user_sid) {
        res.redirect('/manageclass');
    }
    var email = req.body.email;
    var password = req.body.password;

    var get_pwd_hash = `SELECT id AS teacherid,firstname,lastname,username,department,password FROM staff WHERE email='${email}';`;
    //    console.log(get_pwd_hash);
    con.query(get_pwd_hash, function (err, result) {
        if (err) {
            console.error('error connecting: ' + err.stack);
            return;
        }
        if (result.length == 0) {
            //email not in database
            console.log('No+user+exists');
        } else if (result.length > 1) {
            console.log('something wrong, more than one result?')
        } else {
            // Load hash from your password DB.
            bcrypt.compare(password, result[0].password, function (err, bcrypt_result) {
                //res = true if password verifies
                if (bcrypt_result) {
                    //                    console.log(result[0]);
                    req.session.teacherid = result[0].teacherid;
                    req.session.firstname = result[0].firstname;
                    req.session.lastname = result[0].lastname;
                    req.session.username = result[0].username;
                    req.session.department = result[0].department;
                    console.log('PASSWORD CORRECT');
                } else {
                    console.log('PASSWORD INCORRECT');
                    //password incorrect
                }
                res.redirect('/');
            });
        }
    });
});


function updateClasses(req, res, next) {
    var weekdays = new Array("Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday")
    var currentDay = weekdays[new Date().getDay()];
    var currentDate = new Date().toLocaleDateString();
    var currentTime = new Date().toLocaleTimeString('en-GB', {
        hour12: false,
        hour: "numeric",
        minute: "numeric"
    });
    var teacherid = req.session.teacherid;
    var clearOldLessons = `SELECT count(*) FROM class WHERE teacherid='${teacherid}'`;
    // might delete this function - meant to automatically close old classes?
    next();
}


app.use('/manageclass', updateClasses, function (req, res) {

    if (!req.session.username) {
        // no username in the session = no user logged in
        res.redirect('/');
    } else {
        /*
            1) get data from session ✓
            2) check if current class exists
                a) if not, put button to create
                    i) when clicked, create class for this period and reload page which will trigger next step
                b) if it does, build the page with session
                    i) load class data (date, time)
                    ii)load studetns logged in
                    iii)build area (form?) to add students
                
        */
        var teacherid = req.session.teacherid;
        var fname = req.session.firstname;
        var lname = req.session.lastname;
        var uname = req.session.username;
        var dept = req.session.department;


        var class_exists = `SELECT * FROM class WHERE teacherid='${teacherid}';`;
        console.log(class_exists);
        con.query(class_exists, function (err, result) {
            if (err) {
                console.error('error connecting: ' + err.stack);
                return;
            }
            console.log(result);
            if (result.length == 0) {
                res.render('manageclass', {
                    title: 'Manage a class',
                    classexists: false,
                    teacherid: teacherid,
                    firstname: fname,
                    lastname: lname,
                    username: uname,
                    department: dept
                });
            } else {
                res.render('manageclass', {
                    title: 'Manage a class',
                    classexists: true,
                    teacherid: teacherid,
                    firstname: fname,
                    lastname: lname,
                    username: uname,
                    department: dept
                });
            }
        });
    }
});

app.use('/createclass', function (req, res) {
    /*
    
    */
    var teacherid = req.session.teacherid;
    var weekdays = new Array("Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday")
    var currentDay = weekdays[new Date().getDay()];
    var getPeriodId = `SELECT id FROM timetable WHERE starttime<curtime() AND endtime>curtime() AND day='${currentDay}';`;
    console.log(getPeriodId);
    con.query(getPeriodId, function (err, result) {
        if (err) {
            console.error('error connecting: ' + err.stack);
            return;
        }
        if (result.length == 0) {
            var periodId = 31;
        } else {
            var periodId = result[0].id;
        }
        var insert = `INSERT INTO class (id, teacherid, periodid, classname, createdat) VALUES (NULL, '${teacherid}', '${periodId}', 'banana', CURRENT_TIMESTAMP)`;
        console.log(insert);
        con.query(insert, function (err, result) {
            if (err) {
                console.error('error connecting: ' + err.stack);
                return;
            }
            console.log('redirecting');
            res.redirect('/manageclass');
        });
    });
});



app.use('/closeclass', function (req, res) {
    /*
        Duplicates the existing class into an archive table then deletes it
    */
    var teacherid = req.session.teacherid;
    var selectclass = `SELECT * FROM class WHERE teacherid='${teacherid}';`;
    con.query(selectclass, function (err, result) {
        if (err) {
            console.error('error connecting: ' + err.stack);
            return;
        }
        var clas = result[0]; // can't name a variable class :()
        var insertcopy = `INSERT INTO class_closed (id, teacherid, periodid, classname, createdat) VALUES ('${clas.id}', '${teacherid}', '${clas.periodid}', '${clas.classname}', '${clas.createdat}');`;
        console.log(insertcopy);
        con.query(insertcopy, function () {
            if (err) {
                console.error('error connecting: ' + err.stack);
                return;
            }
            var deleteoriginal = `DELETE FROM class WHERE teacherid='${teacherid}';`;
            console.log(deleteoriginal);
            con.query(deleteoriginal, function (err, result) {
                if (err) {
                    console.error('error connecting: ' + err.stack);
                    return;
                }
                console.log('redirecting');
                res.redirect('/manageclass');
            });
        });
    });
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
        //        console.log("hashed: " + hashed_password);
        var insert = `INSERT INTO staff (id, firstname, lastname, username, email, password, department) VALUES (NULL, '${firstname}', '${lastname}', '${username}', '${email}', '${hashed_password}', '${department}');`;
        //        console.log(insert);
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
