import _ from 'lodash-es';

export class Cropper {
  options;
  gesture = {
    events: {
      start: 'touchstart mousedown',
      move: 'touchmove mousemove',
      stop: 'touchend mouseup',
    },
  };
  pointerPosition = undefined;
  elements;
  originalUrl = null;
  isReady = false;
  initialized = false;
  originalBase64: any;
  originalArrayBuffer: any;
  crossOrigin: any;
  crossOriginUrl: any;

  constructor(options: any) {
    const defaults = {
      checkCrossOrigin: false,
      apiCallback: undefined,
      cropCallback: undefined,
      onChange: undefined,
      onImageReady: undefined,
      width: 400,
      height: 300,
      imageUrl: undefined,
      target: undefined,
      showControls: true,
      fitOnInit: false,
      centerOnInit: false,
      zoomStep: 0.01,
      actionLabels: {
        rotateLeft: ' < ',
        rotateRight: ' > ',
        zoomIn: ' + ',
        zoomOut: ' - ',
        fit: '(fit)',
        crop: '[crop]',
      },
      imageData: undefined,
    };

    this.options = _.extend(defaults, options);

    this.elements = {
      target: this.options.target,
      body: document.getElementsByTagName('body')[0],
    };

    this.buildDOM();
  }

  getOptions() {
    return this.options;
  }

  buildDOM() {
    let _elements = this.elements;

    _elements.wrapper = document.createElement('div');
    _elements.wrapper.className = 'image-cropper-wrapper';

    _elements.container = document.createElement('div');
    _elements.container.className = 'image-cropper-container';

    _elements.image = document.createElement('img');
    _elements.image.className = 'image-cropper-image';

    _elements.container.appendChild(_elements.image);
    _elements.wrapper.appendChild(_elements.container);
    _elements.target.appendChild(_elements.wrapper);

    this.loadImage();
  }

  loadImage() {
    const _self = this;
    let xhr: XMLHttpRequest;

    if (/^data\:/.test(this.originalUrl)) {
      this.originalBase64 = this.originalUrl;
      return this.setupImageSRC();
    }

    xhr = new XMLHttpRequest();
    xhr.onerror = xhr.onabort = function (response) {
      _self.originalBase64 = _self.originalUrl;
      _self.setupImageSRC();
    };

    xhr.onload = function () {
      _self.originalArrayBuffer = this.response;
      _self.originalBase64 =
        'data:image/jpeg;base64,' + _self.base64ArrayBuffer(this.response);
      _self.setupImageSRC();
    };

    xhr.open('get', this.originalUrl, true);
    xhr.responseType = 'arraybuffer';
    xhr.send();
  }

  setupImageSRC() {
    const _image = this.elements.image;

    if (this.options.checkCrossOrigin && this.isCrossOrigin(this.originalUrl)) {
      this.crossOrigin = _image.crossOrigin;

      if (this.crossOrigin) {
        this.crossOrigin = this.originalUrl;
      } else {
        this.crossOrigin = 'anonymous';
        this.crossOriginUrl = this.addTimestamp(this.originalUrl);
      }
    }

    if (this.crossOrigin) {
      this.elements.image.crossOrigin = this.crossOrigin;
    }

    this.elements.image.src = this.crossOriginUrl || this.originalUrl;

    this.elements.image.onload = function () {
      this.events.triggerHandler('ImageReady', this.elements.target);
    }.bind(this);
  }

  addTimestamp(url: any): any {
    const timestamp = 'timestamp=' + new Date().getTime();
    let sign = '?';

    if (url.indexOf('?') !== -1) {
      sign = '&';
    }

    return url.concat(sign, timestamp);
  }

  isCrossOrigin(url: any) {
    const parts = url.match();

    return Boolean(
      parts &&
        (parts[1] !== location.protocol ||
          parts[2] !== location.hostname ||
          parts[3] !== location.port)
    );
  }

  base64ArrayBuffer(response: any) {
    let base64 = '';
    const encodings =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    const bytes = new Uint8Array(response);
    const byteLength = bytes.byteLength;
    const byteRemainder = byteLength % 3;
    const mainLength = byteLength - byteRemainder;
    let a, b, c, d;
    let chunk;
    // Main loop deals with bytes in chunks of 3
    for (let i = 0; i < mainLength; i = i + 3) {
      // Combine the three bytes into a single integer
      chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
      // Use bitmasks to extract 6-bit segments from the triplet
      a = (chunk & 16515072) >> 18; // 16515072 = (2^6 - 1) << 18
      b = (chunk & 258048) >> 12; // 258048   = (2^6 - 1) << 12
      c = (chunk & 4032) >> 6; // 4032     = (2^6 - 1) << 6
      d = chunk & 63; // 63       = 2^6 - 1
      // Convert the raw binary segments to the appropriate ASCII encoding
      base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d];
    }
    // Deal with the remaining bytes and padding
    if (byteRemainder == 1) {
      chunk = bytes[mainLength];
      a = (chunk & 252) >> 2; // 252 = (2^6 - 1) << 2
      // Set the 4 least significant bits to zero
      b = (chunk & 3) << 4; // 3   = 2^2 - 1
      base64 += encodings[a] + encodings[b] + '==';
    } else if (byteRemainder == 2) {
      chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1];
      a = (chunk & 64512) >> 10; // 64512 = (2^6 - 1) << 10
      b = (chunk & 1008) >> 4; // 1008  = (2^6 - 1) << 4
      // Set the 2 least significant bits to zero
      c = (chunk & 15) << 2; // 15    = 2^4 - 1
      base64 += encodings[a] + encodings[b] + encodings[c] + '=';
    }
    return base64;
  }
}

export default Cropper;
