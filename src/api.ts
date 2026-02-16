import {requestUrl} from 'obsidian';
import type {MediaUploadResponse, PostPayload} from './types';

export class CmsApi {
	constructor(
		private baseUrl: string,
		private apiKey: string,
	) {}

	private headers(): Record<string, string> {
		return {
			'Content-Type': 'application/json',
			'X-API-Key': this.apiKey,
		};
	}

	async uploadMedia(base64DataUrl: string, purpose: 'thumbnail' | 'post'): Promise<MediaUploadResponse> {
		const response = await requestUrl({
			url: `${this.baseUrl}/media`,
			method: 'POST',
			headers: this.headers(),
			body: JSON.stringify({image_base64: base64DataUrl, purpose}),
		});
		return response.json as MediaUploadResponse;
	}

	async updatePost(slug: string, payload: PostPayload): Promise<{status: number; body: unknown}> {
		const response = await requestUrl({
			url: `${this.baseUrl}/posts/${slug}`,
			method: 'PUT',
			headers: this.headers(),
			body: JSON.stringify(payload),
			throw: false,
		});
		return {status: response.status, body: response.json};
	}

	async createPost(payload: PostPayload): Promise<{status: number; body: unknown}> {
		const response = await requestUrl({
			url: `${this.baseUrl}/posts`,
			method: 'POST',
			headers: this.headers(),
			body: JSON.stringify(payload),
		});
		return {status: response.status, body: response.json};
	}

	async getPost(slug: string): Promise<Record<string, unknown> | null> {
		const response = await requestUrl({
			url: `${this.baseUrl}/posts/${slug}`,
			method: 'GET',
			headers: this.headers(),
			throw: false,
		});
		if (response.status === 404) return null;
		if (response.status >= 400) {
			throw new Error(`Failed to fetch post: ${response.status}`);
		}
		return response.json as Record<string, unknown>;
	}
}
