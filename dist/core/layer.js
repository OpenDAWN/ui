'use strict';

var _get = require('babel-runtime/helpers/get')['default'];

var _inherits = require('babel-runtime/helpers/inherits')['default'];

var _createClass = require('babel-runtime/helpers/create-class')['default'];

var _classCallCheck = require('babel-runtime/helpers/class-call-check')['default'];

var _slicedToArray = require('babel-runtime/helpers/sliced-to-array')['default'];

var _Object$assign = require('babel-runtime/core-js/object/assign')['default'];

var _Map = require('babel-runtime/core-js/map')['default'];

var _getIterator = require('babel-runtime/core-js/get-iterator')['default'];

var _interopRequireDefault = require('babel-runtime/helpers/interop-require-default')['default'];

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _utilsScales = require('../utils/scales');

var _utilsScales2 = _interopRequireDefault(_utilsScales);

var _events = require('events');

var _events2 = _interopRequireDefault(_events);

var _namespace = require('./namespace');

var _namespace2 = _interopRequireDefault(_namespace);

var _shapesSegment = require('../shapes/segment');

var _shapesSegment2 = _interopRequireDefault(_shapesSegment);

var _behaviorsTimeContextBehavior = require('../behaviors/time-context-behavior');

// time context bahevior

var _behaviorsTimeContextBehavior2 = _interopRequireDefault(_behaviorsTimeContextBehavior);

var timeContextBehavior = null;
var timeContextBehaviorCtor = _behaviorsTimeContextBehavior2['default'];

/**
 *  The layer class is the main visualization class
 */

