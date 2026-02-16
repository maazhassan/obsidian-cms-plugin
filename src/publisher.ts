import {App, Notice} from 'obsidian';
import {CmsApi} from './api';
import {processImages} from './image';
import type {PostFrontmatter, PostPayload, PluginSettings} from './types';
import {REQUIRED_FRONTMATTER_FIELDS} from './types';

export async function publishPost(app: App, settings: PluginSettings): Promise<void> {
	// Step 1: Get active file
	const file = app.workspace.getActiveFile();
	if (!file || file.extension !== 'md') {
		new Notice('No active Markdown file to publish.');
		return;
	}

	// Step 2: Parse and validate frontmatter
	const cache = app.metadataCache.getFileCache(file);
	const frontmatter = cache?.frontmatter as PostFrontmatter | undefined;

	if (!frontmatter) {
		new Notice('No frontmatter found. Add required fields: slug, title, description, author, published.');
		return;
	}

	const missing = REQUIRED_FRONTMATTER_FIELDS.filter(
		field => frontmatter[field] === undefined || frontmatter[field] === null,
	);
	if (missing.length > 0) {
		new Notice(`Missing required frontmatter: ${missing.join(', ')}`);
		return;
	}

	const apiKey = settings.apiKeySecretId
		? app.secretStorage.getSecret(settings.apiKeySecretId)
		: null;
	if (!apiKey || !settings.cmsUrl) {
		new Notice('CMS URL and API key must be configured in plugin settings.');
		return;
	}

	const api = new CmsApi(settings.cmsUrl, apiKey);

	// Step 3: Process images - extract content without frontmatter
	const rawContent = await app.vault.read(file);
	const contentWithoutFrontmatter = stripFrontmatter(rawContent);

	let contentMarkdown: string;
	let thumbnailUrl: string | undefined;

	try {
		const result = await processImages(app, file, contentWithoutFrontmatter, api);
		contentMarkdown = result.contentMarkdown;
		thumbnailUrl = result.thumbnailUrl;
	} catch (e) {
		new Notice(`Failed to process images: ${String(e)}`);
		return;
	}

	// Step 4: Send post to CMS
	const payload: PostPayload = {
		slug: frontmatter.slug,
		title: frontmatter.title,
		description: frontmatter.description,
		author: frontmatter.author,
		published: frontmatter.published,
		content_markdown: contentMarkdown,
		...(frontmatter.tags && {tags: frontmatter.tags}),
		...(frontmatter.published_at && {published_at: frontmatter.published_at}),
		...(thumbnailUrl && {thumbnail_url: thumbnailUrl}),
	};

	try {
		// Try updating first, fall back to creating if 404
		const updateResult = await api.updatePost(frontmatter.slug, payload);

		if (updateResult.status === 404) {
			await api.createPost(payload);
		} else if (updateResult.status >= 400) {
			const msg = formatErrorMessage(updateResult.body);
			new Notice(`Failed to publish: ${msg}`);
			return;
		}

		// Step 5: Show success
		new Notice('Post published successfully');
	} catch (e) {
		new Notice(`Failed to publish post: ${String(e)}`);
	}
}

function stripFrontmatter(content: string): string {
	const match = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
	if (match) {
		return content.slice(match[0].length);
	}
	return content;
}

function formatErrorMessage(body: unknown): string {
	if (typeof body === 'object' && body !== null) {
		const obj = body as Record<string, unknown>;
		if (typeof obj.message === 'string') return obj.message;
		if (typeof obj.error === 'string') return obj.error;
		if (typeof obj.detail === 'string') return obj.detail;
	}
	return String(body);
}
