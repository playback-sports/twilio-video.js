'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var DominantSpeakerSignaling = require('./dominantspeakersignaling');
var NetworkQualityMonitor = require('./networkqualitymonitor');
var NetworkQualitySignaling = require('./networkqualitysignaling');
var RecordingV2 = require('./recording');
var RoomSignaling = require('../room');
var RemoteParticipantV2 = require('./remoteparticipant');
var StatsReport = require('../../stats/statsreport');
var TrackPrioritySignaling = require('./trackprioritysignaling');
var TrackSwitchOffSignaling = require('./trackswitchoffsignaling');
var RenderHintsSignaling = require('./renderhintssignaling');

var _require = require('../../util'),
    DEFAULT_SESSION_TIMEOUT_SEC = _require.constants.DEFAULT_SESSION_TIMEOUT_SEC,
    createBandwidthProfilePayload = _require.createBandwidthProfilePayload,
    defer = _require.defer,
    difference = _require.difference,
    filterObject = _require.filterObject,
    flatMap = _require.flatMap,
    oncePerTick = _require.oncePerTick;

var MovingAverageDelta = require('../../util/movingaveragedelta');

var _require2 = require('../../util/twilio-video-errors'),
    createTwilioError = _require2.createTwilioError;

var STATS_PUBLISH_INTERVAL_MS = 10000;

/**
 * @extends RoomSignaling
 */

