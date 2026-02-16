import {App, Notice, TFile} from 'obsidian';
import {CmsApi} from './api';
import type {ImageUploadResult} from './types';

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'];

/**
 * Processes embedded images in a markdown file's content.
 *
 * - Normal markdown images (![alt](url)) are left as-is; the first one's URL
 *   is tracked as the thumbnail.
 * - Obsidian vault embeds (![[file.png]]) are uploaded to the CMS and replaced
 *   with standard markdown image syntax using the returned hosted URL.
 *
 * Returns the transformed markdown content and the thumbnail URL.
 */
export async function processImages(
	app: App,
	file: TFile,
	content: string,
	api: CmsApi,
): Promise<ImageUploadResult> {
	const cache = app.metadataCache.getFileCache(file);
	const embeds = cache?.embeds ?? [];

	// Track whether we've identified the first image overall (for thumbnail purpose).
	// We walk the content top-to-bottom, so we check both markdown images and vault
	// embeds in document order using their position offsets.
	let thumbnailUrl: string | undefined;
	let isFirstImage = true;

	// Find the first standard markdown image in the raw content to determine
	// if the overall first image is a markdown image (no upload needed for thumbnail).
	const markdownImageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
	let firstMarkdownImageOffset = Infinity;
	let firstMarkdownImageUrl: string | undefined;
	let match;
	while ((match = markdownImageRegex.exec(content)) !== null) {
		if (match.index < firstMarkdownImageOffset) {
			firstMarkdownImageOffset = match.index;
			firstMarkdownImageUrl = match[2];
		}
		break; // only need the first
	}

	// Find the first vault embed that is an image
	let firstVaultEmbedOffset = Infinity;
	for (const embed of embeds) {
		const resolved = app.metadataCache.getFirstLinkpathDest(embed.link, file.path);
		if (resolved && IMAGE_EXTENSIONS.includes(resolved.extension.toLowerCase())) {
			if (embed.position.start.offset < firstVaultEmbedOffset) {
				firstVaultEmbedOffset = embed.position.start.offset;
			}
			break;
		}
	}

	// Determine if the first image overall is a markdown image or a vault embed
	if (firstMarkdownImageOffset < firstVaultEmbedOffset && firstMarkdownImageUrl) {
		thumbnailUrl = firstMarkdownImageUrl;
		isFirstImage = false;
	}

	// Process vault embeds: upload each image and collect replacements
	const replacements: {original: string; replacement: string}[] = [];

	for (const embed of embeds) {
		const resolved = app.metadataCache.getFirstLinkpathDest(embed.link, file.path);
		if (!resolved) {
			new Notice(`Warning: Could not resolve embedded file "${embed.link}"`);
			continue;
		}

		if (!IMAGE_EXTENSIONS.includes(resolved.extension.toLowerCase())) {
			continue;
		}

		const purpose = isFirstImage ? 'thumbnail' : 'post';
		isFirstImage = false;

		try {
			const dataUrl = await readFileAsDataUrl(app, resolved);
			const result = await api.uploadMedia(dataUrl, purpose);
			const hostedUrl = result.url;

			if (!thumbnailUrl) {
				thumbnailUrl = hostedUrl;
			}

			const altText = embed.displayText ?? resolved.basename;
			replacements.push({
				original: embed.original,
				replacement: `![${altText}](${hostedUrl})`,
			});
		} catch (e) {
			new Notice(`Warning: Failed to upload image "${resolved.name}": ${String(e)}`);
		}
	}

	// Apply replacements to the content (only for the payload, not the local file)
	let processedContent = content;
	for (const {original, replacement} of replacements) {
		processedContent = processedContent.replace(original, replacement);
	}

	return {contentMarkdown: processedContent, thumbnailUrl};
}

async function readFileAsDataUrl(app: App, file: TFile): Promise<string> {
	const buffer = await app.vault.readBinary(file);
	const bytes = new Uint8Array(buffer);
	let binary = '';
	for (let i = 0; i < bytes.byteLength; i++) {
		binary += String.fromCharCode(bytes[i]!);
	}
	const base64 = window.btoa(binary);
	const mimeType = getMimeType(file.extension);
	return `data:${mimeType};base64,${base64}`;
}

function getMimeType(extension: string): string {
	const map: Record<string, string> = {
		png: 'image/png',
		jpg: 'image/jpeg',
		jpeg: 'image/jpeg',
		gif: 'image/gif',
		webp: 'image/webp',
		svg: 'image/svg+xml',
		bmp: 'image/bmp',
	};
	return map[extension.toLowerCase()] ?? 'application/octet-stream';
}
