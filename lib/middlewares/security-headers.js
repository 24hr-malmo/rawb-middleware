
// This middleware sets which frame sources it allows to run

const init = (options) => {

    const allowedSources = [...options.list];
    
    if (process.env.NODE_ENV == 'development' || options.development === true) {
        allowedSources.push('*.localhost');
    }

    return async function setSecurityHeaders(ctx, next) {

        ctx.set('Content-Security-Policy', `frame-ancestors ${allowedSources.join(' ')}`);
        await next();

    };

};

module.exports = init;