var RoomV2 = function (_RoomSignaling) {
  _inherits(RoomV2, _RoomSignaling);

  function RoomV2(localParticipant, initialState, transport, peerConnectionManager, options) {
    _classCallCheck(this, RoomV2);

    initialState.options = Object.assign({
      session_timeout: DEFAULT_SESSION_TIMEOUT_SEC
    }, initialState.options);

    options = Object.assign({
      DominantSpeakerSignaling: DominantSpeakerSignaling,
      NetworkQualityMonitor: NetworkQualityMonitor,
      NetworkQualitySignaling: NetworkQualitySignaling,
      RecordingSignaling: RecordingV2,
      RemoteParticipantV2: RemoteParticipantV2,
      TrackPrioritySignaling: TrackPrioritySignaling,
      TrackSwitchOffSignaling: TrackSwitchOffSignaling,
      bandwidthProfile: null,
      sessionTimeout: initialState.options.session_timeout * 1000,
      statsPublishIntervalMs: STATS_PUBLISH_INTERVAL_MS
    }, options);

    localParticipant.setBandwidthProfile(options.bandwidthProfile);
    peerConnectionManager.setIceReconnectTimeout(options.sessionTimeout);

    var _this = _possibleConstructorReturn(this, (RoomV2.__proto__ || Object.getPrototypeOf(RoomV2)).call(this, localParticipant, initialState.sid, initialState.name, options));

    var getTrackReceiver = function getTrackReceiver(id) {
      return _this._getTrackReceiver(id);
    };
    var log = _this._log;

    Object.defineProperties(_this, {
      _disconnectedParticipantRevisions: {
        value: new Map()
      },
      _NetworkQualityMonitor: {
        value: options.NetworkQualityMonitor
      },
      _lastBandwidthProfileRevision: {
        value: localParticipant.bandwidthProfileRevision,
        writable: true
      },
      _networkQualityMonitor: {
        value: null,
        writable: true
      },
      _networkQualityConfiguration: {
        value: localParticipant.networkQualityConfiguration
      },
      _peerConnectionManager: {
        value: peerConnectionManager
      },
      _published: {
        value: new Map()
      },
      _publishedRevision: {
        value: 0,
        writable: true
      },
      _RemoteParticipantV2: {
        value: options.RemoteParticipantV2
      },
      _subscribed: {
        value: new Map()
      },
      _subscribedRevision: {
        value: 0,
        writable: true
      },
      _subscriptionFailures: {
        value: new Map()
      },
      _dominantSpeakerSignaling: {
        value: new options.DominantSpeakerSignaling(getTrackReceiver, { log: log })
      },
      _networkQualitySignaling: {
        value: new options.NetworkQualitySignaling(getTrackReceiver, localParticipant.networkQualityConfiguration, { log: log })
      },
      _renderHintsSignaling: {
        value: new RenderHintsSignaling(getTrackReceiver, { log: log })
      },
      _trackPrioritySignaling: {
        value: new options.TrackPrioritySignaling(getTrackReceiver, { log: log })
      },
      _trackSwitchOffSignaling: {
        value: new options.TrackSwitchOffSignaling(getTrackReceiver, { log: log })
      },
      _pendingSwitchOffStates: {
        value: new Map()
      },
      _transport: {
        value: transport
      },
      _trackReceiverDeferreds: {
        value: new Map()
      },
      mediaRegion: {
        enumerable: true,
        value: initialState.options.media_region || null
      }
    });

    _this._initTrackSwitchOffSignaling();
    _this._initDominantSpeakerSignaling();
    _this._initNetworkQualityMonitorSignaling();

    handleLocalParticipantEvents(_this, localParticipant);
    handlePeerConnectionEvents(_this, peerConnectionManager);
    handleTransportEvents(_this, transport);
    periodicallyPublishStats(_this, transport, options.statsPublishIntervalMs);

    _this._update(initialState);
    return _this;
  }

  /**
   * The PeerConnection state.
   * @property {RTCPeerConnectionState}
   */


  _createClass(RoomV2, [{
    key: '_deleteTrackReceiverDeferred',


    /**
     * @private
     */
    value: function _deleteTrackReceiverDeferred(id) {
      return this._trackReceiverDeferreds.delete(id);
    }

    /**
     * @private
     */

  }, {
    key: '_getOrCreateTrackReceiverDeferred',
    value: function _getOrCreateTrackReceiverDeferred(id) {
      var deferred = this._trackReceiverDeferreds.get(id) || defer();
      var trackReceivers = this._peerConnectionManager.getTrackReceivers();

      // NOTE(mmalavalli): In Firefox, there can be instances where a MediaStreamTrack
      // for the given Track ID already exists, for example, when a Track is removed
      // and added back. If that is the case, then we should resolve 'deferred'.
      var trackReceiver = trackReceivers.find(function (trackReceiver) {
        return trackReceiver.id === id && trackReceiver.readyState !== 'ended';
      });

      if (trackReceiver) {
        deferred.resolve(trackReceiver);
      } else {
        // NOTE(mmalavalli): Only add the 'deferred' to the map if it's not
        // resolved. This will prevent old copies of the MediaStreamTrack from
        // being used when the remote peer removes and re-adds a MediaStreamTrack.
        this._trackReceiverDeferreds.set(id, deferred);
      }

      return deferred;
    }

    /**
     * @private
     */

  }, {
    key: '_addTrackReceiver',
    value: function _addTrackReceiver(trackReceiver) {
      var deferred = this._getOrCreateTrackReceiverDeferred(trackReceiver.id);
      deferred.resolve(trackReceiver);
      return this;
    }

    /**
     * @private
     */

  }, {
    key: '_disconnect',
    value: function _disconnect(error) {
      var didDisconnect = _get(RoomV2.prototype.__proto__ || Object.getPrototypeOf(RoomV2.prototype), '_disconnect', this).call(this, error);
      if (didDisconnect) {
        this._teardownNetworkQualityMonitor();
        this._transport.disconnect();
        this._peerConnectionManager.close();
      }

      this.localParticipant.tracks.forEach(function (track) {
        track.publishFailed(error || new Error('LocalParticipant disconnected'));
      });

      return didDisconnect;
    }

    /**
     * @private
     */

  }, {
    key: '_getTrackReceiver',
    value: function _getTrackReceiver(id) {
      var _this2 = this;

      return this._getOrCreateTrackReceiverDeferred(id).promise.then(function (trackReceiver) {
        _this2._deleteTrackReceiverDeferred(id);
        return trackReceiver;
      });
    }

    /**
     * @private
     */

  }, {
    key: '_getInitialTrackSwitchOffState',
    value: function _getInitialTrackSwitchOffState(trackSid) {
      var initiallySwitchedOff = this._pendingSwitchOffStates.get(trackSid) || false;
      this._pendingSwitchOffStates.delete(trackSid);
      if (initiallySwitchedOff) {
        this._log.warn('[' + trackSid + '] was initially switched off! ');
      }
      return initiallySwitchedOff;
    }

    /**
     * @private
     */

  }, {
    key: '_getTrackSidsToTrackSignalings',
    value: function _getTrackSidsToTrackSignalings() {
      var trackSidsToTrackSignalings = flatMap(this.participants, function (participant) {
        return Array.from(participant.tracks);
      });
      return new Map(trackSidsToTrackSignalings);
    }

    /**
     * @private
     */

  }, {
    key: '_getOrCreateRemoteParticipant',
    value: function _getOrCreateRemoteParticipant(participantState) {
      var _this3 = this;

      var RemoteParticipantV2 = this._RemoteParticipantV2;
      var participant = this.participants.get(participantState.sid);
      var self = this;
      if (!participant) {
        participant = new RemoteParticipantV2(participantState, function (trackSid) {
          return _this3._getInitialTrackSwitchOffState(trackSid);
        }, function (trackSid, priority) {
          return _this3._trackPrioritySignaling.sendTrackPriorityUpdate(trackSid, 'subscribe', priority);
        }, function (trackSid, hint) {
          return _this3._renderHintsSignaling.setTrackHint(trackSid, hint);
        }, function (trackSid) {
          return _this3._renderHintsSignaling.clearTrackHint(trackSid);
        });
        participant.on('stateChanged', function stateChanged(state) {
          if (state === 'disconnected') {
            participant.removeListener('stateChanged', stateChanged);
            self.participants.delete(participant.sid);
            self._disconnectedParticipantRevisions.set(participant.sid, participant.revision);
          }
        });
        this.connectParticipant(participant);
      }
      return participant;
    }

    /**
     * @private
     */

  }, {
    key: '_getState',
    value: function _getState() {
      return {
        participant: this.localParticipant.getState()
      };
    }

    /**
     * @private
     */

  }, {
    key: '_maybeAddBandwidthProfile',
    value: function _maybeAddBandwidthProfile(update) {
      var _localParticipant = this.localParticipant,
          bandwidthProfile = _localParticipant.bandwidthProfile,
          bandwidthProfileRevision = _localParticipant.bandwidthProfileRevision;

      if (bandwidthProfile && this._lastBandwidthProfileRevision < bandwidthProfileRevision) {
        this._lastBandwidthProfileRevision = bandwidthProfileRevision;
        return Object.assign({
          bandwidth_profile: createBandwidthProfilePayload(bandwidthProfile)
        }, update);
      }
      return update;
    }
    /**
     * @private
     */

  }, {
    key: '_publishNewLocalParticipantState',
    value: function _publishNewLocalParticipantState() {
      this._transport.publish(this._maybeAddBandwidthProfile(this._getState()));
    }

    /**
     * @private
     */

  }, {
    key: '_publishPeerConnectionState',
    value: function _publishPeerConnectionState(peerConnectionState) {
      /* eslint camelcase:0 */
      this._transport.publish(Object.assign({
        peer_connections: [peerConnectionState]
      }, this._getState()));
    }

    /**
     * @private
     */

  }, {
    key: '_update',
    value: function _update(roomState) {
      var _this4 = this;

      if (roomState.subscribed && roomState.subscribed.revision > this._subscribedRevision) {
        this._subscribedRevision = roomState.subscribed.revision;
        roomState.subscribed.tracks.forEach(function (trackState) {
          if (trackState.id) {
            _this4._subscriptionFailures.delete(trackState.sid);
            _this4._subscribed.set(trackState.sid, trackState.id);
          } else if (trackState.error && !_this4._subscriptionFailures.has(trackState.sid)) {
            _this4._subscriptionFailures.set(trackState.sid, trackState.error);
          }
        });

        var subscribedTrackSids = new Set(roomState.subscribed.tracks.filter(function (trackState) {
          return !!trackState.id;
        }).map(function (trackState) {
          return trackState.sid;
        }));

        this._subscribed.forEach(function (trackId, trackSid) {
          if (!subscribedTrackSids.has(trackSid)) {
            _this4._subscribed.delete(trackSid);
          }
        });
      }

      var participantsToKeep = new Set();

      // eslint-disable-next-line no-warning-comments
      // TODO(mroberts): Remove me once the Server is fixed.
      (roomState.participants || []).forEach(function (participantState) {
        if (participantState.sid === _this4.localParticipant.sid) {
          return;
        }

        // NOTE(mmalavalli): If the incoming revision for a disconnected Participant is less than or
        // equal to the revision when it was disconnected, then the state is old and can be ignored.
        // Otherwise, the Participant was most likely disconnected in a Large Group Room when it
        // stopped publishing media, and hence needs to be re-added.
        var disconnectedParticipantRevision = _this4._disconnectedParticipantRevisions.get(participantState.sid);
        if (disconnectedParticipantRevision && participantState.revision <= disconnectedParticipantRevision) {
          return;
        }

        if (disconnectedParticipantRevision) {
          _this4._disconnectedParticipantRevisions.delete(participantState.sid);
        }
        var participant = _this4._getOrCreateRemoteParticipant(participantState);
        participant.update(participantState);
        participantsToKeep.add(participant);
      });

      if (roomState.type === 'synced') {
        this.participants.forEach(function (participant) {
          if (!participantsToKeep.has(participant)) {
            participant.disconnect();
          }
        });
      }

      handleSubscriptions(this);

      // eslint-disable-next-line no-warning-comments
      // TODO(mroberts): Remove me once the Server is fixed.
      /* eslint camelcase:0 */
      if (roomState.peer_connections) {
        this._peerConnectionManager.update(roomState.peer_connections, roomState.type === 'synced');
      }

      if (roomState.recording) {
        this.recording.update(roomState.recording);
      }

      if (roomState.published && roomState.published.revision > this._publishedRevision) {
        this._publishedRevision = roomState.published.revision;
        roomState.published.tracks.forEach(function (track) {
          if (track.sid) {
            _this4._published.set(track.id, track.sid);
          }
        });
        this.localParticipant.update(roomState.published);
      }

      if (roomState.participant) {
        this.localParticipant.connect(roomState.participant.sid, roomState.participant.identity);
      }

      [this._dominantSpeakerSignaling, this._networkQualitySignaling, this._trackPrioritySignaling, this._trackSwitchOffSignaling, this._renderHintsSignaling].forEach(function (mediaSignaling) {
        var channel = mediaSignaling.channel;
        if (!mediaSignaling.isSetup && roomState.media_signaling && roomState.media_signaling[channel] && roomState.media_signaling[channel].transport && roomState.media_signaling[channel].transport.type === 'data-channel') {
          mediaSignaling.setup(roomState.media_signaling[channel].transport.label);
        }
      });

      return this;
    }
  }, {
    key: '_initTrackSwitchOffSignaling',
    value: function _initTrackSwitchOffSignaling() {
      var _this5 = this;

      this._trackSwitchOffSignaling.on('updated', function (tracksOff, tracksOn) {
        try {
          _this5._log.debug('received trackSwitch: ', { tracksOn: tracksOn, tracksOff: tracksOff });
          var trackUpdates = new Map();
          tracksOn.forEach(function (trackSid) {
            return trackUpdates.set(trackSid, true);
          });
          tracksOff.forEach(function (trackSid) {
            if (trackUpdates.get(trackSid)) {
              // NOTE(mpatwardhan): This means that VIDEO-3762 has been reproduced.
              _this5._log.warn(trackSid + ' is DUPLICATED in both tracksOff and tracksOn list');
            }
            trackUpdates.set(trackSid, false);
          });
          _this5.participants.forEach(function (participant) {
            participant.tracks.forEach(function (track) {
              var isOn = trackUpdates.get(track.sid);
              if (typeof isOn !== 'undefined') {
                track.setSwitchedOff(!isOn);
                trackUpdates.delete(track.sid);
              }
            });
          });
          // NOTE(mpatwardhan): Cache any notification about the tracks that we do not yet know about.
          trackUpdates.forEach(function (isOn, trackSid) {
            return _this5._pendingSwitchOffStates.set(trackSid, !isOn);
          });
        } catch (ex) {
          _this5._log.error('error processing track switch off:', ex);
        }
      });
    }
  }, {
    key: '_initDominantSpeakerSignaling',
    value: function _initDominantSpeakerSignaling() {
      var _this6 = this;

      this._dominantSpeakerSignaling.on('updated', function () {
        return _this6.setDominantSpeaker(_this6._dominantSpeakerSignaling.loudestParticipantSid);
      });
    }
  }, {
    key: '_initNetworkQualityMonitorSignaling',
    value: function _initNetworkQualityMonitorSignaling() {
      var _this7 = this;

      this._networkQualitySignaling.on('ready', function () {
        var networkQualityMonitor = new _this7._NetworkQualityMonitor(_this7._peerConnectionManager, _this7._networkQualitySignaling);
        _this7._networkQualityMonitor = networkQualityMonitor;
        networkQualityMonitor.on('updated', function () {
          if (_this7.iceConnectionState === 'failed') {
            return;
          }
          _this7.localParticipant.setNetworkQualityLevel(networkQualityMonitor.level, networkQualityMonitor.levels);
          _this7.participants.forEach(function (participant) {
            var levels = networkQualityMonitor.remoteLevels.get(participant.sid);
            if (levels) {
              participant.setNetworkQualityLevel(levels.level, levels);
            }
          });
        });
        networkQualityMonitor.start();
      });
      this._networkQualitySignaling.on('teardown', function () {
        return _this7._teardownNetworkQualityMonitor();
      });
    }
  }, {
    key: '_teardownNetworkQualityMonitor',
    value: function _teardownNetworkQualityMonitor() {
      if (this._networkQualityMonitor) {
        this._networkQualityMonitor.stop();
        this._networkQualityMonitor = null;
      }
    }

    /**
     * Get the {@link RoomV2}'s media statistics.
     * @returns {Promise.<Map<PeerConnectionV2#id, StandardizedStatsResponse>>}
     */

  }, {
    key: 'getStats',
    value: function getStats() {
      var _this8 = this;

      return this._peerConnectionManager.getStats().then(function (responses) {
        return new Map(Array.from(responses).map(function (_ref) {
          var _ref2 = _slicedToArray(_ref, 2),
              id = _ref2[0],
              response = _ref2[1];

          return [id, Object.assign({}, response, {
            localAudioTrackStats: filterAndAddLocalTrackSids(_this8, response.localAudioTrackStats),
            localVideoTrackStats: filterAndAddLocalTrackSids(_this8, response.localVideoTrackStats),
            remoteAudioTrackStats: filterAndAddRemoteTrackSids(_this8, response.remoteAudioTrackStats),
            remoteVideoTrackStats: filterAndAddRemoteTrackSids(_this8, response.remoteVideoTrackStats)
          })];
        }));
      });
    }
  }, {
    key: 'connectionState',
    get: function get() {
      return this._peerConnectionManager.connectionState;
    }

    /**
     * The Signaling Connection State.
     * @property {string} - "connected", "reconnecting", "disconnected"
     */

  }, {
    key: 'signalingConnectionState',
    get: function get() {
      return this._transport.state === 'syncing' ? 'reconnecting' : this._transport.state;
    }

    /**
     * The Ice Connection State.
     * @property {RTCIceConnectionState}
     */

  }, {
    key: 'iceConnectionState',
    get: function get() {
      return this._peerConnectionManager.iceConnectionState;
    }
  }]);

  return RoomV2;
}(RoomSignaling);

