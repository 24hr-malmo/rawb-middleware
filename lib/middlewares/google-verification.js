
const verify = (options) => async (ctx, next) => {

    if (options.code) {

        const url = ctx.request.path.replace(/\/$/, '');

        if (url === `/${options.code}.html`) {
            ctx.body = `google-site-verification: ${options.code}.html`;
            return;
        }

    }

    await next();

};

module.exports = verify;

