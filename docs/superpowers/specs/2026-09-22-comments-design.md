# ระบบ Comment สำหรับบทความและโปรเจกต์: Design Spec

สืบเนื่องจาก `docs/superpowers/specs/2026-09-13-blog-portfolio-design.md` ที่ตอนนั้นตั้งใจไม่สร้าง comment ไว้ก่อน (ดูข้อ 1 ในสรุปการตัดสินใจที่ล็อกแล้วของ spec นั้น) และภาคผนวก ค ข้อ 3 ของ spec เดิมเตือนไว้ว่าถ้าจะเพิ่ม comment ต้องกลับมาทบทวนเรื่อง CSRF ใหม่ เพราะตอนนั้นกันด้วย `SameSite=Lax` cookie อย่างเดียว — spec นี้ทำทั้งสองเรื่องพร้อมกัน

## สรุปการตัดสินใจที่ล็อกแล้ว

1. Comment ขึ้นเว็บทันทีที่ส่ง (post-moderate) เจ้าของเว็บลบทีหลังได้ผ่าน `/admin/comments` ไม่มีคิวอนุมัติก่อนขึ้น
2. ไม่มีระบบแจ้งเตือนอีเมลเมื่อมี comment ใหม่ เจ้าของเว็บเข้า `/admin/comments` เองเป็นระยะ (เว็บนี้ไม่มีระบบส่งอีเมลอยู่แล้ว การเพิ่มเข้ามาเฉพาะเพื่อแจ้งเตือนไม่คุ้มกับ dependency และ credential ที่ต้องดูแลเพิ่ม)
3. กัน spam ด้วย honeypot field + rate-limit ในหน่วยความจำต่อ IP เท่านั้น ไม่ใช้ captcha service ของ third-party (ไม่ต้องสมัคร ไม่ต้องโหลด JS จากนอกเว็บ เข้ากับแนวทาง minimal dependency ของเว็บนี้)
4. ผู้คอมเมนต์ไม่กรอกชื่อเอง ระบบสุ่มชื่อให้จาก **คำคุณศัพท์ไทย + เลข** (เช่น `ใจดี482`) แล้วจำไว้ด้วย cookie เพื่อให้คนเดิมได้ชื่อเดิมทุกครั้ง มีลิงก์สุ่มชื่อใหม่
5. ไม่มี field อีเมลหรือเว็บไซต์ของผู้คอมเมนต์ ไม่มี threading/reply ไม่มี pagination ของ comment list
6. Comment ผูกกับตัวโพสต์/โปรเจกต์ (ไม่ผูกกับภาษาที่แปล) ผู้อ่านทั้งสองภาษาเห็น comment ชุดเดียวกัน
7. UI/UX ของส่วน comment อิงสไตล์ Medium responses (avatar วงกลม, ไม่มีกรอบการ์ด, เส้นคั่นบางๆ, กล่องพิมพ์ที่ขยายอัตโนมัติ) แต่ใช้ดีไซน์ token เดิมของเว็บทั้งหมด ไม่เพิ่มชุดสีหรือฟอนต์ใหม่

## สิ่งที่เจ้าของต้องทำหรือเลือก

- ไม่มี — ทุกอย่างที่ต้องเลือกถูกล็อกไว้ในหัวข้อก่อนหน้าแล้ว
- Deploy: ต้องตั้ง `app.set('trust proxy', 1)` (ส่วนที่ 3 ด้านล่าง) เพราะ rate-limit ต้องอ้างอิง IP จริงของผู้อ่าน ไม่ใช่ IP ของ reverse proxy ของ Render/Fly.io — เป็นการเปลี่ยนแปลงทางเทคนิคล้วน ไม่ต้องตัดสินใจอะไรเพิ่ม

## ส่วนที่ 1: โครงข้อมูล

### `src/schema.sql` (เพิ่มท้ายไฟล์)

