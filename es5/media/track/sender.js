'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var MediaTrackTransceiver = require('./transceiver');

/**
 * A {@link MediaTrackSender} represents one or more local RTCRtpSenders.
 * @extends MediaTrackTransceiver
 */

var MediaTrackSender = function (_MediaTrackTransceive) {
  _inherits(MediaTrackSender, _MediaTrackTransceive);

  /**
   * Construct a {@link MediaTrackSender}.
   * @param {MediaStreamTrack} mediaStreamTrack
   */
  function MediaTrackSender(mediaStreamTrack) {
    _classCallCheck(this, MediaTrackSender);

    var _this = _possibleConstructorReturn(this, (MediaTrackSender.__proto__ || Object.getPrototypeOf(MediaTrackSender)).call(this, mediaStreamTrack.id, mediaStreamTrack));

    Object.defineProperties(_this, {
      _clones: {
        value: new Set()
      },
      _senders: {
        value: new Set()
      },
      isPublishing: {
        get: function get() {
          return !!this._clones.size;
        }
      }
    });
    return _this;
  }

  /**
   * Return a new {@link MediaTrackSender} containing a clone of the underlying
   * MediaStreamTrack. No RTCRtpSenders are copied.
   * @returns {MediaTrackSender}
   */


  _createClass(MediaTrackSender, [{
    key: 'clone',
    value: function clone() {
      var clone = new MediaTrackSender(this.track.clone());
      this._clones.add(clone);
      return clone;
    }

    /**
     * Remove a cloned {@link MediaTrackSender}.
     * @returns {void}
     */

  }, {
    key: 'removeClone',
    value: function removeClone(clone) {
      this._clones.delete(clone);
    }

    /**
     * Set the given MediaStreamTrack.
     * @param {MediaStreamTrack} mediaStreamTrack
     * @returns {Promise<void>}
     */

  }, {
    key: 'setMediaStreamTrack',
    value: function setMediaStreamTrack(mediaStreamTrack) {
      var _this2 = this;

      var clones = Array.from(this._clones);
      var senders = Array.from(this._senders);
      return Promise.all(clones.map(function (clone) {
        return clone.setMediaStreamTrack(mediaStreamTrack.clone());
      }).concat(senders.map(function (sender) {
        return sender.replaceTrack(mediaStreamTrack);
      }))).finally(function () {
        _this2._track = mediaStreamTrack;
      });
    }

    /**
     * Add an RTCRtpSender.
     * @param {RTCRtpSender} sender
     * @returns {this}
     */

  }, {
    key: 'addSender',
    value: function addSender(sender) {
      this._senders.add(sender);
      return this;
    }

    /**
     * Remove an RTCRtpSender.
     * @param {RTCRtpSender} sender
     * @returns {this}
     */

  }, {
    key: 'removeSender',
    value: function removeSender(sender) {
      this._senders.delete(sender);
      return this;
    }
  }]);

  return MediaTrackSender;
}(MediaTrackTransceiver);

module.exports = MediaTrackSender;