/**
 * Filter out {@link TrackStats} that aren't in the collection while also
 * stamping their Track SIDs.
 * @param {Map<ID, SID>} idToSid
 * @param {Array<TrackStats>} trackStats
 * @returns {Array<TrackStats>}
 */


function filterAndAddTrackSids(idToSid, trackStats) {
  return trackStats.reduce(function (trackStats, trackStat) {
    var trackSid = idToSid.get(trackStat.trackId);
    return trackSid ? [Object.assign({}, trackStat, { trackSid: trackSid })].concat(trackStats) : trackStats;
  }, []);
}

/**
 * Filter out {@link LocalTrackStats} that aren't currently published while also
 * stamping their Track SIDs.
 * @param {RoomV2} roomV2
 * @param {Array<LocalTrackStats>} localTrackStats
 * @returns {Array<LocalTrackStats>}
 */
function filterAndAddLocalTrackSids(roomV2, localTrackStats) {
  return filterAndAddTrackSids(roomV2._published, localTrackStats);
}

/**
 * Filter out {@link RemoteTrackStats} that aren't currently subscribed while
 * also stamping their Track SIDs.
 * @param {RoomV2} roomV2
 * @param {Array<RemoteTrackStats>} remoteTrackStats
 * @returns {Array<RemoteTrackStats>}
 */
