var config        = require("../../.env.json");
var CartoDBClient = require("cartodb-client");

module.exports = new CartoDBClient(config.cartodbAccountName, { apiroot: 'https://' + config.cartodbAccountName + '.cartodb.com/api/v2/' });