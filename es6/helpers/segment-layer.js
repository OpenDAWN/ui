import Layer from '../core/layer';
import Segment from '../shapes/segment';
import SegmentBehavior from '../behaviors/segment-behavior';


export default class SegmentLayer extends Layer {
  constructor(data, options = {}, accessors = {}) {
    super('collection', data, options);

    options = Object.assign({
      displayHandlers: true,
      opacity: 0.6
    }, options);

    this.configureShape(Segment, accessors, {
      displayHandlers: options.displayHandlers,
      opacity: options.opacity,
    });

    this.setBehavior(new SegmentBehavior());
  }
}