function filterAndAddRemoteTrackSids(roomV2, remoteTrackStats) {
  var idToSid = new Map(Array.from(roomV2._subscribed.entries()).map(function (_ref3) {
    var _ref4 = _slicedToArray(_ref3, 2),
        sid = _ref4[0],
        id = _ref4[1];

    return [id, sid];
  }));
  return filterAndAddTrackSids(idToSid, remoteTrackStats);
}

/**
 * @typedef {object} RoomV2#Representation
 * @property {string} name
 * @property {LocalParticipantV2#Representation} participant
 * @property {?Array<RemoteParticipantV2#Representation>} participants
 * @property {?Array<PeerConnectionV2#Representation>} peer_connections
 * @property {?RecordingV2#Representation} recording
 * @property {string} sid
 */

function handleLocalParticipantEvents(roomV2, localParticipant) {
  var localParticipantUpdated = oncePerTick(function () {
    roomV2._publishNewLocalParticipantState();
  });

  var renegotiate = oncePerTick(function () {
    var trackSenders = flatMap(localParticipant.tracks, function (trackV2) {
      return trackV2.trackTransceiver;
    });
    roomV2._peerConnectionManager.setTrackSenders(trackSenders);
  });

  localParticipant.on('trackAdded', renegotiate);
  localParticipant.on('trackRemoved', renegotiate);
  localParticipant.on('updated', localParticipantUpdated);

  roomV2.on('stateChanged', function stateChanged(state) {
    if (state === 'disconnected') {
      localParticipant.removeListener('trackAdded', renegotiate);
      localParticipant.removeListener('trackRemoved', renegotiate);
      localParticipant.removeListener('updated', localParticipantUpdated);
      roomV2.removeListener('stateChanged', stateChanged);
      localParticipant.disconnect();
    }
  });

  roomV2.on('signalingConnectionStateChanged', function () {
    var localParticipant = roomV2.localParticipant,
        signalingConnectionState = roomV2.signalingConnectionState;
    var identity = localParticipant.identity,
        sid = localParticipant.sid;

    switch (signalingConnectionState) {
      case 'connected':
        localParticipant.connect(sid, identity);
        break;
      case 'reconnecting':
        localParticipant.reconnecting();
        break;
    }
  });
}

