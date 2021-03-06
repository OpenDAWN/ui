'use strict';

var _createClass = require('babel-runtime/helpers/create-class')['default'];

var _classCallCheck = require('babel-runtime/helpers/class-call-check')['default'];

var _toConsumableArray = require('babel-runtime/helpers/to-consumable-array')['default'];

var _Set = require('babel-runtime/core-js/set')['default'];

var _Object$assign = require('babel-runtime/core-js/object/assign')['default'];

Object.defineProperty(exports, '__esModule', {
  value: true
});

var BaseBehavior = (function () {
  function BaseBehavior() {
    var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    _classCallCheck(this, BaseBehavior);

    this._selectedItems = new _Set(); // no duplicate in Set
    this._selectedClass = options.selectedClass || 'selected';
    this._layer = null;

    this._params = _Object$assign({}, this.getDefaults(), options);
  }

  _createClass(BaseBehavior, [{
    key: 'initialize',
    value: function initialize(layer) {
      this._layer = layer;
    }
  }, {
    key: 'destroy',
    value: function destroy() {
      // clean all items in `this._selectedItems`
    }
  }, {
    key: 'getDefaults',
    value: function getDefaults() {
      return {};
    }
  }, {
    key: 'select',

    /**
     *  @param item {DOMElement} the item to select
     *  @param datum {Object} the related datum (@NOTE remove it ?)
     */
    value: function select($item, datum) {
      $item.classList.add(this.selectedClass);
      this._selectedItems.add($item);
    }

    /**
     *  @param item {DOMElement} the item to select
     *  @param datum {Object} the related datum (@NOTE remove it ?)
     */
  }, {
    key: 'unselect',
    value: function unselect($item, datum) {
      $item.classList.remove(this.selectedClass);
      this._selectedItems['delete']($item);
    }

    /**
     *  @NOTE is this really usefull ?
     *  @param item {DOMElement} the item to select
     *  @param datum {Object} the related datum (@NOTE remove it ?)
     */
  }, {
    key: 'toggleSelection',
    value: function toggleSelection($item, datum) {
      var method = this._selectedItems.has($item) ? 'unselect' : 'select';
      this[method]($item);
    }

    /**
     *  Edition behavior
     */
  }, {
    key: 'edit',
    value: function edit(renderingContext, shape, datum, dx, dy, target) {
      // must be implemented in children
    }
  }, {
    key: 'selectedClass',
    set: function set(value) {
      this._selectedClass = value;
    },
    get: function get() {
      return this._selectedClass;
    }
  }, {
    key: 'selectedItems',
    get: function get() {
      return [].concat(_toConsumableArray(this._selectedItems));
    }
  }]);

  return BaseBehavior;
})();

