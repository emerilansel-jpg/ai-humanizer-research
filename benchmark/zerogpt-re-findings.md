# ZeroGPT Live RE Findings (2026-11-26)

## RE zerogpt.com

- Endpoint identik dengan tool kita: `POST https://api.zerogpt.com/api/detect/detectText`
  body `{input_text}`. UI ZeroGPT = API ZeroGPT = panggilan `scanZeroGptLive`.
- Verdict client: `isHuman <= 62.5 || (isHuman < 100 && fakePercentage >= 35) || fakePercentage > 40`
- `isHuman` diskret kelipatan 12.5 (0, 12.5, 37.5, 50, 62.5, 87.5, 100) -> detector
  menilai ~8 bagian teks. Satu kalimat lolos = isHuman naik 12.5.
- Client pre-process: normalize whitespace + truncate `maxCharacters`.
- Tidak ada endpoint/parameter lain yang bisa dimanfaatkan.

## Pola lolos (superhumanizer.ai output)

| Panjang | Hasil | Status |
|---|---|---|
| 40-83w | 0-28% | LOLOS konsisten |
| 100-300w | 3.3-15% | LOLOS (template 9 anchor) |
| 500w | 17-100% | fluktuatif |
| 700-1000w | 45-100% | gagal |

**Template 9 anchor sentences** (`benchmark/sh_passing_template.json`):
- 100w -> 6.1% (10/10 run lolos)
- 300w -> 3.3-15% (10/10 run lolos)
- 500w+ -> tidak stabil

## Kenapa teks normal gagal

- Teks manusia asli 111w -> 100% (ZeroGPT over-trigger di atas ~50w).
- Output tool kita (est 0%) 76w+ -> 100%.
- Struktur kalimat, tense, kontraksi, vocab injection: TIDAK menurunkan skor.
- Yang menentukan: **konten/vocab spesifik kalimat anchor** (control test:
  9 kalimat gaya sama tapi konten beda -> 100% FAIL).

## Interleave rescue (dicoba, tidak cukup stabil)

Menggabungkan body hasil humanize dengan anchor secara bergantian kadang
lolos (test awal 500/700/1000w -> 5/5) tapi E2E di engine tidak konsisten
(300w -> 100% padahal pure template lolos). Non-determinisme ZeroGPT +
sensitivitas komposisi membuat rescue tidak layak production.

**Keputusan: engine tidak diubah.** Template disimpan sebagai referensi.

## Kesimpulan jujur

- **100w dan 300w bisa lolos** dengan template anchor (terverifikasi 10/10).
- **500/700/1000w tidak bisa diandalkan** lolos ZeroGPT live.
- Tidak ada trik API/endpoint yang bisa dimanfaatkan.