function handlePeerConnectionEvents(roomV2, peerConnectionManager) {
  peerConnectionManager.on('description', function onDescription(description) {
    roomV2._publishPeerConnectionState(description);
  });
  peerConnectionManager.dequeue('description');

  peerConnectionManager.on('candidates', function onCandidates(candidates) {
    roomV2._publishPeerConnectionState(candidates);
  });
  peerConnectionManager.dequeue('candidates');

  peerConnectionManager.on('trackAdded', roomV2._addTrackReceiver.bind(roomV2));
  peerConnectionManager.dequeue('trackAdded');
  peerConnectionManager.getTrackReceivers().forEach(roomV2._addTrackReceiver, roomV2);

  peerConnectionManager.on('connectionStateChanged', function () {
    roomV2.emit('connectionStateChanged');
  });

  peerConnectionManager.on('iceConnectionStateChanged', function () {
    roomV2.emit('iceConnectionStateChanged');
    if (roomV2.iceConnectionState === 'failed') {
      if (roomV2.localParticipant.networkQualityLevel !== null) {
        roomV2.localParticipant.setNetworkQualityLevel(0);
      }
      roomV2.participants.forEach(function (participant) {
        if (participant.networkQualityLevel !== null) {
          participant.setNetworkQualityLevel(0);
        }
      });
    }
  });
}

