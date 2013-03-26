/*
 * Copyright 2013 the original author or authors
 * @license MIT, see LICENSE.txt for details
 *
 * @author Scott Andrews
 */

(function (define) {
	'use strict';

	/**
	 * Channel with topical subscriptions
	 */
	define(function (require) {

		var msgs, topicalDispatcher, broadcastDispatcher;

		msgs = require('..');
		topicalDispatcher = require('./dispatchers/topical');
		broadcastDispatcher = require('./dispatchers/broadcast');

		/**
		 * Create a topic exchange channel
		 *
		 * @param {string} [name] the name to register this channel under
		 * @param {Matcher} [opts.matcher=literal] matcher to decide if a message
		 *   topic matches a subscription
		 * @param {Dispatcher} [opts.dispatchStrategy=broadcast] dispatcher to use
		 *   for subscribers within a topic, must be a subscribable dispatcher
		 */
		msgs.prototype.exchangeChannel = msgs.utils.optionalName(function exchangeChannel(name, opts) {
			opts = opts || {};
			opts.matcher = opts.matcher || topicalDispatcher.matchers.literal;
			opts.dispatcher = opts.dispatcher || broadcastDispatcher;
			return this._channel(name, topicalDispatcher(opts.matcher, opts.dispatcher), 'exchange');
		});

		return msgs;

	});

}(
	typeof define === 'function' && define.amd ? define : function (factory) { module.exports = factory(require); }
	// Boilerplate for AMD and Node
));
