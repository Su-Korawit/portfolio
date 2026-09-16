# Dev Portfolio และ Tech Blog สองภาษา: Design Spec

- **วันที่:** 2026-09-13
- **สถานะ:** รอเจ้าของโปรเจกต์รีวิว ยังไม่เริ่มเขียนโค้ด
- **ขอบเขต:** เปลี่ยน TalkAlways จาก chat MVP เป็น dev portfolio และ tech blog สองภาษา พร้อมหน้า admin

## สรุปการตัดสินใจที่ล็อกแล้ว

1. ระบบ chat, socket.io และ Stripe ออกจากแอป โค้ดเดิมย้ายไป `archive/` โดยไม่ลบ เผื่อใช้ทำ comment หรือ private messenger ภายหลัง รอบนี้ไม่สร้าง comment
2. เนื้อหาเป็น dev portfolio คู่ tech blog โปรเจกต์มีลิงก์ GitHub และ demo บทความเป็น markdown ที่มี code block พร้อม syntax highlight
3. Stack คือ Express 5, EJS และ SQLite ไม่มี build step และ render ฝั่ง server ทั้งหมด
4. เว็บมีสองภาษา ไทยและอังกฤษ บทความที่แปลไม่ครบก็เผยแพร่ได้
5. Admin ระดับกลาง มี login คนเดียว จัดการบทความและโปรเจกต์สองภาษา เผยแพร่แยกภาษา ดูตัวอย่างก่อนเผยแพร่ อัปโหลดรูป จัดการแท็ก ปักหมุดโปรเจกต์ และแก้หน้า About กับลิงก์โซเชียล
6. หน้าตาเป็น editorial minimal มีธีมสว่างและมืด เริ่มตามค่า OS และมีปุ่มสลับ
7. Runtime คือ Node 24 LTS เพราะ Node 20.19.5 ที่ติดตั้งอยู่ในเครื่อง EOL ไปแล้วเมื่อ 2026-04-30
8. เพิ่ม search, cookie จำภาษา, แถบ consent ตาม PDPA พร้อม Google Analytics, หน้า privacy, ปุ่มออกจากระบบทุกเครื่อง และ CI บน GitHub Actions รายละเอียดอยู่ในส่วนที่ 4

## สิ่งที่ต่างจากที่คุยกันก่อนหน้า

- **สถานะเผยแพร่อยู่ระดับภาษา** ร่างภาษาอังกฤษของบทความไทยที่เผยแพร่แล้วจึงไม่หลุดออกไปเอง
- **alt text ของภาพปกแยกภาษา** เพราะ screen reader ต้องอ่านภาษาเดียวกับเนื้อหา
- **ไม่มีตาราง `admin_users`** ผู้ใช้มีคนเดียว credentials จึงอยู่ใน `.env` และ reset รหัสผ่านด้วยการแก้ `.env`
- **slug เป็น ASCII เท่านั้น** ตัวอย่าง `/th/blog/เริ่มต้น-docker` ที่เคยยกไว้ถูกยกเลิก เพราะตัวอักษรไทยหนึ่งตัวยาวเป็นเก้าตัวเมื่อ encode และแอป chat บางตัวตัดลิงก์ขาด เหตุผลเต็มอยู่ในข้อ 2.3
- **ลบแล้วไม่มีข้อมูลค้าง** ตารางลูกทุกตัวใช้ `ON DELETE CASCADE` และ DB เปิด `foreign_keys` ทุกครั้งที่เชื่อมต่อ

## สิ่งที่เจ้าของต้องทำหรือเลือก

- **ต้องทำก่อนเริ่ม** ติดตั้ง Node 24 LTS ในเครื่อง ขั้นตอนอยู่ใน Phase 0
- **host และ domain** เลือกได้ก่อนถึง Phase 7 ตัวเลือกอยู่ในข้อ 3.6
- **ฟอนต์ไทย** ค่าเริ่มต้นคือ Anuphan ถ้าอยากได้แบบมีหัว เปลี่ยนเป็น IBM Plex Sans Thai ได้โดยแก้ `@font-face` กับ token เดียว
- **แบรนด์** จะใช้ชื่อและโลโก้ TalkAlways ต่อหรือทำใหม่ก็ได้ ระหว่างนี้ใช้ favicon placeholder ส่วนชื่อเว็บ, tagline และ About แก้ใน admin
- **Google Analytics** สร้าง property แล้วนำ Measurement ID มาใส่ `GA_MEASUREMENT_ID` ถ้ายังไม่ใส่ เว็บจะไม่เก็บสถิติ และแถบ cookie จะมีแค่ปุ่มรับทราบ
- **repo บน GitHub** จะให้เป็น public หรือ private ต้องตอบก่อน push ครั้งแรกใน Phase 0

ทุกข้อยกเว้นข้อแรกไม่บล็อกการเขียนโค้ด

## ส่วนที่ 1: โครงข้อมูล

### หลักการ

- ข้อมูลที่ไม่ขึ้นกับภาษาอยู่ในตารางแม่ ข้อมูลที่แปลได้อยู่ในตาราง translations
- ภาษาที่ยังไม่มีฉบับแปลคือภาษาที่ไม่มี row ไม่ใช่ row ว่าง
- สถานะ `draft` หรือ `published` และวันที่เผยแพร่อยู่บน translation row แต่ละภาษาจึงเผยแพร่แยกกันได้
- `published_at` ถูกตั้งครั้งแรกที่ภาษานั้นถูก publish และไม่ถูก reset ตอนบันทึกซ้ำหรือถอยกลับเป็น draft
- แท็กเก็บชื่อสองภาษาเป็นคอลัมน์ตรงๆ เพราะแท็กมีครบสองภาษาเสมอ
- HTML ไม่ถูกเก็บลง DB markdown ถูก render ใหม่ทุก request
- เวลาทุกช่องเป็น ISO-8601 UTC รูปแบบเดียวกับ `new Date().toISOString()` เพื่อให้ `ORDER BY` ที่เทียบ string เรียงถูก
- DB ใหม่คือ `data/site.db` ส่วน `data/talkalways.db` จะไม่ถูกเปิดเลย

### `src/schema.sql`

```sql
CREATE TABLE IF NOT EXISTS posts (
  id           INTEGER PRIMARY KEY,
  cover_image  TEXT,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS post_translations (
  post_id          INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  lang             TEXT NOT NULL CHECK (lang IN ('th', 'en')),
  status           TEXT NOT NULL CHECK (status IN ('draft', 'published')),
  slug             TEXT NOT NULL,
  title            TEXT NOT NULL,
  excerpt          TEXT NOT NULL DEFAULT '',
  body_markdown    TEXT NOT NULL DEFAULT '',
  cover_image_alt  TEXT NOT NULL DEFAULT '',
  seo_title        TEXT NOT NULL DEFAULT '',
  seo_description  TEXT NOT NULL DEFAULT '',
  published_at     TEXT,
  updated_at       TEXT NOT NULL,
  PRIMARY KEY (post_id, lang),
  UNIQUE (lang, slug)
);

CREATE TABLE IF NOT EXISTS projects (
  id          INTEGER PRIMARY KEY,
  thumbnail   TEXT,
  repo_url    TEXT,
  demo_url    TEXT,
  featured    INTEGER NOT NULL DEFAULT 0 CHECK (featured IN (0, 1)),
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS project_translations (
  project_id     INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  lang           TEXT NOT NULL CHECK (lang IN ('th', 'en')),
  status         TEXT NOT NULL CHECK (status IN ('draft', 'published')),
  slug           TEXT NOT NULL,
  title          TEXT NOT NULL,
  summary        TEXT NOT NULL DEFAULT '',
  body_markdown  TEXT NOT NULL DEFAULT '',
  thumbnail_alt  TEXT NOT NULL DEFAULT '',
  published_at   TEXT,
  updated_at     TEXT NOT NULL,
  PRIMARY KEY (project_id, lang),
  UNIQUE (lang, slug)
);

CREATE TABLE IF NOT EXISTS tags (
  id       INTEGER PRIMARY KEY,
  slug     TEXT NOT NULL UNIQUE,
  name_th  TEXT NOT NULL,
  name_en  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS post_tags (
  post_id  INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  tag_id   INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

CREATE TABLE IF NOT EXISTS project_tags (
  project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  tag_id      INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, tag_id)
);

CREATE TABLE IF NOT EXISTS settings (
  key    TEXT NOT NULL,
  lang   TEXT NOT NULL CHECK (lang IN ('th', 'en', '*')),
  value  TEXT NOT NULL,
  PRIMARY KEY (key, lang)
);
```

- `src/db.js` ต้องรัน `PRAGMA foreign_keys = ON` ทุกครั้งที่เปิด connection เพราะค่านี้ไม่ถูกเก็บในไฟล์ DB และตั้ง `PRAGMA journal_mode = WAL` ตอนเปิด
- `src/db.js` สร้างโฟลเดอร์ `DATA_DIR/uploads` ด้วย `fs.mkdirSync(..., { recursive: true })` ก่อนเปิด DB เพราะ `data/` ถูก gitignore จึงไม่มีอยู่บน server ที่เพิ่ง clone และไม่มีใน temp dir ของ test ทดสอบแล้วว่าถ้าไม่สร้าง sqlite3 จะเปิดไฟล์ไม่ได้ด้วย `SQLITE_CANTOPEN` และการอัปโหลดรูปจะพังด้วย `ENOENT`
- `updated_at` ของ translation ไม่มีค่า default เพราะแอปส่งค่าเองทุกครั้งที่ upsert
- ไม่มี migration tool ถ้าต้องแก้ schema หลัง launch ให้เขียน `ALTER TABLE` เอง
- ตาราง settings ใช้ `lang = '*'` กับค่าที่ไม่ขึ้นกับภาษา และใช้ key ชุดคงที่ตามข้อ 2.4

## ส่วนที่ 2: Routes, ภาษา, โครงสร้างไฟล์, หน้า Admin และ Dependencies

### 2.0 การตัดสินใจหลักของส่วนนี้

- **Slug เป็น ASCII เท่านั้น** (`a-z`, `0-9`, `-`) และ server เป็นคน normalize เอง เลือกทางนี้แทน Thai slug ที่เคยยกตัวอย่างไว้ในการคุยครั้งก่อน เหตุผลอยู่ในข้อ 2.3
- **ถ้าโพสต์มีแค่ภาษาไทย หน้า list ภาษาอังกฤษจะยังแสดงโพสต์นั้น** โดยใช้การ์ดภาษาไทยติด badge แต่ถ้าเข้า `/en/blog/<slug>` ของโพสต์นั้นตรงๆ จะได้ 404 ไม่มีการ redirect
- **Pagination ใช้ `?page=N`** ไม่ใช้ `/blog/page/N` แบบนี้ไม่ต้องจองคำว่า `page` ไว้ และลำดับการประกาศ route ก็ไม่มีผล
- **Preview ไม่บันทึกข้อมูลลง DB** ปุ่มดูตัวอย่างจะ POST ข้อมูลในฟอร์มไป render ด้วย template หน้าจริง เลยใช้ได้ทั้งกับโพสต์ใหม่และโพสต์ที่เผยแพร่แล้ว โดยไม่เผลอ publish อะไรออกไป
- **ตัดตาราง `admin_users` ออก** แล้วย้าย credentials ไปไว้ใน `.env` (ดูส่วนที่ 1)
- **สถานะเผยแพร่อยู่ที่ translation row** ตาม amendment ที่อนุมัติแล้ว ทุก public query จึงกรอง `t.status = 'published'` และ editor มีตัวควบคุมสถานะแยกของแต่ละภาษา

### 2.1 Public routes

router ตัวเดียว mount ไว้สองที่คือ `/th` และ `/en` path ในตารางนับจากจุด mount

```
METHOD  PATH             ตัวอย่าง URL                 หน้าที่
GET     /                /th, /en                     หน้าแรก: tagline, featured projects, 5 โพสต์ล่าสุด
GET     /blog            /th/blog, /th/blog?page=2    รายการโพสต์ หน้าละ 10
GET     /blog/:slug      /th/blog/docker-101          บทความ
GET     /tags/:slug      /en/tags/sqlite?page=2       โพสต์ที่ติดแท็กนี้ (เฉพาะโพสต์)
GET     /projects        /th/projects                 โปรเจกต์ทั้งหมด ไม่แบ่งหน้า
GET     /projects/:slug  /th/projects/talkalways      รายละเอียดโปรเจกต์
GET     /about           /th/about                    About และ social links
GET     /search          /th/search?q=docker          ค้นหาบทความและโปรเจกต์ (ข้อ 4.1)
GET     /privacy         /en/privacy                  cookie ที่ใช้และนโยบายความเป็นส่วนตัว (ข้อ 4.2)
```

Routes ระดับบนสุด เรียงตามลำดับที่ต้องประกาศ

```
USE  cookies      cookieParser(process.env.SESSION_SECRET) ตัวเดียวระดับ app (ข้อ 4.2)
GET  /            302 ไป /th หรือ /en ตาม cookie lang แล้วค่อย Accept-Language พร้อม Vary: Accept-Language, Cookie
USE  static       express.static(path.join(__dirname,'public'), { index:false, maxAge:'30d' })
USE  /uploads     express.static(DATA_DIR/uploads, { index:false, maxAge:'365d', immutable:true })
                  พร้อม header X-Content-Type-Options: nosniff
USE  /th, /en     public router
USE  /admin       admin router (ข้อ 2.4)
USE  (ท้ายสุด)     404 render views/error.ejs
USE  (err,...)    error handler: res.status(err.status || 500).render('error')
```

```js
for (const lang of ['th', 'en']) {
  app.use('/' + lang, (req, res, next) => {
    res.locals.lang = lang;
    res.locals.other = lang === 'th' ? 'en' : 'th';
    res.locals.t = strings[lang];
    next();
  }, publicRouter);
}
```

- `GET /` ต้องประกาศก่อน static ส่วน `index:false` กันไว้อีกชั้น เพราะทดสอบแล้วว่าถ้า static ขึ้นมาก่อนและไม่ได้ตั้ง `index:false` ไฟล์ `public/index.html` จะบังการ redirect ที่ `/`
- Express 5 ไม่รองรับ `app.get('*')` แล้ว 404 handler จึงต้องใช้ `app.use`
- เมื่อ URL ผิดรูป เช่น `/th/blog/%E0%` (มักเจอเวลาลิงก์ภาษาไทยโดนตัดใน chat) router จะโยน `err.status = 400` แล้ว error handler render หน้า error ให้ ผู้ใช้จึงไม่เห็น stack trace
- public router โหลด settings ครั้งเดียวต่อ request ด้วย `WHERE lang IN (?, '*')` แล้วใส่ไว้ใน `res.locals.settings`
- middleware ตัวแรกสุดของ app ตั้งค่า default ห้าตัวก่อนทุก router ได้แก่ `res.locals.lang = 'th'`, `res.locals.other = 'en'`, `res.locals.t = strings.th`, `res.locals.settings = {}` และ `res.locals.meta = {}` เพราะ 404 หรือ error ที่เกิดนอก `/th` กับ `/en` เช่น `/nope` หรือ `/admin/xyz` ต้อง render `error.ejs` ได้ ถ้าขาดตัวใดตัวหนึ่ง template จะโยน ReferenceError ซ้ำใน error handler
- ทดสอบแล้วว่าถ้าขาดแค่ `meta` ตัวเดียว `GET /nope` จะกลายเป็น 500 ที่แสดง stack trace ส่วน route ที่มีข้อมูลจริงก็ส่ง `meta` ของตัวเองทับค่า default ตามปกติ
- header แสดง `settings.site_name || 'Portfolio'` จึงยังมีชื่อเว็บตอนที่ settings ยังว่าง

