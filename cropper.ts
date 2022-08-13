import _ from 'lodash-es';
import Events from './events';

export class Cropper {
  options;
  gesture = {
    events: {
      start: 'touchstart mousedown',
      move: 'touchmove mousemove',
      stop: 'touchend mouseup',
      zoom: 'mousewheel',
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
  events: Events;
  zoomInFactor: number;
  zoomOutFactor: number;
  imageRatio: number;
  width: number;
  height: number;
  left: number;
  top: number;
  angle: number;
  data: {
    scale: number;
    degrees: number;
    x: number;
    y: number;
    w: any;
    h: any;
    scaleX: number;
  };
  zoomEnabled: boolean;
  api: any = {};

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

    this.events = new Events();

    this.options = _.extend(defaults, options);

    this.originalUrl = this.options.imageUrl;

    this.elements = {
      target: this.options.target,
      body: document.getElementsByTagName('body')[0],
    };

    this.api = {
      zoomIn: this.applyZoomIn.bind(this),
      zoomOut: this.applyZoomOut.bind(this),
    };

    this.buildDOM();
    this.useHardwareAccelerate(this.elements.image);

    this.events.on('ImageReady', this.initialize.bind(this));
  }

  initialize(target: HTMLDivElement) {
    if (target != this.elements.target) {
      return;
    }

    this.setDimensions();

    if (this.imageHasToFit()) {
      this.fitImage();
      this.centerImage();
    }

    this.initializeGesture();

    if (this.options.centerOnInit) {
      this.centerImage();
    }

    if (this.options.imageData) {
      if (this.options.imageData.w && this.options.imageData.h) {
        const prevWidth = this.width;

        this.width = this.options.imageData.w;
        this.height = this.options.imageData.h;

        this.elements.container.style.width = this.width * 100 + '%';
        this.elements.container.style.height = this.height * 100 + '%';

        this.data.scale *= this.width / prevWidth;
      }

      this.left =
        (this.options.imageData.x === 0 ? '0' : this.options.imageData.x) ||
        this.left;
      this.top =
        (this.options.imageData.y === 0 ? '0' : this.options.imageData.y) ||
        this.top;

      this.elements.image.style.transform =
        'scaleX(' + (this.options.imageData.scaleX || 1) + ')';

      this.setOffset(this.left, this.top);
    }

    this.initialized = true;
    this.toggleZoom();
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

  setDimensions() {
    this.zoomInFactor = 1 + parseFloat(this.options.zoomStep);
    this.zoomOutFactor = 1 / this.zoomInFactor;

    this.imageRatio = this.options.height / this.options.width;
    this.width = this.elements.image.naturalWidth / this.options.width;
    this.height = this.elements.image.naturalHeight / this.options.height;
    this.left = 0;
    this.top = 0;
    this.angle = 0;
    this.data = {
      scale: 1,
      degrees: 0,
      x: 0,
      y: 0,
      w: this.options.width,
      h: this.options.height,
      scaleX: 1,
    };

    // Container.
    this.elements.container.style.width = this.width * 100 + '%';
    this.elements.container.style.height = this.height * 100 + '%';
    this.elements.container.style.top = 0;
    this.elements.container.style.left = 0;

    // Wrapper.
    this.elements.wrapper.style.height = 'auto';
    this.elements.wrapper.style.width = '100%';
    this.elements.wrapper.style.paddingTop = this.imageRatio * 100 + '%';

    this.isReady = true;
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

  imageHasToFit() {
    return (
      this.elements.image.naturalWidth < this.options.width ||
      this.elements.image.naturalHeight < this.options.height ||
      this.width < 1 ||
      this.height < 1 ||
      this.options.fitOnInit
    );
  }

  fitImage() {
    var prevWidth, relativeRatio;

    prevWidth = this.width;
    relativeRatio = this.height / this.width;

    if (relativeRatio > 1) {
      this.width = 1;
      this.height = relativeRatio;
    } else {
      this.width = 1 / relativeRatio;
      this.height = 1;
    }

    this.elements.container.style.width = (this.width * 100).toFixed(2) + '%';
    this.elements.container.style.height = (this.height * 100).toFixed(2) + '%';

    this.data.scale *= this.width / prevWidth;
  }

  centerImage() {
    this.setOffset((this.width - 1) / 2, (this.height - 1) / 2);
  }

  centerX() {
    this.setOffset((this.width - 1) / 2, this.top);
  }

  centerY() {
    this.setOffset(this.left, (this.height - 1) / 2);
  }

  flipX() {
    this.data.scaleX = this.data.scaleX * -1;
    this.elements.image.style.transform = 'scaleX(' + this.data.scaleX + ')';
    this.events.triggerHandler('Changed', {
      data: this.info(),
      target: this.elements.target,
    });
  }

  zoomImage(factor: number) {
    if (factor <= 0 || factor == 1) {
      return;
    }

    var originalWidth = this.width;

    if (this.width * factor > 1 && this.height * factor > 1) {
      this.height *= factor;
      this.width *= factor;
      this.elements.container.style.height =
        (this.height * 100).toFixed(2) + '%';
      this.elements.container.style.width = (this.width * 100).toFixed(2) + '%';
      this.data.scale *= factor;
    } else {
      this.fitImage();
      factor = this.width / originalWidth;
    }

    var left = (this.left + 0.5) * factor - 0.5;
    var top = (this.top + 0.5) * factor - 0.5;

    this.setOffset(left, top);
  }

  setOffset(left: number, top: number) {
    if (left || left === 0) {
      if (left < 0) {
        left = 0;
      }
      if (left > this.width - 1) {
        left = this.width - 1;
      }

      this.elements.container.style.left = (-left * 100).toFixed(2) + '%';
      this.left = left;
      this.data.x = Math.round(left * this.options.width);
    }

    /**
     * Offset top.
     */
    if (top || top === 0) {
      if (top < 0) {
        top = 0;
      }
      if (top > this.height - 1) {
        top = this.height - 1;
      }

      this.elements.container.style.top = (-top * 100).toFixed(2) + '%';
      this.top = top;
      this.data.y = Math.round(top * this.options.height);
    }

    this.events.triggerHandler('Changed', {
      data: this.info(),
      target: this.elements.target,
    });
  }

  initializeGesture() {
    const self = this;
    this.addEventListeners(
      this.elements.image,
      this.gesture.events.start,
      function (event) {
        if (self.isReady && self.isValidEvent(event)) {
          event.preventDefault();
          event.stopImmediatePropagation();
          self.pointerPosition = self.getPointerPosition(event);
          bind();
        }
      }
    );

    const bind = function () {
      self.elements.body.classList.add('imgCropper-dragging');
      self.addEventListeners(
        self.elements.body,
        self.gesture.events.move,
        drag
      );
      self.addEventListeners(
        self.elements.body,
        self.gesture.events.stop,
        unbind
      );
    };

    const unbind = function () {
      self.elements.body.classList.remove('imgCropper-dragging');
      self.removeEventListeners(
        self.elements.body,
        self.gesture.events.move,
        drag
      );
      self.removeEventListeners(
        self.elements.body,
        self.gesture.events.stop,
        unbind
      );
    };

    const drag = function (event) {
      self.dragging.call(self, event);
    };
  }

  toggleZoom() {
    const self = this;
    this.zoomEnabled = !this.zoomEnabled;

    if (this.zoomEnabled) {
      self.addEventListeners(this.elements.body, 'mousewheel', this.zoom, this);
    } else {
      self.removeEventListeners(
        this.elements.body,
        'mousewheel',
        this.zoom,
        this
      );
    }
  }

  zoom(event) {
    const self = this;
    event.preventDefault();
    event.stopPropagation();

    if (event.wheelDelta > 0) {
      self.api.zoomIn(0.01);
    } else {
      self.api.zoomOut(0.01);
    }
  }

  applyZoomIn(zoom) {
    this.zoomImage(1 + parseFloat(zoom));
  }

  applyZoomOut(zoom) {
    this.zoomImage(1 / (1 + parseFloat(zoom)));
  }

  dragging(event) {
    var dx, dy, left, p, top;
    event.preventDefault();
    event.stopImmediatePropagation();

    p = this.getPointerPosition(event); // Cursor position after moving.

    dx = p.x - this.pointerPosition.x; // Difference (cursor movement) on X axes.
    dy = p.y - this.pointerPosition.y; // Difference (cursor movement) on Y axes.

    this.pointerPosition = p; // Update cursor position.

    /**
     * dx > 0 if moving right.
     * dx / clientWidth is the percentage of the wrapper's width it moved over X.
     */
    left = dx === 0 ? null : this.left - dx / this.elements.wrapper.clientWidth;

    /**
     * dy > 0 if moving down.
     * dy / clientHeight is the percentage of the wrapper's width it moved over Y.
     */
    top = dy === 0 ? null : this.top - dy / this.elements.wrapper.clientHeight;

    // Move.
    this.setOffset(left, top);
  }

  removeEventListeners(
    element: any,
    eventNames: string,
    func: (event: any) => void,
    context?
  ) {
    eventNames.split(' ').forEach(function (eventName) {
      if (context) {
        element.removeEventListener(eventName, func.bind(context), false);
      } else {
        element.removeEventListener(eventName, func, false);
      }
    });
  }

  getPointerPosition(event: any): any {
    if (this.isTouchEvent(event)) {
      event = event.touches[0];
    }
    return {
      x: event.pageX,
      y: event.pageY,
    };
  }

  isTouchEvent(event: any) {
    return /touch/i.test(event.type);
  }

  isValidEvent(event: any) {
    if (this.isTouchEvent(event)) {
      return event.changedTouches.length === 1;
    }
    return event.which === 1;
  }

  addEventListeners(
    elm: any,
    eventNames: string,
    func: (event: any) => void,
    context?
  ) {
    eventNames.split(' ').forEach(function (eventName) {
      if (context) {
        elm.addEventListener(eventName, func.bind(context), false);
      } else {
        elm.addEventListener(eventName, func, false);
      }
    });
  }

  info() {
    return {
      w: this.width,
      h: this.height,
      x: this.left,
      y: this.top,
      degrees: this.data.degrees,
      scaleX: this.data.scaleX,
    };
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

  useHardwareAccelerate(elm: HTMLElement) {
    elm.style.perspective = '1000px';
    elm.style.backfaceVisibility = 'hidden';
  }
}

export default Cropper;