var Layer = (function (_events$EventEmitter) {
  _inherits(Layer, _events$EventEmitter);

  /**
   * Structure of the DOM view of a Layer
   *
   * ```
   * <g class="layer"> Flip y axis, timeContext.start and top position from params are applied on this $elmt
   *   <svg class="bounding-box"> timeContext.duration is applied on this $elmt
   *    <g class="layer-interactions"> Contains the timeContext edition elements (a segment) </g>
   *    <g class="offset items"> The shapes are inserted here, and we apply timeContext.offset on this $elmt </g>
   *   </svg>
   * </g>
   * ```
   */

  function Layer(dataType, data) {
    var options = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

    _classCallCheck(this, Layer);

    _get(Object.getPrototypeOf(Layer.prototype), 'constructor', this).call(this);
    this.dataType = dataType; // 'entity' || 'collection';
    this.data = data;

    var defaults = {
      height: 100,
      top: 0,
      id: '',
      yDomain: [0, 1],
      opacity: 1,
      contextHandlerWidth: 2,
      className: null,
      // when false the layer is not returned by `BaseState.getHitLayers`
      hittable: true,
      overflow: 'hidden'
    };

    this.params = _Object$assign({}, defaults, options);
    this.timeContext = null;

    // container elements
    this.$el = null; // offset group of the parent context
    this.$boundingBox = null;
    this.$offset = null;
    this.$interactions = null;

    this._shapeConfiguration = null; // { ctor, accessors, options }
    this._commonShapeConfiguration = null; // { ctor, accessors, options }
    // map to associate datums, $items, and shapes
    this._$itemShapeMap = new _Map(); // item group <DOMElement> => shape
    this._$itemDataMap = new _Map();
    this._$itemCommonShapeMap = new _Map(); // one entry max in this map

    this._isContextEditable = false;
    this._behavior = null;

    this._valueToPixel = _utilsScales2['default'].linear().domain(this.params.yDomain).range([0, this.params.height]);

    this.contextBehavior = '';

    // initialize timeContext layout
    this._renderContainer();

    // creates the timeContextBehavior for all layer, lazy instanciation
    if (timeContextBehavior === null) {
      timeContextBehavior = new timeContextBehaviorCtor();
    }
  }

  _createClass(Layer, [{
    key: 'destroy',
    value: function destroy() {
      this.timeContext = null;
      this.data = null;
      this.params = null;
      this._behavior = null;

      this._$itemShapeMap.clear();
      this._$itemDataMap.clear();
      this._$itemCommonShapeMap.clear();

      this.removeAllListeners();
    }

    /**
     *  allows to override default the TimeContextBehavior
     */
  }, {
    key: 'setTimeContext',

    /**
     * @mandatory define the context in which the layer is drawn
     * @param context {TimeContext} the timeContext in which the layer is displayed
     */
    value: function setTimeContext(timeContext) {
      this.timeContext = timeContext;
      // create a mixin to pass to the shapes
      this._renderingContext = {};
      this._updateRenderingContext();
    }

    // --------------------------------------
    // Data
    // --------------------------------------

  }, {
    key: '_renderContainer',

    // Initialization

    /**
     *  render the DOM in memory on layer creation to be able to use it before
     *  the layer is actually inserted in the DOM
     */
    value: function _renderContainer() {
      var _this = this;

      // wrapper group for `start, top and context flip matrix
      this.$el = document.createElementNS(_namespace2['default'], 'g');
      this.$el.classList.add('layer');
      if (this.params.className !== null) {
        this.$el.classList.add(this.params.className);
      }
      // clip the context with a `svg` element
      this.$boundingBox = document.createElementNS(_namespace2['default'], 'svg');
      this.$boundingBox.classList.add('bounding-box');
      this.$boundingBox.style.overflow = this.params.overflow;
      // group to apply offset
      this.$offset = document.createElementNS(_namespace2['default'], 'g');
      this.$offset.classList.add('offset', 'items');
      // layer background
      this.$background = document.createElementNS(_namespace2['default'], 'rect');
      this.$background.setAttributeNS(null, 'height', '100%');
      this.$background.setAttributeNS(null, 'width', '100%');
      this.$background.classList.add('background');
      this.$background.style.fillOpacity = 0;
      this.$background.style.pointerEvents = 'none';
      // context interactions
      this.$interactions = document.createElementNS(_namespace2['default'], 'g');
      this.$interactions.classList.add('interactions');
      this.$interactions.style.display = 'none';
      // @NOTE: works but king of ugly... should be cleaned
      this.contextShape = new _shapesSegment2['default']();
      this.contextShape.install({
        opacity: function opacity() {
          return 0.1;
        },
        color: function color() {
          return '#787878';
        },
        width: function width() {
          return _this.timeContext.duration;
        },
        height: function height() {
          return _this._renderingContext.valueToPixel.domain()[1];
        },
        y: function y() {
          return _this._renderingContext.valueToPixel.domain()[0];
        }
      });

      this.$interactions.appendChild(this.contextShape.render());
      // create the DOM tree
      this.$el.appendChild(this.$boundingBox);
      this.$boundingBox.appendChild(this.$offset);
      this.$offset.appendChild(this.$background);
      this.$boundingBox.appendChild(this.$interactions);
    }

    // --------------------------------------
    // Component Configuration
    // --------------------------------------

    /**
     *  Register the shape and its accessors to use in order to render
     *  the entity or collection
     *  @param ctor <Function:BaseShape> the constructor of the shape to be used
     *  @param accessors <Object> accessors to use in order to map the data structure
     */
  }, {
    key: 'configureShape',
    value: function configureShape(ctor) {
      var accessors = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];
      var options = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

      this._shapeConfiguration = { ctor: ctor, accessors: accessors, options: options };
    }

    /**
     *  Register the shape to use with the entire collection
     *  example: the line in a beakpoint function
     *  @param ctor {BaseShape} the constructor of the shape to use to render data
     *  @param accessors {Object} accessors to use in order to map the data structure
     */
  }, {
    key: 'configureCommonShape',
    value: function configureCommonShape(ctor) {
      var accessors = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];
      var options = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

      this._commonShapeConfiguration = { ctor: ctor, accessors: accessors, options: options };
    }

    /**
     *  Register the behavior to use when interacting with the shape
     *  @param behavior {BaseBehavior}
     */
  }, {
    key: 'setBehavior',
    value: function setBehavior(behavior) {
      behavior.initialize(this);
      this._behavior = behavior;
    }

    /**
     *  update the values in `_renderingContext`
     *  is particulary needed when updating `stretchRatio` as the pointer
     *  to the `timeToPixel` scale may change
     */
  }, {
    key: '_updateRenderingContext',
    value: function _updateRenderingContext() {
      this._renderingContext.timeToPixel = this.timeContext.timeToPixel;
      this._renderingContext.valueToPixel = this._valueToPixel;

      this._renderingContext.height = this.params.height;
      this._renderingContext.width = this.timeContext.timeToPixel(this.timeContext.duration);
      // for foreign object issue in chrome
      this._renderingContext.offsetX = this.timeContext.timeToPixel(this.timeContext.offset);
      this._renderingContext.startX = this.timeContext.parent.timeToPixel(this.timeContext.start);

      // @TODO replace with `minX` and `maxX` representing the visible pixels in which
      // the shapes should be rendered, could allow to not update the DOM of shapes
      // who are not in this area.
      // in between: expose some timeline attributes -> improves Waveform perfs
      this._renderingContext.trackOffsetX = this.timeContext.parent.timeToPixel(this.timeContext.parent.offset);
      this._renderingContext.visibleWidth = this.timeContext.parent.visibleWidth;
    }

    // --------------------------------------
    // Behavior Accessors
    // --------------------------------------

  }, {
    key: 'select',
    value: function select() {
      for (var _len = arguments.length, $items = Array(_len), _key = 0; _key < _len; _key++) {
        $items[_key] = arguments[_key];
      }

      if (!this._behavior) {
        return;
      }
      if (!$items.length) {
        $items = this._$itemDataMap.keys();
      }
      if (Array.isArray($items[0])) {
        $items = $items[0];
      }

      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = _getIterator($items), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var $item = _step.value;

          var datum = this._$itemDataMap.get($item);
          this._behavior.select($item, datum);
          this._toFront($item);
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator['return']) {
            _iterator['return']();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }
    }
  }, {
    key: 'unselect',
    value: function unselect() {
      for (var _len2 = arguments.length, $items = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
        $items[_key2] = arguments[_key2];
      }

      if (!this._behavior) {
        return;
      }
      if (!$items.length) {
        $items = this._$itemDataMap.keys();
      }
      if (Array.isArray($items[0])) {
        $items = $items[0];
      }

      var _iteratorNormalCompletion2 = true;
      var _didIteratorError2 = false;
      var _iteratorError2 = undefined;

      try {
        for (var _iterator2 = _getIterator($items), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
          var $item = _step2.value;

          var datum = this._$itemDataMap.get($item);
          this._behavior.unselect($item, datum);
        }
      } catch (err) {
        _didIteratorError2 = true;
        _iteratorError2 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion2 && _iterator2['return']) {
            _iterator2['return']();
          }
        } finally {
          if (_didIteratorError2) {
            throw _iteratorError2;
          }
        }
      }
    }
  }, {
    key: 'toggleSelection',
    value: function toggleSelection() {
      for (var _len3 = arguments.length, $items = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
        $items[_key3] = arguments[_key3];
      }

      if (!this._behavior) {
        return;
      }
      if (!$items.length) {
        $items = this._$itemDataMap.keys();
      }
      if (Array.isArray($items[0])) {
        $items = $items[0];
      }

      var _iteratorNormalCompletion3 = true;
      var _didIteratorError3 = false;
      var _iteratorError3 = undefined;

      try {
        for (var _iterator3 = _getIterator($items), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
          var $item = _step3.value;

          var datum = this._$itemDataMap.get($item);
          this._behavior.toggleSelection($item, datum);
        }
      } catch (err) {
        _didIteratorError3 = true;
        _iteratorError3 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion3 && _iterator3['return']) {
            _iterator3['return']();
          }
        } finally {
          if (_didIteratorError3) {
            throw _iteratorError3;
          }
        }
      }
    }
  }, {
    key: 'edit',
    value: function edit($items, dx, dy, target) {
      if (!this._behavior) {
        return;
      }
      $items = !Array.isArray($items) ? [$items] : $items;

      var _iteratorNormalCompletion4 = true;
      var _didIteratorError4 = false;
      var _iteratorError4 = undefined;

      try {
        for (var _iterator4 = _getIterator($items), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
          var $item = _step4.value;

          var shape = this._$itemShapeMap.get($item);
          var datum = this._$itemDataMap.get($item);

          this._behavior.edit(this._renderingContext, shape, datum, dx, dy, target);
          this.emit('edit', shape, datum);
        }
      } catch (err) {
        _didIteratorError4 = true;
        _iteratorError4 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion4 && _iterator4['return']) {
            _iterator4['return']();
          }
        } finally {
          if (_didIteratorError4) {
            throw _iteratorError4;
          }
        }
      }
    }

    /**
     *  draws the shape to interact with the context
     *  @params {Boolean} [bool=true] - defines if the layer's context is editable or not
     */
  }, {
    key: 'setContextEditable',
    value: function setContextEditable() {
      var bool = arguments.length <= 0 || arguments[0] === undefined ? true : arguments[0];

      var display = bool ? 'block' : 'none';
      this.$interactions.style.display = display;
      this._isContextEditable = bool;
    }
  }, {
    key: 'editContext',
    value: function editContext(dx, dy, target) {
      timeContextBehavior.edit(this, dx, dy, target);
    }
  }, {
    key: 'stretchContext',
    value: function stretchContext(dx, dy, target) {
      timeContextBehavior.stretch(this, dx, dy, target);
    }

    // --------------------------------------
    // Helpers
    // --------------------------------------

    /**
     *  Moves an `$el`'s group to the end of the layer (svg z-index...)
     *  @param `$el` {DOMElement} the DOMElement to be moved
     */
  }, {
    key: '_toFront',
    value: function _toFront($item) {
      this.$offset.appendChild($item);
    }

    /**
     *  Returns the $item to which the given DOMElement belongs
     *  @param {DOMElement} $el the element to be tested
     *  @return {DOMElement|null} item group containing the `$el` if belongs to this layer, null otherwise
     */
  }, {
    key: 'getItemFromDOMElement',
    value: function getItemFromDOMElement($el) {
      var $item = undefined;

      do {
        if ($el.classList && $el.classList.contains('item')) {
          $item = $el;
          break;
        }

        $el = $el.parentNode;
      } while ($el !== null);

      return this.hasItem($item) ? $item : null;
    }

    /**
     *  Returns the datum associated to a specific item DOMElement
     *  @param {DOMElement} $item
     *  @return {Object|Array|null} depending on the user data structure
     */
  }, {
    key: 'getDatumFromItem',
    value: function getDatumFromItem($item) {
      return this._$itemDataMap.get($item);
    }
  }, {
    key: 'getDatumFromDOMElement',
    value: function getDatumFromDOMElement($el) {
      var $item = this.getItemFromDOMElement($el);
      if ($item === null) {
        return null;
      }
      return this.getDatumFromItem($item);
    }

    /**
     *  Defines if the given DOMElement is an item of the layer
     *  @param {DOMElement} $item
     *  @return {bool}
     */
  }, {
    key: 'hasItem',
    value: function hasItem($item) {
      return this._$itemDataMap.has($item);
    }

    /**
     *  Defines if a given element belongs to the layer
     *  is more general than `hasItem`, can be used to check interactions elements too
     *  @param {DOMElement} $el
     *  @return {bool}
     */
  }, {
    key: 'hasElement',
    value: function hasElement($el) {
      do {
        if ($el === this.$el) {
          return true;
        }

        $el = $el.parentNode;
      } while ($el !== null);

      return false;
    }

    /**
     *  retrieve all the $items in a given area
     *  @param {Object} area - The area in which to find the elements
     *  @return {Array} - list of the DOM elements in the given area
     */
  }, {
    key: 'getItemsInArea',
    value: function getItemsInArea(area) {
      var start = this.timeContext.parent.timeToPixel(this.timeContext.start);
      var duration = this.timeContext.timeToPixel(this.timeContext.duration);
      var offset = this.timeContext.timeToPixel(this.timeContext.offset);
      var top = this.params.top;
      // be aware af context's translations - constrain in working view
      var x1 = Math.max(area.left, start);
      var x2 = Math.min(area.left + area.width, start + duration);
      x1 -= start + offset;
      x2 -= start + offset;
      // keep consistent with context y coordinates system
      var y1 = this.params.height - (area.top + area.height);
      var y2 = this.params.height - area.top;

      y1 += this.params.top;
      y2 += this.params.top;

      var $filteredItems = [];

      var _iteratorNormalCompletion5 = true;
      var _didIteratorError5 = false;
      var _iteratorError5 = undefined;

      try {
        for (var _iterator5 = _getIterator(this._$itemDataMap.entries()), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
          var _step5$value = _slicedToArray(_step5.value, 2);

          var $item = _step5$value[0];
          var datum = _step5$value[1];

          var shape = this._$itemShapeMap.get($item);
          var inArea = shape.inArea(this._renderingContext, datum, x1, y1, x2, y2);

          if (inArea) {
            $filteredItems.push($item);
          }
        }
      } catch (err) {
        _didIteratorError5 = true;
        _iteratorError5 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion5 && _iterator5['return']) {
            _iterator5['return']();
          }
        } finally {
          if (_didIteratorError5) {
            throw _iteratorError5;
          }
        }
      }

      return $filteredItems;
    }

    // --------------------------------------
    // Rendering / Display methods
    // --------------------------------------

  }, {
    key: 'render',
    value: function render() {
      var _this2 = this;

      // render `commonShape` only once
      if (this._commonShapeConfiguration !== null && this._$itemCommonShapeMap.size === 0) {
        var _commonShapeConfiguration = this._commonShapeConfiguration;
        var ctor = _commonShapeConfiguration.ctor;
        var accessors = _commonShapeConfiguration.accessors;
        var options = _commonShapeConfiguration.options;

        var $group = document.createElementNS(_namespace2['default'], 'g');
        var shape = new ctor(options);

        shape.install(accessors);
        $group.appendChild(shape.render());
        $group.classList.add('item', 'common', shape.getClassName());

        this._$itemCommonShapeMap.set($group, shape);
        this.$offset.appendChild($group);
      }

      // append elements all at once
      var fragment = document.createDocumentFragment();
      var values = this._$itemDataMap.values(); // iterator

      // enter
      this.data.forEach(function (datum) {
        var _iteratorNormalCompletion6 = true;
        var _didIteratorError6 = false;
        var _iteratorError6 = undefined;

        try {
          for (var _iterator6 = _getIterator(values), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
            var value = _step6.value;
            if (value === datum) {
              return;
            }
          }
        } catch (err) {
          _didIteratorError6 = true;
          _iteratorError6 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion6 && _iterator6['return']) {
              _iterator6['return']();
            }
          } finally {
            if (_didIteratorError6) {
              throw _iteratorError6;
            }
          }
        }

        var _shapeConfiguration = _this2._shapeConfiguration;
        var ctor = _shapeConfiguration.ctor;
        var accessors = _shapeConfiguration.accessors;
        var options = _shapeConfiguration.options;

        var shape = new ctor(options);
        shape.install(accessors);

        var $el = shape.render(_this2._renderingContext);
        $el.classList.add('item', shape.getClassName());

        _this2._$itemShapeMap.set($el, shape);
        _this2._$itemDataMap.set($el, datum);

        fragment.appendChild($el);
      });

      this.$offset.appendChild(fragment);

      // remove
      var _iteratorNormalCompletion7 = true;
      var _didIteratorError7 = false;
      var _iteratorError7 = undefined;

      try {
        for (var _iterator7 = _getIterator(this._$itemDataMap.entries()), _step7; !(_iteratorNormalCompletion7 = (_step7 = _iterator7.next()).done); _iteratorNormalCompletion7 = true) {
          var _step7$value = _slicedToArray(_step7.value, 2);

          var $item = _step7$value[0];
          var datum = _step7$value[1];

          if (this.data.indexOf(datum) !== -1) {
            continue;
          }

          var shape = this._$itemShapeMap.get($item);

          this.$offset.removeChild($item);
          shape.destroy();
          // a removed item cannot be selected
          if (this._behavior) {
            this._behavior.unselect($item, datum);
          }

          this._$itemDataMap['delete']($item);
          this._$itemShapeMap['delete']($item);
        }
      } catch (err) {
        _didIteratorError7 = true;
        _iteratorError7 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion7 && _iterator7['return']) {
            _iterator7['return']();
          }
        } finally {
          if (_didIteratorError7) {
            throw _iteratorError7;
          }
        }
      }
    }

    /**
     *  updates Context and Shapes
     */
  }, {
    key: 'update',
    value: function update() {
      this.updateContainer();
      this.updateShapes();
    }

    /**
     *  updates the layer's container
     */
  }, {
    key: 'updateContainer',
    value: function updateContainer() {
      this._updateRenderingContext();

      var timeContext = this.timeContext;
      var width = timeContext.timeToPixel(timeContext.duration);
      // x is relative to timeline's timeContext
      var x = timeContext.parent.timeToPixel(timeContext.start);
      var offset = timeContext.timeToPixel(timeContext.offset);
      var top = this.params.top;
      var height = this.params.height;
      // matrix to invert the coordinate system
      var translateMatrix = 'matrix(1, 0, 0, -1, ' + x + ', ' + (top + height) + ')';

      this.$el.setAttributeNS(null, 'transform', translateMatrix);

      this.$boundingBox.setAttributeNS(null, 'width', width);
      this.$boundingBox.setAttributeNS(null, 'height', height);
      this.$boundingBox.style.opacity = this.params.opacity;

      this.$offset.setAttributeNS(null, 'transform', 'translate(' + offset + ', 0)');
      // maintain context shape
      this.contextShape.update(this._renderingContext, this.timeContext, 0);
    }

    /**
     *  updates the Shapes which belongs to the layer
     *  @param {DOMElement} $el - Not implemented
     */
  }, {
    key: 'updateShapes',
    value: function updateShapes() {
      var _this3 = this;

      var $el = arguments.length <= 0 || arguments[0] === undefined ? null : arguments[0];

      this._updateRenderingContext();
      // update common shapes
      this._$itemCommonShapeMap.forEach(function (shape, $item) {
        shape.update(_this3._renderingContext, _this3.data);
      });

      var _iteratorNormalCompletion8 = true;
      var _didIteratorError8 = false;
      var _iteratorError8 = undefined;

      try {
        for (var _iterator8 = _getIterator(this._$itemDataMap.entries()), _step8; !(_iteratorNormalCompletion8 = (_step8 = _iterator8.next()).done); _iteratorNormalCompletion8 = true) {
          var _step8$value = _slicedToArray(_step8.value, 2);

          var $item = _step8$value[0];
          var datum = _step8$value[1];

          var shape = this._$itemShapeMap.get($item);
          shape.update(this._renderingContext, datum);
        }
      } catch (err) {
        _didIteratorError8 = true;
        _iteratorError8 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion8 && _iterator8['return']) {
            _iterator8['return']();
          }
        } finally {
          if (_didIteratorError8) {
            throw _iteratorError8;
          }
        }
      }
    }
  }, {
    key: 'start',
    get: function get() {
      return this.timeContext.start;
    },
    set: function set(value) {
      this.timeContext.start = value;
    }
  }, {
    key: 'offset',
    get: function get() {
      return this.timeContext.offset;
    },
    set: function set(value) {
      this.timeContext.offset = value;
    }
  }, {
    key: 'duration',
    get: function get() {
      return this.timeContext.duration;
    },
    set: function set(value) {
      this.timeContext.duration = value;
    }
  }, {
    key: 'stretchRatio',
    get: function get() {
      return this.timeContext.stretchRatio;
    },
    set: function set(value) {
      this.timeContext.stretchRatio = value;
    }
  }, {
    key: 'yDomain',
    set: function set(domain) {
      this.params.yDomain = domain;
      this._valueToPixel.domain(domain);
    },
    get: function get() {
      return this.params.yDomain;
    }
  }, {
    key: 'opacity',
    set: function set(value) {
      this.params.opacity = value;
    },
    get: function get() {
      return this.params.opacity;
    }

    // expose scale
  }, {
    key: 'timeToPixel',
    get: function get() {
      return this.timeContext.timeToPixel;
    }
  }, {
    key: 'valueToPixel',
    get: function get() {
      return this._valueToPixel;
    }

    /**
     *  @return {Array} - an array containins all the DOMElement items
     */
  }, {
    key: 'items',
    get: function get() {
      var items = [];

      var _iteratorNormalCompletion9 = true;
      var _didIteratorError9 = false;
      var _iteratorError9 = undefined;

      try {
        for (var _iterator9 = _getIterator(this._$itemDataMap.keys()), _step9; !(_iteratorNormalCompletion9 = (_step9 = _iterator9.next()).done); _iteratorNormalCompletion9 = true) {
          var item = _step9.value;

          items.push(item);
        }
      } catch (err) {
        _didIteratorError9 = true;
        _iteratorError9 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion9 && _iterator9['return']) {
            _iterator9['return']();
          }
        } finally {
          if (_didIteratorError9) {
            throw _iteratorError9;
          }
        }
      }

      return items;
    }
  }, {
    key: 'data',
    get: function get() {
      return this._data;
    },
    set: function set(data) {
      switch (this.dataType) {
        case 'entity':
          if (this._data) {
            // if data already exists, reuse the reference
            this._data[0] = data;
          } else {
            this._data = [data];
          }
          break;
        case 'collection':
          this._data = data;
          break;
      }
    }
  }, {
    key: 'selectedItems',
    get: function get() {
      return this._behavior ? this._behavior.selectedItems : [];
    }
  }], [{
    key: 'configureTimeContextBehavior',
    value: function configureTimeContextBehavior(ctor) {
      timeContextBehaviorCtor = ctor;
    }
  }]);

  return Layer;
})(_events2['default'].EventEmitter);