#### กติกาของ public query

- ทุก query กรอง `t.status = 'published'` บน translation row เพราะ parent table ไม่มี status แล้ว
- หน้า detail ใช้ `WHERE t.lang = ? AND t.slug = ? AND t.status = 'published'` ถ้าไม่เจอให้เรียก `next()` ซึ่งจะได้ 404
- วันที่ที่ใช้เรียงและที่แสดงบนหน้า มาจาก `t.published_at` เสมอ
- alt ของรูปมาจาก `t.cover_image_alt` หรือ `t.thumbnail_alt` ของภาษาที่กำลังแสดงอยู่
- หน้า list (blog, tags, home, projects) ใช้ fallback query ด้านล่าง query นี้ทดสอบกับ sqlite3 จริงแล้ว

```sql
SELECT t.post_id, t.lang, t.slug, t.title, t.excerpt, t.published_at, p.cover_image
FROM post_translations t
JOIN posts p ON p.id = t.post_id
WHERE t.status = 'published'
  AND (t.lang = ? OR NOT EXISTS (
        SELECT 1 FROM post_translations x
        WHERE x.post_id = t.post_id AND x.lang = ? AND x.status = 'published'))
ORDER BY t.published_at DESC
LIMIT 11 OFFSET ?
```

- ถ้าโพสต์มีฉบับ published ในภาษาของหน้า query จะเลือกฉบับนั้น
- ถ้าไม่มี query จะเลือกฉบับ published ของอีกภาษาแทน
- หน้า tag หาแท็กจาก slug ก่อน ถ้าไม่เจอให้เรียก `next()` ซึ่งจะได้ 404 ถ้าเจอแต่ยังไม่มีโพสต์ published ให้ render รายการว่าง
- list query ของหน้า tag เพิ่มแค่ `JOIN post_tags` เข้าไป
- projects ใช้โครงเดียวกัน โดยเรียงด้วย `ORDER BY p.featured DESC, p.sort_order, p.id`

#### Pagination

```js
const page = Number(req.query.page || 1);
if (!Number.isInteger(page) || page < 1) return next();
const rows = await all(LIST_SQL, [lang, lang, (page - 1) * 10]);
if (page > 1 && rows.length === 0) return next();
const hasNext = rows.length > 10;
```

- ใช้ query เดียว ไม่ต้องมี `COUNT(*)`
- ลิงก์ไปหน้า 1 เขียนเป็น `/th/blog` เฉยๆ ไม่ใส่ `?page=1`

#### About

- body ของหน้า About มาจาก `about_body` ของภาษาปัจจุบัน
- ถ้าภาษานั้นยังว่าง ให้ใช้ของอีกภาษา และใส่ `lang` ของภาษานั้นไว้ที่ element ครอบ body
- social links อ่านจาก settings ที่ `lang='*'` ถ้าค่าไหนว่างก็ไม่ต้องแสดง

### 2.2 การเลือกภาษาและการสลับภาษา

#### เข้า `/` เปล่าๆ

```js
app.get('/', (req, res) => {
  res.set('Vary', 'Accept-Language, Cookie');
  const pref = ['th', 'en'].includes(req.cookies.lang) ? req.cookies.lang : null;
  res.redirect(302, '/' + (pref || req.acceptsLanguages('th', 'en') || 'th'));
});
```

- ภาษา default คือ `th` เพราะเจ้าของเขียนภาษาไทยเป็นหลัก
- ถ้าไม่มี header (Googlebot ก็ไม่ส่ง) หรือเป็น `*` หรือเป็นภาษาอื่น จะไปที่ `/th`
- ใช้ 302 เพราะปลายทางขึ้นกับคนเข้าเว็บ ถ้าใช้ 301 browser จะ cache ไว้ถาวร
- ถ้าผู้อ่านเคยเข้าหน้า `/th` หรือ `/en` มาก่อน cookie `lang` ชนะ Accept-Language รายละเอียดอยู่ในข้อ 4.2

#### ลิงก์สลับภาษา

```
หน้าที่อยู่                                          ลิงก์ไปที่
/th, /th/projects, /th/about                         /en, /en/projects, /en/about
/th/blog?page=3                                      /en/blog (ไม่พก page ไปด้วย)
/th/tags/sqlite?page=2                               /en/tags/sqlite
/th/blog/<slug> ที่มีฉบับ en published                 /en/blog/<en-slug>
/th/blog/<slug> ที่ไม่มีฉบับ en หรือ en ยังเป็น draft    /en/blog
/th/projects/<slug>                                  กติกาเดียวกับ blog
```

- ลิงก์สลับภาษาแสดงตลอด ไม่ซ่อน
- ใน `<a>` ต้องใส่ `lang="en"` และ `hreflang="en"` ไม่อย่างนั้น screen reader ภาษาไทยจะอ่านคำว่า English ด้วยเสียงไทย
- หน้า detail หา sibling ด้วย `SELECT lang, slug FROM post_translations WHERE post_id = ? AND status = 'published'`

#### การ์ดที่แสดงเนื้อหาอีกภาษา

- ถ้า `row.lang !== lang` ให้ใส่ `lang="th"` (หรือ `en`) ที่ `<article>` ของการ์ด เพื่อให้ font กับ line-height ของภาษาไทยทำงานถูกต้อง
- ติด badge ข้อความจาก strings เช่น `Thai` บนหน้า `/en`
- ลิงก์ของการ์ดชี้ไป `/th/blog/<slug>` ตรงๆ
- ส่วน `/en/blog/<th-only-slug>` จะได้ 404 และหน้า error มีลิงก์กลับไป `/en/blog`

#### SEO head

ทุกครั้งที่ render ต้องส่ง object `meta` ไปด้วย ส่วน `partials/head.ejs` อ่านค่าจาก `meta.*` อย่างเดียว ถ้าหน้าไหนไม่ส่ง field ครบ EJS จะไม่โยน ReferenceError และ error handler ก็ไม่พังซ้ำ

```js
res.render('post', { post, tr, tags, meta: {
  title: tr.seo_title || tr.title,
  description: tr.seo_description || tr.excerpt,
  canonical: `/${lang}/blog/${tr.slug}`,
  alternates,                       // [{ lang, href }] เฉพาะฉบับที่ published
  image: post.cover_image           // ไม่มีก็ไม่ใส่ og:image
}});
```

- สร้าง canonical จาก `lang` กับ slug ที่ได้จาก DB หรือจาก path ที่เขียนตายตัว ห้ามสร้างจาก `req.originalUrl` เพราะจะติด uppercase, trailing slash หรือ utm มาด้วย
- หน้า `?page=N` ที่ N มากกว่า 1 ให้ canonical ชี้มาที่ตัวเอง
- หน้า detail ใส่ hreflang ก็ต่อเมื่อทั้งสองภาษา published แล้วเท่านั้น
- หน้า home, list, projects และ about ใส่ hreflang ทั้งสองภาษาได้เลย เพราะหน้าเหล่านี้มีครบทั้งสองภาษาอยู่แล้ว
- ไม่ใส่ `x-default`
- tag ที่ต้องมี: `og:title`, `og:description`, `og:image`, `og:url`, `og:type`, `og:locale` (`th_TH` หรือ `en_US`) เพราะ LINE อ่านแค่สามตัวแรก
- ไม่ใส่ `meta keywords` และ `rel=prev/next`
- ตอน boot ให้ตัด trailing slash ของ `SITE_URL` ทิ้งหนึ่งครั้ง
- route ส่ง `canonical`, `alternates` และ `image` มาเป็น path เสมอ `head.ejs` เป็นที่เดียวที่ต่อ `SITE_URL` ไว้ข้างหน้า ทั้ง canonical, hreflang, `og:url` และ `og:image`
- `og:image` ต้องเป็น URL เต็ม เพราะ LINE และ Facebook ไม่โหลดรูปจาก path สัมพัทธ์
- วันที่ใช้ `new Intl.DateTimeFormat(lang === 'th' ? 'th-TH' : 'en-US', { dateStyle: 'medium', timeZone: 'Asia/Bangkok' }).format(new Date(t.published_at))` ฝั่งไทยจะแสดงเป็น พ.ศ. ให้เอง ไม่ต้องลง dependency เพิ่ม
- ต้องใส่ `timeZone` เพราะ server มักตั้งเป็น UTC ทดสอบแล้วว่าโพสต์ที่เผยแพร่ช่วงเช้ามืดตามเวลาไทยจะแสดงเป็นวันก่อนหน้า
- ต้องแปลงเป็น `new Date(...)` ก่อนส่งให้ `format` เพราะถ้าส่ง string ตรงๆ จะโยน `RangeError`

### 2.3 Slug

```js
// src/slug.js
const toSlug = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const hasThai = s => /[฀-๿]/.test(s || '');
module.exports = { toSlug, hasThai };
```

ลำดับการหา slug ตอนบันทึก ทำเฉพาะภาษาที่สถานะไม่ใช่ `none`

1. ถ้าพิมพ์ slug มา ใช้ `toSlug(ค่าที่พิมพ์)`
2. ถ้าไม่ได้พิมพ์และ title ไม่มีตัวอักษรไทย ใช้ `toSlug(title)`
3. ถ้ายังว่าง ใช้ slug ของอีกภาษา
4. ถ้ายังว่างอีก ให้ re-render ฟอร์มพร้อมข้อความ "กรุณาใส่ slug ภาษาอังกฤษ (a-z, 0-9, -)"

- ช่อง slug ใส่ `pattern="[a-z0-9-]*"` ไว้ browser จะเตือนก่อน submit โดยไม่ต้องเขียน JS
- slug ของ tag คือ `toSlug(slug || name_en)` และ `name_en` มีค่าเสมอ
- แก้ slug ของฉบับที่ published แล้วได้ ใต้ช่องมีข้อความเตือนว่าลิงก์เดิมจะใช้ไม่ได้ ระบบไม่มี redirect table ให้

เหตุผลที่ใช้แค่ ASCII

- ตัวอักษรไทยหนึ่งตัวกลายเป็น 9 ตัวเมื่อ percent-encode ชื่อเรื่องจริง 43 ตัวอักษรกลายเป็น slug ยาว 323 ตัว
- แอป chat บางตัวหยุด detect ลิงก์ตรงตัวอักษรที่ไม่ใช่ ASCII ตัวแรก
- ไม่ต้องเจอกับดัก `\p{M}` ที่ทำให้สระและวรรณยุกต์หายไป
- ไม่ต้องเจอปัญหาลำดับสระกับวรรณยุกต์ ที่ทำให้ slug สองตัวดูเหมือนกันแต่เป็นคนละ string
- ทั้งสองภาษาใช้ slug เดียวกันได้ เพราะ `UNIQUE(lang, slug)` ผูกอยู่กับแต่ละภาษา
- ต้นทุนคือเจ้าของต้องพิมพ์ slug ภาษาอังกฤษหนึ่งบรรทัดต่อโพสต์ไทย
- เรื่องนี้ใช้โค้ดเท่ากับแบบที่ยอมรับ Thai slug เพราะตัวอักษรไทยถูก strip ไปแล้วจะไปเข้า error branch เดียวกับกรณี slug ว่าง

### 2.4 หน้า Admin

#### Authentication

```js
const COOKIE = { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production',
                 path: '/admin', signed: true };
const MAX_AGE = 30 * 864e5;
const issue = (res, epoch) => res.cookie('ta_admin', (Date.now() + MAX_AGE) + ':' + epoch, { ...COOKIE, maxAge: MAX_AGE });

async function requireAdmin(req, res, next) {
  const [exp, ep] = String(req.signedCookies.ta_admin || '').split(':');
  const epoch = await sessionEpoch();   // ข้อ 4.3
  if (!(Number(exp) > Date.now() && ep === epoch)) return res.redirect('/admin/login');
  issue(res, epoch);            // sliding renewal: หมดอายุหลังไม่ได้ใช้งาน 30 วัน
  next();
}
```

- cookie ถูก sign ด้วย `cookieParser(process.env.SESSION_SECRET)` ตัวเดียวที่ mount ไว้ระดับ app (ข้อ 4.2)
- ค่าใน cookie คือ `เวลาหมดอายุ:epoch` ถ้ามีคนขโมย cookie ไปได้ จะใช้ได้จนหมดเวลาหรือจนเจ้าของกดออกจากระบบทุกเครื่อง (ข้อ 4.3)
- `signed: true` ต้องอยู่ใน `COOKIE` ถ้าลืม login จะวนกลับมาหน้าเดิมไม่รู้จบ
- ห้ามอ่าน `req.cookies` เพื่อตรวจสิทธิ์เด็ดขาด เพราะใครก็ปลอมค่าได้
- renew ทุก request เพื่อไม่ให้ session หมดอายุตอนกำลังเขียนบทความค้างไว้ ถ้าหมดกลางทาง ข้อความที่พิมพ์จะหายตอนกด save
- credentials อยู่ใน `.env` คือ `ADMIN_USERNAME` กับ `ADMIN_PASSWORD_HASH` (bcrypt cost 12)
- ใช้ `await bcrypt.compare(password || '', hash)` เท่านั้น เพราะ `compareSync` บล็อก event loop ราว 460ms
- ตรวจกับ parser ของ Node แล้วว่า `.env` ไม่ expand ตัว `$` ใน hash
- สร้าง hash ด้วย `node scripts/hash-password.js 'passphrase'` ซึ่งเป็นสคริปต์ 3 บรรทัด และใช้ reset รหัสผ่านได้ด้วย
- กันการ brute force ด้วย passphrase ยาว 20 ตัวขึ้นไปจาก password manager
- ถ้าต้องการให้ทุก session หลุด ให้กดออกจากระบบทุกเครื่องในหน้า settings (ข้อ 4.3)
- ป้องกัน CSRF ด้วย `SameSite=Lax` และให้ทุก mutation เป็น POST ไม่มี token และไม่มี Origin check
- ใน Express 5 ต้องเขียน `req.body ?? {}` และ `res.redirect(303, url)`

```js
const r = express.Router();
r.use(express.urlencoded({ extended: true, limit: '1mb' }));   // ค่า default 100kb ไม่พอ
r.get('/login', ...);
r.post('/login', ...);
r.use(requireAdmin);          // ทุก route ที่ประกาศหลังบรรทัดนี้ถูกบังคับ login
// ... route อื่นทั้งหมด
app.use('/admin', r);
```

#### Admin route table

