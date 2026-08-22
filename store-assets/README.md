# Nuvio TV store submission materials

This directory contains the first store-ready material draft for Samsung TV and LG webOS. The visual assets are generated from the project-owned Nuvio brand and real 1920x1080 captures of the local TV build.

## Ready locally

- Samsung: `samsung/logo-background-1920x1080.png`, `samsung/icon-512x423.png`, four JPG screenshots and `samsung/Nuvio_TV_UI_Description.pptx`.
- LG: `lg/splash-background-1920x1080.png`, `lg/seller-lounge-icon-400x400.png` and four JPG screenshots.
- Draft store copy: `docs/store-copy.md`.
- Samsung submission path and missing account inputs: `docs/samsung-submission-data.md`.
- LG UX scenario and self-checklist draft: `docs/lg-submission-data.md`.

## Important status

These are submission drafts, not a final store release. The final publisher identity, legal contact, privacy URL, rating, countries/model groups, test account and signed package must be supplied in Seller Office/Seller Lounge. Do not copy the publisher and support details currently visible on the public `com.nuvio.app` Google Play page without confirming that listing ownership; they do not match the NuvioMedia repository identity.

Samsung’s public-store profile intentionally excludes the EngineFS `tizen:service`. Torrent/P2P can be kept in a signed Samsung package only after Samsung approves the partner-service route and provides the exact metadata/privilege authorization. LG’s package keeps the existing native webOS service path; its availability remains subject to LG review and real-device QA.

Official references:

- Samsung [Launch Checklist](https://developer.samsung.com/tv-seller-office/checklists-for-distribution/launch-checklist.html)
- Samsung [Publishing an application](https://developer.samsung.com/tizen/Smart-TV/Quickstarts/Publishing-an-application.html)
- Samsung [Becoming Partners](https://developer.samsung.com/tv-seller-office/guides/membership/becoming-partner.html)
- LG [App Resources](https://webostv.developer.lge.com/develop/getting-started/app-resources)
- LG [Approval Process](https://webostv.developer.lge.com/distribute/app-approval-process)
