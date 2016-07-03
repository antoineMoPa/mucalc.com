module.exports = {};

/*
  Thank you, Stack Overflow:
  http://stackoverflow.com/questions/8855687/secure-random-token-in-node-jse
*/
module.exports.generate_token = function(num){
    var num = num || 10;
    return require('crypto').randomBytes(num).toString('hex');
}
