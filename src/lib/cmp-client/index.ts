/**
 * API client for the Optimizely CMP REST API.
 * Handles authenticated requests, automatic token refresh on 401,
 * and provides typed methods for templates and work requests.
 */

import { CmpTokenManager } from "./auth";
import type { CmpTemplate } from "@/types";

const BASE_URL = "https://api.cmp.optimizely.com";

export class CmpClient {
  private tokenManager: CmpTokenManager;

  constructor(tokenManager: CmpTokenManager) {
    this.tokenManager = tokenManager;
  }

  /**
   * Makes an authenticated request to the CMP API. If the first attempt
   * returns a 401, the token is invalidated and the request is retried
   * once with a fresh token.
   */
  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const attempt = async (): Promise<Response> => {
      const token = await this.tokenManager.getToken();
      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      };

      const init: RequestInit = { method, headers };

      if (body !== undefined) {
        headers["Content-Type"] = "application/json";
        init.body = JSON.stringify(body);
      }

      return fetch(`${BASE_URL}${path}`, init);
    };

    let response = await attempt();

    // Retry once on 401 with a fresh token.
    if (response.status === 401) {
      this.tokenManager.invalidate();
      response = await attempt();
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `CMP API error. ${method} ${path} returned ${response.status}. ${errorText}`
      );
    }

    return response.json() as Promise<T>;
  }

  /**
   * Extracts the array of items from a CMP API response, which may use
   * different wrapper keys depending on the endpoint.
   */
  private extractArray(resp: unknown): unknown[] {
    if (Array.isArray(resp)) return resp;
    if (resp && typeof resp === "object") {
      const obj = resp as Record<string, unknown>;
      if (Array.isArray(obj.data)) return obj.data;
      if (Array.isArray(obj.items)) return obj.items;
      if (Array.isArray(obj._embedded)) return obj._embedded;
    }
    return [];
  }

  /**
   * Fetches all pages from a paginated CMP API endpoint.
   * Reads the `pagination.next` link from each response to determine
   * the next page URL. Stops when there is no next link.
   */
  private async fetchAllPages<T>(basePath: string): Promise<T[]> {
    const allItems: T[] = [];
    let path: string | null = basePath;

    while (path) {
      const resp = await this.request<Record<string, unknown>>("GET", path);
      const items = this.extractArray(resp) as T[];
      allItems.push(...items);

      // Check for a next page link in the pagination object.
      const pagination = resp.pagination as Record<string, unknown> | undefined;
      const nextUrl = pagination?.next as string | undefined;

      if (nextUrl) {
        // The next URL may be absolute. Extract just the path portion.
        try {
          const url = new URL(nextUrl);
          path = url.pathname + url.search;
        } catch {
          path = nextUrl;
        }
      } else {
        path = null;
      }

      // Safety limit to prevent infinite loops.
      if (allItems.length > 5000) break;
    }

    return allItems;
  }

  /**
   * Fetches all templates from the CMP API, handling pagination.
   */
  async getTemplates(): Promise<CmpTemplate[]> {
    return this.fetchAllPages<CmpTemplate>("/v3/templates");
  }

  /**
   * Fetches a single template by its ID.
   */
  async getTemplate(id: string): Promise<CmpTemplate> {
    return this.request<CmpTemplate>("GET", `/v3/templates/${id}`);
  }

  /**
   * Creates a new work request in CMP.
   */
  async createWorkRequest(
    templateId: string,
    formFields: Array<{
      identifier: string;
      type: string;
      values: unknown[];
    }>,
  ): Promise<{ id: string }> {
    const body: Record<string, unknown> = {
      template_id: templateId,
      form_fields: formFields,
    };

    return this.request<{ id: string }>("POST", "/v3/work-requests", body);
  }

  /**
   * Uploads a file attachment to an existing work request.
   * Uses the 3-step CMP upload flow:
   * 1. GET /v3/upload-url for a pre-signed URL and key
   * 2. POST file to the pre-signed URL
   * 3. POST key and name to the attachments endpoint
   */
  async uploadAttachment(
    workRequestId: string,
    fileName: string,
    fileBuffer: Buffer,
    contentType: string
  ): Promise<void> {
    const key = await this.uploadToPresignedUrl(fileName, fileBuffer, contentType);
    await this.request("POST", `/v3/work-requests/${workRequestId}/attachments`, {
      key,
      name: fileName,
    });
  }

  /**
   * Uploads a creative asset to an existing work request.
   * Uses the same 3-step CMP upload flow as attachments.
   */
  async uploadCreativeAsset(
    workRequestId: string,
    fileName: string,
    fileBuffer: Buffer,
    contentType: string
  ): Promise<void> {
    const key = await this.uploadToPresignedUrl(fileName, fileBuffer, contentType);
    await this.request("POST", `/v3/work-requests/${workRequestId}/creative-assets`, {
      key,
      name: fileName,
    });
  }

  /**
   * Handles steps 1 and 2 of the CMP upload flow.
   * Fetches a pre-signed upload URL, uploads the file to it,
   * and returns the key for use in step 3.
   */
  private async uploadToPresignedUrl(
    fileName: string,
    fileBuffer: Buffer,
    contentType: string
  ): Promise<string> {
    // Step 1: Get the pre-signed upload URL and metadata fields.
    const uploadInfo = await this.request<{
      url: string;
      upload_meta_fields: Record<string, string>;
    }>("GET", "/v3/upload-url");

    const presignedUrl = uploadInfo.url;
    const metaFields = uploadInfo.upload_meta_fields;
    const key = metaFields.key;

    // Step 2: Upload the file to the pre-signed URL.
    // Meta fields must come before the file field in the form data.
    const formData = new FormData();
    for (const [fieldName, fieldValue] of Object.entries(metaFields)) {
      formData.append(fieldName, fieldValue);
    }
    const blob = new Blob([new Uint8Array(fileBuffer)], { type: contentType });
    formData.append("file", blob, fileName);

    const uploadResponse = await fetch(presignedUrl, {
      method: "POST",
      body: formData,
    });

    if (!uploadResponse.ok && uploadResponse.status !== 204) {
      const errorText = await uploadResponse.text();
      throw new Error(
        `CMP file upload to pre-signed URL failed with ${uploadResponse.status}. ${errorText}`
      );
    }

    return key;
  }
}
