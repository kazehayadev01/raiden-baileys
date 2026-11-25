# Raiden-Baileys

<p align="center">
  <img src="https://raw.githubusercontent.com/kazehayadev01/raiden-baileys/main/assets/banner.png" width="500" alt="Raiden-Baileys banner"/>
</p>

<p align="center">
  <b>Pustaka Bot WhatsApp</b><br>
  Wrapper Baileys berkinerja tinggi untuk otomatisasi bot WhatsApp kalian
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-v20+-green?style=flat-square">
  <img src="https://img.shields.io/badge/Modified-Baileys-blue?style=flat-square">
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=flat-square">
</p>

---

## Overview

Raiden-Baileys adalah library open source berbasis Baileys yang telah dimodifikasi untuk kebutuhan automation dan integrasi WhatsApp skala besar.

Dirancang agar ringan, cepat, dan mudah digunakan, serta mendukung fitur-fitur terbaru WhatsApp bot, termasuk dukungan **LID** (PN ↔ LID) dan sinkronisasi dengan Baileys v7 rc14.

---

## Features

- Custom & automatic pairing
- Interactive message & action buttons
- Album message (multiple images)
- Event message
- Poll result message
- Product message
- Payment request message
- Group & chat management
- Privasi pesan/panggilan, call link, daftar bot, member label grup, `newsletterUpdate`
- Kontak, label, dan quick reply (`addOrEditContact`, `removeContact`, `addLabel`, `addOrEditQuickReply`, `removeQuickReply`)
- Multi-device support
- Dukungan LID: pemetaan PN ↔ LID persisten, sesi Signal kanonik LID
- Retry manager: cache pesan terkirim & auto session recreation
- Transaksi kunci Signal serial per akun (mutex + antrean per tipe key)
- Private relay (`sendPrivateRelay`): kirim ke sebagian perangkat saja, include/exclude per nomor, LID, atau device
- Metadata relay otomatis: node `biz` untuk katalog, order, `payment_key_info`; node `meta` untuk poll dan event
- `photoPoll`, `buttonLocation`, dan `rawMessage` di `sendMessage`
- Lightweight & scalable

---

## Installation

```bash
npm install @kaze012/raiden-baileys
```

Atau langsung dari GitHub:

```bash
npm install github:<username>/<repo>
```

> Butuh **Node.js 20+**. Fitur audio/video (thumbnail, waveform, konversi) membutuhkan **ffmpeg** terpasang di sistem.

---

## CommonJS & ESM

Paket ini mendukung **CJS** dan **ESM** sekaligus (dual package). Keduanya memuat kode yang sama, jadi tidak ada instance ganda.

```js
// CommonJS
const { default: makeWASocket, useMultiFileAuthState } = require('@kaze012/raiden-baileys')
```

```js
// ESM (.mjs, atau "type": "module" di package.json)
import makeWASocket, { useMultiFileAuthState, proto } from '@kaze012/raiden-baileys'
// atau
import * as baileys from '@kaze012/raiden-baileys'
```

Catatan:
- Import deep path memakai `exports`: `@kaze012/raiden-baileys/lib/Utils/crypto` (tanpa/dengan `.js`) dan `@kaze012/raiden-baileys/WAProto` tetap bisa. Import folder (misalnya `@kaze012/raiden-baileys/lib/Utils`) tidak bisa, tulis file-nya (`.../Utils/index`).
- Tipe TypeScript tersedia untuk keduanya (`lib/index.d.ts` untuk CJS, `lib/index.d.mts` untuk ESM).
- Setelah menambah export baru di `lib/index.js`, jalankan `npm run build:esm` untuk membuat ulang `lib/index.mjs`.

---

## Quick Start

```js
const { default: makeWASocket, useMultiFileAuthState } = require('@kaze012/raiden-baileys')

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState('session')
  const sock = makeWASocket({ auth: state, printQRInTerminal: true })

  sock.ev.on('creds.update', saveCreds)
  sock.ev.on('messages.upsert', ({ messages }) => {
    console.log(messages[0])
  })
}

start()
```

### Opsi tambahan