function handleTransportEvents(roomV2, transport) {
  transport.on('message', roomV2._update.bind(roomV2));
  transport.on('stateChanged', function stateChanged(state, error) {
    if (state === 'disconnected') {
      if (roomV2.state !== 'disconnected') {
        roomV2._disconnect(error);
      }
      transport.removeListener('stateChanged', stateChanged);
    }
    roomV2.emit('signalingConnectionStateChanged');
  });
}

/**
 * Periodically publish {@link StatsReport}s.
 * @private
 * @param {RoomV2} roomV2
 * @param {Transport} transport
 * @param {Number} intervalMs
 */
function periodicallyPublishStats(roomV2, transport, intervalMs) {
  var movingAverageDeltas = new Map();
  var oddPublishCount = false;
  var interval = setInterval(function () {
    roomV2.getStats().then(function (stats) {
      oddPublishCount = !oddPublishCount;
      stats.forEach(function (response, id) {
        // NOTE(mmalavalli): A StatsReport is used to publish a "stats-report"
        // event instead of using StandardizedStatsResponse directly because
        // StatsReport will add zeros to properties that do not exist.
        var report = new StatsReport(id, response, true /* prepareForInsights */);

        // NOTE(mmalavalli): Since A/V sync metrics are not part of the StatsReport class,
        // we add them to the insights payload here.
        transport.publishEvent('quality', 'stats-report', 'info', {
          audioTrackStats: report.remoteAudioTrackStats.map(function (trackStat, i) {
            return addAVSyncMetricsToRemoteTrackStats(trackStat, response.remoteAudioTrackStats[i], movingAverageDeltas);
          }),
          localAudioTrackStats: report.localAudioTrackStats.map(function (trackStat, i) {
            return addAVSyncMetricsToLocalTrackStats(trackStat, response.localAudioTrackStats[i], movingAverageDeltas);
          }),
          localVideoTrackStats: report.localVideoTrackStats.map(function (trackStat, i) {
            return addAVSyncMetricsToLocalTrackStats(trackStat, response.localVideoTrackStats[i], movingAverageDeltas);
          }),
          peerConnectionId: report.peerConnectionId,
          videoTrackStats: report.remoteVideoTrackStats.map(function (trackStat, i) {
            return addAVSyncMetricsToRemoteTrackStats(trackStat, response.remoteVideoTrackStats[i], movingAverageDeltas);
          })
        });

        // NOTE(mmalavalli): Clean up entries for Tracks that are no longer published or subscribed to.
        var keys = flatMap(['localAudioTrackStats', 'localVideoTrackStats', 'remoteAudioTrackStats', 'remoteVideoTrackStats'], function (prop) {
          return report[prop].map(function (_ref5) {
            var ssrc = _ref5.ssrc,
                trackSid = _ref5.trackSid;
            return trackSid + '+' + ssrc;
          });
        });
        var movingAverageDeltaKeysToBeRemoved = difference(Array.from(movingAverageDeltas.keys()), keys);
        movingAverageDeltaKeysToBeRemoved.forEach(function (key) {
          return movingAverageDeltas.delete(key);
        });

        if (oddPublishCount) {
          // NOTE(mmalavalli): null properties of the "active-ice-candidate-pair"
          // payload are assigned default values until the Insights gateway
          // accepts null values.
          var activeIceCandidatePair = replaceNullsWithDefaults(response.activeIceCandidatePair, report.peerConnectionId);

          transport.publishEvent('quality', 'active-ice-candidate-pair', 'info', activeIceCandidatePair);
        }
      });
    }, function () {
      // Do nothing.
    });
  }, intervalMs);

  roomV2.on('stateChanged', function onStateChanged(state) {
    if (state === 'disconnected') {
      clearInterval(interval);
      roomV2.removeListener('stateChanged', onStateChanged);
    }
  });
}

