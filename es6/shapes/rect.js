const BaseShape = require('./base-shape');

class Rect extends BaseShape {
  getClassName() { return 'rect'; }

  _getAccessorList() {
    return { x: 0, y: 0, width: 0, height: 0, color: '#000000', opacity: 1 };
  }

  _getDefaults() {
    return {
      handlerWidth: 2,
      handlerOpacity: 0.8,
      opacity: 0.6
    }
  }

  render(context) {
    if (this.shape) { return this.shape; }

    this.shape = document.createElementNS(this.ns, 'g');

    this.rect = document.createElementNS(this.ns, 'rect');
    this.rect.style.opacity = this.params.opacity;
    this.rect.setAttributeNS(null, 'shape-rendering', 'crispEdges');

    this.leftHandler = document.createElementNS(this.ns, 'rect');
    this.leftHandler.classList.add('left', 'handler');
    this.leftHandler.setAttributeNS(null, 'width', this.params.handlerWidth);
    this.leftHandler.setAttributeNS(null, 'shape-rendering', 'crispEdges');
    this.leftHandler.style.opacity = this.params.handlerOpacity;
    this.leftHandler.style.cursor = 'ew-resize';

    this.rightHandler = document.createElementNS(this.ns, 'rect');
    this.rightHandler.classList.add('right', 'handler');
    this.rightHandler.setAttributeNS(null, 'width', this.params.handlerWidth);
    this.rightHandler.setAttributeNS(null, 'shape-rendering', 'crispEdges');
    this.rightHandler.style.opacity = this.params.handlerOpacity;
    this.rightHandler.style.cursor = 'ew-resize';

    this.shape.appendChild(this.rect);
    this.shape.appendChild(this.leftHandler);
    this.shape.appendChild(this.rightHandler);

    return this.shape;
  }

  update(context, group, datum, index) {
    const x = context.xScale(this.x(datum));
    const y = context.yScale(this.y(datum));
    const width = context.xScale(this.width(datum));
    const height = context.yScale(this.height(datum));
    const color = this.color(datum);

    group.setAttributeNS(null, 'transform', `translate(${x}, ${y})`);

    this.rect.setAttributeNS(null, 'width', Math.max(width, 0));
    this.rect.setAttributeNS(null, 'height', height);
    this.rect.style.fill = color;

    // display handlers
    this.leftHandler.setAttributeNS(null, 'height', height);
    this.leftHandler.setAttributeNS(null, 'transform', 'translate(0, 0)');
    this.leftHandler.style.fill = color;

    const rightHandlerTranslate = `translate(${width - this.params.handlerWidth}, 0)`;
    this.rightHandler.setAttributeNS(null, 'height', height);
    this.rightHandler.setAttributeNS(null, 'transform', rightHandlerTranslate);
    this.rightHandler.style.fill = color;
  }

  inArea(context, datum, x1, y1, x2, y2) {
    const shapeX1 = context.xScale(this.x(datum));
    const shapeX2 = context.xScale(this.x(datum) + this.width(datum));
    const shapeY1 = context.yScale(this.y(datum));
    const shapeY2 = context.yScale(this.y(datum) + this.height(datum));

    // http://jsfiddle.net/uthyZ/ - check overlaping area
    const xOverlap = Math.max(0, Math.min(x2, shapeX2) - Math.max(x1, shapeX1));
    const yOverlap = Math.max(0, Math.min(y2, shapeY2) - Math.max(y1, shapeY1));
    const area = xOverlap * yOverlap;

    return area > 0;
  }
}

module.exports = Rect;