| Opsi | Default | Fungsi |
| --- | --- | --- |
| `enableRecentMessageCache` | `true` | Cache pesan terkirim untuk retry |
| `enableAutoSessionRecreation` | `true` | Buat ulang sesi saat retry |
| `lidSessionMigration` | `true` | Migrasi sesi Signal PN → LID |

---

## Fitur Pengiriman Lanjutan

### Private relay

Kirim `proto.IMessage` hanya ke sebagian perangkat. Fungsi mengembalikan message id.

```js
// semua perangkat kecuali device 2 milik 628xxx
await sock.sendPrivateRelay('628xxx@s.whatsapp.net', { conversation: 'halo' }, {
  mode: 'exclude',          // 'exclude' (default) | 'include'
  target: ['628xxx:2'],     // nomor, JID PN, JID LID, opsional ":device"
})

// hanya HP utama penerima
await sock.sendPrivateRelay(jid, message, { mode: 'include', target: ['628xxx'], deviceMode: 'primary' })

// grup: anggota target tidak menerima pesan
await sock.sendPrivateRelay('1203...@g.us', message, { target: ['628yyy'] })
```

| Opsi | Default | Fungsi |
| --- | --- | --- |
| `mode` | `'exclude'` | `include` = hanya target, `exclude` = semua kecuali target |
| `target` | `[]` | Daftar nomor / JID. Alias PN ↔ LID ikut dicocokkan |
| `deviceMode` | `'all'` | `all`, `primary` (device 0), `secondary` (perangkat pendamping) |
| `targetMe` | - | `true`/`false` memaksa perangkat sendiri ikut/tidak |
| `hideDecryptFail` | `true` | Atribut `decrypt-fail="hide"` |
| `ai` | `false` | Tambah node `<bot biz_bot="1"/>` |
| `statusJidList` | - | Wajib untuk `status@broadcast` |

Catatan grup: private relay membuat sender key baru, lalu mengosongkan `sender-key-memory` grup itu. Pesan grup normal berikutnya mengirim ulang sender key ke semua anggota.

### Metadata relay otomatis

`relayMessage` dan `sendMessage` kini menambah node berikut bila belum ada di `additionalNodes`:

| Isi pesan | Node |
| --- | --- |
| `productMessage` | `<biz native_flow_name="catalog_message"/>` |
| `orderMessage` | `<biz native_flow_name="order_details"/>` |
| tombol `payment_key_info` | `<biz><interactive type="native_flow"><native_flow name="payment_key_info"/></interactive></biz>` |
| `pollCreationMessage` (V1/V2/V3/V5) | `<meta polltype="creation"/>` |
| `eventMessage` | `<meta event_type="creation"/>` |

### photoPoll

Alias `sock.sendImagePoll` lewat `sendMessage`.

```js
await sock.sendMessage(jid, {
  photoPoll: {
    name: 'Pilih menu',
    selectableCount: 1,
    values: [
      { name: 'Nasi goreng', image: { url: './nasgor.jpg' } },
      { name: 'Mie ayam', image: { url: './mieayam.jpg' } },
    ],
  },
})
```

### buttonLocation

Tombol dengan header lokasi. `thumbnail` berupa URL, path, atau Buffer (butuh paket opsional `jimp`).

```js
await sock.sendMessage(jid, {
  buttonLocation: {
    text: 'Kantor kami',
    footer: 'Raiden',
    title: 'Kantor Pusat',
    address: 'Jl. Contoh No. 1',
    thumbnail: 'https://example.com/peta.jpg',
    buttons: [
      { id: 'rute', text: 'Rute' },
      { id: 'menu', text: 'Menu', type: 'single_select', params: { title: 'Menu', sections: [] } },
    ],
  },
})
```

### rawMessage

Kirim `proto.IMessage` mentah lewat `sendMessage`. Isi pesan tidak diubah oleh builder Raiden.

```js
await sock.sendMessage(jid, { rawMessage: { conversation: 'pesan mentah' } })
```

### sendMetaStep

Pesan dengan indikator langkah/progres (`proto.BotProgressIndicatorMetadata`). Setiap langkah punya judul, isi, dan status `PLANNED` / `EXECUTING` / `FINISHED`. Pesan yang sama diedit tiap kali ada langkah baru.

