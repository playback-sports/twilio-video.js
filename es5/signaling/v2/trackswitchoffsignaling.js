'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var MediaSignaling = require('./mediasignaling');

/**
 * @emits TrackSwitchOffSignalinging#updated
 */

var TrackSwitchOffSignaling = function (_MediaSignaling) {
  _inherits(TrackSwitchOffSignaling, _MediaSignaling);

  /**
   * Construct a {@link TrackSwitchOffSignaling}.
   * @param {Promise<DataTrackReceiver>} getReceiver
   */
  function TrackSwitchOffSignaling(getReceiver, options) {
    _classCallCheck(this, TrackSwitchOffSignaling);

    var _this = _possibleConstructorReturn(this, (TrackSwitchOffSignaling.__proto__ || Object.getPrototypeOf(TrackSwitchOffSignaling)).call(this, getReceiver, 'track_switch_off', options));

    _this.on('ready', function (transport) {
      transport.on('message', function (message) {
        switch (message.type) {
          case 'track_switch_off':
            _this._setTrackSwitchOffUpdates(message.off || [], message.on || []);
            break;
          default:
            break;
        }
      });
    });
    return _this;
  }

  /**
   * @private
   * @param {[Track.SID]} tracksSwitchedOff
   * @param {[Track.SID]} tracksSwitchedOn
   * @returns {void}
   */


  _createClass(TrackSwitchOffSignaling, [{
    key: '_setTrackSwitchOffUpdates',
    value: function _setTrackSwitchOffUpdates(tracksSwitchedOff, tracksSwitchedOn) {
      this.emit('updated', tracksSwitchedOff, tracksSwitchedOn);
    }
  }]);

  return TrackSwitchOffSignaling;
}(MediaSignaling);

/**
 * @event TrackSwitchOffSignaling#updated
 */

module.exports = TrackSwitchOffSignaling;