```sql
CREATE TABLE IF NOT EXISTS comments (
  id          INTEGER PRIMARY KEY,
  post_id     INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  project_id  INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  body        TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK ((post_id IS NULL) <> (project_id IS NULL))
);
CREATE INDEX IF NOT EXISTS comments_post ON comments (post_id, created_at);
CREATE INDEX IF NOT EXISTS comments_project ON comments (project_id, created_at);
```

- `post_id`/`project_id` เป็น `ON DELETE CASCADE` แบบเดียวกับ `post_tags`/`project_tags` — ลบโพสต์หรือโปรเจกต์แล้ว comment ของมันหายตามไปเอง ไม่ต้องมี cleanup แยก
- CHECK บังคับให้มีอย่างใดอย่างหนึ่งเท่านั้น กันแถวที่ไม่ผูกกับอะไรเลยหรือผูกสองอย่างพร้อมกัน
- ไม่มีคอลัมน์ email/website/status/lang ตามข้อ 5-6 ในการตัดสินใจที่ล็อกแล้ว
- index ตาม `(post_id/project_id, created_at)` เพราะทุก query อ่าน comment คือ "ของโพสต์นี้ เรียงตามเวลา"

## ส่วนที่ 2: การสุ่มชื่อผู้คอมเมนต์

### `src/nickname.js` (ใหม่)

โมดูลเดียว ไม่มี state ทำหน้าที่สองอย่าง: สุ่มชื่อใหม่ และตรวจว่าชื่อในคุกกี้ยังอยู่ในรูปแบบที่ระบบสร้างเองหรือเปล่า (กันคนแก้ cookie มือเป็นค่าประหลาด)

```js
// 50 คำคุณศัพท์ไทยเชิงบวก/เป็นกลาง คัดคำที่อ่านแล้วรู้สึกดีหรือเฉยๆ ไม่มีคำที่กำกวมไปทางลบหรือหยาบ
const WORDS = [
  'ใจดี', 'ร่าเริง', 'ขยัน', 'สงบ', 'มั่นใจ', 'อบอุ่น', 'ขี้เล่น', 'ใจเย็น', 'กล้าหาญ', 'ซื่อสัตย์',
  'ใจกว้าง', 'ยิ้มแย้ม', 'กระตือรือร้น', 'อดทน', 'เป็นมิตร', 'ตื่นเต้น', 'สุขุม', 'มีน้ำใจ', 'แจ่มใส', 'ห้าวหาญ',
  'อ่อนโยน', 'คิดบวก', 'ไฟแรง', 'ใจสู้', 'เรียบง่าย', 'มีชีวิตชีวา', 'ตั้งใจ', 'ระเบียบ', 'ประณีต', 'อบอุ่นใจ',
  'เฉลียวฉลาด', 'ช่างสังเกต', 'ชอบเรียนรู้', 'ชอบผจญภัย', 'รักสงบ', 'มีเหตุผล', 'ตรงไปตรงมา', 'มุ่งมั่น', 'สร้างสรรค์', 'ช่างคิด',
  'อารมณ์ดี', 'เป็นกันเอง', 'ไม่หยุดนิ่ง', 'ชอบช่วยเหลือ', 'ใจสบาย', 'มองโลกดี', 'ขี้สงสัย', 'ชัดเจน', 'หนักแน่น', 'เปิดกว้าง'
];

const PATTERN = new RegExp('^(' + WORDS.join('|') + ')([1-9][0-9]{1,2})$');

function generate() {
  const word = WORDS[Math.floor(Math.random() * WORDS.length)];
  const number = 10 + Math.floor(Math.random() * 990); // 10-999
  return word + number;
}

function isValid(name) {
  return typeof name === 'string' && PATTERN.test(name);
}

module.exports = { generate, isValid };
```