```
METHOD  PATH                           หน้าที่
GET     /admin/login                   ฟอร์ม login (ไม่ต้อง login)
POST    /admin/login                   ถูก: 303 ไป /admin/posts  ผิด: 401 และแสดงฟอร์มพร้อม error
-----   requireAdmin   -----
GET     /admin                         303 ไป /admin/posts
POST    /admin/logout                  clearCookie('ta_admin', COOKIE) แล้ว 303 ไป /admin/login
GET     /admin/posts                   รายการโพสต์พร้อม chip สถานะแยกภาษา
GET     /admin/posts/new               editor ว่าง (ต้องประกาศก่อน /:id)
POST    /admin/posts                   สร้าง แล้ว 303 ไป /admin/posts/:id?saved=1
GET     /admin/posts/:id               editor
POST    /admin/posts/:id               บันทึก
POST    /admin/posts/:id/delete        ลบ
POST    /admin/posts/preview/:lang     render หน้า post จริงจากข้อมูลในฟอร์ม ไม่บันทึก
GET     /admin/projects                รายการโปรเจกต์
GET     /admin/projects/new
POST    /admin/projects
GET     /admin/projects/:id
POST    /admin/projects/:id
POST    /admin/projects/:id/delete
POST    /admin/projects/preview/:lang
GET     /admin/tags                    รายการแท็ก และฟอร์มเพิ่มหรือแก้ในหน้าเดียว
POST    /admin/tags
POST    /admin/tags/:id
POST    /admin/tags/:id/delete
GET     /admin/settings                site_name, tagline, About, social links
POST    /admin/settings
POST    /admin/sessions/revoke         ออกจากระบบทุกเครื่อง แล้ว 303 ไป /admin/login
POST    /admin/upload                  รับรูป 1 ไฟล์ ตอบ JSON { url }
```

- admin UI มีแค่ภาษาไทย เพราะมีผู้ใช้คนเดียว
- `/admin` ไม่มี dashboard เพราะ analytics ไม่อยู่ใน scope
- `:id` ต้องเป็นจำนวนเต็มบวก ถ้าไม่ใช่หรือหาแถวไม่เจอ ให้ตอบ 404 ทุก route ที่มี `:id`
- ไม่มี `method-override` ไม่มี flash package และไม่มี `?next=`
- ข้อความ "บันทึกแล้ว" แสดงเมื่อ URL มี `?saved=1`
- ปุ่มลบใช้ `onsubmit="return confirm('ลบบทความนี้?')"`
- admin head ใส่ `<meta name="robots" content="noindex">`

#### รายการโพสต์

```sql
SELECT p.id, p.updated_at,
  (SELECT title FROM post_translations WHERE post_id = p.id ORDER BY lang = 'th' DESC LIMIT 1) AS title,
  (SELECT status FROM post_translations WHERE post_id = p.id AND lang = 'th') AS th,
  (SELECT status FROM post_translations WHERE post_id = p.id AND lang = 'en') AS en
FROM posts p ORDER BY p.updated_at DESC
```

- คอลัมน์มี: หัวข้อ, ไทย, EN, แก้ไขล่าสุด
- chip ใช้คำกลางๆ คือ `เผยแพร่`, `แบบร่าง`, `ไม่มีฉบับแปล`
- ไม่ใช้สีแดงและไม่ใช้คำว่า "ขาด"
- ไม่มี filter และไม่แบ่งหน้า

#### Post editor

```
[บทความ]                                              [บันทึก]
ภาพหน้าปก [/uploads/3f9a...c1.jpg        ] [อัปโหลด]
แท็ก  [x] nodejs  [x] sqlite  [ ] design

v ไทย · เผยแพร่                      (<details open lang="th">)
  สถานะ     [ ไม่มีฉบับนี้ | แบบร่าง | เผยแพร่ ]
  หัวข้อ     [..............]   slug [..............]
  เกริ่นนำ    [.........................................]
  alt ภาพปก [.........................................]
  เนื้อหา    [ markdown ............................... ]
  SEO title / SEO description
  [ดูตัวอย่าง]   (formaction=/admin/posts/preview/th formtarget=_blank)

> English · ไม่มีฉบับแปล               (<details lang="en">)
```

- แต่ละภาษาเป็น `<details>` หนึ่งก้อน ไทยเปิดไว้ ส่วน EN เปิดเมื่อมี row อยู่แล้ว ส่วนนี้ไม่ต้องใช้ JS
- ทุกภาษามี select สถานะตัวเดียวสามค่า `none | draft | published` ถ้าใช้ checkbox คู่กับ select จะเกิดสถานะไร้ความหมาย เช่น "ไม่มีฉบับแต่เผยแพร่"
- `none` หมายถึงไม่มี row ตอนบันทึกจะ DELETE row ของภาษานั้นทิ้ง
- ถ้าเปลี่ยนเป็น `none` บนภาษาที่มี row อยู่ จะมี inline `onchange` ขึ้น `confirm('ลบฉบับภาษานี้เมื่อบันทึก?')` เพราะระบบไม่มี revision history
- โพสต์ใหม่ตั้งค่าเริ่มต้นเป็น `th=draft` และ `en=none`
- ช่อง `alt ภาพปก` อยู่ในแต่ละภาษา แต่ไฟล์ภาพปกใช้ร่วมกันและอยู่ด้านบน
- ชื่อ field ซ้อนตามภาษา เช่น `th[title]` และ `en[status]` แล้ว `urlencoded({extended:true})` จะแยกเป็น `req.body.th` กับ `req.body.en` ให้
- แท็กต้องแปลงเป็น array ด้วย `[].concat(req.body.tags || [])` เพราะทดสอบแล้วว่าถ้าติ๊กแท็กเดียว body จะได้ string เช่น `'12'` ถ้าวนลูปตรงๆ จะได้แท็ก `1` กับ `2` ผิดตัว
- validation ตรวจเฉพาะภาษาที่สถานะไม่ใช่ `none` และต้องมีอย่างน้อยหนึ่งภาษาที่ไม่ใช่ `none`
- ก่อนเขียนต้องเช็ก slug ซ้ำด้วย `SELECT 1 FROM post_translations WHERE lang = ? AND slug = ? AND post_id <> ?`
- ถ้า validation ไม่ผ่าน ให้ตอบ `res.status(400).render('admin/post-edit', { values: req.body, errors })` ห้าม redirect และห้ามปล่อยให้เป็น 500 ข้อความที่พิมพ์ไว้ต้องไม่หาย
- การบันทึกทั้งหมดอยู่ใน transaction เดียว: insert หรือ update `posts`, upsert หรือ delete translation ของแต่ละภาษา, ลบ `post_tags` แล้ว insert ใหม่

```sql
INSERT INTO post_translations
  (post_id, lang, status, slug, title, excerpt, body_markdown, seo_title, seo_description,
   cover_image_alt, published_at, updated_at)
VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
ON CONFLICT(post_id, lang) DO UPDATE SET
  status = excluded.status, slug = excluded.slug, title = excluded.title,
  excerpt = excluded.excerpt, body_markdown = excluded.body_markdown,
  seo_title = excluded.seo_title, seo_description = excluded.seo_description,
  cover_image_alt = excluded.cover_image_alt, updated_at = excluded.updated_at,
  published_at = CASE WHEN excluded.status = 'published'
                      THEN COALESCE(post_translations.published_at, excluded.published_at)
                      ELSE post_translations.published_at END
```

- ตอน INSERT ให้ส่ง `published_at = status === 'published' ? now : null`
- `published_at` ถูกตั้งแค่ครั้งแรกที่ publish ถ้า save ซ้ำ โพสต์จะไม่เด้งขึ้นไปบนสุด
- ถ้าถอยกลับเป็น draft แล้ว publish ใหม่ วันที่เดิมยังอยู่
- ปุ่มดูตัวอย่างส่งฟอร์มทั้งฟอร์มไป `POST /admin/posts/preview/:lang` แล้ว server render `views/post.ejs` จาก `req.body[lang]` พร้อมแถบ "ตัวอย่าง ยังไม่ได้บันทึก"
- `:lang` ต้องเป็น `th` หรือ `en` เท่านั้น ถ้าไม่ใช่ให้ตอบ 404
- ก่อน render preview ต้องตั้ง `res.locals.lang`, `res.locals.other` และ `res.locals.t` ตาม `:lang` แบบเดียวกับ public router ทดสอบแล้วว่าถ้าไม่ตั้ง preview ฉบับอังกฤษจะได้ `<html lang="th">` ข้อความ UI ภาษาไทย และ line-height ของภาษาไทย
- preview ไม่แตะ DB จึงกดกับโพสต์ใหม่ได้โดยไม่สร้าง row ซ้ำ และกดกับโพสต์ที่เผยแพร่แล้วได้โดยไม่ publish ส่วนที่แก้ออกไป
- preview ใช้ markdown renderer ตัวเดียวกับหน้าจริง ผลที่เห็นจึงตรงกัน รวมถึง syntax highlight
- public route ไม่ต้องรู้จัก admin เลย จึงไม่มีการ render draft ที่ URL จริง

#### Project editor

- ส่วนที่ใช้ร่วมกันอยู่ด้านบน: thumbnail, `repo_url`, `demo_url`, checkbox `featured`, ช่องตัวเลข `sort_order`, แท็ก
- ส่วนของแต่ละภาษามี: สถานะ, title, slug, summary, `thumbnail_alt`, `body_markdown`
- ไม่มี SEO fields เพราะใน schema ไม่มี
- เปลี่ยนลำดับด้วยการแก้ตัวเลข `sort_order` ไม่มีปุ่มขึ้นลงและไม่มี reorder route
- ถ้า `demo_url` ว่าง หน้าจริงจะไม่แสดงลิงก์ demo

#### แท็ก

- ทั้งหมดอยู่ในหน้าเดียว แต่ละแถวมี `slug`, `name_th`, `name_en` และปุ่มลบ
- บังคับกรอกทั้ง `name_th` และ `name_en`
- ลบแท็กแล้ว `post_tags` และ `project_tags` ที่อ้างถึงจะหายไปเองด้วย `ON DELETE CASCADE`
- ชิปแท็กในหน้าโพสต์ลิงก์ไป `/lang/tags/:slug`
- ชิปแท็กในหน้าโปรเจกต์เป็นข้อความเฉยๆ เพราะหน้า tag แสดงเฉพาะโพสต์

#### Settings

```
key            lang      ใช้ที่
site_name      *         <title>, header
tagline        th, en    หน้าแรก (ข้อความธรรมดา)
about_body     th, en    /about (markdown)
github_url     *         footer และ About
linkedin_url   *
x_url          *
email          *
privacy_body   th, en    /privacy (markdown)
session_epoch  *         ออกจากระบบทุกเครื่อง (ข้อ 4.3) ไม่อยู่ในฟอร์ม settings
```

- ในหน้า settings เป็น input และ textarea ธรรมดา ไม่มี tab และไม่มีสถานะ
- ชื่อ field ใช้แบบเดียวกับ editor ค่าที่แยกภาษาเป็น `th[tagline]` หรือ `en[about_body]` ส่วนค่าที่ไม่ขึ้นกับภาษาใช้ชื่อตรงๆ เช่น `site_name` หรือ `github_url`
- ถ้าช่องไหนว่าง ตอนบันทึกจะ DELETE row นั้น ถ้ามีค่าจะ upsert ด้วย `ON CONFLICT(key, lang)`
- การบันทึก settings แตะเฉพาะ key ที่อยู่ในฟอร์ม `session_epoch` จึงไม่ถูกลบตอนกดบันทึก

#### Upload รูป

```js
const receive = multer({ limits: { fileSize: 5 * 1024 * 1024, files: 1 } }).single('image');
// ใน route หลัง receive
const ext = sniff(req.file.buffer);   // ดู magic bytes 12 ตัวแรก ได้ .jpg .png .gif .webp หรือ null
if (!ext) return res.status(400).json({ error: 'รองรับเฉพาะ JPEG / PNG / GIF / WebP' });
const name = crypto.randomBytes(16).toString('hex') + ext;
fs.writeFileSync(path.join(UPLOAD_DIR, name), req.file.buffer);
res.json({ url: '/uploads/' + name });
```

- ใช้ memory storage ไฟล์ที่ยังไม่ผ่านการตรวจจึงไม่ถูกเขียนลง disk
- เรียก `receive(req, res, err => { ... })` เองแทนการใช้เป็น middleware ถ้า `err` มีค่าหรือไม่มี `req.file` ให้ตอบ `400` เป็น JSON ทันที ทดสอบกับ multer 2.3.0 แล้วว่าไฟล์เกิน 5 MB, ชื่อ field ผิด และฟอร์มที่ไม่มีไฟล์ จะกลายเป็น 500 หน้า HTML ซึ่ง `admin.js` อ่านเป็น JSON ไม่ได้
- ไม่ใช้ `fileFilter` เพราะมันเห็นแค่ MIME ที่ client ประกาศมา ซึ่งปลอมได้
- ชื่อไฟล์ server สร้างเองทั้งหมด `originalname` ไม่ถูกนำไปใช้ path traversal จึงเกิดไม่ได้
- SVG และ HTML ที่เปลี่ยนนามสกุลเป็น .png จะไม่ผ่าน sniff
- ถ้าต้องใช้ logo แบบ SVG ให้ commit ลง `public/` เอง
- `public/js/admin.js` ราว 20 บรรทัด ทำหน้าที่ส่ง FormData ไป `/admin/upload` แล้วเอา url ไปใส่ช่องภาพปก หรือแทรก `![](url)` ตรง cursor โดยวาง cursor ไว้ในวงเล็บ `[]` ให้พิมพ์ alt ต่อได้ทันที
- input file ไม่มี `name` และไม่ถูกส่งไปพร้อมฟอร์มหลัก
- ไฟล์กำพร้าที่ไม่มีใครอ้างถึงแล้วเก็บไว้เฉยๆ ไม่มีโค้ดตามลบ
- รูปของ draft เข้าถึงได้ทันทีผ่าน URL สุ่มที่เดาไม่ได้ ถือว่ายอมรับได้
- ไม่ใช้ `sharp` ให้ย่อรูปก่อน upload เอง

#### Markdown

```js
// src/markdown.js
const MarkdownIt = require('markdown-it');
const hljs = require('highlight.js/lib/common');   // มีมาให้ 36 ภาษา รวม js ts sql bash go rust php
hljs.registerLanguage('dockerfile', require('highlight.js/lib/languages/dockerfile'));   // lib/common ไม่มี dockerfile
module.exports = new MarkdownIt({
  highlight: (code, lang) => lang && hljs.getLanguage(lang)
    ? hljs.highlight(code, { language: lang, ignoreIllegals: true }).value : ''
});
```

- ใช้ค่า default ทั้งหมด คือ `html:false`, `linkify:false`, `breaks:false`
- ห้ามเปิด `html` เพราะถ้า paste snippet ที่มี `<img onerror>` มา มันจะทำงานกับผู้อ่านทุกคน
- ห้ามเปิด `linkify` เพราะ linkify-it จะดูดตัวอักษรไทยที่ติดท้าย URL เข้าไปในลิงก์ด้วย
- field ที่ render เป็น markdown มีแค่ `body_markdown` ของโพสต์และโปรเจกต์ กับ `about_body`
- field อื่นทุกตัว (title, excerpt, summary, seo_*, alt, tag name) ใช้ `<%= %>`
- `<%-` ใช้ได้แค่กับผลของ `md.render` และ `include` เท่านั้น

