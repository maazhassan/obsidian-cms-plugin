import {Plugin} from 'obsidian';
import {SettingTab} from './settings';
import {publishPost} from './publisher';
import {syncMetadataOnOpen} from './metadataSync';
import type {PluginSettings} from './types';
import {DEFAULT_SETTINGS} from './types';

export default class ObsidianCMS extends Plugin {
	settings: PluginSettings;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: 'publish-post',
			name: 'Publish post',
			callback: () => publishPost(this.app, this.settings),
		});

		this.addSettingTab(new SettingTab(this.app, this));

		this.registerEvent(
			this.app.workspace.on('file-open', (file) => {
				if (file) {
					void syncMetadataOnOpen(this.app, file, this.settings);
				}
			}),
		);
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<PluginSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
