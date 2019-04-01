/* *************************************************************
 *
 * This middleware will expose a maintenance page that can be set by calling an url with a specific key.
 * It will be midified to read from a database later.
 *
 */

let state = {
    active: false,
};

// const p2 = require('path');
// const fs = require('fs');


function handle ({path, key, ipList, html}) {

    path = path || '/maintenance-toggle';
    ipList = [...ipList, '127.0.0.1', '::ffff:127.0.0.1'];

    return async function (ctx, next) {

        // html = fs.readFileSync(p2.join(__dirname, '../../static-pages/maintenance/index.html'), 'utf8');

        if ( ctx.path.indexOf(`${path}/${key}`) === 0) {
            if (ipList.includes(ctx.request.ip)) {
                if ( ctx.path.includes('/on')) {
                    state.active = true;
                } else if ( ctx.path.includes('/off')) {
                    state.active = false;
                }
                ctx.body = `Maintenance status ${state.active ? 'on' : 'off'}`;
                return;
            }
        }
        if (!ipList.includes(ctx.request.ip) && state.active) {
            ctx.body = html;
            return;
        }
        if (state.active) {
            ctx.set('X-Maintenance-Status', state.active);
        }
        await next();
    };

}

module.exports = handle;