### 2.5 โครงสร้างไฟล์

```
talkalways/
  archive/                  โค้ด chat MVP เดิม ไม่ถูก mount และไม่มีโค้ดใหม่ require
    README.md               เหตุผลที่เก็บไว้
    server.js  config/  src/  public/  README.md  DEPLOYMENT.md  MVP_SUMMARY.md
  data/                     gitignored
    talkalways.db           ไฟล์เดิม ไม่เปิดและไม่แตะ
    site.db                 DB ใหม่
    uploads/                รูปที่ upload
  public/
    css/site.css            ทุกหน้า public
    css/admin.css           เฉพาะ /admin ราว 40 บรรทัด
    fonts/anuphan-latin.woff2
    fonts/anuphan-thai.woff2
    js/theme.js             ปุ่มสลับธีม
    js/admin.js             upload และแทรกรูป
    js/consent.js           แถบ cookie และโหลด Google Analytics (ข้อ 4.2)
    favicon.svg             placeholder จนกว่าเจ้าของจะเลือกแบรนด์ อ้างจาก <link rel="icon"> ใน head
  scripts/
    hash-password.js        สร้าง ADMIN_PASSWORD_HASH
    backup.sh               backup รายคืน (ข้อ 3.6) เขียนใน Phase 7 หลังเลือก host แล้ว
  src/
    app.js                  สร้าง express app และ export ออกไปให้ test ใช้ได้
    db.js                   เปิด DB, PRAGMA, รัน schema.sql, export db, run, get, all
    schema.sql              CREATE TABLE IF NOT EXISTS ทั้ง 8 ตาราง
    markdown.js
    slug.js
    strings.js              ข้อความ UI สาธารณะ { th: {...}, en: {...} } รวม aria-label
    routes/public.js
    routes/admin.js         login, guard, tags, settings, upload
    routes/admin-posts.js
    routes/admin-projects.js
  views/
    partials/head.ejs  partials/header.ejs  partials/footer.ejs  partials/post-card.ejs  partials/consent.ejs
    home.ejs  blog.ejs  post.ejs  projects.ejs  project.ejs  about.ejs  error.ejs  search.ejs  privacy.ejs
    admin/head.ejs  admin/foot.ejs  admin/login.ejs
    admin/posts.ejs  admin/post-edit.ejs  admin/projects.ejs  admin/project-edit.ejs
    admin/tags.ejs  admin/settings.ejs
  test/
    helpers.js  *.test.js
  server.js                 require('./src/app') แล้ว listen
  .env.example
  .github/workflows/ci.yml  GitHub Actions (ข้อ 4.4)
  package.json
```

- `blog.ejs` ใช้กับทั้งหน้า blog index และหน้า tag
- `post-card.ejs` เป็น partial เพราะใช้ในสี่หน้า รวมหน้า search
- admin posts กับ projects เขียนแยกไฟล์ และยอมให้โค้ดซ้ำกันบางส่วน ไม่ทำ generic "translatable entity" helper เพราะสอง editor ต่างกันพอสมควร
- ไม่มีไฟล์ `auth.js`, `seo.js`, `i18n.js` หรือ middleware แยก เพราะแต่ละอย่างใช้แค่ที่เดียว
- EJS ใช้ `include` ไม่ใช้ `express-ejs-layouts`

### 2.6 Dependencies

```
เพิ่ม
  ejs                template engine
  markdown-it        แปลง markdown เป็น HTML ปิด raw HTML ไว้เป็น default จึงไม่ต้องมี sanitizer
  highlight.js       highlight ฝั่ง server ด้วย lib/common
  multer@^2.3        รับไฟล์ upload (เวอร์ชัน 2.x พ้น CVE ปี 2025 แล้ว)
  cookie-parser      signed cookie สำหรับ admin

ลบ
  socket.io          ย้ายไป archive แล้ว
  stripe             ย้ายไป archive แล้ว
  cors               config ที่ไม่ได้ใช้แล้วของ chat API (ลบเพราะไม่ได้ใช้ ไม่ใช่เพราะเป็นช่องโหว่)
  uuid               ใช้ crypto.randomBytes แทน
  dotenv             ใช้ node --env-file-if-exists แทน
  nodemon (dev)      ใช้ node --watch แทน

คงไว้
  express, sqlite3, bcryptjs
```

เวอร์ชันที่ตรวจกับ npm registry แล้วเมื่อ 2026-09-13

```
express        ^5.2.1    ในเครื่องตอนนี้เป็น 5.1.0
sqlite3        ^6.0.1    ในเครื่องตอนนี้เป็น 5.1.7 ส่วน v6 ต้องการ Node 20.17 ขึ้นไป มี prebuilt ของ Node-API v3 และ v6
bcryptjs       ^3.0.3    ใช้ require() ได้ ทดสอบ hash และ compare แบบ async แล้ว
ejs            ^6.0.1
markdown-it    ^15.0.2
highlight.js   ^11.12.0  มี lib/common สำหรับ require
multer         ^2.3.0
cookie-parser  ^1.4.7
```

- ejs กระโดดจาก 3.1.10 ไป 6.0.1 ภายในปี 2026 README ของ 6.0.1 ยืนยันว่า `require('ejs')`, Express view system และ `<%- include('x', {...}) %>` ใช้ได้เหมือนเดิม หน้าแรกที่ render ได้ใน Phase 1 คือตัวยืนยันสุดท้าย

```json
{
  "engines": { "node": ">=24" },
  "scripts": {
    "start": "node --env-file-if-exists=.env server.js",
    "dev": "node --watch --env-file-if-exists=.env server.js",
    "test": "node --test test/*.test.js"
  }
}
```

- ไม่มี `devDependencies` เลย
- `npm test` ต้องระบุ `test/*.test.js` ถ้าสั่ง `node --test` เปล่าๆ runner จะหยิบทุกไฟล์ในโฟลเดอร์ `test/` รวมถึง `helpers.js` มารันเป็น test ด้วย ข้อนี้ทดสอบกับ Node ในเครื่องแล้ว
- Node 21 ขึ้นไปขยาย glob ที่ส่งให้ `--test` เอง จึงใช้ได้บน Windows ที่ shell ไม่ขยาย glob ให้
- ถ้าวันหน้าจะเอาโค้ดใน archive กลับมาใช้ ต้อง install `socket.io` และ `stripe` ใหม่

#### Environment variables

```
PORT=3000
NODE_ENV=production                 ต้องเป็น production บน server ไม่อย่างนั้น cookie จะไม่มี Secure
DATA_DIR=data                       ไม่ใส่ก็ได้ ค่า default คือ data (resolve จากโฟลเดอร์โปรเจกต์)
SITE_URL=https://example.com        ใช้กับ canonical, hreflang, og:url
SESSION_SECRET=<32 random bytes base64url>
ADMIN_USERNAME=...
ADMIN_PASSWORD_HASH=$2b$12$...
GA_MEASUREMENT_ID=G-XXXXXXXXXX       ไม่ใส่ก็ได้ ถ้าไม่ใส่จะไม่มี analytics (ข้อ 4.2)
```

ตัวที่ต้องลบออกจาก `.env` เดิม

```
DB_PATH  JWT_SECRET  BCRYPT_ROUNDS  DEFAULT_ROOM_PASSWORD  ROOM_EXPIRY_DAYS
STRIPE_PUBLISHABLE_KEY  STRIPE_SECRET_KEY  STRIPE_WEBHOOK_SECRET
PAYMENT_SUCCESS_URL  PAYMENT_CANCEL_URL  ALLOWED_ORIGINS
```

## ส่วนที่ 3: CSS และ Typography, Testing, ลำดับการสร้าง, Deployment

### 3.1 โครงสร้าง CSS

- `public/css/site.css` ใช้กับทุกหน้า public รวม tokens, `@font-face`, reset, layout, components, `.prose` และ code block
- `public/css/admin.css` ใช้เฉพาะ `/admin` ประมาณ 40 บรรทัด มีแค่ layout ของ editor, chip สถานะ และแถบ preview
- หน้า admin โหลด `site.css` ก่อน แล้วค่อยโหลด `admin.css` เพื่อใช้ปุ่มกับฟอร์มชุดเดียวกัน
- ไม่ใช้ `@import`, preprocessor หรือ build step
- `public/css/style.css` ตัวเก่าย้ายไป archive แล้วเขียนใหม่ทั้งไฟล์ ไม่ดึงของเก่ามาใช้
- custom property ทุกตัวประกาศไว้ใน `:root` block เดียวที่หัว `site.css` ห้ามประกาศที่อื่น
- ห้ามเขียน `var(--x, fallback)` เพราะ fallback เป็นสาเหตุที่ stylesheet เดิมพังโดยไม่มีใครเห็น
- cache busting ใช้ `app.locals.v = Date.now().toString(36)` แล้วต่อ `?v=<%= v %>` ท้ายไฟล์ CSS และ JS ทุกไฟล์
- ไฟล์ฟอนต์ไม่ต่อ `?v` เพราะ href ของ `<link rel="preload">` ต้องตรงกับ `url()` ใน `@font-face` ทุกตัวอักษร ถ้าไม่ตรง browser จะโหลดฟอนต์ซ้ำสองรอบ
- ถ้าหัวไฟล์หายไปอีก ตัวที่ป้องกันจริงคือ git ไม่ต้องเขียน script ตรวจ

### 3.2 Theme: light, dark และปุ่มสลับ

```css
:root {
  color-scheme: light dark;
  --bg:            light-dark(#FCFCFA, #121315);
  --surface:       light-dark(#FFFFFF, #1A1C1F);
  --surface-soft:  light-dark(#F0EEE8, #23262A);
  --text:          light-dark(#1A1A18, #E8E8E4);
  --text-muted:    light-dark(#5F5F58, #A8A8A1);
  --border:        light-dark(#E4E2DC, #2C2F33);
  --border-strong: light-dark(#948F84, #6B7079);
  --accent:        light-dark(#1F5FA8, #7FB2F0);
  --code-bg:       light-dark(#F5F4F0, #17191C);
  --syn-key:       light-dark(#8A3B92, #D5A0E8);
  --syn-str:       light-dark(#2D6E3E, #8FCFA0);
  --syn-num:       light-dark(#9A4B18, #E9A178);
  --syn-com:       light-dark(#6B6B63, #8E8E88);
  --syn-typ:       light-dark(#8A5A00, #D9BE79);
  --font-sans:     "Anuphan", system-ui, sans-serif;
  --font-mono:     ui-monospace, "SF Mono", "Cascadia Mono", Consolas, Menlo, "Anuphan", monospace;
  --fs-sm: 0.875rem;  --fs-base: 1rem;  --fs-h3: 1.25rem;  --fs-h2: 1.5rem;  --fs-h1: 2rem;
  --lh-body: 1.65;  --lh-tight: 1.25;
  --sp-1: 0.25rem;  --sp-2: 0.5rem;  --sp-3: 0.75rem;  --sp-4: 1rem;  --sp-6: 1.5rem;  --sp-8: 2rem;  --sp-12: 3rem;
  --r-sm: 4px;  --r-md: 8px;
  --measure: 42rem;  --page: 64rem;  --gutter: 1rem;
}
:root[data-theme="light"] { color-scheme: light; }
:root[data-theme="dark"]  { color-scheme: dark; }
body { background: var(--bg); color: var(--text); font-family: var(--font-sans); }
```

- `light-dark()` ช่วยให้ไม่ต้องเขียนสีชุด dark ซ้ำสองที่
- ถ้าไม่มี `data-theme` จะอิงค่า `prefers-color-scheme` ของ OS
- `color-scheme` ทำให้ scrollbar, select และ form control เปลี่ยนตามธีมด้วย โดยไม่ต้องเขียน CSS เพิ่ม
- ไม่ต้องทำ `@supports` fallback เพราะ browser เก่าที่ไม่รู้จัก `light-dark()` ยังได้สี system ที่อ่านออกจาก `color-scheme`
- accent ใช้สีน้ำเงินหมึก เปลี่ยนภายหลังได้โดยแก้ hex สองค่า
- contrast ที่คำนวณไว้แล้ว: text 16.97 / 15.13, muted 6.26 / 7.77, accent 6.27 / 8.43 ค่าที่ต่ำที่สุดคือสี comment ใน light mode ได้ 4.88 ซึ่งผ่าน AA ทั้งหมด

ปุ่มสลับธีม

```html
<head>
  <meta charset="utf-8">
  <script>try{var t=localStorage.getItem('theme');if(t)document.documentElement.dataset.theme=t}catch(e){}</script>
  <link rel="stylesheet" href="/css/site.css?v=<%= v %>">
```

- script inline ต้องอยู่บรรทัดแรกของ `<head>` เพื่อไม่ให้หน้าจอกะพริบ
- `public/js/theme.js` ยาวราว 9 บรรทัด โหลดแบบ `defer` สลับได้ 2 สถานะ และบันทึกลง `localStorage`
- คลิกครั้งแรกอ่าน `matchMedia` เพื่อให้ผลตรงกับที่ผู้ใช้เห็นอยู่
- ปุ่มเป็น `<button type="button">` ใช้ไอคอนเดียวตายตัว และ `aria-label` มาจาก `strings.js` ของภาษานั้น

Code block และ syntax colors

```css
pre { background: var(--code-bg); overflow-x: auto; padding: var(--sp-4);
      border: 1px solid var(--border); border-radius: var(--r-md); tab-size: 2; }
pre, code { font-family: var(--font-mono); }
.hljs-keyword, .hljs-built_in, .hljs-literal, .hljs-name, .hljs-selector-tag  { color: var(--syn-key); }
.hljs-string, .hljs-regexp, .hljs-symbol, .hljs-addition                      { color: var(--syn-str); }
.hljs-number, .hljs-deletion                                                  { color: var(--syn-num); }
.hljs-comment, .hljs-quote                                                    { color: var(--syn-com); }
.hljs-title, .hljs-section, .hljs-selector-class, .hljs-selector-id           { color: var(--accent); }
.hljs-attr, .hljs-attribute, .hljs-type, .hljs-variable, .hljs-template-variable { color: var(--syn-typ); }
```

- ไม่โหลด theme สำเร็จรูปของ highlight.js เพราะ theme เหล่านั้นเปลี่ยนตาม `light-dark()` ไม่ได้
- comment ไม่ใช้ตัวเอียง เพราะภาษาไทยใน comment จะกลายเป็นตัวเอียงปลอมที่อ่านยาก
- บนหน้าจอเล็ก code block ยื่นออกไปชนขอบจอด้วย `margin-inline: calc(var(--gutter) * -1)`

### 3.3 Typography ไทยและละติน

#### ฟอนต์

