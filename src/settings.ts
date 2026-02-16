import {App, PluginSettingTab, SecretComponent, Setting} from 'obsidian';
import type ObsidianCMS from './main';

export class SettingTab extends PluginSettingTab {
	plugin: ObsidianCMS;

	constructor(app: App, plugin: ObsidianCMS) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName('CMS API URL')
			.setDesc('Base URL of the CMS API (e.g. https://api.example.com)')
			.addText(text => text
				.setPlaceholder('https://api.example.com')
				.setValue(this.plugin.settings.cmsUrl)
				.onChange(async (value) => {
					this.plugin.settings.cmsUrl = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('API key')
			.setDesc('Select a secret from the secret store to use as the API key')
			.addComponent(el => new SecretComponent(this.app, el)
				.setValue(this.plugin.settings.apiKeySecretId)
				.onChange(async (secretId) => {
					this.plugin.settings.apiKeySecretId = secretId;
					await this.plugin.saveSettings();
				}));
	}
}