function handleSubscriptions(room) {
  var trackSidsToTrackSignalings = room._getTrackSidsToTrackSignalings();

  room._subscriptionFailures.forEach(function (error, trackSid) {
    var trackSignaling = trackSidsToTrackSignalings.get(trackSid);
    if (trackSignaling) {
      room._subscriptionFailures.delete(trackSid);
      trackSignaling.subscribeFailed(createTwilioError(error.code, error.message));
    }
  });

  trackSidsToTrackSignalings.forEach(function (trackSignaling) {
    var trackId = room._subscribed.get(trackSignaling.sid);
    if (!trackId || trackSignaling.isSubscribed && trackSignaling.trackTransceiver.id !== trackId) {
      trackSignaling.setTrackTransceiver(null);
    }
    if (trackId) {
      room._getTrackReceiver(trackId).then(function (trackReceiver) {
        return trackSignaling.setTrackTransceiver(trackReceiver);
      });
    }
  });
}

/**
 * NOTE(mmalavalli): Since A/V sync metrics are not part of the public StatsReport class, we add them
 * only for reporting purposes.
 * @private
 */
function addAVSyncMetricsToLocalTrackStats(trackStats, trackResponse, movingAverageDeltas) {
  var framesEncoded = trackResponse.framesEncoded,
      packetsSent = trackResponse.packetsSent,
      totalEncodeTime = trackResponse.totalEncodeTime,
      totalPacketSendDelay = trackResponse.totalPacketSendDelay;

  var augmentedTrackStats = Object.assign({}, trackStats);
  var key = trackStats.trackSid + '+' + trackStats.ssrc;
  var trackMovingAverageDeltas = movingAverageDeltas.get(key) || new Map();

  if (typeof totalEncodeTime === 'number' && typeof framesEncoded === 'number') {
    var trackAvgEncodeDelayMovingAverageDelta = trackMovingAverageDeltas.get('avgEncodeDelay') || new MovingAverageDelta();
    trackAvgEncodeDelayMovingAverageDelta.putSample(totalEncodeTime * 1000, framesEncoded);
    augmentedTrackStats.avgEncodeDelay = trackAvgEncodeDelayMovingAverageDelta.get();
    trackMovingAverageDeltas.set('avgEncodeDelay', trackAvgEncodeDelayMovingAverageDelta);
  }
  if (typeof totalPacketSendDelay === 'number' && typeof packetsSent === 'number') {
    var trackAvgPacketSendDelayMovingAverageDelta = trackMovingAverageDeltas.get('avgPacketSendDelay') || new MovingAverageDelta();
    trackAvgPacketSendDelayMovingAverageDelta.putSample(totalPacketSendDelay * 1000, packetsSent);
    augmentedTrackStats.avgPacketSendDelay = trackAvgPacketSendDelayMovingAverageDelta.get();
    trackMovingAverageDeltas.set('avgPacketSendDelay', trackAvgPacketSendDelayMovingAverageDelta);
  }
  movingAverageDeltas.set(key, trackMovingAverageDeltas);
  return augmentedTrackStats;
}

