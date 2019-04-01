const fs = require('fs');

const loadRedirects = (file, nameOfOriginalUrlColumn, nameOfNewUrlColumn) => {

    let content = fs.readFileSync(file, 'utf8');
    
    const list = content.split('\n');
    const top = list.shift();

    const indexOfOriginal = top.split(';').reduce((result, item, index) => {
        if (item === nameOfOriginalUrlColumn) {
            result = index;
        }
        return result;
    }, -1);

    const indexOfNew = top.split(';').reduce((result, item, index) => {
        if (item === nameOfNewUrlColumn) {
            result = index;
        }
        return result;
    }, -1);

    const result = list.reduce((result, item) => {
        let parts = item.split(';');
        let original = parts[indexOfOriginal].replace(/http(s|):\/\/(.*?)\//i, '/').replace(/\/$/, '');
        let destination = parts[indexOfNew] ? parts[indexOfNew].replace(/http(s|):\/\/(.*?)\//i, '/') : false;

        if (destination) {
            destination = destination.replace(/[\r\n]/g, '');
        }

        // We replace the last slash here, since its only if its real empty that we should treat this value
        if (original && destination && original !== destination.replace(/\/$/g, '')) {
            result[original] = destination;
        }

        return result;
    }, {});

    return result;

};

const redirect = (options) => {

    const { logger } = options;

    let listOfRedirects = {};
    let listOfRedirectRexExp = {};

    Object.keys(options).forEach(siteId => {

        let siteOptions = options[siteId];
        let list = siteOptions.list; 

        listOfRedirects[siteId] = {};
        listOfRedirectRexExp[siteId] = [];

        list.forEach(item => {
            if (typeof item === 'string') {
                listOfRedirects[siteId] = { ...listOfRedirects[siteId], ...loadRedirects(item, siteOptions.original, siteOptions.destination) };
            } else {
                listOfRedirectRexExp[siteId].push(item);
            }
        });

    });

    let total = Object.keys(options).reduce((total, siteId) => {
        return total + Object.keys(listOfRedirects[siteId]).length;
    }, 0);

    logger.info('Total amount off redirect urls: ', total);

    return async (ctx, next) => {

        const url = ctx.request.path.replace(/\/$/, '');


        // Dont redirect urls with extensions
        if (url.match(/\.\w{3,3}$/) && !url.includes('.xml')) {
            return await next();
        }

        let siteRedirects = listOfRedirects[ctx.locals.siteId];
        if (!siteRedirects) {
            return await next();
        }

        let redirect = siteRedirects[url];

        if (!redirect) {

            let siteRedirectsRexExp = listOfRedirectRexExp[ctx.locals.siteId];

            redirect = siteRedirectsRexExp.reduce((result, item) => {

                if (typeof item.source === 'string') {

                    // Here we check without remoeving the last slash, since we want sometimes
                    // the destination to have a slash at the end
                    if (item.source === ctx.request.path) {
                        return item.destination;
                    }

                }

                if (typeof item.source === 'object') {
                    if (item.source.exec(url)) {
                        return item.destination;
                    }
                }

                return result;

            }, null);
        }

        if (redirect) {

            if (ctx.request.querystring) {
                redirect += `?${ctx.request.querystring}`;
            }

            // Last check so we dont redirect to the same url
            if (url !== redirect) {
                ctx.status = 301;
                ctx.redirect(redirect);
            }

        } else {
            await next();
        }


    };

};

module.exports = redirect;
