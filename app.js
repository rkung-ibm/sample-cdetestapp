/*jshint node:true*/
// app.js
//BEGIN COPYRIGHT
//*************************************************************************
//
// IBM Confidential
// OCO Source Materials
// 5725-N02
// (C) Copyright IBM Corporation 2015.
// The source code for this program is not published or otherwise
// divested of its trade secrets, irrespective of what has been
// deposited with the U.S. Copyright Office.
//
//*************************************************************************
//END COPYRIGHT

var express = require('express');
var request = require('request'); //.defaults({
//    strictSSL: false
// });

// setup middleware
var app = express();
app.use(app.router);
app.use(express.bodyParser());
app.use(express.errorHandler());
app.use(express.static(__dirname + '/public')); //setup static public directory

var appInfo = JSON.parse(process.env.VCAP_APPLICATION || "{}");
var services = JSON.parse(process.env.VCAP_SERVICES || "{}");
var host = (process.env.VCAP_APP_HOST || 'localhost');
var port = (process.env.VCAP_APP_PORT || 3002);

var insight_host = services["twitterinsights"]
    ? services["twitterinsights"][0].credentials.url
    : "";

var MAX_TWEETS = 20;

// callback - done(err, data)
function insightRequest(path, query, done) {
    request({
        method: "GET",
        url: insight_host + '/api/v1/messages' + path,
        qs: {
            q: query,
            size: MAX_TWEETS
        }
    }, function(err, response, data) {
        if (err) {
            done(err);
        } else {
            if (response.statusCode == 200) {
                try {
                    done(null, JSON.parse(data));
                } catch(e) {
                    done({ 
                        error: { 
                            description: e.message
                        },
                        status_code: response.statusCode
                    });
                }
            } else {
                done({ 
                    error: { 
                        description: data 
                    },
                    status_code: response.statusCode
                });
            }
        }
    });
}

app.get('/api/search', function(req, res) {
    insightRequest("/search", req.param("q"), function(err, data) {
        if (err) {
            res.send(err).status(400);
        } else {
            res.json(data);
        }
    });
});

app.get('/api/count', function(req, res) {
    insightRequest("/count", req.param("q"), function(err, data) {
        if (err) {
            res.send(err).status(400);
        } else {
            res.json({
                query: req.param("q"),
                count: data.search.results
            });
        }
    });
});

app.listen(port, host);
console.log('App started on port ' + port);

