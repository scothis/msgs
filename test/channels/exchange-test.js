/*
 * Copyright 2013 the original author or authors
 * @license MIT, see LICENSE.txt for details
 *
 * @author Scott Andrews
 */

(function (buster, define) {
	'use strict';

	var assert, refute, fail;

	assert = buster.assert;
	refute = buster.refute;
	fail = buster.assertions.fail;

	define('msgs/channels/exchange-test', function (require) {

		var msgs, exchangeDispatcher, unicastDispatcher, bus;

		msgs = require('msgs/channels/exchange');
		exchangeDispatcher = require('msgs/channels/dispatchers/exchange');
		unicastDispatcher = require('msgs/channels/dispatchers/unicast');

		buster.testCase('msgs/channels/exchange', {
			setUp: function () {
				bus = msgs.bus();
			},
			tearDown: function () {
				bus.destroy();
			},

			'should dispatch to the subscribed topic': function () {
				var spy;

				bus.exchangeChannel('world');
				spy = this.spy(function (message) {
					assert.equals('hello', message);
				});
				bus.outboundAdapter(spy, { input: 'world!greeting' });

				bus.send('world!greeting', 'hello');

				assert(spy.called);
			},
			'should not dispatch to a different topic': function () {
				var spy;

				bus.exchangeChannel('world');
				spy = this.spy(function () {
					fail();
				});
				bus.outboundAdapter(spy, { input: 'world!somethingElse' });

				bus.send('world!greeting', 'hello');

				refute(spy.called);
			},
			'should broadcast to topic subscriptions': function () {
				var aSpy, bSpy;

				aSpy = this.spy(function (message) {
					assert.equals('hello', message);
				});
				bSpy = this.spy(function (message) {
					assert.equals('hello', message);
				});

				bus.exchangeChannel('world');
				bus.outboundAdapter(aSpy, { input: 'world!greeting' });
				bus.outboundAdapter(bSpy, { input: 'world!greeting' });

				bus.send('world!greeting', 'hello');
				bus.send('world!greeting', 'hello');

				assert.same(2, aSpy.callCount);
				assert.same(2, bSpy.callCount);
			},
			'should use a custom topic dispatcher when configured': function () {
				var aSpy, bSpy;

				aSpy = this.spy(function (message) {
					assert.equals('hello', message);
				});
				bSpy = this.spy(function (message) {
					assert.equals('hello', message);
				});

				bus.exchangeChannel('world', { dispatcher: unicastDispatcher });
				bus.outboundAdapter(aSpy, { input: 'world!greeting' });
				bus.outboundAdapter(bSpy, { input: 'world!greeting' });

				bus.send('world!greeting', 'hello');
				bus.send('world!greeting', 'hello');

				assert.same(2, aSpy.callCount + bSpy.callCount);
			},
			'should use a custom topic matcher when configured': function () {
				var aSpy, bSpy;

				aSpy = this.spy(function (message) {
					assert.equals('hello', message);
				});
				bSpy = this.spy(function (message) {
					assert.equals('hello', message);
				});

				bus.exchangeChannel('world', { matcher: function () { return true; } });
				bus.outboundAdapter(aSpy, { input: 'world!aTopic' });
				bus.outboundAdapter(bSpy, { input: 'world!bTopic' });

				bus.send('world!greeting', 'hello');

				assert.same(1, aSpy.callCount);
				assert.same(1, bSpy.callCount);
			},
			'should subscribe/unsubscribe for a topic on demand': function () {
				var adapter, adapterSpy, deadLetterSpy;

				adapterSpy = this.spy(function (message) {
					assert.equals('hello', message);
				});
				deadLetterSpy = this.spy(function (message) {
					assert.equals('hello', message);
				});

				bus.exchangeChannel('world');
				adapter = bus.outboundAdapter(adapterSpy);
				bus.deadLetterChannel.subscribe(bus.outboundAdapter(deadLetterSpy));

				assert.same(0, adapterSpy.callCount);
				assert.same(0, deadLetterSpy.callCount);

				bus.send('world!greeting', 'hello');
				assert.same(0, adapterSpy.callCount);
				assert.same(1, deadLetterSpy.callCount);

				bus.subscribe('world!greeting', adapter);
				bus.send('world!greeting', 'hello');
				assert.same(1, adapterSpy.callCount);
				assert.same(1, deadLetterSpy.callCount);

				bus.unsubscribe('world!greeting', adapter);
				bus.send('world!greeting', 'hello');
				assert.same(1, adapterSpy.callCount);
				assert.same(2, deadLetterSpy.callCount);
			},
			'should have pubsub type': function () {
				assert.same('exchange', bus.exchangeChannel().type);
			},
			'the literal matcher': {
				'should only match the exact string': function () {
					assert(exchangeDispatcher.matchers.literal('foo', 'foo'));
					refute(exchangeDispatcher.matchers.literal('foo', 'bar'));
				}
			},
			'the topical matcher': {
				'should match the exact string': function () {
					assert(exchangeDispatcher.matchers.topical('foo', 'foo'));
					refute(exchangeDispatcher.matchers.topical('foo', 'bar'));
				},
				'should match with single word wildcards': function () {
					assert(exchangeDispatcher.matchers.topical('foo.*', 'foo.bar'));
					refute(exchangeDispatcher.matchers.topical('foo.*', 'bar.foo'));

					assert(exchangeDispatcher.matchers.topical('*.bar', 'foo.bar'));
					refute(exchangeDispatcher.matchers.topical('*.bar', 'bar.foo'));

					assert(exchangeDispatcher.matchers.topical('foo.*.baz', 'foo.bar.baz'));
					refute(exchangeDispatcher.matchers.topical('foo.*.baz', 'foo.bar.bar.baz'));

					assert(exchangeDispatcher.matchers.topical('foo.*.*.baz', 'foo.bar.bar.baz'));
					refute(exchangeDispatcher.matchers.topical('foo.*.*.baz', 'foo.bar.baz'));
				},
				'should match with single words with multi word wildcards': function () {
					assert(exchangeDispatcher.matchers.topical('foo.#', 'foo.bar'));
					refute(exchangeDispatcher.matchers.topical('foo.#', 'bar.foo'));

					assert(exchangeDispatcher.matchers.topical('#.bar', 'foo.bar'));
					refute(exchangeDispatcher.matchers.topical('#.bar', 'bar.foo'));
				},
				'should match with multiple words with multi word wildcards': function () {
					assert(exchangeDispatcher.matchers.topical('foo.#.baz', 'foo.bar.bar.baz'));
					refute(exchangeDispatcher.matchers.topical('foo.#.baz', 'foo.bar.baz.bar'));
				},
				'should find flexable matches': function () {
					assert(exchangeDispatcher.matchers.topical('#.foo.bar.#', 'foo.foo.foo.foo.bar.foo'));
					assert(exchangeDispatcher.matchers.topical('#.foo.bar.#', 'foo.foo.foo.bar.foo.foo'));
					assert(exchangeDispatcher.matchers.topical('#.foo.bar.#', 'foo.foo.bar.foo.foo.foo'));
				},
				'should match with optional multi word wildcards': function () {
					assert(exchangeDispatcher.matchers.topical('#.foo', 'foo'));
					assert(exchangeDispatcher.matchers.topical('foo.#', 'foo'));
					assert(exchangeDispatcher.matchers.topical('#.foo.#', 'foo'));
					assert(exchangeDispatcher.matchers.topical('foo.#.bar', 'foo.bar'));
					assert(exchangeDispatcher.matchers.topical('foo.#.#.bar', 'foo.bar'));
					assert(exchangeDispatcher.matchers.topical('foo.#.*.#.bar', 'foo.baz.bar'));
					refute(exchangeDispatcher.matchers.topical('foo.#.bar', 'foo..bar'));
				}
			}
		});

	});

}(
	this.buster || require('buster'),
	typeof define === 'function' && define.amd ? define : function (id, factory) {
		var packageName = id.split(/[\/\-]/)[0], pathToRoot = id.replace(/[^\/]+/g, '..');
		pathToRoot = pathToRoot.length > 2 ? pathToRoot.substr(3) : pathToRoot;
		factory(function (moduleId) {
			return require(moduleId.indexOf(packageName) === 0 ? pathToRoot + moduleId.substr(packageName.length) : moduleId);
		});
	}
	// Boilerplate for AMD and Node
));
