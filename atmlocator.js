var express = require("express");
var usergrid = require("usergrid");

// Run Locally
var PORT = process.env.VCAP_APP_PORT || 9000;

// Usergrid config - Common for all platforms

//var config = require('./config');
// Set up Express environment and enable it to read and write JavaScript
var allowCrossDomain = function(req, res, next) {
    //res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS");
    res.header(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, Content-Length, X-Requested-With"
    );
    //res.setHeader("Access-Control-Allow-Headers", req.getHeader("Access-Control-Request-Headers"));
    // intercept OPTIONS method
    if ("OPTIONS" == req.method) {
        res.send(200);
    } else {
        next();
    }
};

var app = express();
var allentities = [];
app.use(allowCrossDomain);
//app.use(express.bodyParser());
app.use(express.urlencoded());
app.use(express.json());

var ug = new usergrid.client({
    'orgName': 'sujoyghosal',
    'appName': 'AIBLOCATIONS',
    'URI': 'https://apibaas-trial.apigee.net',
    'clientId': 'b3U6qZdN9MaZEeanNBIuBzeXfQ',
    'clientSecret': 'b3U6-cw_nkkX9VRDgrvKwi0ofs2Sr4E',
    logging: true
});

var loggedIn = null;

// The API starts here

// GET / 

var rootTemplate = {
    'atms': { 'href': './atms' }
};

app.get('/', function(req, resp) {
    //    resp.jsonp(rootTemplate);
    out = "Are you looking for something?";
    out += "  Use /allatms to get all ATMS or addATM with name=value pairs to add an ATM or find ATMs nearby by passing lat long values to vicinityatms";
    resp.jsonp(out);
});

var userid;
app.get('/allatms', function(req, res) {
    if (loggedIn === null) {
        logIn(req, res, getatms);
    } else {
        userid = req.param('userid');
        getatms(req, res);
    } //qs:{ql:"name='bread' or uuid=b3aad0a4-f322-11e2-a9c1-999e12039f87"}
});

var options = {
    type: "atms?limit=100",
    qs: { "ql": "user_id='" + userid + "'" }
};
//Call request to initiate the API call

function getatms(req, res) {

    loggedIn.createCollection({ type: 'atms?limit=100' }, function(err, response) {
        //    loggedIn.createCollection(options, function(err, ngccnotifications) {
        //  loggedIn.request({ options, function(err, ngccnotifications) {      
        if (err) {
            res.jsonp(500, { 'error': JSON.stringify(err) });
            return;
        }
        var allatms = [];
        while (response.hasNextEntity()) {
            var oneatm = response.getNextEntity().get();
            allatms.push(oneatm);
        }
        res.jsonp(allatms);
    });
}

// POST /checkin

app.get('/addATM', function(req, res) {

    var b = req.body;
    var e = {
        'name': req.param('atmname'),
        'atmname': req.param('atmname'),
        'address': req.param('address'),
        'PhotoURL': req.param('photourl'),
        'Telephone': req.param('phone'),
        'location': {
            'latitude': req.param('latitude'),
            'longitude': req.param('longitude')
        }
    };

    if (loggedIn === null) {
        logIn(req, res, function() {
            createATM(e, req, res);
        });
    } else {
        createATM(e, req, res);
    }
});

function createATM(e, req, res) {
    var opts = {
        type: 'atms',
        //        name: 'Dominos' 
    };
    loggedIn.createEntity(opts, function(err, o) {
        if (err) {
            res.jsonp(500, err);
            return;
        }
        o.set(e);
        o.save(function(err) {
            if (err) {
                res.jsonp(500, err);
                return;
            }

            res.send(201);
        });
    });
}

var geo_query = '';
app.get('/vicinityatms', function(req, res) {
    var criteria = 'location within ' + req.param('radius') + ' of ' + req.param('latitude') + ', ' + req.param('longitude');
    var count = 100;
    if (req.param('nearest') == '') {
        count = 100;
    } else {
        count = req.param('nearest');
    }
    console.log("######Received vicinit API request with criteria: " + criteria);
    geo_query = {
        type: "atms?limit=" + count, //Required - the type of collection to be retrieved
        //		qs:criteria
        //        qs: {"ql": "location within 500 of 51.5183638, -0.1712939000000233"}
        qs: { "ql": criteria }
    };

    if (loggedIn === null) {
        logIn(req, res, getatmsbylocation);
    } else {
        //      userid = req.param('userid');
        //      alert("Calling getcheckinbylocation');
        getatmsbylocation(req, res);
    }

});

function getatmsbylocation(req, res) {

    loggedIn.createCollection(geo_query, function(err, response) {
        if (err) {
            res.jsonp(500, { 'getatmsbylocation error': JSON.stringify(err) });
            return;
        }
        var allatms = [];
        while (response.hasNextEntity()) {
            var arow = response.getNextEntity().get();
            allatms.push(arow);
        }
        res.jsonp(allatms);
    });
}

var login_query = '';

// We need this for UserGrid authentication

function logIn(req, res, next) {
    console.log('Logging in as %s', 'sujoyghosal');
    ug.login('sujoyghosal', 'Kolkata41', function(err) {
        if (err) {
            console.log('Login failed: %s', JSON.stringify(err));
            res.jsonp(500, { error: err });
            return;
        }

        loggedIn = new usergrid.client({
            'orgName': 'sujoyghosal',
            'appName': 'aiblocations',
            'URI': 'https://apibaas-trial.apigee.net',
            'authType': usergrid.AUTH_APP_USER,
            'token': ug.token,
            logging: true
        });

        console.log("Got a token. I wonder when it expires? Let's guess.");

        // Go on to do what we were trying to do in the first place
        setTimeout(expireToken, 6000);

        next(req, res);
    });
}

function expireToken() {
    console.log('Getting rid of user authentication token');
    if (loggedIn !== null) {
        loggedIn.logout();
        loggedIn = null;
    }
}

// Listen for requests until the server is stopped
var PORT = process.env.VCAP_APP_PORT || 9000;
app.listen(PORT);
console.log('Listening on port ' + PORT)