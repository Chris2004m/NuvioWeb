# Changelog

## 1.0.3 - 2026-09-02

- Finalized the Tizen plugin-service lifecycle, packaging contract, local health probing, launcher fallbacks, plugin HTTP playback proxy, and localized plugin UI handling ([0fbd1810](https://github.com/NuvioMedia/NuvioTVSmart/commit/0fbd1810fcc2af78d1ee33c23726d4444632e6cd)). (@WhiteGiso)
- Scoped plugin repositories, provider code, and cloud synchronization to the effective profile, including revision and dirty-state protection against cross-profile updates ([b5c2ddc0](https://github.com/NuvioMedia/NuvioTVSmart/commit/b5c2ddc099227b1309ca8deb9a08a03ca7f75807)). (@WhiteGiso)
- Preserved profile-bound local repository changes during remote reconciliation so stale snapshots cannot overwrite recent TV updates ([b8c78b5d](https://github.com/NuvioMedia/NuvioTVSmart/commit/b8c78b5d45d5d6c1bb3f8ab83e7c66526b3e15b2)). (@WhiteGiso)
- Moved provider-code caching from synchronous `localStorage` to profile-keyed asynchronous IndexedDB with bounded eviction, memory fallback, cleanup handling, authentication/profile integration, and the required Tizen storage privilege ([c32b1ad6](https://github.com/NuvioMedia/NuvioTVSmart/commit/c32b1ad6bd2fd914dad7707053644a67c99286ce)). (@WhiteGiso)
- Restored the existing detail route after playback, targeting the correct history entry and avoiding duplicate detail screens while retaining stream cleanup ([6c7abe09](https://github.com/NuvioMedia/NuvioTVSmart/commit/6c7abe09c6c5e86a133af4ebd0754c4a8cab76aa)). (@WhiteGiso)
- Removed test programs and plugin fixtures from tracked application directories, keeping local test assets exclusively under the ignored root `tests/` directory ([de151ebf](https://github.com/NuvioMedia/NuvioTVSmart/commit/de151ebfda376600511f9b1597cb0db14cdde3e4)). (@WhiteGiso)