- เลข 2-3 หลัก (10-999) ให้ประมาณ 50 × 990 ≈ 49,500 ชื่อไม่ซ้ำ พอสำหรับบล็อกส่วนตัว
- `isValid` ใช้ตรวจค่าที่มาจาก `req.signedCookies` ก่อนเชื่อ — ถ้าไม่ผ่าน (ไม่มีคุกกี้, หมดอายุ, หรือถูกแก้ให้ผิดรูปแบบ) ระบบ `generate()` ชื่อใหม่แทนเงียบๆ ไม่มี error โชว์ผู้ใช้

### Cookie `ta_nick`

- Signed cookie (`cookie-parser` เดิม, secret เดียวกับ `ta_admin`) `httpOnly`, `sameSite: 'lax'`, `secure` ตาม `NODE_ENV === 'production'`, `path: '/'`, อายุ 1 ปี (เหมือน cookie `lang`)
- Middleware ใหม่ในเส้นทางสาธารณะ (เฉพาะหน้า post/project ที่มีฟอร์ม comment ไม่ใช่ทุก route): ถ้า `isValid(req.signedCookies.ta_nick)` เป็น false ให้ `generate()` ชื่อใหม่ ตั้งคุกกี้ และใส่ `res.locals.nickname`
- ลิงก์ "สุ่มชื่อใหม่" คือ `POST /:lang/reroll-nickname` (redirect 303 กลับหน้าเดิมด้วย `Referer` ที่ validate แล้วว่าเป็น same-origin path — ไม่เชื่อ header ตรงๆ ถ้า parse ไม่ได้ fallback ไปหน้าแรกของภาษานั้น) ลบคุกกี้เดิมทิ้งแล้วให้ middleware ข้างบนสุ่มใหม่ในรอบ request ถัดไป

## ส่วนที่ 3: CSRF และกัน spam

นี่คือส่วนที่ตอบภาคผนวก ค ข้อ 3 ของ spec เดิม

### CSRF: double-submit signed cookie

- Cookie `ta_csrf`: signed, `httpOnly`, `sameSite: 'lax'`, `secure` ตาม production, อายุ 1 วัน สุ่มด้วย `crypto.randomBytes(24).toString('base64url')`
- Middleware เดียวกับที่ตั้ง `ta_nick` (รันเฉพาะหน้าที่มีฟอร์ม POST ของสาธารณะ): ถ้าไม่มีหรือค่าไม่ผ่าน signature ให้สุ่มใหม่และตั้งคุกกี้ ใส่ `res.locals.csrfToken` ให้ view ใช้เป็น hidden input
- ทุก route ที่รับ POST จากสาธารณะ (comment, reroll-nickname) ตรวจ `req.body._csrf === req.signedCookies.ta_csrf` ก่อนทำอะไร ไม่ตรงให้ตอบเหมือนกรณี honeypot ติด (ดูด้านล่าง) คือทำเหมือนสำเร็จแต่ไม่บันทึกจริง เพื่อไม่ให้เป็นสัญญาณให้ผู้โจมตีลองซ้ำ
- ไม่ทำ CSRF middleware แบบ global เพราะตอนนี้มีแค่สอง endpoint ที่ต้องการ ใส่ตรงจุดพอ ไม่เพิ่ม dependency (`csurf` เลิกดูแลแล้วและไม่จำเป็นสำหรับ pattern ง่ายขนาดนี้)

### Honeypot

- ฟอร์ม comment มี input ซ่อนชื่อ `website` (ชื่อที่บอทมักกรอกอัตโนมัติ) ซ่อนด้วย CSS (`position: absolute; left: -9999px`) ไม่ใช่ `display: none`/`type=hidden` เพราะ screen reader และบอทบางตัวข้าม field ที่ตรวจแบบนั้นได้ง่ายกว่า มี `tabindex="-1" aria-hidden="true" autocomplete="off"` กันคนจริงกด Tab ไปเจอ
- ถ้า `req.body.website` ไม่ว่าง → ถือว่าเป็นบอท ตอบเหมือนสำเร็จ (redirect 303 กลับหน้าเดิม) แต่ไม่บันทึกอะไรลง DB

### Rate limit ในหน่วยความจำ

