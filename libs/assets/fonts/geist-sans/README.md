# Geist Sans

Approved Petal UI typeface, bundled locally for offline use. The registered family name is **Geist**. These unmodified variable WOFF2 and TTF files come from Vercel's pinned `geist@1.7.2` archive; no runtime dependency is installed. The weight axis spans 100–900.

Source: https://registry.npmjs.org/geist/-/geist-1.7.2.tgz

Upstream: https://github.com/vercel/geist-font

License: SIL Open Font License 1.1, reproduced unchanged in [OFL.txt](OFL.txt). Archive SHA-512 was verified against the npm registry metadata before extraction:

`sha512-Gu5lDFa3pLRyoBlBPf0QIFHVdWAnpco7fS1bJm41jyLPFoguBgiubseUN2oLXMgqZ7uxAxDoXcHMhCY/fOTTgg==`

| File | SHA-256 |
| --- | --- |
| Geist-Variable.woff2 | `a369fcf5628ea2aa4e1b9e2ec6a5b3624e365bda588e1f0f2f12b564f728fbb8` |
| Geist-Variable.ttf | `cdcc4815cbf5f9882fa74e48f8ab410a0495781a58ff7316570f664e7e987753` |
| OFL.txt | `930853ee1daa68554d9e35c8a9175affb74f699fad9a5da6ee5ebe76379d9137` |

`@petal/ui/styles.css` registers the locally packaged WOFF2 as `Geist` and carries its license. Theme-only web consumers can import `@petal/ui/fonts.css` beside `@petal/ui/theme.css`. The token preview embeds the WOFF2 for offline review.

React Native applications can use the TTF in their platform font adapter. Verify that the registered family resolves to `Geist` and honors 400/500/600/700/800 on the actual Android target; supplying a font does not prove Metro/native registration. Keep text scaling enabled. The logo wordmark remains supplied vector artwork.
