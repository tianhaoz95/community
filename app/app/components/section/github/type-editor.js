// Copyright 2016 Documize Inc. <legal@documize.com>. All rights reserved.
//
// This software (Documize Community Edition) is licensed under
// GNU AGPL v3 http://www.gnu.org/licenses/agpl-3.0.en.html
//
// You can operate outside the AGPL restrictions by purchasing
// Documize Enterprise Edition and obtaining a commercial license
// by contacting <sales@documize.com>.
//
// https://documize.com

import Ember from 'ember';
import NotifierMixin from '../../../mixins/notifier';
import TooltipMixin from '../../../mixins/tooltip';
import SectionMixin from '../../../mixins/section';

export default Ember.Component.extend(SectionMixin, NotifierMixin, TooltipMixin, {
	sectionService: Ember.inject.service('section'),
	isDirty: false,
	busy: false,
	authenticated: false,
	config: {},
	owners: null,

	didReceiveAttrs() {
		let self = this;
		let page = this.get('page');

		if (is.undefined(this.get('config.clientId')) || is.undefined(this.get('config.callbackUrl'))) {
			self.get('sectionService').fetch(page, "config", {})
				.then(function (cfg) {
					let config = {};

					config = {
						clientId: cfg.clientID,
						callbackUrl: cfg.authorizationCallbackURL,
						owner: null,
						owner_name: "",
						lists: [],
						branchSince: "",
						branchLines: "100",
						userId: "",
						pageId: page.get('id'),
						showMilestones: false,
						showIssues: false,
						showCommits: false,
					};

					try {
						let metaConfig = JSON.parse(self.get('meta.config'));
						config.owner = metaConfig.owner;
						config.lists = metaConfig.lists;
						config.branchSince = metaConfig.branchSince;
						config.userId = metaConfig.userId;
						config.pageId = metaConfig.pageId;
						config.showMilestones = metaConfig.showMilestones;
						config.showIssues = metaConfig.showIssues;
						config.showCommits = metaConfig.showCommits;
					} catch (e) {}

					self.set('config', config);
					self.set('config.pageId', page.get('id'));

					// On auth callback capture code
					let code = window.location.search;

					if (is.not.undefined(code) && is.not.null(code) && is.not.empty(code) && code !== "") {
						let tok = code.replace("?code=", "");
						self.get('sectionService').fetch(page, "saveSecret", { "token": tok })
							.then(function () {
								console.log("github auth code saved to db");
								self.send('authStage2');
							}, function (error) { //jshint ignore: line
								console.log(error);
								self.send('auth');
							});
					} else {
						if (config.userId !== self.get("session.session.authenticated.user.id")) {
							console.log("github auth wrong user ID, switching");
							self.set('config.userId', self.get("session.session.authenticated.user.id"));
						}
						self.get('sectionService').fetch(page, "checkAuth", self.get('config'))
							.then(function () {
								console.log("github auth code valid");
								self.send('authStage2');
							}, function (error) { //jshint ignore: line
								console.log(error);
								self.send('auth'); // require auth if the db token is invalid
							});
					}
				}, function (error) { //jshint ignore: line
					console.log(error);
				});
		}
	},

	willDestroyElement() {
		this.destroyTooltips();
	},

	getOwnerLists() {
		this.set('busy', true);

		let owners = this.get('owners');
		let thisOwner = this.get('config.owner');

		if (is.null(thisOwner) || is.undefined(thisOwner)) {
			if (owners.length) {
				thisOwner = owners[0];
				this.set('config.owner', thisOwner);
			}
		} else {
			this.set('config.owner', owners.findBy('id', thisOwner.id));
		}

		this.set('owner', thisOwner);

		this.getOrgReposLists();

		if (is.undefined(this.get('initDateTimePicker'))) {
			$.datetimepicker.setLocale('en');
			$('#branch-since').datetimepicker();
			this.set('initDateTimePicker', "Done");
		}

	},

	getOrgReposLists() {
		this.set('busy', true);

		let self = this;
		let page = this.get('page');

		this.get('sectionService').fetch(page, "orgrepos", self.get('config'))
			.then(function (lists) {
				let savedLists = self.get('config.lists');
				if (savedLists === null) {
					savedLists = [];
				}

				if (lists.length > 0) {
					let noIncluded = true;

					lists.forEach(function (list) {
						let included = false;
						var saved;
						if (is.not.undefined(savedLists)) {
							saved = savedLists.findBy("id", list.id);
						}
						if (is.not.undefined(saved)) {
							included = saved.included;
							noIncluded = false;
						}
						list.included = included;
					});

					if (noIncluded) {
						lists[0].included = true; // make the first entry the default
					}
				}

				self.set('config.lists', lists);
				self.set('busy', false);
			}, function (error) { //jshint ignore: line
				self.set('busy', false);
				self.set('authenticated', false);
				self.showNotification("Unable to fetch repositories");
				console.log(error);
			});
	},

	actions: {
		isDirty() {
			return this.get('isDirty');
		},

		onListCheckbox(id) { // select one repository only
			let lists = this.get('config.lists');
			let list = lists.findBy('id', id);

			lists.forEach(function (entry) {
				Ember.set(entry, 'included', false);
			});

			if (list !== null) {
				Ember.set(list, 'included', true);
			}
		},

		authStage2() {
			let self = this;
			self.set('config.userId', self.get("session.session.authenticated.user.id"));
			self.set('authenticated', true);
			self.set('busy', true);
			let page = this.get('page');

			self.get('sectionService').fetch(page, "owners", self.get('config'))
				.then(function (owners) {
					self.set('busy', false);
					self.set('owners', owners);
					self.getOwnerLists();
				}, function (error) { //jshint ignore: line
					self.set('busy', false);
					self.set('authenticated', false);
					self.showNotification("Unable to fetch owners");
					console.log(error);
				});

		},

		auth() {
			let self = this;
			self.set('busy', true);
			self.set('authenticated', false);
			let target = "https://github.com/login/oauth/authorize?client_id=" + self.get('config.clientId') +
				"&scope=repo&redirect_uri=" + encodeURIComponent(self.get('config.callbackUrl')) +
				"&state=" + encodeURIComponent(window.location.href);
			window.location.href = target;

		},

		onOwnerChange(thisOwner) {
			this.set('isDirty', true);
			this.set('config.owner', thisOwner);
			this.set('config.lists', []);
			this.getOwnerLists();
		},

		onStateChange(thisState) {
			this.set('config.state', thisState);
		},

		onCancel() {
			this.attrs.onCancel();
		},

		onAction(title) {
			this.set('busy', true);

			let self = this;
			let page = this.get('page');
			let meta = this.get('meta');
			page.set('title', title);
			meta.set('rawBody', '');
			meta.set('config', JSON.stringify(this.get('config')));
			meta.set('externalSource', true);

			this.get('sectionService').fetch(page, 'content', this.get('config'))
				.then(function (response) {
					meta.set('rawBody', JSON.stringify(response));
					self.set('busy', false);
					self.attrs.onAction(page, meta);
				}, function (reason) { //jshint ignore: line
					self.set('busy', false);
					self.attrs.onAction(page, meta);
				});
		}
	}
});