```js
// src/rate-limit.js
const hits = new Map(); // ip -> timestamp[]
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;

function allow(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter(t => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length <= MAX_PER_WINDOW;
}
```

- Key คือ `req.ip` ไม่เก็บลง DB ไม่มีผลต่อ privacy policy ที่มีอยู่ (คนละส่วนกับ analytics consent)
- ต้องมี `app.set('trust proxy', 1)` ใน `src/app.js` ไม่งั้น `req.ip` จะเป็น IP ของ reverse proxy ตัวเดียวกันทุก request บน Render/Fly.io ทำให้ทุกคนถูกนับรวมเป็นคนเดียว
- เกิน limit → ตอบเหมือน honeypot ติด (เงียบ ไม่บอกว่าเพราะอะไร) เพื่อไม่ให้บอทรู้ threshold ที่แน่นอน
- Map นี้ไม่มีการล้างเป็น cron แยก อาศัย filter ตอน `allow()` เข้าถึงคีย์นั้นอยู่แล้ว เพราะ traffic ของเว็บนี้เล็กพอที่จำนวน key ค้างจะไม่กลายเป็นปัญหาหน่วยความจำจริง

## ส่วนที่ 4: Routes

### Public (`src/routes/public.js`)

- `GET /:lang/blog/:slug` และ `GET /:lang/projects/:slug` (มีอยู่แล้ว) เพิ่มการ query comment list และส่ง `nickname`, `csrfToken` เข้า view
- `POST /:lang/blog/:slug/comments` และ `POST /:lang/projects/:slug/comments` (ใหม่) — หา `post_id`/`project_id` จาก slug+lang+status='published' แบบเดียวกับ route แสดงผล (คอมเมนต์ได้เฉพาะเนื้อหาที่เผยแพร่แล้วเท่านั้น ไม่งั้น 404) ตรวจ honeypot → CSRF → rate-limit → validate `body` (trim แล้วยาว 2-2000 ตัวอักษร) เรียงตามลำดับนี้ (honeypot/rate-limit ก่อน เพราะเป็นการตัดทิ้งแบบเงียบที่ถูกที่สุด ไม่ต้องเสีย query DB) ผ่านหมดค่อย `INSERT` แล้ว redirect 303 กลับไปที่ `#comments` ของหน้าเดิม ไม่ผ่านด้วยเหตุผลที่ควรบอกผู้ใช้ (ข้อความสั้น/ยาวเกิน) → re-render หน้าเดิมด้วย status 400 พร้อม error และค่าที่พิมพ์ไว้ (pattern เดียวกับ `saveTag` ใน `admin.js`)
- `POST /:lang/reroll-nickname` (ใหม่) — ตามส่วนที่ 2

### Admin (`src/routes/admin-comments.js`, ใหม่)

Mount เป็น `router.use('/comments', require('./admin-comments'))` ใน `admin.js` แบบเดียวกับ posts/projects

- `GET /admin/comments` — list ทุก comment ใหม่สุดก่อน (`ORDER BY created_at DESC`) แสดงชื่อ ข้อความ (ตัดสั้นถ้ายาว) วันที่ และลิงก์ไปโพสต์/โปรเจกต์ต้นทาง (join กับ `post_translations`/`project_translations` เอา title + slug ภาษาที่มี ให้ความสำคัญกับภาษาที่ยังเผยแพร่อยู่ก่อน)
- `POST /admin/comments/:id/delete` — เหมือน `POST /admin/tags/:id/delete` เป๊ะ: `parseId` แล้ว `DELETE FROM comments WHERE id = ?` ไม่มี confirm ฝั่ง server (ฝั่ง client อาจมี `confirm()` แบบ progressive enhancement เหมือนที่อื่นถ้ามี pattern นี้อยู่แล้ว)
- เพิ่มแถวเมนูใน `views/admin/head.ejs`: `['comments', '/admin/comments', 'ความคิดเห็น']`

## ส่วนที่ 5: การ render และป้องกัน XSS

