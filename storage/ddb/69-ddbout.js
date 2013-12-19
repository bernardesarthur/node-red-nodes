/**
 * Copyright 2013 Wolfgang Nagele
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

var RED = require(process.env.NODE_RED_HOME+"/red/red");
var util = require("util");
var querystring = require('querystring');
var aws = require("aws-sdk");
var attrWrapper = require("dynamodb-data-types").AttributeValue;

function DDBNode(n) {
    RED.nodes.createNode(this, n);
    var credentials = RED.nodes.getCredentials(n.id);
    if (credentials) {
        this.accessKey = credentials.accessKey;
        this.secretAccessKey = credentials.secretAccessKey;
    }
}
RED.nodes.registerType("awscredentials", DDBNode);

RED.app.get('/awscredentials/:id', function(req, res) {
    var credentials = RED.nodes.getCredentials(req.params.id);
    if (credentials) {
        res.send(JSON.stringify({ accessKey: credentials.accessKey, secretAccessKey: credentials.secretAccessKey }));
    } else {
        res.send(JSON.stringify({}));
    }
});

RED.app.delete('/awscredentials/:id', function(req, res) {
    RED.nodes.deleteCredentials(req.params.id);
    res.send(200);
});

RED.app.post('/awscredentials/:id', function(req, res) {
    var body = "";
    req.on("data", function(chunk) {
        body += chunk;
    });
    req.on("end", function() {
        var newCreds = querystring.parse(body);
        var credentials = RED.nodes.getCredentials(req.params.id) || {};
        if (newCreds.accessKey == null || newCreds.accessKey == "") {
            delete credentials.accessKey;
        } else {
            credentials.accessKey = newCreds.accessKey || credentials.accessKey;
        }
        if (newCreds.secretAccessKey == null || newCreds.secretAccessKey == "") {
            delete credentials.secretAccessKey;
        } else {
            credentials.secretAccessKey = newCreds.secretAccessKey || credentials.secretAccessKey;
        }
        RED.nodes.addCredentials(req.params.id, credentials);
        res.send(200);
    });
});

function DDBOutNode(n) {
    RED.nodes.createNode(this, n);
    this.credentials = RED.nodes.getNode(n.credentials);
    this.region = n.region || "us-east-1";
    this.table = n.table;

    aws.config.update({ accessKeyId: this.credentials.accessKey,
                        secretAccessKey: this.credentials.secretAccessKey,
                        region: this.region });

    var ddb = new aws.DynamoDB();

    this.on("input", function(msg) {
        if (msg != null) {
            ddb.putItem({ "TableName": this.table,
                          "Item": attrWrapper.wrap(msg.payload) },
            function(err, data) {
                err && util.log(err);
            });
        }
    });
}
RED.nodes.registerType("ddb out", DDBOutNode);
