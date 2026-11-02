import { handleGraphFile } from './worker-handler';
const scope = globalThis;
if (typeof globalThis.importScripts === 'function') {
    scope.onmessage = (event) => {
        void handleGraphFile(event.data.file).then((result) => {
            scope.postMessage(result);
        });
    };
}