- ชื่อ (`author_name`) render ด้วย `<%= %>` เสมอ (auto-escape) ไม่มีข้อยกเว้น เพราะมาจากระบบสุ่มเองก็จริง แต่ view ต้อง treat เหมือนข้อมูลจากผู้ใช้อยู่ดี — สอดคล้องกับความเสี่ยงข้อ 2 ในภาคผนวก ค ของ spec เดิม (`<%-` ตัวเดียวพังได้ทั้งระบบ)
- เนื้อหา comment (`body`) เป็น **plain text ล้วน ไม่รองรับ markdown หรือ HTML** — render ด้วย `<%= %>` แล้วให้ CSS `white-space: pre-wrap` จัดการขึ้นบรรทัดใหม่ตามที่ผู้ใช้พิมพ์ ไม่แปลง `\n` เป็น `<br>` ด้วยมือ (ไม่มีจุดไหนต้องใช้ `<%-` กับข้อมูลจาก comment เลยแม้แต่จุดเดียว — ตัดความเสี่ยง stored XSS ของ section นี้ทั้งหมดตั้งแต่ต้นทาง)
- ฟอร์ม comment **ไม่ render ในโหมด preview** (`preview: true` ใน `post.ejs`/`project.ejs`) เพราะหน้า preview เป็นของ admin ดูก่อนบันทึก ไม่ใช่หน้าให้คนอ่านคอมเมนต์

## ส่วนที่ 6: UI/UX (สไตล์ Medium responses)

ใช้ design token เดิมทั้งหมด (`--bg`, `--surface`, `--border`, `--text-muted`, `--accent`, `--r-sm`, `--sp-*`) ไม่เพิ่มสีหรือฟอนต์ใหม่ นอกจาก palette เล็กๆ สำหรับ avatar

### โครงสร้าง

```
<section id="comments" class="comments">
  <h2>ความคิดเห็น (<%= comments.length %>)</h2>

  <form class="comment-form" method="post" action="...">
    <input type="hidden" name="_csrf" value="<%= csrfToken %>">
    <div class="comment-form-identity">
      <span class="avatar avatar-<%= avatarIndex(nickname) %>"></span>
      คอมเมนต์ในชื่อ <strong><%= nickname %></strong>
      · <form method="post" action="/.../reroll-nickname">
          <input type="hidden" name="_csrf" value="<%= csrfToken %>">
          <button class="link-button">สุ่มชื่อใหม่</button>
        </form>
    </div>
    <div class="comment-form-honeypot" aria-hidden="true">
      <input type="text" name="website" tabindex="-1" autocomplete="off">
    </div>
    <textarea name="body" placeholder="แชร์ความคิดเห็นของคุณ…" maxlength="2000" required></textarea>
    <div class="comment-form-footer">
      <span class="comment-counter"></span>
      <button type="submit">โพสต์</button>
    </div>
  </form>

  <ul class="comment-list">
    <li class="comment">
      <span class="avatar avatar-<%= avatarIndex(c.author_name) %>"></span>
      <div class="comment-body">
        <p class="comment-meta"><strong><%= c.author_name %></strong> <time><%= formatDate(lang, c.created_at) %></time></p>
        <p class="comment-text"><%= c.body %></p>
      </div>
    </li>
  </ul>
  <p class="comment-empty">ยังไม่มีความคิดเห็น เป็นคนแรกที่คอมเมนต์ได้เลย</p> <!-- แสดงเมื่อ comments.length === 0 -->
</section>
```

### Avatar

