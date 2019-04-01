const compress = require('koa-compress');
const bodyParser = require('koa-bodyparser');
const serve = require('koa-static');

const siteId = require('rawb-site-id-middleware');

const noIndex = require('./middlewares/no-index');
const maintenance = require('./middlewares/maintenance');
const conditionalStatics = require('./middlewares/conditional-statics');
const googleVerification = require('./middlewares/google-verification');
const redirects = require('./middlewares/redirects');
const apiCallCheker = require( './middlewares/api-call-checker');
const securityHeaders = require('./middlewares/security-headers');
const analyzeAuthJwt = require('./middlewares/analyze-auth-jwt');

const init = (app, options) => {

    let { logger } = options;

    // If no logger was defined, fallback to console.log
    if (!logger) {
        logger = ['error', 'info', 'debug', 'verbose'].reduce((all, logLevel) => {
            all[logLevel] = console.log; // eslint-disable-line
            return all;
        }, {});
    }

    // This adds an endpoint to turn on or offf a maintenance page
    if (options.maintenance) {
        app.use(maintenance(options.maintenance));
    }

    // Set the correct site id
    if (options.siteId) {
        const { siteIdMap } = options.siteId;
        app.use(siteId(siteIdMap, logger));
    }

    // Handles redirects. Specially important when launching a site
    if (options.redirects) {
        app.use(redirects(options.redirects));
    }

    // Compress all responses but apply a filter if one is added
    app.use(compress({
        filter: function (contentType) { // eslint-disable-line no-unused-vars
            return options.compress && compress.filter ? options.compress.filter(contentType) : true;
        },
        threshold: 2048,
        flush: require('zlib').Z_SYNC_FLUSH
    }));

    // Sets the security headers for all requests
    if (options.securityHeaders) {
        app.use(securityHeaders(options.securityHeaders));
    }

    // Configure some static pages that are only available in certain conditions
    if (options.conditionalStatics) {
        app.use(conditionalStatics(options.conditionalStatics));
    }

    if (options.static) {
        app.use(serve(options.static.path));
    }

    app.use(bodyParser());

    // Catch the google verification request
    if (options.googleVerification) {
        app.use(googleVerification({ code: options.googleVerification.code }));
    }

    // Will look for a JWT-cookie and add user to ctx.state.user if logged in
    if (options.analyzeAuthJwt) {
        app.use(analyzeAuthJwt);
    }

    // Add the feature flags functions as a function of the context
    if (options.featureFlags) {
        app.use(options.featureFlags.middleware);
    }

    // Sets the correct mime type and xhr if the path begins with the string provided
    if (options.apiCallChecker) {
        app.use(apiCallCheker(options.apiCallChecker.path));
    }

    // Check what siteids should be excluded from indexing
    if (options.noIndex) {
        app.use(noIndex(options.noIndex));
    }

    // Catch errors and shpw them either as a xhr response or normal response
    app.use(async (ctx, next) => {

        try {
            await next();
        } catch (err) {

            let errorObject = {
                error: true,
                errorMessage: err.message,
                ...err
            };
            if (ctx.xhr) {
                ctx.type = 'application/json';
                ctx.body = errorObject;
            } else {
                ctx.body = JSON.stringify(errorObject);
            }

            ctx.status = err.status || 500;
            logger.error(ctx.status,  ctx.req.url, err);

            if (err.status !== 404) {
                logger.error(ctx.req.method, ctx.req.url, err.message);
            }

        }

    });

    // Clean upp the last slash, otherwise /foo/bar will not be treated as /foo/bar/
    // but make sure we dont process url with a file extension
    app.use(async (ctx, next) => {

        // Add a last slash if none exists
        if (ctx.req.url !== '/' && !ctx.req.url.match(/\.\w{2,3}/i)) {
            let queryString = '';
            if (Object.keys(ctx.query).length > 0) {
                queryString = '?' + querystring.stringify(ctx.query);
                queryString = queryString.replace(/=$/, '');
            }
            ctx.req.url = ctx.path.replace(/([^/]$)/, '$1/') + queryString;
        }

        await next();

    });

};

exports.init = init;