- ฟอนต์หลักคือ **Anuphan** แบบ variable น้ำหนัก 300 ถึง 700 self-host แค่ 2 ไฟล์ (latin 35 KB, thai 19 KB)
- ตัวไทยและละตินของ Anuphan ออกแบบมาเป็นชุดเดียวกัน จึงไม่ต้องปรับ `size-adjust`
- ทางเลือกที่มีหัวคือ IBM Plex Sans Thai ต้องใช้ 4 ไฟล์ (400 และ 600 อย่างละ 2 subset) ข้อนี้ให้เจ้าของเลือกเอง
- เหตุผลที่ self-host คือไม่ต้องต่อไปอีกสอง origin, ใช้ preload ได้ และไม่ส่ง IP ผู้อ่านไปให้ Google
- `@font-face` ใช้ `font-display: swap` และ `unicode-range` คัดลอกมาจาก CSS ของ Google ตรงๆ
- preload ไฟล์ latin ทุกหน้า ส่วนไฟล์ thai preload เฉพาะหน้า `/th`
- `<link rel="preload" ... crossorigin>` ต้องมี `crossorigin` เสมอ แม้เป็น same-origin ไม่อย่างนั้น browser จะโหลดไฟล์ซ้ำสองรอบ
- ฟอนต์ mono ใช้ของ system: `ui-monospace, "SF Mono", "Cascadia Mono", Consolas, Menlo, Anuphan, monospace`
- ที่ไม่ใช้ JetBrains Mono เพราะ subset latin ของ Google ไม่มีตัวอักษร box-drawing ที่ output ของ `tree` ต้องใช้
- ต้องวาง Anuphan ไว้ในสแต็ก mono เพื่อให้ภาษาไทยใน comment ใช้ฟอนต์เดียวกับเนื้อหา

#### กติกาเฉพาะภาษาไทย

```css
:lang(th) { --fs-base: 1.125rem; --lh-body: 1.9; --lh-tight: 1.45; }
body, .prose, .card, .excerpt { font-size: var(--fs-base); line-height: var(--lh-body); }
h1, h2, h3 { line-height: var(--lh-tight); text-wrap: balance; }
p, li { text-wrap: pretty; }
:lang(th) em, :lang(th) i { font-style: normal; font-weight: 600; }
.prose a, .prose code { overflow-wrap: break-word; }
```

- ใช้ `:lang(th)` ไม่ใช้ `:root:lang(th)` เพื่อให้ใช้ได้กับการ์ด fallback, `<details lang="th">` ใน editor และหน้า preview
- ต้องประกาศ `line-height` ซ้ำบน `.prose`, `.card`, `.excerpt` และ heading เพื่อให้ token ถูกคำนวณใหม่ที่ element ที่มี `lang` ของตัวเอง
- ภาษาไทยซ้อนได้สี่ชั้น ถ้า line-height เท่ากับภาษาละติน วรรณยุกต์จะไปทับบรรทัดบน
- element ที่ใช้ `-webkit-line-clamp` ต้องใช้ `var(--lh-body)` ด้วย เพราะ `overflow: hidden` จะตัดวรรณยุกต์บรรทัดบนสุด
- ห้ามใช้ `text-align: justify` กับภาษาไทย
- ห้ามใช้ `letter-spacing` และ `text-transform: uppercase` กับ element ที่อาจมีภาษาไทย เช่น label, nav, chip
- ห้ามตั้ง `word-break` หรือ `overflow-wrap` ทั้งหน้า เพราะจะไปทับ dictionary line breaking ของ browser
- ภาษาไทยไม่มีตัวเอียง `<em>` จึงแสดงเป็นตัวหนาแทน

#### Layout

- header มีชื่อเว็บที่ลิงก์ไป `/<lang>`, ลิงก์ บทความ / โปรเจกต์ / เกี่ยวกับ / ค้นหา จาก `strings.js`, ลิงก์สลับภาษา และปุ่มสลับธีม
- footer มีลิงก์โซเชียลเฉพาะตัวที่มีค่า, ลิงก์หน้า privacy และ `© ปี site_name`
- หน้าโปรเจกต์มีภาพ thumbnail พร้อม alt, ชื่อ, summary, ลิงก์ repo และ demo ถ้ามี, ชิปแท็กแบบข้อความ และ body จาก markdown

- blog index เป็นรายการคั่นด้วยเส้นบาง ไม่ใช่ card grid
- thumbnail ของ blog index กว้าง 8rem แสดงเฉพาะจอตั้งแต่ 40rem ขึ้นไป ใส่ `alt=""` และ `loading="lazy"`
- project grid ใช้ `repeat(auto-fill, minmax(17rem, 1fr))` จึงไม่ต้องมี breakpoint ของตัวเอง
- ใช้ media query สองตัวคือ `40rem` และ `64rem` และเขียนแบบ mobile-first
- ไม่มี hamburger menu header ใช้ `flex-wrap` ความกว้าง 348px ยังใส่ลิงก์ภาษาไทยได้ครบ
- ทั้งการ์ดคลิกได้ด้วย `.card h3 a::after { position:absolute; inset:0 }` โดยยังมีลิงก์เดียวใน accessibility tree
- หน้า detail ใช้ `alt` จาก translation ส่วน thumbnail ในหน้า list ใช้ `alt=""` เพราะมีชื่อเรื่องอยู่ข้างๆ แล้ว
- ไม่แสดงเวลาอ่าน เพราะภาษาไทยไม่มีช่องว่างระหว่างคำ นับคำไม่ได้
- accessibility: `:focus-visible` outline, skip link ไป `#main`, landmark ครบ, nav สองอันมี `aria-label` ต่างกันและมาจาก strings

### 3.4 Testing

#### เครื่องมือ

- ใช้ `node:test`, `node:assert/strict`, global `fetch` และ `app.listen(0)`
- เป็น CommonJS ทั้งหมด (`module.exports` / `require`)
- ไม่ใช้ supertest, jsdom, Playwright หรือ test framework อื่น
- `npm test` ไม่ได้โหลด `.env` test จึงไม่เห็นค่าจริงเลย

#### Test database

```js
// test/helpers.js
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'site-test-'));
process.env.SESSION_SECRET = 'test-secret';
process.env.SITE_URL = 'http://test.local';
process.env.ADMIN_USERNAME = 'admin';
process.env.ADMIN_PASSWORD_HASH = require('bcryptjs').hashSync('pw', 4);
const app = require('../src/app');
const { db, run, get, all } = require('../src/db');
// start(): listen(0), คืน req() ที่เก็บ cookie ด้วย getSetCookie() และ login()
// insertPost({ th: {...}, en: {...}, tags }) กับ insertProject(...): SQL ตรงผ่าน db module
// stop(): server.close() แล้วรอ db.close(callback) ให้เสร็จ จากนั้นค่อย fs.rmSync(dir, { recursive: true, force: true })
module.exports = { start, insertPost, insertProject, get, all };
```

- `DATA_DIR` ถูก assign ก่อน require app และไม่อ่านค่าเดิม test จึงไม่มีทางไปเปิด DB จริงได้
- node test runner รันแต่ละไฟล์แยก process ทุกไฟล์จึงได้ DB ไฟล์ใหม่ใน temp dir ของตัวเอง
- เพราะเป็นไฟล์จริง WAL, `foreign_keys` และโฟลเดอร์ uploads จึงถูกทดสอบไปด้วย
- ไม่ใช้ `:memory:` เพราะ `DATA_DIR` เป็น directory ถ้าใช้ `:memory:` จะได้ path ผิดและเกิดโฟลเดอร์ชื่อ `:memory:` ขึ้นมา
- บน Windows ถ้า `rmSync` ทำงานก่อน DB ปิดเสร็จ จะโยน `EPERM` เพราะไฟล์ `-wal` ยังถูกล็อก ทดสอบกับ Node 24 บนเครื่องนี้แล้ว

#### Launch gate: 17 tests

แต่ละ test ผ่านเมื่อทุก assertion ในข้อนั้นเป็นจริง

1. **markdown**
   - fence ` ```js ` ให้ผลที่มี `class="language-js"` และ `class="hljs-keyword"`
   - `<script>alert(1)</script>` ใน body ต้องออกมาเป็น `&lt;script&gt;` และไม่มี `<script>` จริงหลุดออกมา
   - fence ` ```foobar ` ต้องไม่ throw และโค้ดถูก escape
2. **routing**
   - `GET /` ที่ไม่มี Accept-Language ได้ 302 ไป `/th` และ header `Vary` มี `Accept-Language`
   - `GET /` พร้อม `Accept-Language: en-US,en;q=0.9` ได้ 302 ไป `/en`
   - `GET /th/nope` ได้ 404
   - `GET /nope` ได้ 404 และ body เป็นหน้า error ของเว็บ ไม่ใช่ stack trace
3. **แยกสถานะเผยแพร่ต่อภาษา** (bug ที่ amendment แก้) ใช้โพสต์ที่ th published slug `x` และ en draft slug `x` title `EN DRAFT`
   - `/en/blog` ต้องไม่มี `EN DRAFT` แต่ต้องมี title ไทยอยู่ใน element ที่มี `lang="th"`
   - `/en/blog/x` ได้ 404
   - `/th/blog/x` ได้ 200 และไม่มี `hreflang="en"`
4. **published_at คงที่** (ทำผ่าน admin POST)
   - publish th แล้วจดค่า `published_at` ไว้
   - แก้ title แล้ว save ซ้ำ ค่าต้องเท่าเดิม
   - publish en ค่าของ th ต้องเท่าเดิม
   - เปลี่ยน th เป็น draft แล้ว publish ใหม่ ค่าต้องเท่าเดิม
5. **หน้า blog ที่ต้องไม่แสดงเนื้อหา** ใช้โพสต์ที่มีแค่ th draft ส่วนสอง assertion สุดท้ายย้ายมาจาก test 2 เพราะ route ของ blog เพิ่งมีใน Phase 3
   - `/th/blog` และ `/th` ต้องไม่มี title นั้น
   - `/th/blog/<slug>` ได้ 404
   - `GET /th/blog/%E0%` ได้ 400 และ body ไม่มีคำว่า `node_modules`
   - `GET /th/blog?page=abc` ได้ 404
6. **ลบแล้วไม่มีเศษ** ใช้โพสต์ที่มี 2 ภาษาและ 2 แท็ก
   - หลัง `POST /admin/posts/:id/delete` จำนวน `post_translations` และ `post_tags` ของ id นั้นต้องเป็น 0
   - ข้อนี้พิสูจน์ว่า `PRAGMA foreign_keys = ON` ทำงานจริง
7. **admin guard**
   - anonymous `GET /admin/posts` ได้ 302 ไป `/admin/login`
   - anonymous `POST /admin/posts` พร้อมฟอร์มที่ถูกต้อง ได้ 302 และจำนวน `posts` ต้องไม่เปลี่ยน
   - `GET /admin/login` ได้ 200
8. **login และ cookie**
   - รหัสผิดได้ 401 และไม่มี `Set-Cookie`
   - รหัสถูกได้ 303 ไป `/admin/posts` และ `Set-Cookie` มี `HttpOnly`, `SameSite=Lax`, `Path=/admin` และค่าขึ้นต้นด้วย `s%3A`
   - หลัง login `GET /admin/posts` ได้ 200
   - cookie ที่ sign ถูกต้องแต่เวลาหมดอายุไปแล้ว (sign เองใน `helpers.js` ด้วย HMAC-SHA256 จาก `node:crypto` แบบเดียวกับ cookie-parser ห้าม require `cookie-signature` ตรงๆ เพราะเป็น dependency ทางอ้อมที่ไม่ได้ประกาศใน package.json) ได้ 302
   - cookie ที่ถูกแก้ค่าได้ 302
   - cookie หมดอายุที่ sign เองต้องมีค่าในรูป `เวลาหมดอายุ:epoch` ตามข้อ 4.3
   - หลัง `POST /admin/sessions/revoke` cookie เดิมได้ 302 แต่ login ใหม่แล้ว `GET /admin/posts` ได้ 200
9. **validation ตอนบันทึก**
   - title ไทย, slug ว่าง, en เป็น none ได้ 400, response ยังมี body markdown ที่พิมพ์ไว้ และจำนวน `posts` ไม่เปลี่ยน
   - เหมือนข้อบนแต่ en มี slug `docker-101` บันทึกสำเร็จ และทั้งสองภาษาได้ slug `docker-101`
   - slug ซ้ำกับโพสต์อื่นในภาษาเดียวกัน ได้ 400 พร้อมข้อความ ต้องไม่ใช่ 500
10. **preview**
    - `POST /admin/posts/preview/th` ที่มี fence js และ title ไทย ได้ 200 มี `hljs-keyword` และ title และจำนวน `posts` ไม่เปลี่ยน
    - preview โพสต์ที่ published แล้วด้วย title ใหม่ หน้า public ต้องยังแสดง title เดิม
    - `POST /admin/posts/preview/en` ต้องได้ `<html lang="en">`
11. **upload**
    - bytes ของ PNG signature ได้ 200 และ url ตรงกับ `^/uploads/[0-9a-f]{32}\.png$`
    - ไฟล์นั้นต้องมีอยู่จริงใน `DATA_DIR/uploads` และ `GET url` ได้ header `X-Content-Type-Options: nosniff`
    - `<html>` ที่ตั้งชื่อ `x.png` และประกาศ `image/png` ได้ 400 และจำนวนไฟล์ไม่เปลี่ยน
    - `<svg>` ได้ 400
    - ไฟล์ขนาด 6 MB ได้ 400 และ body เป็น JSON ไม่ใช่หน้า HTML
12. **ลำดับโปรเจกต์** ใช้ A (featured, sort 2), B (featured, sort 1), C (ไม่ featured, sort 0)
    - `/th/projects` ต้องเรียงเป็น B, A, C
    - หน้า `/th` ต้องมี B กับ A แต่ไม่มี C
13. **หน้าแท็ก**
    - `/th/tags/<slug ที่ไม่มีอยู่>` ได้ 404
    - แท็กที่ติดกับโพสต์ published หนึ่งตัวและ draft หนึ่งตัว หน้า `/th/tags/<slug>` ต้องมีแค่ตัวที่ published
14. **settings และหน้า About**
    - บันทึก settings ผ่านฟอร์ม admin โดยให้ `th[about_body]` เป็น `**หนา**` และปล่อย `github_url` ว่าง
    - `/th/about` ต้องมี `<strong>หนา</strong>` และไม่มีลิงก์ GitHub
15. **search**
    - โพสต์ th published ที่ body มีคำว่า `ญี่ปุ่น` ต้องขึ้นใน `/th/search?q=ญี่ปุ่น` ส่วนโพสต์ draft ที่มีคำเดียวกันต้องไม่ขึ้น
    - โพสต์ที่ published ทั้ง th และ en โดยคำค้นมีแค่ในฉบับไทย ต้องขึ้นใน `/en/search` เป็นการ์ดภาษาอังกฤษ
    - `q=100%` ต้องเจอเฉพาะโพสต์ที่มีข้อความ `100%` จริง
    - โปรเจกต์ published ที่ summary มีคำค้นต้องขึ้นในส่วนโปรเจกต์
    - หน้า search มี `noindex` และ `q` ยาว 500 ตัวอักษรได้ 200
