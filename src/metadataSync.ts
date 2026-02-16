import {App, Notice, TFile} from 'obsidian';
import {CmsApi} from './api';
import type {PluginSettings} from './types';

const SYNCED_FIELDS = ['title', 'description', 'author', 'tags', 'published', 'published_at'] as const;

/**
 * Syncs frontmatter from the CMS when a markdown file with a slug is opened.
 * Only updates metadata fields - never overwrites slug or content.
 */
export async function syncMetadataOnOpen(app: App, file: TFile, settings: PluginSettings): Promise<void> {
	if (file.extension !== 'md') return;

	const apiKey = settings.apiKeySecretId
		? app.secretStorage.getSecret(settings.apiKeySecretId)
		: null;
	if (!apiKey || !settings.cmsUrl) return;

	const cache = app.metadataCache.getFileCache(file);
	const slug = cache?.frontmatter?.slug as string | undefined;
	if (!slug) return;

	const api = new CmsApi(settings.cmsUrl, apiKey);

	try {
		const post = await api.getPost(slug);
		if (!post) return;

		await app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
			for (const field of SYNCED_FIELDS) {
				if (post[field] !== undefined) {
					frontmatter[field] = post[field];
				}
			}
		});
	} catch (e) {
		new Notice(`Failed to sync metadata for "${file.basename}": ${String(e)}`);
	}
}