exports['default'] = BaseBehavior;
module.exports = exports['default'];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImVzNi9iZWhhdmlvcnMvYmFzZS1iZWhhdmlvci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7O0lBQXFCLFlBQVk7QUFDcEIsV0FEUSxZQUFZLEdBQ0w7UUFBZCxPQUFPLHlEQUFHLEVBQUU7OzBCQURMLFlBQVk7O0FBRTdCLFFBQUksQ0FBQyxjQUFjLEdBQUcsVUFBUyxDQUFDO0FBQ2hDLFFBQUksQ0FBQyxjQUFjLEdBQUcsT0FBTyxDQUFDLGFBQWEsSUFBSSxVQUFVLENBQUM7QUFDMUQsUUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUM7O0FBRW5CLFFBQUksQ0FBQyxPQUFPLEdBQUcsZUFBYyxFQUFFLEVBQUUsSUFBSSxDQUFDLFdBQVcsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0dBQy9EOztlQVBrQixZQUFZOztXQVNyQixvQkFBQyxLQUFLLEVBQUU7QUFDaEIsVUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUM7S0FDckI7OztXQUVNLG1CQUFHOztLQUVUOzs7V0FFVSx1QkFBRztBQUNaLGFBQU8sRUFBRSxDQUFDO0tBQ1g7Ozs7Ozs7O1dBa0JLLGdCQUFDLEtBQUssRUFBRSxLQUFLLEVBQUU7QUFDbkIsV0FBSyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO0FBQ3hDLFVBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO0tBQ2hDOzs7Ozs7OztXQU1PLGtCQUFDLEtBQUssRUFBRSxLQUFLLEVBQUU7QUFDckIsV0FBSyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO0FBQzNDLFVBQUksQ0FBQyxjQUFjLFVBQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztLQUNuQzs7Ozs7Ozs7O1dBT2MseUJBQUMsS0FBSyxFQUFFLEtBQUssRUFBRTtBQUM1QixVQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxVQUFVLEdBQUcsUUFBUSxDQUFDO0FBQ3RFLFVBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztLQUNyQjs7Ozs7OztXQUtHLGNBQUMsZ0JBQWdCLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRTs7S0FFcEQ7OztTQTdDZ0IsYUFBQyxLQUFLLEVBQUU7QUFDdkIsVUFBSSxDQUFDLGNBQWMsR0FBRyxLQUFLLENBQUM7S0FDN0I7U0FFZ0IsZUFBRztBQUNsQixhQUFPLElBQUksQ0FBQyxjQUFjLENBQUM7S0FDNUI7OztTQUVnQixlQUFHO0FBQ2xCLDBDQUFXLElBQUksQ0FBQyxjQUFjLEdBQUU7S0FDakM7OztTQS9Ca0IsWUFBWTs7O3FCQUFaLFlBQVkiLCJmaWxlIjoiZXM2L2JlaGF2aW9ycy9iYXNlLWJlaGF2aW9yLmpzIiwic291cmNlc0NvbnRlbnQiOlsiZXhwb3J0IGRlZmF1bHQgY2xhc3MgQmFzZUJlaGF2aW9yIHtcbiAgY29uc3RydWN0b3Iob3B0aW9ucyA9IHt9KSB7XG4gICAgdGhpcy5fc2VsZWN0ZWRJdGVtcyA9IG5ldyBTZXQoKTsgLy8gbm8gZHVwbGljYXRlIGluIFNldFxuICAgIHRoaXMuX3NlbGVjdGVkQ2xhc3MgPSBvcHRpb25zLnNlbGVjdGVkQ2xhc3MgfHzCoCdzZWxlY3RlZCc7XG4gICAgdGhpcy5fbGF5ZXIgPSBudWxsO1xuXG4gICAgdGhpcy5fcGFyYW1zID0gT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5nZXREZWZhdWx0cygpLCBvcHRpb25zKTtcbiAgfVxuXG4gIGluaXRpYWxpemUobGF5ZXIpIHtcbiAgICB0aGlzLl9sYXllciA9IGxheWVyO1xuICB9XG5cbiAgZGVzdHJveSgpIHtcbiAgICAvLyBjbGVhbiBhbGwgaXRlbXMgaW4gYHRoaXMuX3NlbGVjdGVkSXRlbXNgXG4gIH1cblxuICBnZXREZWZhdWx0cygpIHtcbiAgICByZXR1cm4ge307XG4gIH1cblxuICBzZXQgc2VsZWN0ZWRDbGFzcyh2YWx1ZSkge1xuICAgIHRoaXMuX3NlbGVjdGVkQ2xhc3MgPSB2YWx1ZTtcbiAgfVxuXG4gIGdldCBzZWxlY3RlZENsYXNzKCkge1xuICAgIHJldHVybiB0aGlzLl9zZWxlY3RlZENsYXNzO1xuICB9XG5cbiAgZ2V0IHNlbGVjdGVkSXRlbXMoKSB7XG4gICAgcmV0dXJuIFsuLi50aGlzLl9zZWxlY3RlZEl0ZW1zXTtcbiAgfVxuXG4gIC8qKlxuICAgKiAgQHBhcmFtIGl0ZW0ge0RPTUVsZW1lbnR9IHRoZSBpdGVtIHRvIHNlbGVjdFxuICAgKiAgQHBhcmFtIGRhdHVtIHtPYmplY3R9IHRoZSByZWxhdGVkIGRhdHVtIChATk9URSByZW1vdmUgaXQgPylcbiAgICovXG4gIHNlbGVjdCgkaXRlbSwgZGF0dW0pIHtcbiAgICAkaXRlbS5jbGFzc0xpc3QuYWRkKHRoaXMuc2VsZWN0ZWRDbGFzcyk7XG4gICAgdGhpcy5fc2VsZWN0ZWRJdGVtcy5hZGQoJGl0ZW0pO1xuICB9XG5cbiAgLyoqXG4gICAqICBAcGFyYW0gaXRlbSB7RE9NRWxlbWVudH0gdGhlIGl0ZW0gdG8gc2VsZWN0XG4gICAqICBAcGFyYW0gZGF0dW0ge09iamVjdH0gdGhlIHJlbGF0ZWQgZGF0dW0gKEBOT1RFIHJlbW92ZSBpdCA/KVxuICAgKi9cbiAgdW5zZWxlY3QoJGl0ZW0sIGRhdHVtKSB7XG4gICAgJGl0ZW0uY2xhc3NMaXN0LnJlbW92ZSh0aGlzLnNlbGVjdGVkQ2xhc3MpO1xuICAgIHRoaXMuX3NlbGVjdGVkSXRlbXMuZGVsZXRlKCRpdGVtKTtcbiAgfVxuXG4gIC8qKlxuICAgKiAgQE5PVEUgaXMgdGhpcyByZWFsbHkgdXNlZnVsbCA/XG4gICAqICBAcGFyYW0gaXRlbSB7RE9NRWxlbWVudH0gdGhlIGl0ZW0gdG8gc2VsZWN0XG4gICAqICBAcGFyYW0gZGF0dW0ge09iamVjdH0gdGhlIHJlbGF0ZWQgZGF0dW0gKEBOT1RFIHJlbW92ZSBpdCA/KVxuICAgKi9cbiAgdG9nZ2xlU2VsZWN0aW9uKCRpdGVtLCBkYXR1bSkge1xuICAgIGNvbnN0IG1ldGhvZCA9IHRoaXMuX3NlbGVjdGVkSXRlbXMuaGFzKCRpdGVtKSA/ICd1bnNlbGVjdCcgOiAnc2VsZWN0JztcbiAgICB0aGlzW21ldGhvZF0oJGl0ZW0pO1xuICB9XG5cbiAgLyoqXG4gICAqICBFZGl0aW9uIGJlaGF2aW9yXG4gICAqL1xuICBlZGl0KHJlbmRlcmluZ0NvbnRleHQsIHNoYXBlLCBkYXR1bSwgZHgsIGR5LCB0YXJnZXQpIHtcbiAgICAvLyBtdXN0IGJlIGltcGxlbWVudGVkIGluIGNoaWxkcmVuXG4gIH1cbn1cbiJdfQ==