16. **cookie ภาษา**
    - `GET /en/blog` ที่ไม่มี cookie ต้องได้ `Set-Cookie` ที่ขึ้นต้นด้วย `lang=en` และมี `HttpOnly`
    - `GET /` พร้อม `Cookie: lang=en` และ `Accept-Language: th` ได้ 302 ไป `/en` และ `Vary` มี `Cookie`
    - `GET /en/blog` พร้อม `Cookie: lang=en` ต้องไม่มี `Set-Cookie`
17. **consent, analytics และหน้า privacy** ไฟล์ test นี้ตั้ง `process.env.GA_MEASUREMENT_ID = 'G-TEST'` ก่อน require `helpers.js`
    - `GET /th` ที่ไม่มี cookie ต้องมีแถบ consent และ `data-ga-id="G-TEST"`
    - `GET /th` พร้อม `Cookie: consent=denied` ต้องไม่มีแถบ
    - `POST /admin/posts/preview/th` ที่ login แล้วและส่ง `consent=granted` ต้องไม่มี `G-TEST` และไม่มีแถบ
    - `/th/privacy` ได้ 200 และมีชื่อ `ta_admin`, `lang`, `consent` และ `_ga`

#### Manual checklist (ต้องผ่านทุกข้อก่อน launch)

- ถ้ายังไม่เคยเลือกธีม หน้าเว็บต้องเปลี่ยนตาม OS กดสลับแล้ว reload ธีมต้องคงอยู่และหน้าไม่กะพริบ
- ที่ความกว้าง 400px ทั้งสองธีม หน้าต้องไม่เลื่อนแนวนอน มีแค่ code block ที่เลื่อนแนวนอนในกรอบของตัวเอง
- ย่อหน้าไทยที่มีคำว่า ปั๊ก ที่ ญี่ปุ่น วรรณยุกต์ต้องไม่แตะบรรทัดบน และ `<em>` ภาษาไทยต้องเป็นตัวหนาไม่ใช่ตัวเอียง
- excerpt ไทยที่ถูก clamp ต้องไม่มีวรรณยุกต์บรรทัดแรกโดนตัด
- CI ตรวจ `<%-` ให้ทุก push แล้ว (ข้อ 4.4) ก่อน launch ให้ดูว่า GitHub Actions ของ commit ล่าสุดผ่าน
- กดยอมรับบนเว็บจริงแล้ว DevTools ต้องเห็น request ไป `googletagmanager.com` และ cookie `_ga` จากนั้นกดตั้งค่า cookie ใหม่บนหน้า privacy แล้ว `_ga` กับ `consent` ต้องหายไป
- กดปฏิเสธแล้ว reload ต้องไม่มี request ไป Google เลย
- `npm ls socket.io stripe cors uuid dotenv nodemon` ต้องว่าง
- sha256 ของ `data/talkalways.db` หลัง launch ต้องตรงกับค่าที่จดไว้ใน Phase 0
- ส่งลิงก์บทความหาตัวเองใน LINE แล้ว preview ต้องมี title, description และรูปปก
- บน server จริง `Set-Cookie` ของ admin ต้องมี `Secure`

**นิยามว่าเสร็จ:** `npm test` exit 0 และมี 17 tests ผ่าน และ manual checklist ผ่านครบทุกข้อ

### 3.5 ลำดับการสร้าง (vertical slices)

แต่ละ phase จบด้วยสิ่งที่เปิดดูได้จริง

#### Phase 0: ทำให้ย้อนกลับได้ก่อน

- ติดตั้ง Node 24 LTS แล้วตรวจว่า `node -v` ได้ 24 ขึ้นไป ตอนนี้เครื่องเป็น 20.19.5 ซึ่ง EOL ไปแล้ว
- จด sha256 ของ `data/talkalways.db` และคัดลอกไฟล์นี้ไปไว้นอก repo เพราะไฟล์นี้ถูก gitignore git จึงไม่ได้เก็บไว้ให้
- `git init` แล้ว commit MVP ตามสภาพเดิม ตรวจด้วย `git show --stat HEAD` ต้องไม่มี `.env` หรือ `data/`
- commit แรกไม่รวม `docs/` แล้ว commit spec ฉบับนี้เป็น commit ที่สอง
- สร้าง repo บน GitHub ด้วย `gh repo create` แล้ว push หลังเจ้าของยืนยันว่าจะให้ repo เป็น public หรือ private เพราะเป็นการเผยแพร่โค้ดออกนอกเครื่อง
- **ตรวจ:** `git remote -v` ชี้ไป GitHub และ `git status` บอกว่า branch ตรงกับ `origin`
- `git mv` ไฟล์ `server.js`, `config/`, `src/`, `public/` ทั้งโฟลเดอร์, `README.md`, `DEPLOYMENT.md`, `MVP_SUMMARY.md` ไปไว้ใน `archive/` ห้ามลบอะไร
- ตรวจด้วย `git status` ต้องเห็นเป็น `R` (rename) ไม่ใช่ `D` คู่กับ `A`
- เขียน `archive/README.md` หนึ่งย่อหน้า
- ไม่ต้องแก้ `.gitignore` เพราะคลุม `data/`, `*.db`, `.env` และ `node_modules/` ไว้แล้ว

#### Phase 1: โครงแอปที่ render ได้

- แก้ `package.json` ตามข้อ 2.6 แล้ว `npm install`
- สร้าง `src/db.js` กับ `schema.sql` ตั้ง `PRAGMA foreign_keys = ON` และ `PRAGMA journal_mode = WAL`
- สร้าง `src/app.js` กับ `server.js`: mount ภาษา, redirect ที่ `/`, static, 404 และ error handler
- สร้าง views ได้แก่ head, header, footer, error และ home ที่อ่าน settings พร้อม `strings.js`
- สร้าง `site.css` (tokens และฟอนต์), `theme.js` และ `markdown.js`
- สร้าง `test/helpers.js` พร้อม tests ข้อ 1 และ 2
- **ตรวจ:** `npm test` ผ่าน 2 ข้อ
- **ตรวจ:** `curl -sI localhost:3000/` ได้ 302 ไป `/th`
- **ตรวจ:** script หนึ่งบรรทัดอ่าน `data/site.db` ต้องเห็น 8 ตาราง และ `PRAGMA journal_mode` ได้ `wal`
- **ตรวจ:** ปุ่มสลับธีมทำงานตาม checklist
- **ตรวจ:** `grep -rn "archive/" --include=*.js . --exclude-dir=node_modules --exclude-dir=archive` ต้องว่าง
- สร้าง `.github/workflows/ci.yml` ตามข้อ 4.4
- **ตรวจ:** push แล้วหน้า Actions บน GitHub ขึ้นเครื่องหมายผ่าน

#### Phase 2: Admin login

- `routes/admin.js` ส่วน login, logout และ guard
- `scripts/hash-password.js`, `admin/head.ejs`, `admin/foot.ejs` และหน้า posts list ที่ยังว่าง
- tests ข้อ 7 และ 8
- cookie ในรูป `เวลาหมดอายุ:epoch` และ `POST /admin/sessions/revoke` ตามข้อ 4.3 ทำตั้งแต่ phase นี้ test ข้อ 8 จะได้ไม่ต้องเขียนใหม่ทีหลัง ส่วนปุ่มในหน้า settings มาใน Phase 5
- **ตรวจ:** login ใน browser ด้วยรหัสที่ hash ไว้ใน `.env` แล้ว logout เข้า `/admin/posts` อีกครั้งต้องเด้งไปหน้า login

#### Phase 3: โพสต์ครบวงจร

- editor: สถานะแยกภาษา, alt แยกภาษา, checkbox แท็ก, validation, transaction, ลบ และ preview
- ฝั่ง public: blog index, detail, การ์ด fallback, ลิงก์สลับภาษา, canonical, hreflang และ pagination
- tests ข้อ 3, 4, 5, 6, 9 และ 10
- **ตรวจ:** เขียนโพสต์ไทยที่มี ` ```js ` กด preview แล้ว publish เฉพาะภาษาไทย
- **ตรวจ:** `/th/blog/<slug>` ต้องมี highlight ทั้งสองธีม
- **ตรวจ:** `/en/blog` ต้องมีการ์ดไทยพร้อม badge
- **ตรวจ:** เพิ่ม EN แบบ draft แล้ว `/en/blog` ต้องยังแสดงการ์ดไทยเหมือนเดิม

#### Phase 4: โปรเจกต์ครบวงจรและหน้าแรก

- admin projects, `/projects`, `/projects/:slug` และ featured บนหน้าแรก
- test ข้อ 12
- **ตรวจ:** โปรเจกต์ featured อยู่ลำดับแรกทั้งบน `/th/projects` และ `/th`

#### Phase 5: แท็ก, upload และ About

- หน้า admin tags, `/tags/:slug`, `/admin/upload`, หน้า settings และ `/about`
- ปุ่มออกจากระบบทุกเครื่องท้ายหน้า settings
- tests ข้อ 11, 13 และ 14
- **ตรวจ:** upload PNG เป็นภาพปก ใส่ alt ภาษาไทย แล้วแทรกรูปใน body รูปต้องแสดงบนหน้าจริง
- **ตรวจ:** `/th/tags/<slug>` ต้องมีเฉพาะโพสต์ที่ published
- **ตรวจ:** social link ที่ปล่อยว่างต้องไม่แสดง
- **ตรวจ:** login ไว้สอง browser กดออกจากระบบทุกเครื่องจาก browser หนึ่ง แล้วอีก browser refresh ต้องเด้งไปหน้า login

#### Phase 6: Search, cookie และ privacy

- หน้า `/search` พร้อม query ของบทความและโปรเจกต์ และลิงก์ค้นหาใน header
- cookie `lang` และลำดับการเลือกภาษาที่ `/`
- แถบ consent, `public/js/consent.js`, หน้า `/privacy` และ key `privacy_body` ในหน้า admin settings
- tests ข้อ 15, 16 และ 17
- **ตรวจ:** ค้นคำไทยที่อยู่กลางประโยคของโพสต์จริงแล้วเจอ
- **ตรวจ:** ใส่ `GA_MEASUREMENT_ID` ของจริง กดยอมรับ แล้วหน้า Realtime ของ GA เห็นผู้ใช้หนึ่งคน

#### Phase 7: Launch

- ไล่ manual checklist ให้ผ่านครบ
- deploy ตามข้อ 3.6
- ตั้ง backup แล้วทดสอบ restore จริง

### 3.6 Deployment

#### เงื่อนไขที่เปลี่ยนไม่ได้

- ต้องมี Node process ตัวเดียวที่รันยาว และมี persistent disk หนึ่งลูก
- `DATA_DIR` ต้องอยู่บน disk ลูกนั้น เพราะเก็บทั้ง `site.db` และ `uploads/`
- ใช้ไม่ได้: serverless ทุกเจ้า (Vercel, Netlify, Cloudflare), Render free tier, Heroku และทุกอย่างที่รันเกิน 1 instance
- `README.md` เดิมแนะนำ Render free ซึ่งใช้ไม่ได้กับแอปนี้ เพราะ DB จะหายตอน redeploy หรือตอน idle

#### ตัวเลือกที่ใช้ได้ (เจ้าของเลือก)

- **VPS และ Caddy** ถูกที่สุดและไม่มีข้อจำกัด แต่ต้องดูแล systemd และการ update เอง
- **Render แบบเสียเงินพร้อม persistent disk** ไม่ต้องดูแล server แต่ใช้ได้ instance เดียว และระบบจะหยุดสั้นๆ ทุกครั้งที่ deploy
- **Fly.io พร้อม volume** ต้องปักไว้ที่ machine เดียว ถ้า scale เป็นสองเครื่อง จะได้ DB สองก้อนที่ข้อมูลแยกกันไปโดยไม่มี error เตือน
- เลือก region ที่ใกล้ไทย เช่น Singapore และเช็กราคาจริงตอนซื้อ

#### ตั้งค่าบน server

- ติดตั้ง Node 24 LTS
- `.env` วางไว้ในโฟลเดอร์แอป เพราะ `npm start` อ่านด้วย `--env-file-if-exists` บน Render ใช้ env panel แทนได้
- `NODE_ENV=production` ต้องมีเสมอ ไม่อย่างนั้น cookie จะไม่มี `Secure`
- ไม่ต้องตั้ง `trust proxy` เพราะแอปไม่ได้อ่าน `req.ip` หรือ `req.secure` และ `secure: true` ใส่ flag ให้โดยไม่สนใจ proxy
- สร้าง `SESSION_SECRET` ด้วย `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`
- สร้าง `ADMIN_PASSWORD_HASH` บนเครื่องตัวเองด้วย `node scripts/hash-password.js '...'` แล้ว copy ไปวาง
- ถ้าลง `npm ci` แล้ว sqlite3 ติดตั้งไม่ผ่าน แปลว่าดาวน์โหลด prebuilt binary ไม่ได้ ต้องมี build tools
- VPS: systemd unit ตั้ง `Restart=always` และ Caddy ใช้ `reverse_proxy localhost:3000` ซึ่งได้ TLS อัตโนมัติ
- deploy แต่ละรอบ: `git pull && npm ci && systemctl restart <service>`

#### Backup

ถ้า disk พัง ทุกโพสต์ ทุกโปรเจกต์ และทุกรูปจะหายถาวร เพราะ git ไม่ได้เก็บทั้งสองอย่างนี้ไว้

```sh
#!/bin/sh
# scripts/backup.sh ตั้ง cron ทุกคืน รันจากโฟลเดอร์แอป
set -e
: "${DATA_DIR:?ต้องตั้ง DATA_DIR เพราะ cron ไม่ได้โหลด .env}"
TS=$(date +%Y%m%d-%H%M%S)
node -e "new (require('sqlite3').Database)(process.argv[1], require('sqlite3').OPEN_READONLY).run('VACUUM INTO ?', [process.argv[2]], e => { if (e) throw e })" "$DATA_DIR/site.db" "/var/backups/site-$TS.db"
tar czf "/var/backups/uploads-$TS.tgz" -C "$DATA_DIR" uploads
rclone copy /var/backups remote:site-backups
find /var/backups -mtime +7 -delete
```

- `VACUUM INTO` ได้ snapshot ที่ข้อมูลสอดคล้องกันโดยไม่ต้องหยุดแอป
- เปิด DB แบบ `OPEN_READONLY` และบังคับให้มี `DATA_DIR` เพราะทดสอบแล้วว่าถ้า path ผิด sqlite3 แบบปกติจะสร้างไฟล์ DB เปล่าขึ้นมาใหม่ แล้ว backup ไฟล์เปล่านั้นโดย exit 0 ทุกคืนโดยไม่มีใครรู้
- ห้าม copy `site.db` ตรงๆ เพราะมีไฟล์ `-wal` อยู่ข้างๆ
- ชื่อไฟล์ต้องมีเวลา เพราะ `VACUUM INTO` จะ fail ถ้าไฟล์ปลายทางมีอยู่แล้ว
- ปลายทางนอกเครื่องใช้ Backblaze B2 หรือ Google Drive ผ่าน rclone ข้อมูลระดับไม่กี่ MB แทบไม่มีค่าใช้จ่าย
- retention ฝั่ง remote ตั้งเป็น lifecycle rule ของ bucket ไม่ต้องเขียนโค้ด
- **ต้องทดสอบ restore จริงหนึ่งครั้ง:** ดึง backup ล่าสุดมาไว้ในโฟลเดอร์ทดลอง เปิด DB แล้วนับจำนวน posts ให้ตรงกับของจริง แตก tar แล้วต้องเห็นไฟล์รูป ถ้ายังไม่เคย restore ได้ ถือว่ายังไม่มี backup

## ส่วนที่ 4: Search, Cookie และ CI

ส่วนนี้เพิ่มเข้ามาหลังเจ้าของรีวิว spec รอบแรก

### 4.0 การตัดสินใจหลักของส่วนนี้

- **Search ใช้ `LIKE` ของ SQLite** ไม่ใช้ FTS5 เพราะ tokenizer มาตรฐานของ FTS5 แยกคำไทยที่ไม่มีช่องว่างไม่ได้ ส่วน `LIKE` หาคำไทยกลางประโยคได้ทันที ทดสอบกับ 1,000 โพสต์ที่ยาวโพสต์ละ 8,400 ตัวอักษรแล้วใช้เวลา 33 ms
- **ค้นทั้งบทความและโปรเจกต์** เพราะคนที่พิมพ์คำว่า docker บน portfolio คาดว่าจะเจอทั้งสองแบบ
- **แถบ cookie มีแถบเดียว** การแจ้ง cookie กับการขอความยินยอมรวมเป็นแถบเดียวกัน ถ้าตั้ง `GA_MEASUREMENT_ID` แถบมีปุ่มยอมรับและปฏิเสธ ถ้าไม่ได้ตั้ง แถบมีแค่ปุ่มรับทราบ
- **analytics ใช้ Google Analytics 4** เพราะฟรีและคนส่วนใหญ่คุ้นเคย script ไม่ถูกโหลดเลยจนกว่าผู้อ่านจะกดยอมรับ เปลี่ยนเป็นเจ้าอื่นได้โดยแก้ฟังก์ชันเดียวใน `consent.js`
- **cookie จำภาษา** ถูกตั้งตอนเข้าหน้า `/th` หรือ `/en` และถูกใช้ตอนเข้า `/` เปล่าๆ
- **ออกจากระบบทุกเครื่องได้จากหน้า admin settings** โดยไม่ต้องแก้ `.env` และไม่ต้อง restart
- **CI ใช้ GitHub Actions** รัน test และตรวจ `<%-` ทุกครั้งที่ push และเปิด pull request

### 4.1 Search

```
GET  /th/search?q=...   /en/search?q=...   ค้นบทความและโปรเจกต์ที่ published
```

- header เพิ่มลิงก์ ค้นหา / Search ส่วนฟอร์มอยู่บนหน้า `/search` หน้าเดียว header จึงไม่มีช่องค้นหาและไม่ต้องใช้ JS
- ฟอร์มเป็น `<form role="search" method="get">` ที่มี `<input type="search" name="q" maxlength="100">`
- `q` ถูก trim แล้วตัดให้ไม่เกิน 100 ตัวอักษร ถ้าเหลือไม่ถึง 2 ตัวอักษร ให้แสดงฟอร์มกับข้อความแนะนำโดยไม่ query
- ผลลัพธ์แสดงโปรเจกต์ไม่เกิน 10 รายการ ต่อด้วยบทความไม่เกิน 20 รายการ ไม่มีการแบ่งหน้า
- บทความใช้ `post-card.ejs` เดิม การ์ดของอีกภาษาได้ badge และ `lang` แบบเดียวกับหน้า list
- หน้า search ส่ง `meta.noindex = true` ให้ `head.ejs` ใส่ `<meta name="robots" content="noindex">` และไม่มี canonical หรือ hreflang
- ลิงก์สลับภาษาบนหน้า search พก `q` ไปด้วย เช่น `/en/search?q=docker`
- `q` แสดงกลับบนหน้าด้วย `<%= %>` เท่านั้น

```js
const like = q => '%' + q.replace(/[!%_]/g, '!$&') + '%';
```

```sql
SELECT t.post_id, t.lang, t.slug, t.title, t.excerpt, t.published_at, p.cover_image
FROM post_translations t
JOIN posts p ON p.id = t.post_id
WHERE t.status = 'published'
  AND (t.lang = $lang OR NOT EXISTS (
        SELECT 1 FROM post_translations x
        WHERE x.post_id = t.post_id AND x.lang = $lang AND x.status = 'published'))
  AND EXISTS (
        SELECT 1 FROM post_translations m
        WHERE m.post_id = t.post_id AND m.status = 'published'
          AND (m.title LIKE $q ESCAPE '!' OR m.excerpt LIKE $q ESCAPE '!' OR m.body_markdown LIKE $q ESCAPE '!'))
