import ns from './namespace';


/**
 * As a temporal representation, a track establishes a relation between *time* in seconds and *space* in pixels.
 *
 * A `Track` instance can have multiple `Layer` instances.
 *
 * ### Tracks inside a timeline
 *
 * A temporal representation can be rendered upon multiple DOM elements, the tracks (eg multiple `<li>` for a DAW like representation) that belong to the same timeline using the `add` method. These tracks are like windows on the overall and basically unending timeline.
 *
 * ### A timeline with 3 tracks:
 *
 * ```
 * +-----------------+-------------------------------+-- - -  -  -   -
 * |track 1          |xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx|
 * +-----------------+-------------------------------+-- - -  -  -   -
 * |track 2          |xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx|
 * +-----------------+-------------------------------+-- - -  -  -   -
 * |track 3          |xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx|
 * +-------------------------------------------------+-- - -  -  -   -
 *
 * +----------------->
 * timeline.timeContext.timeToPixel(timeline.timeContext.offset)
 *
 *                   <------------------------------->
 *                   timeline's tracks defaults to 1000px
 *                   with a default pixelsPerSecond of 100px/s.
 *                   and a default `stretchRatio = 1`
 *                   track1 shows 10 seconds of the timeline
 * ```
 *
 * ### Layers inside a track
 *
 * Within a track, a `Layer` keeps up-to-date and renders the data. The track's `add` method adds a `Layer` instance to a track.
 *
 * ### The track renderingContext
 *
 * When one modify the timeline renderingContext:
 *
 * - timeline.renderingContext.offset (in seconds) modify the containers track x position
 * - timeline.renderingContext.stretchRatio modify timeline's zoom
 * Each time you set new value of offset or stretchRatio, you need to do `timeline.update()` to update the values.
 *
 * ### Track SVG structure
 *
 * ```html
 * <svg class="track" xmlns:xhtml="http://www.w3.org/1999/xhtml" height="100" shape-rendering="optimizeSpeed">
 *   <defs></defs> Unused for the moment, could be used to define custom shapes for use with layers
 *   <rect style="fill-opacity:0" width="100%" height="100%"></rect>
 *   <g class="offset">
 *     <g class="layout"></g> The layers are inserted here
 *   </g>
 *   <g class="interactions"></g> Placeholder to visualize interactions (eg. brush)
 * </svg>
 * ```
 */
const round = Math.round;

export default class Track {
  /**
   * Create the track of the given `height` in the given `$el`
   * @param {DOMElement} $el
   * @param {Number} [height = 100]
   */
  constructor($el, height = 100) {
    this.$el = $el;
    this.layers = [];
    this._height = height;

    // are set when added to the timeline
    this.renderingContext = null;

    this._createContainer();
  }

  /**
   * @type Number
   * @default 100
   */
  get height() {
    return this._height;
  }

  set height(value) {
    this._height = value;
    // @NOTE: propagate to layers, keeping ratio ? could be handy for vertical resize
  }

  /**
   * This method is called when the track is added to the timeline.
   * The track cannot be updated without being added to a timeline.
   * @param {TimelineTimeContext} renderingContext
   * @semi-private
   */
  configure(renderingContext) {
    this.renderingContext = renderingContext;
  }

  /**
   * Destroy a track
   * The layers from this track can still be reused elsewhere
   */
  destroy() {
    // Detach everything from the DOM
    this.$el.removeChild(this.$svg);
    this.layers.forEach((layer) => this.$layout.removeChild(layer.$el));
    // clean references
    this.$el = null;
    this.renderingContext = null;
    this.layers.length = 0;
  }

  /**
   * Creates the container for the track
   */
  _createContainer() {
    const $svg = document.createElementNS(ns, 'svg');
    $svg.setAttributeNS(null, 'shape-rendering', 'optimizeSpeed');
    $svg.setAttributeNS(null, 'height', this.height);
    $svg.setAttribute('xmlns:xhtml', 'http://www.w3.org/1999/xhtml');
    $svg.classList.add('track');

    const $background = document.createElementNS(ns, 'rect');
    $background.setAttributeNS(null, 'height', '100%');
    $background.setAttributeNS(null, 'width', '100%');
    $background.style.fillOpacity = 0;
    // $background.style.pointerEvents = 'none';

    const $defs = document.createElementNS(ns, 'defs');

    const $offsetGroup = document.createElementNS(ns, 'g');
    $offsetGroup.classList.add('offset');

    const $layoutGroup = document.createElementNS(ns, 'g');
    $layoutGroup.classList.add('layout');

    const $interactionsGroup = document.createElementNS(ns, 'g');
    $interactionsGroup.classList.add('interactions');

    $svg.appendChild($defs);
    $svg.appendChild($background);
    $offsetGroup.appendChild($layoutGroup);
    $svg.appendChild($offsetGroup);
    $svg.appendChild($interactionsGroup);

    this.$el.appendChild($svg);
    // removes additionnal height added who knows why...
    this.$el.style.fontSize = 0;
    // fixes one of the (many ?) weird canvas rendering bugs in Chrome
    this.$el.style.transform = 'translateZ(0)';

    this.$layout = $layoutGroup;
    this.$offset = $offsetGroup;
    this.$interactions = $interactionsGroup;
    this.$svg = $svg;
    this.$background = $background;
  }

  /**
   * Adds a layer to the track
   */
  add(layer) {
    this.layers.push(layer);
    // Create a default renderingContext for the layer if missing
    this.$layout.appendChild(layer.$el);
  }

  /**
   * Removes a layer
   */
  remove(layer) {
    this.layers.splice(this.layers.indexOf(layer), 1);
    // Removes layer from its container
    this.$layout.removeChild(layer.$el);
  }

  /**
   *  Defines if a given element belongs to the track
   *  @param {DOMElement} $el
   *  @return {bool}
   */
  hasElement($el) {
    do {
      if ($el === this.$el) {
        return true;
      }

      $el = $el.parentNode;
    } while ($el !== null);

    return false;
  }

  /**
   * Draw tracks, and the layers in cascade
   */
  render() {
    for (let layer of this) { layer.render(); }
  }

  /**
   * Update the layers
   */
  update(layers = null) {
    this.updateContainer();
    this.updateLayers(layers);
  }

  updateContainer() {
    const $svg = this.$svg;
    const $offset = this.$offset;
    // Should be in some update layout
    const renderingContext = this.renderingContext;
    const height = this.height;
    const width = round(renderingContext.visibleWidth);
    const offsetX = round(renderingContext.timeToPixel(renderingContext.offset));
    const translate = `translate(${offsetX}, 0)`;

    $svg.setAttributeNS(null, 'height', height);
    $svg.setAttributeNS(null, 'width', width);
    $svg.setAttributeNS(null, 'viewbox', `0 0 ${width} ${height}`);

    $offset.setAttributeNS(null, 'transform', translate);
  }

  updateLayers(layers = null) {
    layers = (layers === null) ? this.layers : layers;

    layers.forEach((layer) => {
      if (this.layers.indexOf(layer) === -1) { return; }
      layer.update();
    });
  }

  *[Symbol.iterator]() {
    yield* this.layers[Symbol.iterator]();
  }
}
