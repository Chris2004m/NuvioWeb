# Samsung Seller Office: what to do and what is still needed

## Recommended publication route

Start with a Samsung TV Seller Office account as a Public Seller, register the application and use the public-store package profile for the first pre-test. Samsung’s official guide says Public Sellers distribute in the United States by default; distribution outside the US and partner-level APIs require a Partner Seller request.

Because Nuvio’s local EngineFS implementation is a packaged `tizen:service`, the torrent/P2P path must not be enabled in a public package by assumption. To keep that feature in the Samsung Store package, Samsung must approve the partner-service route and provide the exact metadata/privilege scope. The repository already fails closed unless all of the following are present:

- `TIZEN_PARTNER_SERVICE_APPROVED=true`;
- `TIZEN_INCLUDE_ENGINEFS_SERVICE=true`;
- `TIZEN_SERVICE_METADATA_XML=<tizen:metadata .../>` supplied by Samsung;
- a valid `TIZEN_SECURITY_PROFILE`;
- the official `tizen` CLI in `TIZEN_CLI`.

Without that approval, `npm run package:tizen:store` produces the public profile with EngineFS/P2P disabled. This is intentional and is required to avoid submitting a package with an unauthorized partner-only service.

## Local certificate setup

1. Create a Samsung account and sign in to Samsung Developer/Tizen Studio.
2. Install Tizen Studio with the TV extension and Certificate Manager.
3. Create one author certificate/security profile for the publisher. Keep the author private key and profile backup offline and do not commit them.
4. Use the same author identity for future updates; changing it can prevent updates to an already published application.
5. For a partner-only service, do not generate or invent metadata locally. Ask the Samsung Content Manager for the approved partner scope and certificate requirements.
6. Store the profile securely in the release runner and set only the profile name in `TIZEN_SECURITY_PROFILE`; the private material belongs in the CI secret/secure store.

The exact public/partner certificate fields and device-DUID rules must be completed in Samsung’s current Certificate Manager flow, not in this repository.

## CLI setup

The release command uses the official Tizen CLI executable. On a local machine this is the `tizen` executable installed with Tizen Studio. In CI, install the official TV SDK or use a controlled runner, then configure:

```sh
TIZEN_CLI=/absolute/path/to/tizen \
TIZEN_SECURITY_PROFILE=NuvioStoreProfile \
npm run package:tizen:store
```

The command verifies that the result contains both `author-signature.xml` and `signature1.xml`. An unsigned ZIP/WGT from `npm run package:tizen` is only for development and must not be uploaded.

## Seller Office fields still needed

- Seller account/group and legal seller information.
- Public Seller or Partner Seller status.
- App title, languages, store descriptions and support contact.
- Privacy URL, content rating and market/country selection.
- Samsung model groups to target; start from Tizen 4+/2018 only if the pre-test and real-device matrix confirm it.
- Four final JPG screenshots and the UI Description PPTX (draft supplied in this directory).
- A real test account and the provider/add-on configuration used by certification.
- Final player declarations: codecs, containers, streaming engine, subtitle formats and DRM only after the supported test matrix is known.

## Official references

- [Samsung Launch Checklist](https://developer.samsung.com/tv-seller-office/checklists-for-distribution/launch-checklist.html)
- [Publishing an application](https://developer.samsung.com/tizen/Smart-TV/Quickstarts/Publishing-an-application.html)
- [Becoming Partners](https://developer.samsung.com/tv-seller-office/guides/membership/becoming-partner.html)
- [Privileges Q&A](https://developer.samsung.com/smarttv/develop/faq/privileges.html)
- [Entering Application Information](https://developer.samsung.com/tv-seller-office/guides/applications/entering-application-information.html)
