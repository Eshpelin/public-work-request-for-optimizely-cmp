/**
 * OAuth token management for the Optimizely CMP API.
 * Handles fetching, caching, and refreshing client credentials tokens.
 */

const TOKEN_ENDPOINT = "https://accounts.cmp.optimizely.com/o/oauth2/v1/token";

// Buffer in milliseconds before token expiry to trigger a refresh.
// Set to 5 minutes to avoid using a token that is about to expire.
const EXPIRY_BUFFER_MS = 5 * 60 * 1000;

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export class CmpTokenManager {
  private clientId: string;
  private clientSecret: string;
  private accessToken: string | null = null;
  private expiresAt: number = 0;

  constructor(clientId: string, clientSecret: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  /**
   * Returns a valid access token. If the cached token is still valid
   * (with a 5-minute buffer), it is returned directly. Otherwise a
   * fresh token is fetched from the OAuth endpoint.
   */
  async getToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.expiresAt - EXPIRY_BUFFER_MS) {
      return this.accessToken;
    }

    await this.fetchToken();
    return this.accessToken!;
  }

  /**
   * Fetches a new access token using the client credentials grant.
   */
  private async fetchToken(): Promise<void> {
    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });

    const response = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to fetch CMP access token. Status ${response.status}. ${errorText}`
      );
    }

    const data: TokenResponse = await response.json();

    this.accessToken = data.access_token;
    // expires_in is in seconds, convert to milliseconds and add to current time.
    this.expiresAt = Date.now() + data.expires_in * 1000;
  }

  /**
   * Invalidates the cached token. This is useful when a 401 response
   * is received, forcing the next call to getToken to fetch a fresh one.
   */
  invalidate(): void {
    this.accessToken = null;
    this.expiresAt = 0;
  }
}
