/* eslint-disable no-restricted-globals */
/* eslint-disable no-undef */

// interval web worker
function intervalWorker() {
  let interval = null;
  let delay;

  self.addEventListener('message', (e) => {
    const { data } = e;
    switch (data.cmd) {
      case 'start':
        delay = parseInt(data.delay, 10);
        interval = setInterval(() => {
          self.postMessage('tick');
        }, delay);
        break;
      case 'stop':
        clearInterval(interval);
        self.close();
        break;
      default: break;
    }
  }, false);
}

const intervalWorkerBlob = new Blob(
  [intervalWorker.toString().replace(/^function .+\{?|\}$/g, '')],
  { type: 'text/javascript' },
);
const intervalWorkerBlobUrl = URL.createObjectURL(intervalWorkerBlob);

export default (f, d = 1000) => {
  const w = new Worker(intervalWorkerBlobUrl);
  w.addEventListener('message', () => {
    f();
  });
  w.postMessage({ cmd: 'start', delay: parseInt(d, 10) });

  return {
    stop: () => {
      w.postMessage({ cmd: 'stop' });
      w.terminate();
    },
  };
};
