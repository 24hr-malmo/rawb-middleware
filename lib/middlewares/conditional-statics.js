
// *********************************************************************************
// * This middleware exposes static files but only if certain conditions are met,  *
// * set by a function. It can be used to expose certain static files for specific *
// * hosts, or countries or paths etc.                                             *
// *********************************************************************************

const send = require('koa-send');

const serve = (options = { list: [] }) => {

    return async function serve (ctx, next) {

        // We dont bother with all methods
        if (ctx.method !== 'HEAD' && ctx.method !== 'GET' && ctx.method !== 'POST') {
            return await next();
        }

        // Get all conditions that are met
        const activeConditionals = options.list.filter(entry => entry.condition(ctx));

        if (activeConditionals.length > 0) {

            // Find the route that matches the url
            const activeRoute = activeConditionals.reduce((result, entry) => {
                let found = entry.statics.find(staticEntry => {
                    return ctx.path.indexOf(staticEntry.route) === 0;
                });
                if (found) {
                    return found;
                }
                return result;
            }, null);

            // If we find a route, serve the files
            if (activeRoute) {

                try {

                    // Here we serve the static files. Fi everything went ok, we return and break the 
                    // koa next chain. 
                    // If we get an error, we get back to koas default chain of middlewares and routes
                    await send(ctx, ctx.path.replace(activeRoute.route, '') || '/', { index: 'index.html', root: activeRoute.filePath });

                    return;

                } catch (err) {
                    if (err.status !== 404) {
                        throw err;
                    }
                }

            }

        }

        return await next();

    };

};

module.exports = serve;