exports['default'] = Layer;
module.exports = exports['default'];
//# sourceMappingURL=data:application/json;base64,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QUUsYUFBTyxJQUFJLENBQUMsS0FBSyxDQUFDO0tBQUU7U0FFekIsYUFBQyxJQUFJLEVBQUU7QUFDYixjQUFRLElBQUksQ0FBQyxRQUFRO0FBQ25CLGFBQUssUUFBUTtBQUNYLGNBQUksSUFBSSxDQUFDLEtBQUssRUFBRTs7QUFDZCxnQkFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUM7V0FDdEIsTUFBTTtBQUNMLGdCQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7V0FDckI7QUFDRCxnQkFBTTtBQUFBLEFBQ1IsYUFBSyxZQUFZO0FBQ2YsY0FBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUM7QUFDbEIsZ0JBQU07QUFBQSxPQUNUO0tBQ0Y7OztTQStHZ0IsZUFBRztBQUNsQixhQUFPLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxhQUFhLEdBQUcsRUFBRSxDQUFDO0tBQzNEOzs7V0ExTmtDLHNDQUFDLElBQUksRUFBRTtBQUN4Qyw2QkFBdUIsR0FBRyxJQUFJLENBQUM7S0FDaEM7OztTQW5Ga0IsS0FBSztHQUFTLG9CQUFPLFlBQVk7O3FCQUFqQyxLQUFLIiwiZmlsZSI6ImVzNi9jb3JlL2xheWVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHNjYWxlcyBmcm9tICcuLi91dGlscy9zY2FsZXMnO1xuaW1wb3J0IGV2ZW50cyBmcm9tICdldmVudHMnO1xuXG5pbXBvcnQgbnMgZnJvbSAnLi9uYW1lc3BhY2UnO1xuaW1wb3J0IFNlZ21lbnQgZnJvbSAnLi4vc2hhcGVzL3NlZ21lbnQnO1xuaW1wb3J0IFRpbWVDb250ZXh0QmVoYXZpb3IgZnJvbSAnLi4vYmVoYXZpb3JzL3RpbWUtY29udGV4dC1iZWhhdmlvcic7XG5cbi8vIHRpbWUgY29udGV4dCBiYWhldmlvclxubGV0IHRpbWVDb250ZXh0QmVoYXZpb3IgPSBudWxsO1xubGV0IHRpbWVDb250ZXh0QmVoYXZpb3JDdG9yID0gVGltZUNvbnRleHRCZWhhdmlvcjtcblxuLyoqXG4gKiAgVGhlIGxheWVyIGNsYXNzIGlzIHRoZSBtYWluIHZpc3VhbGl6YXRpb24gY2xhc3NcbiAqL1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTGF5ZXIgZXh0ZW5kcyBldmVudHMuRXZlbnRFbWl0dGVyIHtcbiAgLyoqXG4gICAqIFN0cnVjdHVyZSBvZiB0aGUgRE9NIHZpZXcgb2YgYSBMYXllclxuICAgKlxuICAgKiBgYGBcbiAgICogPGcgY2xhc3M9XCJsYXllclwiPiBGbGlwIHkgYXhpcywgdGltZUNvbnRleHQuc3RhcnQgYW5kIHRvcCBwb3NpdGlvbiBmcm9tIHBhcmFtcyBhcmUgYXBwbGllZCBvbiB0aGlzICRlbG10XG4gICAqICAgPHN2ZyBjbGFzcz1cImJvdW5kaW5nLWJveFwiPiB0aW1lQ29udGV4dC5kdXJhdGlvbiBpcyBhcHBsaWVkIG9uIHRoaXMgJGVsbXRcbiAgICogICAgPGcgY2xhc3M9XCJsYXllci1pbnRlcmFjdGlvbnNcIj4gQ29udGFpbnMgdGhlIHRpbWVDb250ZXh0IGVkaXRpb24gZWxlbWVudHMgKGEgc2VnbWVudCkgPC9nPlxuICAgKiAgICA8ZyBjbGFzcz1cIm9mZnNldCBpdGVtc1wiPiBUaGUgc2hhcGVzIGFyZSBpbnNlcnRlZCBoZXJlLCBhbmQgd2UgYXBwbHkgdGltZUNvbnRleHQub2Zmc2V0IG9uIHRoaXMgJGVsbXQgPC9nPlxuICAgKiAgIDwvc3ZnPlxuICAgKiA8L2c+XG4gICAqIGBgYFxuICAgKi9cbiAgY29uc3RydWN0b3IoZGF0YVR5cGUsIGRhdGEsIG9wdGlvbnMgPSB7fSkge1xuICAgIHN1cGVyKCk7XG4gICAgdGhpcy5kYXRhVHlwZSA9IGRhdGFUeXBlOyAvLyAnZW50aXR5JyB8fCAnY29sbGVjdGlvbic7XG4gICAgdGhpcy5kYXRhID0gZGF0YTtcblxuICAgIGNvbnN0IGRlZmF1bHRzID0ge1xuICAgICAgaGVpZ2h0OiAxMDAsXG4gICAgICB0b3A6IDAsXG4gICAgICBpZDogJycsXG4gICAgICB5RG9tYWluOiBbMCwgMV0sXG4gICAgICBvcGFjaXR5OiAxLFxuICAgICAgY29udGV4dEhhbmRsZXJXaWR0aDogMixcbiAgICAgIGNsYXNzTmFtZTogbnVsbCxcbiAgICAgIC8vIHdoZW4gZmFsc2UgdGhlIGxheWVyIGlzIG5vdCByZXR1cm5lZCBieSBgQmFzZVN0YXRlLmdldEhpdExheWVyc2BcbiAgICAgIGhpdHRhYmxlOiB0cnVlLFxuICAgICAgb3ZlcmZsb3c6ICdoaWRkZW4nLFxuICAgIH07XG5cbiAgICB0aGlzLnBhcmFtcyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRzLCBvcHRpb25zKTtcbiAgICB0aGlzLnRpbWVDb250ZXh0ID0gbnVsbDtcblxuICAgIC8vIGNvbnRhaW5lciBlbGVtZW50c1xuICAgIHRoaXMuJGVsID0gbnVsbDsgLy8gb2Zmc2V0IGdyb3VwIG9mIHRoZSBwYXJlbnQgY29udGV4dFxuICAgIHRoaXMuJGJvdW5kaW5nQm94ID0gbnVsbDtcbiAgICB0aGlzLiRvZmZzZXQgPSBudWxsO1xuICAgIHRoaXMuJGludGVyYWN0aW9ucyA9IG51bGw7XG5cbiAgICB0aGlzLl9zaGFwZUNvbmZpZ3VyYXRpb24gPSBudWxsOyAvLyB7IGN0b3IsIGFjY2Vzc29ycywgb3B0aW9ucyB9XG4gICAgdGhpcy5fY29tbW9uU2hhcGVDb25maWd1cmF0aW9uID0gbnVsbDsgLy8geyBjdG9yLCBhY2Nlc3NvcnMsIG9wdGlvbnMgfVxuICAgIC8vIG1hcCB0byBhc3NvY2lhdGUgZGF0dW1zLCAkaXRlbXMsIGFuZCBzaGFwZXNcbiAgICB0aGlzLl8kaXRlbVNoYXBlTWFwID0gbmV3IE1hcCgpOyAvLyBpdGVtIGdyb3VwIDxET01FbGVtZW50PiA9PiBzaGFwZVxuICAgIHRoaXMuXyRpdGVtRGF0YU1hcCA9IG5ldyBNYXAoKTtcbiAgICB0aGlzLl8kaXRlbUNvbW1vblNoYXBlTWFwID0gbmV3IE1hcCgpOyAvLyBvbmUgZW50cnkgbWF4IGluIHRoaXMgbWFwXG5cbiAgICB0aGlzLl9pc0NvbnRleHRFZGl0YWJsZSA9IGZhbHNlO1xuICAgIHRoaXMuX2JlaGF2aW9yID0gbnVsbDtcblxuICAgIHRoaXMuX3ZhbHVlVG9QaXhlbCA9IHNjYWxlcy5saW5lYXIoKVxuICAgICAgLmRvbWFpbih0aGlzLnBhcmFtcy55RG9tYWluKVxuICAgICAgLnJhbmdlKFswLCB0aGlzLnBhcmFtcy5oZWlnaHRdKTtcblxuICAgIHRoaXMuY29udGV4dEJlaGF2aW9yID0gJyc7XG5cbiAgICAvLyBpbml0aWFsaXplIHRpbWVDb250ZXh0IGxheW91dFxuICAgIHRoaXMuX3JlbmRlckNvbnRhaW5lcigpO1xuXG4gICAgLy8gY3JlYXRlcyB0aGUgdGltZUNvbnRleHRCZWhhdmlvciBmb3IgYWxsIGxheWVyLCBsYXp5IGluc3RhbmNpYXRpb25cbiAgICBpZiAodGltZUNvbnRleHRCZWhhdmlvciA9PT0gbnVsbCkge1xuICAgICAgdGltZUNvbnRleHRCZWhhdmlvciA9IG5ldyB0aW1lQ29udGV4dEJlaGF2aW9yQ3RvcigpO1xuICAgIH1cbiAgfVxuXG4gIGRlc3Ryb3koKSB7XG4gICAgdGhpcy50aW1lQ29udGV4dCA9IG51bGw7XG4gICAgdGhpcy5kYXRhID0gbnVsbDtcbiAgICB0aGlzLnBhcmFtcyA9IG51bGw7XG4gICAgdGhpcy5fYmVoYXZpb3IgPSBudWxsO1xuXG4gICAgdGhpcy5fJGl0ZW1TaGFwZU1hcC5jbGVhcigpO1xuICAgIHRoaXMuXyRpdGVtRGF0YU1hcC5jbGVhcigpO1xuICAgIHRoaXMuXyRpdGVtQ29tbW9uU2hhcGVNYXAuY2xlYXIoKTtcblxuICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKCk7XG4gIH1cblxuICAvKipcbiAgICogIGFsbG93cyB0byBvdmVycmlkZSBkZWZhdWx0IHRoZSBUaW1lQ29udGV4dEJlaGF2aW9yXG4gICAqL1xuICBzdGF0aWMgY29uZmlndXJlVGltZUNvbnRleHRCZWhhdmlvcihjdG9yKSB7XG4gICAgdGltZUNvbnRleHRCZWhhdmlvckN0b3IgPSBjdG9yO1xuICB9XG5cbiAgZ2V0IHN0YXJ0KCkge1xuICAgIHJldHVybiB0aGlzLnRpbWVDb250ZXh0LnN0YXJ0O1xuICB9XG5cbiAgc2V0IHN0YXJ0KHZhbHVlKSB7XG4gICAgdGhpcy50aW1lQ29udGV4dC5zdGFydCA9IHZhbHVlO1xuICB9XG5cbiAgZ2V0IG9mZnNldCgpIHtcbiAgICByZXR1cm4gdGhpcy50aW1lQ29udGV4dC5vZmZzZXQ7XG4gIH1cblxuICBzZXQgb2Zmc2V0KHZhbHVlKSB7XG4gICAgdGhpcy50aW1lQ29udGV4dC5vZmZzZXQgPSB2YWx1ZTtcbiAgfVxuXG4gIGdldCBkdXJhdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy50aW1lQ29udGV4dC5kdXJhdGlvbjtcbiAgfVxuXG4gIHNldCBkdXJhdGlvbih2YWx1ZSkge1xuICAgIHRoaXMudGltZUNvbnRleHQuZHVyYXRpb24gPSB2YWx1ZTtcbiAgfVxuXG4gIGdldCBzdHJldGNoUmF0aW8oKSB7XG4gICAgcmV0dXJuIHRoaXMudGltZUNvbnRleHQuc3RyZXRjaFJhdGlvO1xuICB9XG5cbiAgc2V0IHN0cmV0Y2hSYXRpbyh2YWx1ZSkge1xuICAgIHRoaXMudGltZUNvbnRleHQuc3RyZXRjaFJhdGlvID0gdmFsdWU7XG4gIH1cblxuICBzZXQgeURvbWFpbihkb21haW4pIHtcbiAgICB0aGlzLnBhcmFtcy55RG9tYWluID0gZG9tYWluO1xuICAgIHRoaXMuX3ZhbHVlVG9QaXhlbC5kb21haW4oZG9tYWluKTtcbiAgfVxuXG4gIGdldCB5RG9tYWluKCkge1xuICAgIHJldHVybiB0aGlzLnBhcmFtcy55RG9tYWluO1xuICB9XG5cbiAgc2V0IG9wYWNpdHkodmFsdWUpIHtcbiAgICB0aGlzLnBhcmFtcy5vcGFjaXR5ID0gdmFsdWU7XG4gIH1cblxuICBnZXQgb3BhY2l0eSgpIHtcbiAgICByZXR1cm4gdGhpcy5wYXJhbXMub3BhY2l0eTtcbiAgfVxuXG4gIC8vIGV4cG9zZSBzY2FsZVxuICBnZXQgdGltZVRvUGl4ZWwoKSB7XG4gICAgcmV0dXJuIHRoaXMudGltZUNvbnRleHQudGltZVRvUGl4ZWw7XG4gIH1cblxuICBnZXQgdmFsdWVUb1BpeGVsKCkge1xuICAgIHJldHVybiB0aGlzLl92YWx1ZVRvUGl4ZWw7XG4gIH1cblxuICAvKipcbiAgICogIEByZXR1cm4ge0FycmF5fSAtIGFuIGFycmF5IGNvbnRhaW5pbnMgYWxsIHRoZSBET01FbGVtZW50IGl0ZW1zXG4gICAqL1xuICBnZXQgaXRlbXMoKSB7XG4gICAgdmFyIGl0ZW1zID0gW107XG5cbiAgICBmb3IgKGxldCBpdGVtIG9mIHRoaXMuXyRpdGVtRGF0YU1hcC5rZXlzKCkpIHtcbiAgICAgIGl0ZW1zLnB1c2goaXRlbSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGl0ZW1zO1xuICB9XG5cbiAgLyoqXG4gICAqIEBtYW5kYXRvcnkgZGVmaW5lIHRoZSBjb250ZXh0IGluIHdoaWNoIHRoZSBsYXllciBpcyBkcmF3blxuICAgKiBAcGFyYW0gY29udGV4dCB7VGltZUNvbnRleHR9IHRoZSB0aW1lQ29udGV4dCBpbiB3aGljaCB0aGUgbGF5ZXIgaXMgZGlzcGxheWVkXG4gICAqL1xuICBzZXRUaW1lQ29udGV4dCh0aW1lQ29udGV4dCkge1xuICAgIHRoaXMudGltZUNvbnRleHQgPSB0aW1lQ29udGV4dDtcbiAgICAvLyBjcmVhdGUgYSBtaXhpbiB0byBwYXNzIHRvIHRoZSBzaGFwZXNcbiAgICB0aGlzLl9yZW5kZXJpbmdDb250ZXh0ID0ge307XG4gICAgdGhpcy5fdXBkYXRlUmVuZGVyaW5nQ29udGV4dCgpO1xuICB9XG5cbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8gRGF0YVxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGdldCBkYXRhKCkgeyByZXR1cm4gdGhpcy5fZGF0YTsgfVxuXG4gIHNldCBkYXRhKGRhdGEpIHtcbiAgICBzd2l0Y2ggKHRoaXMuZGF0YVR5cGUpIHtcbiAgICAgIGNhc2UgJ2VudGl0eSc6XG4gICAgICAgIGlmICh0aGlzLl9kYXRhKSB7ICAvLyBpZiBkYXRhIGFscmVhZHkgZXhpc3RzLCByZXVzZSB0aGUgcmVmZXJlbmNlXG4gICAgICAgICAgdGhpcy5fZGF0YVswXSA9IGRhdGE7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5fZGF0YSA9IFtkYXRhXTtcbiAgICAgICAgfVxuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ2NvbGxlY3Rpb24nOlxuICAgICAgICB0aGlzLl9kYXRhID0gZGF0YTtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgLy8gSW5pdGlhbGl6YXRpb25cblxuICAvKipcbiAgICogIHJlbmRlciB0aGUgRE9NIGluIG1lbW9yeSBvbiBsYXllciBjcmVhdGlvbiB0byBiZSBhYmxlIHRvIHVzZSBpdCBiZWZvcmVcbiAgICogIHRoZSBsYXllciBpcyBhY3R1YWxseSBpbnNlcnRlZCBpbiB0aGUgRE9NXG4gICAqL1xuICBfcmVuZGVyQ29udGFpbmVyKCkge1xuICAgIC8vIHdyYXBwZXIgZ3JvdXAgZm9yIGBzdGFydCwgdG9wIGFuZCBjb250ZXh0IGZsaXAgbWF0cml4XG4gICAgdGhpcy4kZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMobnMsICdnJyk7XG4gICAgdGhpcy4kZWwuY2xhc3NMaXN0LmFkZCgnbGF5ZXInKTtcbiAgICBpZiAodGhpcy5wYXJhbXMuY2xhc3NOYW1lICE9PSBudWxsKSB7XG4gICAgICB0aGlzLiRlbC5jbGFzc0xpc3QuYWRkKHRoaXMucGFyYW1zLmNsYXNzTmFtZSk7XG4gICAgfVxuICAgIC8vIGNsaXAgdGhlIGNvbnRleHQgd2l0aCBhIGBzdmdgIGVsZW1lbnRcbiAgICB0aGlzLiRib3VuZGluZ0JveCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyhucywgJ3N2ZycpO1xuICAgIHRoaXMuJGJvdW5kaW5nQm94LmNsYXNzTGlzdC5hZGQoJ2JvdW5kaW5nLWJveCcpO1xuICAgIHRoaXMuJGJvdW5kaW5nQm94LnN0eWxlLm92ZXJmbG93ID0gdGhpcy5wYXJhbXMub3ZlcmZsb3c7XG4gICAgLy8gZ3JvdXAgdG8gYXBwbHkgb2Zmc2V0XG4gICAgdGhpcy4kb2Zmc2V0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKG5zLCAnZycpO1xuICAgIHRoaXMuJG9mZnNldC5jbGFzc0xpc3QuYWRkKCdvZmZzZXQnLCAnaXRlbXMnKTtcbiAgICAvLyBsYXllciBiYWNrZ3JvdW5kXG4gICAgdGhpcy4kYmFja2dyb3VuZCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyhucywgJ3JlY3QnKTtcbiAgICB0aGlzLiRiYWNrZ3JvdW5kLnNldEF0dHJpYnV0ZU5TKG51bGwsICdoZWlnaHQnLCAnMTAwJScpO1xuICAgIHRoaXMuJGJhY2tncm91bmQuc2V0QXR0cmlidXRlTlMobnVsbCwgJ3dpZHRoJywgJzEwMCUnKTtcbiAgICB0aGlzLiRiYWNrZ3JvdW5kLmNsYXNzTGlzdC5hZGQoJ2JhY2tncm91bmQnKTtcbiAgICB0aGlzLiRiYWNrZ3JvdW5kLnN0eWxlLmZpbGxPcGFjaXR5ID0gMDtcbiAgICB0aGlzLiRiYWNrZ3JvdW5kLnN0eWxlLnBvaW50ZXJFdmVudHMgPSAnbm9uZSc7XG4gICAgLy8gY29udGV4dCBpbnRlcmFjdGlvbnNcbiAgICB0aGlzLiRpbnRlcmFjdGlvbnMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMobnMsICdnJyk7XG4gICAgdGhpcy4kaW50ZXJhY3Rpb25zLmNsYXNzTGlzdC5hZGQoJ2ludGVyYWN0aW9ucycpO1xuICAgIHRoaXMuJGludGVyYWN0aW9ucy5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICAgIC8vIEBOT1RFOiB3b3JrcyBidXQga2luZyBvZiB1Z2x5Li4uIHNob3VsZCBiZSBjbGVhbmVkXG4gICAgdGhpcy5jb250ZXh0U2hhcGUgPSBuZXcgU2VnbWVudCgpO1xuICAgIHRoaXMuY29udGV4dFNoYXBlLmluc3RhbGwoe1xuICAgICAgb3BhY2l0eTogKCkgPT4gMC4xLFxuICAgICAgY29sb3IgIDogKCkgPT4gJyM3ODc4NzgnLFxuICAgICAgd2lkdGggIDogKCkgPT4gdGhpcy50aW1lQ29udGV4dC5kdXJhdGlvbixcbiAgICAgIGhlaWdodCA6ICgpID0+IHRoaXMuX3JlbmRlcmluZ0NvbnRleHQudmFsdWVUb1BpeGVsLmRvbWFpbigpWzFdLFxuICAgICAgeSAgICAgIDogKCkgPT4gdGhpcy5fcmVuZGVyaW5nQ29udGV4dC52YWx1ZVRvUGl4ZWwuZG9tYWluKClbMF1cbiAgICB9KTtcblxuICAgIHRoaXMuJGludGVyYWN0aW9ucy5hcHBlbmRDaGlsZCh0aGlzLmNvbnRleHRTaGFwZS5yZW5kZXIoKSk7XG4gICAgLy8gY3JlYXRlIHRoZSBET00gdHJlZVxuICAgIHRoaXMuJGVsLmFwcGVuZENoaWxkKHRoaXMuJGJvdW5kaW5nQm94KTtcbiAgICB0aGlzLiRib3VuZGluZ0JveC5hcHBlbmRDaGlsZCh0aGlzLiRvZmZzZXQpO1xuICAgIHRoaXMuJG9mZnNldC5hcHBlbmRDaGlsZCh0aGlzLiRiYWNrZ3JvdW5kKTtcbiAgICB0aGlzLiRib3VuZGluZ0JveC5hcHBlbmRDaGlsZCh0aGlzLiRpbnRlcmFjdGlvbnMpO1xuICB9XG5cbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8gQ29tcG9uZW50IENvbmZpZ3VyYXRpb25cbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICAvKipcbiAgICogIFJlZ2lzdGVyIHRoZSBzaGFwZSBhbmQgaXRzIGFjY2Vzc29ycyB0byB1c2UgaW4gb3JkZXIgdG8gcmVuZGVyXG4gICAqICB0aGUgZW50aXR5IG9yIGNvbGxlY3Rpb25cbiAgICogIEBwYXJhbSBjdG9yIDxGdW5jdGlvbjpCYXNlU2hhcGU+IHRoZSBjb25zdHJ1Y3RvciBvZiB0aGUgc2hhcGUgdG8gYmUgdXNlZFxuICAgKiAgQHBhcmFtIGFjY2Vzc29ycyA8T2JqZWN0PiBhY2Nlc3NvcnMgdG8gdXNlIGluIG9yZGVyIHRvIG1hcCB0aGUgZGF0YSBzdHJ1Y3R1cmVcbiAgICovXG4gIGNvbmZpZ3VyZVNoYXBlKGN0b3IsIGFjY2Vzc29ycyA9IHt9LCBvcHRpb25zID0ge30pIHtcbiAgICB0aGlzLl9zaGFwZUNvbmZpZ3VyYXRpb24gPSB7IGN0b3IsIGFjY2Vzc29ycywgb3B0aW9ucyB9O1xuICB9XG5cbiAgLyoqXG4gICAqICBSZWdpc3RlciB0aGUgc2hhcGUgdG8gdXNlIHdpdGggdGhlIGVudGlyZSBjb2xsZWN0aW9uXG4gICAqICBleGFtcGxlOiB0aGUgbGluZSBpbiBhIGJlYWtwb2ludCBmdW5jdGlvblxuICAgKiAgQHBhcmFtIGN0b3Ige0Jhc2VTaGFwZX0gdGhlIGNvbnN0cnVjdG9yIG9mIHRoZSBzaGFwZSB0byB1c2UgdG8gcmVuZGVyIGRhdGFcbiAgICogIEBwYXJhbSBhY2Nlc3NvcnMge09iamVjdH0gYWNjZXNzb3JzIHRvIHVzZSBpbiBvcmRlciB0byBtYXAgdGhlIGRhdGEgc3RydWN0dXJlXG4gICAqL1xuICBjb25maWd1cmVDb21tb25TaGFwZShjdG9yLCBhY2Nlc3NvcnMgPSB7fSwgb3B0aW9ucyA9IHt9KSB7XG4gICAgdGhpcy5fY29tbW9uU2hhcGVDb25maWd1cmF0aW9uID0geyBjdG9yLCBhY2Nlc3NvcnMsIG9wdGlvbnMgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiAgUmVnaXN0ZXIgdGhlIGJlaGF2aW9yIHRvIHVzZSB3aGVuIGludGVyYWN0aW5nIHdpdGggdGhlIHNoYXBlXG4gICAqICBAcGFyYW0gYmVoYXZpb3Ige0Jhc2VCZWhhdmlvcn1cbiAgICovXG4gIHNldEJlaGF2aW9yKGJlaGF2aW9yKSB7XG4gICAgYmVoYXZpb3IuaW5pdGlhbGl6ZSh0aGlzKTtcbiAgICB0aGlzLl9iZWhhdmlvciA9IGJlaGF2aW9yO1xuICB9XG5cbiAgLyoqXG4gICAqICB1cGRhdGUgdGhlIHZhbHVlcyBpbiBgX3JlbmRlcmluZ0NvbnRleHRgXG4gICAqICBpcyBwYXJ0aWN1bGFyeSBuZWVkZWQgd2hlbiB1cGRhdGluZyBgc3RyZXRjaFJhdGlvYCBhcyB0aGUgcG9pbnRlclxuICAgKiAgdG8gdGhlIGB0aW1lVG9QaXhlbGAgc2NhbGUgbWF5IGNoYW5nZVxuICAgKi9cbiAgX3VwZGF0ZVJlbmRlcmluZ0NvbnRleHQoKSB7XG4gICAgdGhpcy5fcmVuZGVyaW5nQ29udGV4dC50aW1lVG9QaXhlbCA9IHRoaXMudGltZUNvbnRleHQudGltZVRvUGl4ZWw7XG4gICAgdGhpcy5fcmVuZGVyaW5nQ29udGV4dC52YWx1ZVRvUGl4ZWwgPSB0aGlzLl92YWx1ZVRvUGl4ZWw7XG5cbiAgICB0aGlzLl9yZW5kZXJpbmdDb250ZXh0LmhlaWdodCA9IHRoaXMucGFyYW1zLmhlaWdodDtcbiAgICB0aGlzLl9yZW5kZXJpbmdDb250ZXh0LndpZHRoICA9IHRoaXMudGltZUNvbnRleHQudGltZVRvUGl4ZWwodGhpcy50aW1lQ29udGV4dC5kdXJhdGlvbik7XG4gICAgLy8gZm9yIGZvcmVpZ24gb2JqZWN0IGlzc3VlIGluIGNocm9tZVxuICAgIHRoaXMuX3JlbmRlcmluZ0NvbnRleHQub2Zmc2V0WCA9IHRoaXMudGltZUNvbnRleHQudGltZVRvUGl4ZWwodGhpcy50aW1lQ29udGV4dC5vZmZzZXQpO1xuICAgIHRoaXMuX3JlbmRlcmluZ0NvbnRleHQuc3RhcnRYID0gdGhpcy50aW1lQ29udGV4dC5wYXJlbnQudGltZVRvUGl4ZWwodGhpcy50aW1lQ29udGV4dC5zdGFydCk7XG5cbiAgICAvLyBAVE9ETyByZXBsYWNlIHdpdGggYG1pblhgIGFuZCBgbWF4WGAgcmVwcmVzZW50aW5nIHRoZSB2aXNpYmxlIHBpeGVscyBpbiB3aGljaFxuICAgIC8vIHRoZSBzaGFwZXMgc2hvdWxkIGJlIHJlbmRlcmVkLCBjb3VsZCBhbGxvdyB0byBub3QgdXBkYXRlIHRoZSBET00gb2Ygc2hhcGVzXG4gICAgLy8gd2hvIGFyZSBub3QgaW4gdGhpcyBhcmVhLlxuICAgIC8vIGluIGJldHdlZW46IGV4cG9zZSBzb21lIHRpbWVsaW5lIGF0dHJpYnV0ZXMgLT4gaW1wcm92ZXMgV2F2ZWZvcm0gcGVyZnNcbiAgICB0aGlzLl9yZW5kZXJpbmdDb250ZXh0LnRyYWNrT2Zmc2V0WCA9IHRoaXMudGltZUNvbnRleHQucGFyZW50LnRpbWVUb1BpeGVsKHRoaXMudGltZUNvbnRleHQucGFyZW50Lm9mZnNldCk7XG4gICAgdGhpcy5fcmVuZGVyaW5nQ29udGV4dC52aXNpYmxlV2lkdGggPSB0aGlzLnRpbWVDb250ZXh0LnBhcmVudC52aXNpYmxlV2lkdGg7XG4gIH1cblxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLyBCZWhhdmlvciBBY2Nlc3NvcnNcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBnZXQgc2VsZWN0ZWRJdGVtcygpIHtcbiAgICByZXR1cm4gdGhpcy5fYmVoYXZpb3IgPyB0aGlzLl9iZWhhdmlvci5zZWxlY3RlZEl0ZW1zIDogW107XG4gIH1cblxuICBzZWxlY3QoLi4uJGl0ZW1zKSB7XG4gICAgaWYgKCF0aGlzLl9iZWhhdmlvcikgeyByZXR1cm47IH1cbiAgICBpZiAoISRpdGVtcy5sZW5ndGgpIHsgJGl0ZW1zID0gdGhpcy5fJGl0ZW1EYXRhTWFwLmtleXMoKTsgfVxuICAgIGlmIChBcnJheS5pc0FycmF5KCRpdGVtc1swXSkpIHsgJGl0ZW1zID0gJGl0ZW1zWzBdOyB9XG5cbiAgICBmb3IgKGxldCAkaXRlbSBvZiAkaXRlbXMpIHtcbiAgICAgIGNvbnN0IGRhdHVtID0gdGhpcy5fJGl0ZW1EYXRhTWFwLmdldCgkaXRlbSk7XG4gICAgICB0aGlzLl9iZWhhdmlvci5zZWxlY3QoJGl0ZW0sIGRhdHVtKTtcbiAgICAgIHRoaXMuX3RvRnJvbnQoJGl0ZW0pO1xuICAgIH1cbiAgfVxuXG4gIHVuc2VsZWN0KC4uLiRpdGVtcykge1xuICAgIGlmICghdGhpcy5fYmVoYXZpb3IpIHsgcmV0dXJuOyB9XG4gICAgaWYgKCEkaXRlbXMubGVuZ3RoKSB7ICRpdGVtcyA9IHRoaXMuXyRpdGVtRGF0YU1hcC5rZXlzKCk7IH1cbiAgICBpZiAoQXJyYXkuaXNBcnJheSgkaXRlbXNbMF0pKSB7ICRpdGVtcyA9ICRpdGVtc1swXTsgfVxuXG4gICAgZm9yIChsZXQgJGl0ZW0gb2YgJGl0ZW1zKSB7XG4gICAgICBjb25zdCBkYXR1bSA9IHRoaXMuXyRpdGVtRGF0YU1hcC5nZXQoJGl0ZW0pO1xuICAgICAgdGhpcy5fYmVoYXZpb3IudW5zZWxlY3QoJGl0ZW0sIGRhdHVtKTtcbiAgICB9XG4gIH1cblxuICB0b2dnbGVTZWxlY3Rpb24oLi4uJGl0ZW1zKSB7XG4gICAgaWYgKCF0aGlzLl9iZWhhdmlvcikgeyByZXR1cm47IH1cbiAgICBpZiAoISRpdGVtcy5sZW5ndGgpIHsgJGl0ZW1zID0gdGhpcy5fJGl0ZW1EYXRhTWFwLmtleXMoKTsgfVxuICAgIGlmIChBcnJheS5pc0FycmF5KCRpdGVtc1swXSkpIHsgJGl0ZW1zID0gJGl0ZW1zWzBdOyB9XG5cbiAgICBmb3IgKGxldCAkaXRlbSBvZiAkaXRlbXMpIHtcbiAgICAgIGNvbnN0IGRhdHVtID0gdGhpcy5fJGl0ZW1EYXRhTWFwLmdldCgkaXRlbSk7XG4gICAgICB0aGlzLl9iZWhhdmlvci50b2dnbGVTZWxlY3Rpb24oJGl0ZW0sIGRhdHVtKTtcbiAgICB9XG4gIH1cblxuICBlZGl0KCRpdGVtcywgZHgsIGR5LCB0YXJnZXQpIHtcbiAgICBpZiAoIXRoaXMuX2JlaGF2aW9yKSB7IHJldHVybjsgfVxuICAgICRpdGVtcyA9ICFBcnJheS5pc0FycmF5KCRpdGVtcykgPyBbJGl0ZW1zXSA6ICRpdGVtcztcblxuICAgIGZvciAobGV0ICRpdGVtIG9mICRpdGVtcykge1xuICAgICAgY29uc3Qgc2hhcGUgPSB0aGlzLl8kaXRlbVNoYXBlTWFwLmdldCgkaXRlbSk7XG4gICAgICBjb25zdCBkYXR1bSA9IHRoaXMuXyRpdGVtRGF0YU1hcC5nZXQoJGl0ZW0pO1xuXG4gICAgICB0aGlzLl9iZWhhdmlvci5lZGl0KHRoaXMuX3JlbmRlcmluZ0NvbnRleHQsIHNoYXBlLCBkYXR1bSwgZHgsIGR5LCB0YXJnZXQpO1xuICAgICAgdGhpcy5lbWl0KCdlZGl0Jywgc2hhcGUsIGRhdHVtKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogIGRyYXdzIHRoZSBzaGFwZSB0byBpbnRlcmFjdCB3aXRoIHRoZSBjb250ZXh0XG4gICAqICBAcGFyYW1zIHtCb29sZWFufSBbYm9vbD10cnVlXSAtIGRlZmluZXMgaWYgdGhlIGxheWVyJ3MgY29udGV4dCBpcyBlZGl0YWJsZSBvciBub3RcbiAgICovXG4gIHNldENvbnRleHRFZGl0YWJsZShib29sID0gdHJ1ZSkge1xuICAgIGNvbnN0IGRpc3BsYXkgPSBib29sID8gJ2Jsb2NrJyA6ICdub25lJztcbiAgICB0aGlzLiRpbnRlcmFjdGlvbnMuc3R5bGUuZGlzcGxheSA9IGRpc3BsYXk7XG4gICAgdGhpcy5faXNDb250ZXh0RWRpdGFibGUgPSBib29sO1xuICB9XG5cbiAgZWRpdENvbnRleHQoZHgsIGR5LCB0YXJnZXQpIHtcbiAgICB0aW1lQ29udGV4dEJlaGF2aW9yLmVkaXQodGhpcywgZHgsIGR5LCB0YXJnZXQpO1xuICB9XG5cbiAgc3RyZXRjaENvbnRleHQoZHgsIGR5LCB0YXJnZXQpIHtcbiAgICB0aW1lQ29udGV4dEJlaGF2aW9yLnN0cmV0Y2godGhpcywgZHgsIGR5LCB0YXJnZXQpO1xuICB9XG5cbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8gSGVscGVyc1xuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIC8qKlxuICAgKiAgTW92ZXMgYW4gYCRlbGAncyBncm91cCB0byB0aGUgZW5kIG9mIHRoZSBsYXllciAoc3ZnIHotaW5kZXguLi4pXG4gICAqICBAcGFyYW0gYCRlbGAge0RPTUVsZW1lbnR9IHRoZSBET01FbGVtZW50IHRvIGJlIG1vdmVkXG4gICAqL1xuICBfdG9Gcm9udCgkaXRlbSkge1xuICAgIHRoaXMuJG9mZnNldC5hcHBlbmRDaGlsZCgkaXRlbSk7XG4gIH1cblxuICAvKipcbiAgICogIFJldHVybnMgdGhlICRpdGVtIHRvIHdoaWNoIHRoZSBnaXZlbiBET01FbGVtZW50IGJlbG9uZ3NcbiAgICogIEBwYXJhbSB7RE9NRWxlbWVudH0gJGVsIHRoZSBlbGVtZW50IHRvIGJlIHRlc3RlZFxuICAgKiAgQHJldHVybiB7RE9NRWxlbWVudHxudWxsfSBpdGVtIGdyb3VwIGNvbnRhaW5pbmcgdGhlIGAkZWxgIGlmIGJlbG9uZ3MgdG8gdGhpcyBsYXllciwgbnVsbCBvdGhlcndpc2VcbiAgICovXG4gIGdldEl0ZW1Gcm9tRE9NRWxlbWVudCgkZWwpIHtcbiAgICBsZXQgJGl0ZW07XG5cbiAgICBkbyB7XG4gICAgICBpZiAoJGVsLmNsYXNzTGlzdCAmJiAkZWwuY2xhc3NMaXN0LmNvbnRhaW5zKCdpdGVtJykpIHtcbiAgICAgICAgJGl0ZW0gPSAkZWw7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuXG4gICAgICAkZWwgPSAkZWwucGFyZW50Tm9kZTtcbiAgICB9IHdoaWxlICgkZWwgIT09IG51bGwpO1xuXG4gICAgcmV0dXJuIHRoaXMuaGFzSXRlbSgkaXRlbSkgPyAkaXRlbSA6wqBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqICBSZXR1cm5zIHRoZSBkYXR1bSBhc3NvY2lhdGVkIHRvIGEgc3BlY2lmaWMgaXRlbSBET01FbGVtZW50XG4gICAqICBAcGFyYW0ge0RPTUVsZW1lbnR9ICRpdGVtXG4gICAqICBAcmV0dXJuIHtPYmplY3R8QXJyYXl8bnVsbH0gZGVwZW5kaW5nIG9uIHRoZSB1c2VyIGRhdGEgc3RydWN0dXJlXG4gICAqL1xuICBnZXREYXR1bUZyb21JdGVtKCRpdGVtKSB7XG4gICAgcmV0dXJuIHRoaXMuXyRpdGVtRGF0YU1hcC5nZXQoJGl0ZW0pO1xuICB9XG5cbiAgZ2V0RGF0dW1Gcm9tRE9NRWxlbWVudCgkZWwpIHtcbiAgICB2YXIgJGl0ZW0gPSB0aGlzLmdldEl0ZW1Gcm9tRE9NRWxlbWVudCgkZWwpO1xuICAgIGlmICgkaXRlbSA9PT0gbnVsbCkgeyByZXR1cm4gbnVsbDsgfVxuICAgIHJldHVybiB0aGlzLmdldERhdHVtRnJvbUl0ZW0oJGl0ZW0pO1xuICB9XG5cbiAgLyoqXG4gICAqICBEZWZpbmVzIGlmIHRoZSBnaXZlbiBET01FbGVtZW50IGlzIGFuIGl0ZW0gb2YgdGhlIGxheWVyXG4gICAqICBAcGFyYW0ge0RPTUVsZW1lbnR9ICRpdGVtXG4gICAqICBAcmV0dXJuIHtib29sfVxuICAgKi9cbiAgaGFzSXRlbSgkaXRlbSkge1xuICAgIHJldHVybiB0aGlzLl8kaXRlbURhdGFNYXAuaGFzKCRpdGVtKTtcbiAgfVxuXG4gIC8qKlxuICAgKiAgRGVmaW5lcyBpZiBhIGdpdmVuIGVsZW1lbnQgYmVsb25ncyB0byB0aGUgbGF5ZXJcbiAgICogIGlzIG1vcmUgZ2VuZXJhbCB0aGFuIGBoYXNJdGVtYCwgY2FuIGJlIHVzZWQgdG8gY2hlY2sgaW50ZXJhY3Rpb25zIGVsZW1lbnRzIHRvb1xuICAgKiAgQHBhcmFtIHtET01FbGVtZW50fSAkZWxcbiAgICogIEByZXR1cm4ge2Jvb2x9XG4gICAqL1xuICBoYXNFbGVtZW50KCRlbCkge1xuICAgIGRvIHtcbiAgICAgIGlmICgkZWwgPT09IHRoaXMuJGVsKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuXG4gICAgICAkZWwgPSAkZWwucGFyZW50Tm9kZTtcbiAgICB9IHdoaWxlICgkZWwgIT09IG51bGwpO1xuXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLyoqXG4gICAqICByZXRyaWV2ZSBhbGwgdGhlICRpdGVtcyBpbiBhIGdpdmVuIGFyZWFcbiAgICogIEBwYXJhbSB7T2JqZWN0fSBhcmVhIC0gVGhlIGFyZWEgaW4gd2hpY2ggdG8gZmluZCB0aGUgZWxlbWVudHNcbiAgICogIEByZXR1cm4ge0FycmF5fSAtIGxpc3Qgb2YgdGhlIERPTSBlbGVtZW50cyBpbiB0aGUgZ2l2ZW4gYXJlYVxuICAgKi9cbiAgZ2V0SXRlbXNJbkFyZWEoYXJlYSkge1xuICAgIGNvbnN0IHN0YXJ0ICAgID0gdGhpcy50aW1lQ29udGV4dC5wYXJlbnQudGltZVRvUGl4ZWwodGhpcy50aW1lQ29udGV4dC5zdGFydCk7XG4gICAgY29uc3QgZHVyYXRpb24gPSB0aGlzLnRpbWVDb250ZXh0LnRpbWVUb1BpeGVsKHRoaXMudGltZUNvbnRleHQuZHVyYXRpb24pO1xuICAgIGNvbnN0IG9mZnNldCAgID0gdGhpcy50aW1lQ29udGV4dC50aW1lVG9QaXhlbCh0aGlzLnRpbWVDb250ZXh0Lm9mZnNldCk7XG4gICAgY29uc3QgdG9wICAgICAgPSB0aGlzLnBhcmFtcy50b3A7XG4gICAgLy8gYmUgYXdhcmUgYWYgY29udGV4dCdzIHRyYW5zbGF0aW9ucyAtIGNvbnN0cmFpbiBpbiB3b3JraW5nIHZpZXdcbiAgICBsZXQgeDEgPSBNYXRoLm1heChhcmVhLmxlZnQsIHN0YXJ0KTtcbiAgICBsZXQgeDIgPSBNYXRoLm1pbihhcmVhLmxlZnQgKyBhcmVhLndpZHRoLCBzdGFydCArIGR1cmF0aW9uKTtcbiAgICB4MSAtPSAoc3RhcnQgKyBvZmZzZXQpO1xuICAgIHgyIC09IChzdGFydCArIG9mZnNldCk7XG4gICAgLy8ga2VlcCBjb25zaXN0ZW50IHdpdGggY29udGV4dCB5IGNvb3JkaW5hdGVzIHN5c3RlbVxuICAgIGxldCB5MSA9IHRoaXMucGFyYW1zLmhlaWdodCAtIChhcmVhLnRvcCArIGFyZWEuaGVpZ2h0KTtcbiAgICBsZXQgeTIgPSB0aGlzLnBhcmFtcy5oZWlnaHQgLSBhcmVhLnRvcDtcblxuICAgIHkxICs9IHRoaXMucGFyYW1zLnRvcDtcbiAgICB5MiArPSB0aGlzLnBhcmFtcy50b3A7XG5cbiAgICBjb25zdCAkZmlsdGVyZWRJdGVtcyA9IFtdO1xuXG4gICAgZm9yIChsZXQgWyRpdGVtLCBkYXR1bV0gb2YgdGhpcy5fJGl0ZW1EYXRhTWFwLmVudHJpZXMoKSkge1xuICAgICAgY29uc3Qgc2hhcGUgPSB0aGlzLl8kaXRlbVNoYXBlTWFwLmdldCgkaXRlbSk7XG4gICAgICBjb25zdCBpbkFyZWEgPSBzaGFwZS5pbkFyZWEodGhpcy5fcmVuZGVyaW5nQ29udGV4dCwgZGF0dW0sIHgxLCB5MSwgeDIsIHkyKTtcblxuICAgICAgaWYgKGluQXJlYSkgeyAkZmlsdGVyZWRJdGVtcy5wdXNoKCRpdGVtKTsgfVxuICAgIH1cblxuICAgIHJldHVybiAkZmlsdGVyZWRJdGVtcztcbiAgfVxuXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vIFJlbmRlcmluZyAvIERpc3BsYXkgbWV0aG9kc1xuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIHJlbmRlcigpIHtcbiAgICAvLyByZW5kZXIgYGNvbW1vblNoYXBlYCBvbmx5IG9uY2VcbiAgICBpZiAoXG4gICAgICB0aGlzLl9jb21tb25TaGFwZUNvbmZpZ3VyYXRpb24gIT09IG51bGwgJiZcbiAgICAgIHRoaXMuXyRpdGVtQ29tbW9uU2hhcGVNYXAuc2l6ZSA9PT0gMFxuICAgICkge1xuICAgICAgY29uc3QgeyBjdG9yLCBhY2Nlc3NvcnMsIG9wdGlvbnMgfSA9IHRoaXMuX2NvbW1vblNoYXBlQ29uZmlndXJhdGlvbjtcbiAgICAgIGNvbnN0ICRncm91cCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyhucywgJ2cnKTtcbiAgICAgIGNvbnN0IHNoYXBlID0gbmV3IGN0b3Iob3B0aW9ucyk7XG5cbiAgICAgIHNoYXBlLmluc3RhbGwoYWNjZXNzb3JzKTtcbiAgICAgICRncm91cC5hcHBlbmRDaGlsZChzaGFwZS5yZW5kZXIoKSk7XG4gICAgICAkZ3JvdXAuY2xhc3NMaXN0LmFkZCgnaXRlbScsICdjb21tb24nLCBzaGFwZS5nZXRDbGFzc05hbWUoKSk7XG5cbiAgICAgIHRoaXMuXyRpdGVtQ29tbW9uU2hhcGVNYXAuc2V0KCRncm91cCwgc2hhcGUpO1xuICAgICAgdGhpcy4kb2Zmc2V0LmFwcGVuZENoaWxkKCRncm91cCk7XG4gICAgfVxuXG4gICAgLy8gYXBwZW5kIGVsZW1lbnRzIGFsbCBhdCBvbmNlXG4gICAgY29uc3QgZnJhZ21lbnQgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG4gICAgY29uc3QgdmFsdWVzID0gdGhpcy5fJGl0ZW1EYXRhTWFwLnZhbHVlcygpOyAvLyBpdGVyYXRvclxuXG4gICAgLy8gZW50ZXJcbiAgICB0aGlzLmRhdGEuZm9yRWFjaCgoZGF0dW0pID0+IHtcbiAgICAgIGZvciAobGV0IHZhbHVlIG9mIHZhbHVlcykgeyBpZiAodmFsdWUgPT09IGRhdHVtKSB7IHJldHVybjsgfSB9XG5cbiAgICAgIGNvbnN0IHsgY3RvciwgYWNjZXNzb3JzLCBvcHRpb25zIH0gPSB0aGlzLl9zaGFwZUNvbmZpZ3VyYXRpb247XG4gICAgICBjb25zdCBzaGFwZSA9IG5ldyBjdG9yKG9wdGlvbnMpO1xuICAgICAgc2hhcGUuaW5zdGFsbChhY2Nlc3NvcnMpO1xuXG4gICAgICBjb25zdCAkZWwgPSBzaGFwZS5yZW5kZXIodGhpcy5fcmVuZGVyaW5nQ29udGV4dCk7XG4gICAgICAkZWwuY2xhc3NMaXN0LmFkZCgnaXRlbScsIHNoYXBlLmdldENsYXNzTmFtZSgpKTtcblxuICAgICAgdGhpcy5fJGl0ZW1TaGFwZU1hcC5zZXQoJGVsLCBzaGFwZSk7XG4gICAgICB0aGlzLl8kaXRlbURhdGFNYXAuc2V0KCRlbCwgZGF0dW0pO1xuXG4gICAgICBmcmFnbWVudC5hcHBlbmRDaGlsZCgkZWwpO1xuICAgIH0pO1xuXG4gICAgdGhpcy4kb2Zmc2V0LmFwcGVuZENoaWxkKGZyYWdtZW50KTtcblxuICAgIC8vIHJlbW92ZVxuICAgIGZvciAobGV0IFskaXRlbSwgZGF0dW1dIG9mIHRoaXMuXyRpdGVtRGF0YU1hcC5lbnRyaWVzKCkpIHtcbiAgICAgIGlmICh0aGlzLmRhdGEuaW5kZXhPZihkYXR1bSkgIT09IC0xKSB7IGNvbnRpbnVlOyB9XG5cbiAgICAgIGNvbnN0IHNoYXBlID0gdGhpcy5fJGl0ZW1TaGFwZU1hcC5nZXQoJGl0ZW0pO1xuXG4gICAgICB0aGlzLiRvZmZzZXQucmVtb3ZlQ2hpbGQoJGl0ZW0pO1xuICAgICAgc2hhcGUuZGVzdHJveSgpO1xuICAgICAgLy8gYSByZW1vdmVkIGl0ZW0gY2Fubm90IGJlIHNlbGVjdGVkXG4gICAgICBpZiAodGhpcy5fYmVoYXZpb3IpIHtcbiAgICAgICAgdGhpcy5fYmVoYXZpb3IudW5zZWxlY3QoJGl0ZW0sIGRhdHVtKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5fJGl0ZW1EYXRhTWFwLmRlbGV0ZSgkaXRlbSk7XG4gICAgICB0aGlzLl8kaXRlbVNoYXBlTWFwLmRlbGV0ZSgkaXRlbSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqICB1cGRhdGVzIENvbnRleHQgYW5kIFNoYXBlc1xuICAgKi9cbiAgdXBkYXRlKCkge1xuICAgIHRoaXMudXBkYXRlQ29udGFpbmVyKCk7XG4gICAgdGhpcy51cGRhdGVTaGFwZXMoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiAgdXBkYXRlcyB0aGUgbGF5ZXIncyBjb250YWluZXJcbiAgICovXG4gIHVwZGF0ZUNvbnRhaW5lcigpIHtcbiAgICB0aGlzLl91cGRhdGVSZW5kZXJpbmdDb250ZXh0KCk7XG5cbiAgICBjb25zdCB0aW1lQ29udGV4dCA9IHRoaXMudGltZUNvbnRleHQ7XG4gICAgY29uc3Qgd2lkdGggID0gdGltZUNvbnRleHQudGltZVRvUGl4ZWwodGltZUNvbnRleHQuZHVyYXRpb24pO1xuICAgIC8vIHggaXMgcmVsYXRpdmUgdG8gdGltZWxpbmUncyB0aW1lQ29udGV4dFxuICAgIGNvbnN0IHggICAgICA9IHRpbWVDb250ZXh0LnBhcmVudC50aW1lVG9QaXhlbCh0aW1lQ29udGV4dC5zdGFydCk7XG4gICAgY29uc3Qgb2Zmc2V0ID0gdGltZUNvbnRleHQudGltZVRvUGl4ZWwodGltZUNvbnRleHQub2Zmc2V0KTtcbiAgICBjb25zdCB0b3AgICAgPSB0aGlzLnBhcmFtcy50b3A7XG4gICAgY29uc3QgaGVpZ2h0ID0gdGhpcy5wYXJhbXMuaGVpZ2h0O1xuICAgIC8vIG1hdHJpeCB0byBpbnZlcnQgdGhlIGNvb3JkaW5hdGUgc3lzdGVtXG4gICAgY29uc3QgdHJhbnNsYXRlTWF0cml4ID0gYG1hdHJpeCgxLCAwLCAwLCAtMSwgJHt4fSwgJHt0b3AgKyBoZWlnaHR9KWA7XG5cbiAgICB0aGlzLiRlbC5zZXRBdHRyaWJ1dGVOUyhudWxsLCAndHJhbnNmb3JtJywgdHJhbnNsYXRlTWF0cml4KTtcblxuICAgIHRoaXMuJGJvdW5kaW5nQm94LnNldEF0dHJpYnV0ZU5TKG51bGwsICd3aWR0aCcsIHdpZHRoKTtcbiAgICB0aGlzLiRib3VuZGluZ0JveC5zZXRBdHRyaWJ1dGVOUyhudWxsLCAnaGVpZ2h0JywgaGVpZ2h0KTtcbiAgICB0aGlzLiRib3VuZGluZ0JveC5zdHlsZS5vcGFjaXR5ID0gdGhpcy5wYXJhbXMub3BhY2l0eTtcblxuICAgIHRoaXMuJG9mZnNldC5zZXRBdHRyaWJ1dGVOUyhudWxsLCAndHJhbnNmb3JtJywgYHRyYW5zbGF0ZSgke29mZnNldH0sIDApYCk7XG4gICAgLy8gbWFpbnRhaW4gY29udGV4dCBzaGFwZVxuICAgIHRoaXMuY29udGV4dFNoYXBlLnVwZGF0ZSh0aGlzLl9yZW5kZXJpbmdDb250ZXh0LCB0aGlzLnRpbWVDb250ZXh0LCAwKTtcbiAgfVxuXG4gIC8qKlxuICAgKiAgdXBkYXRlcyB0aGUgU2hhcGVzIHdoaWNoIGJlbG9uZ3MgdG8gdGhlIGxheWVyXG4gICAqICBAcGFyYW0ge0RPTUVsZW1lbnR9ICRlbCAtIE5vdCBpbXBsZW1lbnRlZFxuICAgKi9cbiAgdXBkYXRlU2hhcGVzKCRlbCA9IG51bGwpIHtcbiAgICB0aGlzLl91cGRhdGVSZW5kZXJpbmdDb250ZXh0KCk7XG4gICAgLy8gdXBkYXRlIGNvbW1vbiBzaGFwZXNcbiAgICB0aGlzLl8kaXRlbUNvbW1vblNoYXBlTWFwLmZvckVhY2goKHNoYXBlLCAkaXRlbSkgPT4ge1xuICAgICAgc2hhcGUudXBkYXRlKHRoaXMuX3JlbmRlcmluZ0NvbnRleHQsIHRoaXMuZGF0YSk7XG4gICAgfSk7XG5cbiAgICBmb3IgKGxldCBbJGl0ZW0sIGRhdHVtXSBvZiB0aGlzLl8kaXRlbURhdGFNYXAuZW50cmllcygpKSB7XG4gICAgICBjb25zdCBzaGFwZSA9IHRoaXMuXyRpdGVtU2hhcGVNYXAuZ2V0KCRpdGVtKTtcbiAgICAgIHNoYXBlLnVwZGF0ZSh0aGlzLl9yZW5kZXJpbmdDb250ZXh0LCBkYXR1bSk7XG4gICAgfVxuICB9XG59XG4iXX0=