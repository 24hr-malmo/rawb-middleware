const jwt = require('jsonwebtoken');

module.exports = (options) => {

    const { logger, jwtSecret } = options;

    if (!jwtSecret) {
        throw new Error('Prelase provide a jwtSecret in the options');
    }

    return async function(ctx, next) {

        const jwtCookie = ctx.cookies.get('session_jwt');

        if (jwtCookie) {
            let decoded;
            try {

                decoded = jwt.verify(jwtCookie, jwtSecret);

                if (decoded) {

                    const decodedUser = jwt.decode(decoded.accessToken);

                    ctx.state = ctx.state || {};
                    ctx.state.user = {
                        isAuthenticated: true,
                    };

                    if (options.parseUser) {
                        ctx.options.parseUser(ctx.state, decodedUser);
                    }

                } else {

                    ctx.cookies.set('session_jwt');

                    if (ctx.path.indexOf('/api') === 0) {
                        ctx.body = { redirectTo: options.logoutPath || '/logout' };
                    } else {
                        ctx.redirect(options.logoutPath || '/logout');
                    }

                    return;

                }
            } catch (err) {
                ctx.cookies.set('session_jwt');
                logger.info('Error when verifing the JWT', err);
                return await next();
            }
            return await next();
        }

        return await next();

    };

};