ORDER BY EXISTS (
        SELECT 1 FROM post_translations m
        WHERE m.post_id = t.post_id AND m.status = 'published' AND m.title LIKE $q ESCAPE '!') DESC,
      t.published_at DESC
LIMIT 20
```

- แถวที่แสดงเลือกด้วยกติกา fallback เดียวกับหน้า list แต่คำค้น match กับทุกฉบับที่ published คำที่มีแค่ในฉบับไทยจึงยังเจอบนหน้า `/en`
- บทความที่ชื่อเรื่องตรงกับคำค้นขึ้นก่อน ที่เหลือเรียงตามวันที่เผยแพร่
- `ESCAPE '!'` ทำให้ `%` และ `_` ที่ผู้อ่านพิมพ์กลายเป็นตัวอักษรธรรมดา
- `LIKE` ไม่สนตัวพิมพ์เล็กใหญ่เฉพาะตัวอักษรอังกฤษ ซึ่งพอสำหรับเว็บนี้เพราะภาษาไทยไม่มีตัวพิมพ์ใหญ่
- โปรเจกต์ใช้ query รูปเดียวกันกับ `project_translations` โดย match `title`, `summary` และ `body_markdown` จำกัด 10 รายการ และเรียงแบบเดียวกับหน้าโปรเจกต์
- query ของบทความทดสอบกับ sqlite3 6.0.1 แล้ว 7 เคส ได้แก่ คำไทยกลางประโยค, match ข้ามภาษา, `%` กับ `_`, ตัวพิมพ์ใหญ่, ชื่อเรื่องขึ้นก่อน และ draft ที่ต้องไม่หลุด

### 4.2 Cookie, consent และหน้า privacy

#### cookie ทั้งหมดของเว็บ

```
ชื่อ                  ตั้งโดย    อายุ        ใช้ทำอะไร                                    ประเภท
ta_admin              server    30 วัน      login ของ admin ส่งเฉพาะ path /admin          จำเป็น
lang                  server    1 ปี        จำภาษาล่าสุดที่อ่าน ใช้ตอนเข้า /                  จำเป็นต่อการทำงาน
consent               browser   180 วัน     จำว่าผู้อ่านยอมรับหรือปฏิเสธ cookie สถิติ          จำเป็น
_ga และ _ga_*         Google    2 ปี        สถิติผู้เข้าชม มีเฉพาะหลังผู้อ่านกดยอมรับ           สถิติ ต้องได้รับความยินยอม
theme (localStorage)  browser   ไม่หมดอายุ   จำธีมสว่างหรือมืด ไม่ถูกส่งไป server             จำเป็นต่อการทำงาน
```

- ตารางนี้คือเนื้อหาหลักของหน้า privacy ถ้าเพิ่ม cookie ใหม่ต้องแก้ตารางนี้กับ `strings.js` ด้วย
- การแบ่งประเภทข้างบนเป็นการตีความทางเทคนิค ไม่ใช่คำแนะนำทางกฎหมาย ถ้าวันหน้าเว็บเก็บข้อมูลส่วนบุคคลมากขึ้น ควรให้ผู้รู้ PDPA ตรวจหน้า privacy

#### cookie-parser ระดับ app

- app ใช้ `cookieParser(process.env.SESSION_SECRET)` ตัวเดียวระดับ app แทนตัวที่เคยอยู่บน admin router
- admin อ่าน `req.signedCookies` ส่วน `lang` กับ `consent` อ่านจาก `req.cookies`

#### cookie จำภาษา

```js
// ใน middleware ของ /th และ /en ก่อน public router
if (req.cookies.lang !== lang) {
  res.cookie('lang', lang, { maxAge: 365 * 864e5, sameSite: 'lax', httpOnly: true,
                            secure: process.env.NODE_ENV === 'production', path: '/' });
}
```

- ตั้ง cookie เฉพาะตอนที่ค่าเดิมไม่ตรงกับหน้าปัจจุบัน response ส่วนใหญ่จึงไม่มี `Set-Cookie`
- `GET /` เลือกภาษาตามลำดับ cookie `lang`, Accept-Language แล้วค่อย `th` ค่า cookie ที่ไม่ใช่ `th` หรือ `en` ถูกเมิน
- `GET /` ตั้ง `Vary: Accept-Language, Cookie`
- กลไกนี้ทดสอบกับ Express 5.2.1 และ cookie-parser 1.4.7 แล้ว

#### แถบ consent และ Google Analytics

- public router ตั้ง `res.locals.publicPage = true`, `res.locals.consent = req.cookies.consent` และ `res.locals.gaId = process.env.GA_MEASUREMENT_ID || ''`
- template อ่านสามค่านี้ผ่าน `locals.publicPage`, `locals.consent` และ `locals.gaId` จึงไม่ต้องเพิ่มค่า default ระดับ app และหน้าใต้ `/admin` รวมถึง preview จะไม่มีแถบและไม่มี analytics เลย
- `partials/consent.ejs` ถูก include ท้าย `<body>` และ render แถบก็ต่อเมื่อ `locals.publicPage` เป็นจริง และ `locals.consent` ไม่ใช่ `granted` หรือ `denied` หน้าจอจึงไม่กะพริบ
- แถบวางชิดขอบล่างแบบไม่บังเนื้อหาและไม่เป็น modal
- ถ้ามี `gaId` แถบมีปุ่ม ยอมรับ กับ ปฏิเสธ ขนาดและน้ำหนักเท่ากัน พร้อมลิงก์ไปหน้า privacy
- ถ้าไม่มี `gaId` แถบบอกว่าเว็บใช้เฉพาะ cookie ที่จำเป็น และมีปุ่ม รับทราบ ปุ่มเดียว ซึ่งบันทึกเป็น `denied`
- หน้า public โหลด `<script src="/js/consent.js?v=<%= v %>" defer data-ga-id="<%= locals.gaId %>">`

`public/js/consent.js` ราว 25 บรรทัด ทำสี่อย่าง

1. ตอนโหลด ถ้า cookie `consent` เป็น `granted` และมี GA ID ให้เรียก `loadGa(id)`
2. กดปุ่มในแถบแล้วตั้ง `consent=granted` หรือ `denied` ด้วย `Max-Age=15552000; Path=/; SameSite=Lax` เพิ่ม `Secure` เมื่อหน้าเป็น https แล้วซ่อนแถบ ถ้ากดยอมรับให้เรียก `loadGa(id)` ทันทีโดยไม่ต้อง reload
3. `loadGa(id)` เพิ่ม script `https://www.googletagmanager.com/gtag/js?id=...` แล้วเรียก `gtag('config', id, { cookie_domain: 'none' })`
4. ปุ่ม ตั้งค่า cookie ใหม่ บนหน้า privacy ลบ cookie `consent`, `_ga` และทุกตัวที่ขึ้นต้นด้วย `_ga_` แล้ว reload เพื่อให้แถบกลับมา

- `cookie_domain: 'none'` ทำให้ cookie ของ GA ผูกกับ host ปัจจุบันตรงๆ ข้อ 4 จึงลบได้ด้วย `Path=/` โดยไม่ต้องเดา domain
- ไม่มี inline script ทุกอย่างอยู่ในไฟล์ static

#### หน้า privacy

- `GET /:lang/privacy` render `privacy.ejs`
- หน้านี้มีตาราง cookie จาก `strings.js`, ข้อความ `privacy_body` ที่เจ้าของเขียนเองใน admin settings เช่น ผู้ควบคุมข้อมูลและวิธีติดต่อ, อีเมลจาก settings `email` และปุ่มตั้งค่า cookie ใหม่
- แถว `_ga` ในตารางแสดงเฉพาะเมื่อมี `GA_MEASUREMENT_ID`
- footer ทุกหน้า public มีลิงก์ไปหน้า privacy

### 4.3 ออกจากระบบทุกเครื่อง

- settings เพิ่ม key `session_epoch` ที่ `lang = '*'` ถ้ายังไม่มี row ให้ถือว่าเป็น `'0'`
- ค่าใน cookie `ta_admin` เปลี่ยนเป็น `เวลาหมดอายุ:epoch` ตามโค้ดในข้อ 2.4
- `sessionEpoch()` คือ `SELECT value FROM settings WHERE key = 'session_epoch' AND lang = '*'` แล้วคืน `'0'` ถ้าไม่มี row
- `POST /admin/login` ที่รหัสถูกต้องอ่าน epoch ปัจจุบันแล้วเรียก `issue(res, epoch)`
- `POST /admin/sessions/revoke` เพิ่ม epoch ทีละ 1 แล้ว `clearCookie('ta_admin', COOKIE)` และ 303 ไป `/admin/login`
- cookie ทุกใบที่ออกไปก่อนหน้าใช้ไม่ได้ทันที รวมถึงของเครื่องที่กดเอง
- ปุ่ม ออกจากระบบทุกเครื่อง อยู่ท้ายหน้า admin settings พร้อม `confirm()`
- Express 5 ส่ง error จาก async middleware ต่อให้ error handler เอง จึงไม่ต้องห่อ try/catch
- การเปลี่ยน `SESSION_SECRET` ยังตัดทุก session ได้เหมือนเดิม
- กลไกนี้ทดสอบกับ Express 5.2.1 และ cookie-parser 1.4.7 แล้ว ทั้งการปฏิเสธ cookie เก่าหลัง revoke และการ login ใหม่

### 4.4 CI

```yaml
# .github/workflows/ci.yml
name: ci
on:
  push:
    branches: [main]
  pull_request:
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm test
      - name: unescaped EJS only for md.render and include
        run: |
          if grep -rn "<%-" views/ | grep -v -e "md.render(" -e "include("; then
            echo "found <%- outside md.render or include"
            exit 1
          fi
```

