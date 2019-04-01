
// This middleware will set the correct mimetype for all api calls
// and make sure we set a flag to know what is an api call and whats a backend 
// render call, so we dont get into an infinite loop

function check (path) {
    return async function (ctx, next) {
        const checkerRe = new RegExp(`^${path}`);
        if (ctx.request.path.match(checkerRe)) {

            ctx.type = 'application/json';

            // We need to set the xhr flag as soon as we know that this is an api call so that it
            // doesnt continue in an infinite loop when running the backend render process
            ctx.xhr = true;

        }
        await next();
    };
}

module.exports = check;