- **ไม่มีตัวอักษรในวงกลม** — ตอนแรกคิดจะใส่ตัวแรกของชื่อแบบ Slack/Gmail แต่คำไทยหลายคำขึ้นต้นด้วยสระหน้า (เช่น "ใจดี", "โอบอ้อม") ซึ่งลอยเดี่ยวๆ ไม่มีพยัญชนะต่อจะอ่านแปลกทางการพิมพ์ไทย ใช้วงกลมสีล้วนพอ — ยังให้ความรู้สึก "แต่ละคนมีสีของตัวเอง" แบบ Medium ได้โดยไม่ชนปัญหานี้
- สีมาจาก hash ง่ายๆ ของ `author_name` (เช่น sum ของ char code) mod 6 → class `avatar-0` ถึง `avatar-5` คำนวณฝั่ง server ล้วนผ่าน helper `avatarIndex(name)` ที่ตั้งเป็น `app.locals.avatarIndex` ใน `src/app.js` (จุดเดียวกับ `app.locals.formatDate`/`app.locals.md` ที่มีอยู่แล้ว) ทำงานได้แม้ปิด JS
- กำหนด 6 สีใน `site.css` ด้วย `light-dark()` แบบเดียวกับ token อื่นๆ ให้กลมกลืนกับ `--accent` และ `--syn-*` ที่มีอยู่ ไม่ใช้สีฉูดฉาดแยกจากธีม

### กล่องพิมพ์

- Textarea เริ่มสูง ~2 บรรทัด ขยายอัตโนมัติตามเนื้อหาด้วย JS เสริม (`public/js/comments.js` ตาม pattern ของ `theme.js`/`consent.js` คือ IIFE เล็กๆ, ไม่มี framework) ปิด JS ก็ยังพิมพ์/scroll ในกล่องปกติได้ ไม่ block การส่งฟอร์ม
- ตัวนับตัวอักษรมุมขวาล่าง อัปเดตด้วย JS เดียวกัน ไม่มีก็ไม่กระทบการส่ง (มี `maxlength` ที่ browser บังคับอยู่แล้วเป็น baseline)
- ปุ่ม "โพสต์" ไม่ต้อง disable ด้วย JS ก็ได้ (mute ด้วย CSS `:disabled` เฉยๆ พอ ไม่ใช่ requirement ที่ต้องมี JS ถึงจะส่งได้ — ตรงข้ามกับที่เคยเสนอตอนคุย design เบื้องต้น ปรับให้เรียบง่ายและไม่ผูกกับ JS)

### List

- ไม่มีกรอบการ์ด ใช้ `border-top: 1px solid var(--border)` คั่นระหว่างแต่ละ `.comment` แบบ Medium responses จริง
- วันที่ใช้ `formatDate` helper เดิมของแอป (`app.locals.formatDate`) รูปแบบเดียวกับวันที่เผยแพร่บทความ ไม่ทำ relative time ("2 วันที่แล้ว") ใหม่ เพราะเว็บนี้ใช้ absolute date convention เดียวทั้งเว็บอยู่แล้ว

## ส่วนที่ 7: strings.js (เพิ่ม key ทั้งสองภาษา)

`commentsHeading`, `commentPlaceholder`, `commentSubmit`, `commentAs`, `commentReroll`, `commentEmpty`, `commentTooShort`, `commentTooLong` — ข้อความหน้า admin (`ความคิดเห็น`, ปุ่มลบ ฯลฯ) เป็นภาษาไทยตรงในไฟล์ view เหมือนหน้า admin อื่นทั้งหมด ไม่ผ่าน `strings.js` (admin ทั้งระบบเป็นภาษาไทยล้วนอยู่แล้ว)

## ส่วนที่ 8: Testing

ไฟล์ใหม่ต่อจาก `test/17-consent-privacy.test.js`:

