export interface PluginSettings {
	cmsUrl: string;
	// The ID of the secret in Obsidian's SecretStorage linked to the API key setting
	apiKeySecretId: string;
}

export const DEFAULT_SETTINGS: PluginSettings = {
	cmsUrl: '',
	apiKeySecretId: '',
};

export interface PostFrontmatter {
	slug: string;
	title: string;
	description: string;
	author: string;
	published: boolean;
	tags?: string[];
	published_at?: string;
}

export const REQUIRED_FRONTMATTER_FIELDS: (keyof PostFrontmatter)[] = [
	'slug', 'title', 'description', 'author', 'published',
];

export interface PostPayload {
	slug: string;
	title: string;
	description: string;
	author: string;
	tags?: string[];
	published: boolean;
	published_at?: string;
	content_markdown: string;
	thumbnail_url?: string;
}

export interface MediaUploadResponse {
	url: string;
}

export interface ImageUploadResult {
	contentMarkdown: string;
	thumbnailUrl: string | undefined;
}
