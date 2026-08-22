<div align="center">

  <img src="assets/brand/app_logo_wordmark.png" alt="Nuvio" width="300" />

  <p>
    A free, open-source Smart TV web app for Samsung Tizen and LG webOS.
    <br />
    Bring your own sources. Nuvio turns them into a TV library with artwork, ratings, subtitles, and saved progress.
  </p>

  [Website](https://nuvio.tv) · [GitHub releases](https://github.com/NuvioMedia/NuvioWeb/releases/latest) · [Support Nuvio](https://nuvio.tv/support)

</div>

## Get Nuvio TV

NuvioTV Web supports **Samsung Tizen TVs from 2018 onward (Tizen 4+)** and **LG webOS TVs from 2020 onward (webOS 5+)**.
On Tizen 4, some advanced audio/subtitle features may be limited, and torrent/P2P playback is unavailable.

- [Nuvio WebTV Installer](https://github.com/NuvioMedia/NuvioWeb/releases/latest) for Windows, macOS, and Linux
- [Samsung Tizen WGT](https://github.com/NuvioMedia/NuvioWeb/releases/latest) for manual installation
- [LG webOS Homebrew repository](https://raw.githubusercontent.com/NuvioMedia/NuvioTVWebOS/main/webosbrew/apps.json)
- [LG webOS IPK](https://github.com/NuvioMedia/NuvioWeb/releases/latest) for manual installation

## Build from source

```bash
git clone https://github.com/NuvioMedia/NuvioWeb.git
cd NuvioWeb
npm install
npm run build
```

Build TV packages with:

```bash
npm run package:tizen
npm run package:webos
```

NuvioTV Web is built with JavaScript, HTML, CSS, and platform TV APIs. Building requires Node.js and npm; package installation additionally requires the relevant Tizen or webOS tools.

## License

[GNU General Public License v3.0](./LICENSE)
