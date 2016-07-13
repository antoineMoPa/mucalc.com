var cookie = require('cookie');

module.exports = {};

module.exports.cookie_send_id = cookie_send_id;

function cookie_send_id(res, id){
    res.setHeader(
        'Set-Cookie',
        cookie.serialize('session_id', id, {
            httpOnly: true,
            maxAge: 60 * 60 * 24 // 1 days
        }));
}

module.exports.cookie_get_id = cookie_get_id;

function cookie_get_id(req){
    return cookie.parse(req.headers.cookie || '').session_id;
}
