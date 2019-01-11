require('dotenv').config();
var Server = require('quickbooks-js');  
var qbXMLHandler = require('./qbXMLHandler');
var soapServer = new Server();
quickbooksServer.setQBXMLHandler(qbXMLHandler);
soapServer.run();