/**
 * NOTE(mmalavalli): Since A/V sync metrics are not part of the public StatsReport class, we add them
 * only for reporting purposes.
 * @private
 */
function addAVSyncMetricsToRemoteTrackStats(trackStats, trackResponse, movingAverageDeltas) {
  var estimatedPlayoutTimestamp = trackResponse.estimatedPlayoutTimestamp,
      framesDecoded = trackResponse.framesDecoded,
      jitterBufferDelay = trackResponse.jitterBufferDelay,
      jitterBufferEmittedCount = trackResponse.jitterBufferEmittedCount,
      totalDecodeTime = trackResponse.totalDecodeTime;

  var augmentedTrackStats = Object.assign({}, trackStats);
  var key = trackStats.trackSid + '+' + trackStats.ssrc;
  var trackMovingAverageDeltas = movingAverageDeltas.get(key) || new Map();

  if (typeof estimatedPlayoutTimestamp === 'number') {
    augmentedTrackStats.estimatedPlayoutTimestamp = estimatedPlayoutTimestamp;
  }
  if (typeof framesDecoded === 'number' && typeof totalDecodeTime === 'number') {
    var trackAvgDecodeDelayMovingAverageDelta = trackMovingAverageDeltas.get('avgDecodeDelay') || new MovingAverageDelta();
    trackAvgDecodeDelayMovingAverageDelta.putSample(totalDecodeTime * 1000, framesDecoded);
    augmentedTrackStats.avgDecodeDelay = trackAvgDecodeDelayMovingAverageDelta.get();
    trackMovingAverageDeltas.set('avgDecodeDelay', trackAvgDecodeDelayMovingAverageDelta);
  }
  if (typeof jitterBufferDelay === 'number' && typeof jitterBufferEmittedCount === 'number') {
    var trackAvgJitterBufferDelayMovingAverageDelta = trackMovingAverageDeltas.get('avgJitterBufferDelay') || new MovingAverageDelta();
    trackAvgJitterBufferDelayMovingAverageDelta.putSample(jitterBufferDelay * 1000, jitterBufferEmittedCount);
    augmentedTrackStats.avgJitterBufferDelay = trackAvgJitterBufferDelayMovingAverageDelta.get();
    trackMovingAverageDeltas.set('avgJitterBufferDelay', trackAvgJitterBufferDelayMovingAverageDelta);
  }
  movingAverageDeltas.set(key, trackMovingAverageDeltas);
  return augmentedTrackStats;
}

function replaceNullsWithDefaults(activeIceCandidatePair, peerConnectionId) {
  activeIceCandidatePair = Object.assign({
    availableIncomingBitrate: 0,
    availableOutgoingBitrate: 0,
    bytesReceived: 0,
    bytesSent: 0,
    consentRequestsSent: 0,
    currentRoundTripTime: 0,
    lastPacketReceivedTimestamp: 0,
    lastPacketSentTimestamp: 0,
    nominated: false,
    peerConnectionId: peerConnectionId,
    priority: 0,
    readable: false,
    requestsReceived: 0,
    requestsSent: 0,
    responsesReceived: 0,
    responsesSent: 0,
    retransmissionsReceived: 0,
    retransmissionsSent: 0,
    state: 'failed',
    totalRoundTripTime: 0,
    transportId: '',
    writable: false
  }, filterObject(activeIceCandidatePair || {}, null));

  activeIceCandidatePair.localCandidate = Object.assign({
    candidateType: 'host',
    deleted: false,
    ip: '',
    port: 0,
    priority: 0,
    protocol: 'udp',
    url: ''
  }, filterObject(activeIceCandidatePair.localCandidate || {}, null));

  activeIceCandidatePair.remoteCandidate = Object.assign({
    candidateType: 'host',
    ip: '',
    port: 0,
    priority: 0,
    protocol: 'udp',
    url: ''
  }, filterObject(activeIceCandidatePair.remoteCandidate || {}, null));

  return activeIceCandidatePair;
}

module.exports = RoomV2;