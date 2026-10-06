# Google Analytics MCP setup

Google's official `analytics-mcp` 0.7.0 is installed locally and registered in Codex as `google-analytics`. The MCP handshake and tool list have been verified. Google account authentication is still required; no Analytics property data has been read.

## Authenticate with your Google account

1. In a Google Cloud project you control, enable **Google Analytics Admin API** and **Google Analytics Data API**.
2. Configure the project's OAuth consent screen. If the app is in testing, add your Google account as a test user.
3. Create an OAuth client of type **Desktop app**, download its JSON, and keep it outside this repository.
4. Install the Google Cloud CLI if you do not already have `gcloud`, then run the command below in your own terminal, replacing the example path with the downloaded file:

```sh
gcloud auth application-default login \
  --scopes=https://www.googleapis.com/auth/analytics.readonly,https://www.googleapis.com/auth/cloud-platform \
  --client-id-file=/absolute/path/to/oauth-desktop-client.json
```

Sign in with an account that has access to the Alipo GA4 property. The credentials are saved locally in Google's default application credentials location. Do not paste credentials, authorization codes, access tokens or JSON contents into chat or commit them to Git.

5. Restart Codex so it loads the new MCP configuration. Ask it to list Google Analytics accounts and identify the Alipo property. If APIs or quota require an explicit Cloud project, add `GOOGLE_CLOUD_PROJECT` and `GOOGLE_PROJECT_ID` to this server's environment in Codex MCP settings using the actual project ID.

The GA4 numeric property ID differs from the site's `G-…` measurement ID. Discover the property through `get_account_summaries` after authentication.

## Useful queries

- Show Alipo's active users, sessions and page views over the last 30 days.
- Compare the last seven days with the previous seven days.
- Break down `sponsor_impression` and `sponsor_click` by advertiser and placement where the relevant custom dimensions are registered.
- Show `advertising_rate_card_opened` and `advertising_enquiry` activity.

The public 24-hour fuel report count comes from saved database reports. GA4 event totals are separate measurements and should not substitute for that count.

## References

- [Google's Analytics MCP setup](https://github.com/googleanalytics/google-analytics-mcp)
- [Codex MCP configuration](https://developers.openai.com/codex/mcp)