- `test/18-comments.test.js` — post comment สำเร็จ (ขึ้นทันทีไม่ต้องรออนุมัติ), validation (ว่าง/สั้นเกิน/ยาวเกิน), comment ผูกถูกโพสต์/โปรเจกต์, comment เดียวกันโชว์ทั้งสองภาษาของโพสต์นั้น, คอมเมนต์บนเนื้อหาที่ยังไม่เผยแพร่ (draft) หรือ slug ไม่มีจริง → 404, ลบโพสต์แล้ว comment หายตาม (cascade)
- `test/19-comments-nickname.test.js` — ไม่มีคุกกี้ → สุ่มชื่อใหม่และตั้งคุกกี้, มีคุกกี้ถูกต้อง → ใช้ชื่อเดิม, คุกกี้ถูกแก้เป็นค่าที่ไม่ตรง pattern → สุ่มใหม่ (ไม่ error), reroll endpoint → ชื่อเปลี่ยน
- `test/20-comments-security.test.js` — CSRF token ไม่ตรง/ไม่มี → ไม่บันทึก แต่ตอบเหมือนสำเร็จ, honeypot ไม่ว่าง → ไม่บันทึก, เกิน rate-limit → request ที่ 6 ในหน้าต่างเวลาเดียวกันไม่ถูกบันทึก, XSS payload ใน body/ชื่อ (แม้ชื่อคุมเองแต่เทสต์ไว้กันของแถม) render แบบ escape แล้ว ไม่มี raw `<script>` หลุดออกมาใน response
- `test/21-admin-comments.test.js` — ต้อง login ก่อนเข้า `/admin/comments` (guard เดียวกับหน้า admin อื่น), list แสดงครบ, ลบสำเร็จแล้วหายจากทั้ง admin list และหน้าเว็บจริง

## ภาคผนวก ก: สิ่งที่ตั้งใจไม่สร้าง (รอบนี้)

- Threading/reply ตอบกลับ comment อื่น
- Field อีเมล/เว็บไซต์ของผู้คอมเมนต์ หรือ gravatar
- การแจ้งเตือนอีเมลเมื่อมี comment ใหม่
- Captcha ของ third-party (Turnstile/reCAPTCHA)
- คิวอนุมัติก่อนขึ้นเว็บ (pre-moderate) หรือสถานะ hidden/flagged
- แก้ไข/ลบ comment ของตัวเองโดยผู้คอมเมนต์ (ไม่มี identity ที่ยืนยันตัวได้ จึงไม่มีสิทธิ์ทำแบบนั้น มีแต่แอดมินลบได้)
- Pagination ของ comment list, sort แบบอื่นนอกจากเรียงตามเวลา
- Rate-limit ที่ทนต่อ multi-process/serverless (Map ในหน่วยความจำใช้ได้เพราะแอปรันเป็น process เดียว ถ้าวันหน้า scale เป็นหลาย instance ต้องย้ายไปที่เก็บกลาง)

## ภาคผนวก ข: ความเสี่ยงหลัก

1. **Honeypot + rate-limit ไม่ใช่กำแพงสมบูรณ์** บอทที่เขียนมาเฉพาะเจาะจงเว็บนี้ (อ่าน field name จริง, หมุน IP) ยังผ่านได้ — เพราะเลือก post-moderate เจ้าของเว็บต้องเข้า `/admin/comments` เป็นระยะเพื่อไล่ลบเอง ไม่ใช่ระบบที่ป้องกันได้เอง 100%
2. **Rate-limit ในหน่วยความจำหายเมื่อ deploy ใหม่หรือ restart** ยอมรับได้เพราะ traffic ต่ำและผลคือกัน spam หลวมลงชั่วคราว ไม่ใช่ข้อมูลหาย
3. **`trust proxy` ตั้งผิดค่าทำให้ rate-limit ไร้ผลหรือถูกปลอม IP ได้** ต้องตั้งเป็น `1` (เชื่อ hop เดียวจาก reverse proxy ของ Render/Fly.io) ไม่ใช่ `true` (เชื่อทุก hop จะเปิดช่องให้ปลอม `X-Forwarded-For` ได้)
4. **ชื่อที่สุ่มซ้ำกันได้** (คนละคนได้ชื่อเดียวกัน) เพราะ namespace ~49,500 ชื่อ ไม่ผูกกับตัวตนจริง เป็นเรื่องที่ยอมรับได้สำหรับ nickname เล่นๆ ของบล็อกส่วนตัว ไม่ใช่ identity ที่ต้อง unique