- ใช้ `actions/checkout@v7` และ `actions/setup-node@v7` ซึ่งเป็น major ล่าสุด ตรวจเมื่อ 2026-09-13 แล้วว่า setup-node v7 ยังรับ `node-version` และ `cache` ตามเดิม
- ขั้นตรวจ `<%-` ย้ายมาจาก manual checklist เพราะเป็นความเสี่ยง XSS อันดับต้นๆ และเครื่องตรวจแทนได้ สคริปต์นี้ทดสอบแล้วทั้งแบบ `bash -e` และ `bash -eo pipefail` ว่าผ่านเมื่อ template ปลอดภัยและ fail เมื่อมี `<%-` ที่ไม่ใช่ `md.render` หรือ `include`
- รันบน `ubuntu-latest` อย่างเดียว เพราะ server จริงเป็น Linux ส่วนบน Windows เจ้าของรัน `npm test` เองก่อน push
- ไม่ต้องตั้ง secret ใดๆ เพราะ test ไม่อ่าน `.env`
- `npm ci` ต้องใช้ `package-lock.json` ที่ commit ไว้ ซึ่ง `.gitignore` ไม่ได้กันไฟล์นี้
- ไม่มี CD เพราะยังไม่ได้เลือก host ดูภาคผนวก ข
- CI ทำงานเมื่อ repo อยู่บน GitHub แล้ว ในเครื่องมี `gh` ที่ login ไว้แล้ว การสร้าง repo อยู่ใน Phase 0

## ภาคผนวก ก: สิ่งที่ตั้งใจไม่สร้าง

รายการนี้คือบันทึก YAGNI ถ้าจะเพิ่มข้อไหนกลับเข้ามา ต้องมีเหตุผลใหม่ที่ไม่มีตอนออกแบบ

1. ระบบ chat, socket.io, payment และ Stripe ในแอปที่ใช้งานจริง: ย้ายไป archive/ ตามที่ล็อกไว้แล้ว
2. ตาราง admin_users และสคริปต์ create-admin: ผู้ใช้มีคนเดียว credentials ใน .env จึงพอ และ reset รหัสผ่านด้วยการแก้ .env
3. express-session, connect-sqlite3 และ JWT: เก็บค่าจริงเท็จค่าเดียวของคนคนเดียว signed cookie จึงพอ
4. เอา password hash ไปต่อท้าย signing key และ assert env ตอน boot: ถ้าไม่มี SESSION_SECRET แอปก็ fail ให้เห็นเองอยู่แล้ว
5. CSRF token, Origin check middleware และ SITE_ORIGIN: SameSite=Lax กับ POST-only กันได้ครบ ส่วน subdomain ที่ต้องกันก็ไม่มี
6. In-memory login throttle และ trust proxy: นับครั้งหลัง bcrypt ทำงานไปแล้วจึงกัน burst ไม่ได้ และยังผูกกับ proxy ที่ยังไม่ได้เลือก
7. Draft preview ที่ URL จริงผ่าน isAdmin: ใช้ formaction preview แทน ซึ่งเล็กกว่า ไม่ publish ส่วนที่แก้ออกไป และไม่สร้างโพสต์ซ้ำ
8. Cache-Control no-store บนหน้า admin: ทำให้ bfcache กู้ข้อความใน textarea กลับมาไม่ได้
9. Dashboard ที่ /admin, filter ?status=, reorder route แบบปุ่มขึ้นลง, flash package, method-override และ ?next=
10. Thai slug ใน URL, library transliteration, JS ช่วยเดา slug ฝั่ง client และ .normalize('NFC'): ใช้ ASCII toSlug ฝั่ง server ตัวเดียวแทน
11. Helpful 404 ที่ค้นหาฉบับอีกภาษา: ไม่มีลิงก์ภายในเว็บพามาถึง URL นั้นอยู่แล้ว
12. 302 redirect เมื่อเข้า URL ผิดภาษา: ใช้ slug ข้ามภาษาหาเจ้าของไม่ได้แน่นอน จึงตอบ 404 แทน
13. Pagination แบบ path /blog/page/N, COUNT query และ 301 จาก page 1: ใช้ ?page=N กับ LIMIT 11
14. hreflang x-default: เป็น optional และถ้าวางบนหน้า post จะไม่ reciprocal
15. หน้า 404.ejs กับ 500.ejs แยกกัน: รวมเป็น error.ejs ไฟล์เดียว
16. markdown-it-anchor, TOC อัตโนมัติ, ป้าย data-lang และ custom pre wrapper
17. linkify: linkify-it ดูดตัวอักษรไทยที่ติดท้าย URL เข้าไปในลิงก์
18. raw HTML ใน markdown, DOMPurify และ jsdom: เปิด html:false ไว้ก็ปลอดภัยโดยไม่ต้องมี sanitizer
19. Shiki และ highlighter ฝั่ง client
20. รายการภาษาและ alias ของ highlight.js ที่เขียนเอง: lib/common มีให้แล้ว 36 ภาษา
21. sharp, file-type, disk storage แบบ .tmp/rename และ CSP header บน /uploads: nosniff กับ magic bytes ก็พอ
22. รับ SVG upload
23. โค้ดลบรูปกำพร้าและ route ตรวจสิทธิ์ก่อนดูรูป
24. loading=lazy ในรูปที่อยู่ใน markdown body: ไม่มีขนาดรูป จึงทำให้ layout shift หนักขึ้น
25. JetBrains Mono แบบ self-host: subset ของ Google ไม่มีตัว box-drawing ใช้ system mono แทน
26. @supports fallback ของ light-dark(): สมมติฐานผิด และตัวมันเองมี bug เรื่อง color-scheme
27. prefers-reduced-motion block: เว็บไม่มี animation ให้ลด
28. แยก prose.css: รวมเข้า site.css เพื่อไม่ต้องให้ทุก route ส่ง flag
29. script check:css และ test L4: ไฟล์เขียนใหม่ทั้งหมด และมี git ช่วยป้องกันแล้ว
30. CSS ที่ซ้ำกับ default ของ browser เช่น text-align start, hyphens none, white-space pre ใน code
31. เวลาอ่าน: ภาษาไทยนับคำไม่ได้
32. Hamburger menu, ไอคอนธีมที่เปลี่ยนตามสถานะ และธีม 3 สถานะ
33. Settings แบบมี tab และสถานะ: ใช้ input ธรรมดา
34. Preview ของหน้า About: About เป็นหน้า public เสมอ บันทึกแล้วเข้าไปดูได้เลย
35. ปุ่ม preview ในหน้า editor แบบ live side-by-side ที่ fetch ทุก 400ms: ใช้ formaction preview แทน
36. Generic helper สำหรับ entity ที่มีหลายภาษา: posts กับ projects มีแค่สองที่และต่างกันพอสมควร
37. supertest, jsdom, Playwright, E1 test ที่ไล่ router.stack และ backlog Tier 2 ที่มี 40 tests
38. ใช้ :memory: เป็น test DB: ขัดกับที่ DATA_DIR เป็น directory จึงใช้ mkdtemp แทน
39. Demo seed script: จะเอาโพสต์ปลอมไปใส่ production
40. dotenv, nodemon และ uuid: Node มีของเหล่านี้ในตัวแล้ว
41. cors: ลบในฐานะ config ที่ไม่ได้ใช้ ไม่ใช่เพราะเป็นช่องโหว่ เพราะ credentials:false อยู่แล้ว
42. เล็งไว้ที่ Node 20: EOL ไปแล้วเมื่อ 2026-04-30
43. robots.txt, sitemap.xml และ RSS (ย้ายไปอยู่ใน ภาคผนวก ข)
44. helmet และ migration tool: ตอนนี้มีแค่ schema.sql แบบ CREATE IF NOT EXISTS ถ้าจะแก้ schema ทีหลังให้เขียน ALTER เอง
45. ลิงก์จากชิปแท็กในหน้าโปรเจกต์: หน้า tag แสดงเฉพาะโพสต์
46. script ตรวจขนาด repo ใน Phase 0: brand-mockup.png ย้ายไป archive โดยไม่ต้องตัดสินใจอะไรเพิ่ม
47. FTS5, การไฮไลต์คำค้น, คำแนะนำระหว่างพิมพ์ และช่องค้นหาใน header: `LIKE` กับหน้า `/search` หน้าเดียวพอสำหรับเว็บขนาดนี้
48. Google Consent Mode, การแบ่ง cookie หลายหมวดให้ติ๊กเลือก และการเก็บประวัติการยินยอมลง DB: มี analytics ตัวเดียว ปุ่มยอมรับกับปฏิเสธจึงพอ
49. CI บน Windows และ CD: server เป็น Linux และยังไม่ได้เลือก host

## ภาคผนวก ข: ส่วนเสริมที่เปิดได้ถ้าเจ้าของต้องการ

ไม่มีข้อไหนอยู่ใน scope ตอนนี้ แต่ละข้อบอกต้นทุนไว้แล้ว

1. Live markdown preview ข้างๆ textarea: JS ประมาณ 15 บรรทัดกับ endpoint 3 บรรทัด และต้องโหลด site.css ในหน้า admin
2. RSS แยกภาษา (/th/rss.xml, /en/rss.xml): ประมาณ 35 บรรทัด ต้องแปลง URL รูปใน HTML ให้เป็น absolute และจัดรูปแบบวันที่ RFC-822
3. sitemap.xml ที่มี hreflang: ประมาณ 40 บรรทัด คุ้มเมื่อเว็บมีเกิน 100 URL หรือ Search Console เริ่มฟ้องว่าหาหน้าไม่เจอ
4. Heading anchors ด้วย markdown-it-anchor: เพิ่ม dependency หนึ่งตัวกับ md.use หนึ่งบรรทัด และต้องใส่ prefix 'h-' ไม่ต้อง migrate เพราะ render ใหม่ทุก request
5. YouTube embed ผ่าน syntax @youtube[ID]: markdown-it rule ประมาณ 6 บรรทัด ใช้ iframe template ตายตัว ไม่ต้องเปิด raw HTML
6. ย้ายเข้า scope แล้ว: cookie จำภาษาอยู่ในข้อ 4.2
7. ปุ่ม copy code: JS ประมาณ 10 บรรทัด
8. ธีม 3 สถานะ (light, dark, system) หรือไอคอนพระอาทิตย์กับพระจันทร์ที่เปลี่ยนตามธีม: ประมาณ 6 บรรทัด
9. twitter:card แบบ summary_large_image หนึ่งบรรทัด และ JSON-LD Article ประมาณ 12 บรรทัด
10. image-size สำหรับใส่ width และ height ลดการกระตุกของ layout: dependency 378KB และต้องเพิ่มคอลัมน์ใน schema
11. Login throttle ที่นับตั้งแต่ request เข้ามา: ประมาณ 15 บรรทัด และต้องตั้ง trust proxy ให้ตรงกับ host ที่ใช้ ทำเมื่อ log เริ่มเห็นการ brute force
12. robots.txt: ไฟล์ static 3 บรรทัด
13. ลิงก์โพสต์ก่อนหน้าและถัดไปในหน้าบทความ: query 2 ตัวกับ partial 1 ไฟล์
14. Anuphan subset latin-ext: เพิ่ม @font-face หนึ่งอันกับไฟล์ประมาณ 30KB ถ้าจะเขียนชื่อที่มีตัวอักษรเน้นเสียงบ่อย
15. FTS5 แบบ trigram สำหรับ search: เพิ่ม virtual table กับ trigger ให้ข้อมูลตรงกัน คุ้มเมื่อโพสต์เกินหลายพันและ search เริ่มช้ากว่า 200 ms
16. CD ที่ deploy ให้เองหลัง CI ผ่าน: ทำได้หลังเลือก host แล้ว
17. Dependabot สำหรับ npm และ GitHub Actions: ไฟล์ config ราว 12 บรรทัด

## ภาคผนวก ค: ความเสี่ยงหลัก

1. รูปและ DB หายถาวร: ถ้า DATA_DIR ไม่ได้อยู่บน persistent disk หรือไม่มีใครตั้ง backup รายคืน ทุกอย่างจะหายเพราะ git ไม่ได้เก็บทั้งสองอย่าง และหน้าเว็บยัง render ได้ตามปกติจึงสังเกตยาก
2. XSS กลับมาได้ด้วย <%- เพียงตัวเดียว: ถ้า template ไหนใช้ <%- กับ title, excerpt, alt หรือชื่อแท็ก การตั้ง html:false จะไม่มีผลเลย ต้องรัน grep ตาม checklist ก่อน launch
3. SameSite=Lax เป็นด่านเดียวที่กัน CSRF: ถ้าวันหน้าเพิ่มระบบ comment, HTML จากผู้ใช้ หรือ subdomain ที่คนอื่นควบคุมได้ ต้องกลับมาทบทวนเรื่องนี้ใหม่
4. ไม่มี revision history: ถ้าตั้งสถานะภาษาเป็น none แล้วบันทึก ข้อความของภาษานั้นจะหายถาวร มีแค่ confirm ของ browser กันไว้ชั้นเดียว
5. เปลี่ยน slug ของบทความที่เผยแพร่แล้วทำให้ลิงก์ที่แชร์ไปแล้ว เช่นใน LINE ใช้ไม่ได้ตลอดไป เพราะไม่มี redirect table
6. sqlite3 เป็น native module: ตอนย้ายไป Node 24 ทั้งบน Windows และ server ต้องดาวน์โหลด prebuilt binary ให้ได้ ถ้าไม่ได้ต้องมี build tools ไม่อย่างนั้นแอปจะ boot ไม่ขึ้น
7. ถ้าตั้ง SITE_URL ผิด canonical, hreflang และ og:url จะผิดทั้งหมดโดยที่หน้าเว็บดูปกติ จะเห็นปัญหาก็ต่อเมื่อไปดูใน Search Console หรือ preview ของ LINE
8. ต้องตั้ง NODE_ENV=production บน server ถ้าลืม cookie ของ admin จะถูกส่งโดยไม่มี flag Secure
9. Login ไม่มี throttle: bcrypt ทำให้ event loop หน่วงประมาณ 90ms ต่อครั้ง ถ้ามีคนยิง login จำนวนมากพร้อมกันเว็บจะช้าลง ยอมรับความเสี่ยงนี้สำหรับเว็บส่วนตัว และมี throttle ไว้เป็น opt-in
10. Session ถอนเฉพาะบางเครื่องไม่ได้: ปุ่มออกจากระบบทุกเครื่องตัดทุก session พร้อมกัน รวมถึงเครื่องที่กดเอง (ข้อ 4.3)
11. หน้า /en จะมีการ์ดภาษาไทยปนอยู่ช่วงที่ยังไม่ได้แปล การเลือกแบบนี้ตั้งใจให้ blog ภาษาอังกฤษไม่ว่าง แต่ถ้าเจ้าของอยากให้ /en มีแต่ภาษาอังกฤษล้วน ต้องแก้ query ในหน้า list และ test ข้อ 3
12. เมื่อ Node 24 LTS หมดอายุในเดือนเมษายน 2028 ต้องย้ายเวอร์ชันอีกรอบ
13. Google Analytics ส่งข้อมูลการเข้าชมไปประมวลผลนอกประเทศ หน้า privacy ต้องบอกเรื่องนี้ และถ้าวันหน้าจะเก็บข้อมูลส่วนบุคคลมากขึ้น ควรให้ผู้รู้ PDPA ตรวจ
14. search สแกนทุกแถวด้วย `LIKE` ทดสอบแล้วว่า 1,000 โพสต์ใช้ 33 ms ถ้าเว็บโตถึงหลายพันโพสต์ให้ย้ายไป FTS5 trigram ตามภาคผนวก ข
