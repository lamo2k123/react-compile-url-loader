import { join } from 'path';

import { interpolateName } from 'loader-utils';
import { renderToString } from 'react-dom/server';

import option from './options.json';

const RE_URL_GLOBAL = /url\((:?"|')?(.*)(:?"|')?\)/gi;
const RE_URL = /url\((.*)\)/i;

export default async function(this: any, content: string, map: string, meta: any) {
    const options = this.getOptions(option);
    const callback = this.async();

    if(RE_URL_GLOBAL.test(content)) {
        const matchesGlobal = content.match(RE_URL_GLOBAL);

        if(matchesGlobal) {
            for(const matchGlobal of matchesGlobal) {
                const matchLocal = matchGlobal.match(RE_URL);

                if(!matchLocal || !matchLocal[1]) {
                    continue;
                }

                const url = matchLocal[1].replace(/("|')/g, '');

                if(!options.test.test(url)) {
                    continue;
                }

                const [, query] = url.split('?');
                const props = Object.fromEntries(new URLSearchParams(query));
                const module = await this.importModule(url, options);
                const result = renderToString(module.default(props));

                const filename = interpolateName(this, options.filename as string, { content: result });

                this.emitFile(filename, result);

                content = content.replace(matchLocal[0], `/** webpackIgnore: true **/ url(${join(this._compiler.options.output.publicPath, filename)})`);
            }
        }
    }

    callback(null, content, map, meta);
}