```js
const meta = await sock.sendMetaStep(jid, { title: 'Memproses', body: 'tunggu', disabled: false })
await meta.step({ title: 'Langkah 2', body: 'hampir selesai' })
await meta.done('selesai')
```

Pesan dikirim dalam format balasan Meta AI: `richResponseMessage` dibungkus `botForwardedMessage`, dengan `botMetadata.progressIndicatorMetadata`, sehingga muncul tombol "Lihat perincian" untuk daftar Steps. Teks pesan adalah judul langkah terakhir. Langkah baru dikirim sebagai edit yang juga dibungkus `botForwardedMessage`.

- `disabled: true` membuat langkah langsung `FINISHED`. Default `false` (`EXECUTING`). Bisa juga pakai `status: 'PLANNED'`.
- `meta.done(teks)` menandai semua langkah `FINISHED`; `teks` jadi `progressDescription`, teks pesan tetap judul langkah terakhir. Objek `meta.done({ title, body })` menambah langkah penutup. `meta.finish` sama dengan `done`.
- `meta.step()` menandai langkah lama `FINISHED` lalu menambah langkah baru. Pakai `meta.step(x, { keepPrevious: true })` agar status langkah lama tidak berubah.
- Opsi langkah lain: `reasoning`, `sections: [{ title, body }]`, `sources: [{ title, url }]`, `description`, `text`.
- Tampilan di klien penerima ditentukan WhatsApp. Field ini aslinya untuk balasan bot AI, jadi hasil di akun biasa belum dijamin.

### Status Saluran (sendNewsletterStatus)

Posting status di saluran WhatsApp (bukan post biasa). Bot harus admin saluran, dan saluran harus sudah punya fitur status dari WhatsApp. Jika tidak, server menolak dengan error `403` / `not-authorized`.

```js
const jid = '120363xxxxxxxxxx@newsletter'

// teks
const st = await sock.sendNewsletterStatus(jid, { text: 'Halo pengikut!' })
console.log(st.key.id, st.newsletterStatusServerId)

// gambar / video / audio
await sock.sendNewsletterStatus(jid, { image: { url: './foto.jpg' }, caption: 'Info terbaru' })
await sock.sendNewsletterStatus(jid, { video: buffer, caption: 'Video' })
await sock.sendNewsletterStatus(jid, { audio: buffer, mimetype: 'audio/ogg; codecs=opus', ptt: true })

// reaksi ke status (serverId dari hasil kirim atau getNewsletterStatuses); tanpa emoji = hapus reaksi
await sock.sendNewsletterStatusReaction(jid, st.newsletterStatusServerId, '🔥')

// hapus status
await sock.revokeNewsletterStatus(jid, st.key.id)

// daftar status dan pembaruan (views, reaksi)
const { statuses } = await sock.getNewsletterStatuses(jid, { count: 20 })
const updates = await sock.getNewsletterStatusUpdates(jid, { count: 20 })
```

- Isi yang didukung: teks, gambar, video, gif, audio. Dokumen dan stiker ditolak.
- WhatsApp Web sendiri hanya memposting status gambar dan video; audio dan gif bisa ditolak server.
- Upload media otomatis memakai jalur upload saluran. Hasil kirim berisi `newsletterStatusServerId` dan `newsletterStatusAck`.
- Opsi: `ackTimeoutMs` (default 20000), `resolveServerId: false`, `statusAttribution: false`, `mediaId` (handle media yang sudah diunggah).

---

## Changelog

### [1.0.1] - 2026-11-25

- Paket diganti nama menjadi `@kaze012/raiden-baileys`; repo pindah ke `kazehayadev01/raiden-baileys`.
- WAProto diperbarui ke WhatsApp Web `2.3000.1056191857`.

### [1.0.0]

- Rilis pertama.

---

## Contact

- WhatsApp : [+62 815-4950-1054](https://wa.me/6281549501054)
- Instagram: [@qwerty267_](https://instagram.com/qwerty267_)

---

## Contributors

- Kaze ([kazehayadev01](https://github.com/kazehayadev01))
- [Kelvin](https://github.com/vfmarket24-alt)
- Tayro

---

## Credits

Lihat [CREDITS.md](CREDITS.md).

## License

MIT © Kaze, Kelvin, Tayro
