var string = "";

module.exports = {};

module.exports.cookie_send_id = cookie_send_id;

function cookie_send_id(res, id){
    res.locals.cookies.set('session_id', id, {
        maxAge: 60 * 60 * 24 * 1000
    });
}

module.exports.cookie_get_id = cookie_get_id;

function cookie_get_id(res){
    return res.locals.cookies.get("session_id");
}
