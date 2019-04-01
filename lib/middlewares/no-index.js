/* *************************************************************
 *
 * This middleware takes an array of siteids and makes sure that those site ids are have both
 * a robots.txt and a nofollow, noindex header
 *
 */

function analyze (noIndexList) {
    return async function (ctx, next) {
        if ( ctx.locals && ctx.locals.siteId && noIndexList.includes(ctx.locals.siteId) ) {
            if (ctx.path === '/robots.txt') {
                ctx.body = 'User-agent: *\nDisallow: /';
                return;
            } else {
                ctx.set('X-Robots-Tag', 'noindex, nofollow');
            }
        } else {
            if (ctx.path === '/robots.txt') {
                ctx.body = '';
                return;
            }
        }
        await next();
    };
}

module.exports = analyze;
