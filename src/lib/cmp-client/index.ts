/**
 * API client for the Optimizely CMP REST API.
 * Handles authenticated requests, automatic token refresh on 401,
 * and provides typed methods for templates, workflows, and work requests.
 */

import { CmpTokenManager } from "./auth";
import type { CmpTemplate, CmpWorkflow } from "@/types";

const BASE_URL = "https://api.cmp.optimizely.com";

interface PaginatedResponse<T> {
  items: T[];
  total: number;
}

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
   * Fetches all templates from the CMP API.
   */
  async getTemplates(): Promise<CmpTemplate[]> {
    const data = await this.request<PaginatedResponse<CmpTemplate>>(
      "GET",
      "/v3/templates"
    );
    return data.items;
  }

  /**
   * Fetches a single template by its ID.
   */
  async getTemplate(id: string): Promise<CmpTemplate> {
    return this.request<CmpTemplate>("GET", `/v3/templates/${id}`);
  }

  /**
   * Fetches all workflows from the CMP API.
   */
  async getWorkflows(): Promise<CmpWorkflow[]> {
    const data = await this.request<PaginatedResponse<CmpWorkflow>>(
      "GET",
      "/v3/workflows"
    );
    return data.items;
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
    workflowId?: string
  ): Promise<{ id: string }> {
    const body: Record<string, unknown> = {
      template_id: templateId,
      form_fields: formFields,
    };

    if (workflowId) {
      body.workflow_id = workflowId;
    }

    return this.request<{ id: string }>("POST", "/v3/work-requests", body);
  }

  /**
   * Uploads a file attachment to an existing work request.
   * The file is sent as multipart/form-data.
   */
  async uploadAttachment(
    workRequestId: string,
    fileName: string,
    fileBuffer: Buffer,
    contentType: string
  ): Promise<void> {
    await this.uploadFile(
      `/v3/work-requests/${workRequestId}/attachments`,
      fileName,
      fileBuffer,
      contentType
    );
  }

  /**
   * Uploads a creative asset to an existing work request.
   * The file is sent as multipart/form-data.
   */
  async uploadCreativeAsset(
    workRequestId: string,
    fileName: string,
    fileBuffer: Buffer,
    contentType: string
  ): Promise<void> {
    await this.uploadFile(
      `/v3/work-requests/${workRequestId}/creative-assets`,
      fileName,
      fileBuffer,
      contentType
    );
  }

  /**
   * Shared helper for uploading files via multipart/form-data.
   * Constructs a FormData payload and sends it with authentication.
   * Retries once on 401 just like the standard request method.
   */
  private async uploadFile(
    path: string,
    fileName: string,
    fileBuffer: Buffer,
    contentType: string
  ): Promise<void> {
    const buildFormData = (): FormData => {
      const formData = new FormData();
      const blob = new Blob([new Uint8Array(fileBuffer)], { type: contentType });
      formData.append("file", blob, fileName);
      return formData;
    };

    const attempt = async (): Promise<Response> => {
      const token = await this.tokenManager.getToken();
      const formData = buildFormData();

      return fetch(`${BASE_URL}${path}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
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
        `CMP API file upload error. POST ${path} returned ${response.status}. ${errorText}`
      );
    }
  }
}
