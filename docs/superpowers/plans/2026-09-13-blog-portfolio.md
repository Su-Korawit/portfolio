# Dev Portfolio และ Tech Blog สองภาษา Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** เปลี่ยน TalkAlways จาก chat MVP เป็น dev portfolio และ tech blog สองภาษา พร้อมหน้า admin, search, cookie consent และ CI

**Architecture:** Express 5 render ทุกหน้าด้วย EJS จากฝั่ง server ข้อมูลอยู่ใน SQLite ไฟล์เดียวใต้ `DATA_DIR` เนื้อหาที่แปลได้อยู่ในตาราง translations ซึ่งมีสถานะเผยแพร่แยกตามภาษา ไม่มี build step และ JavaScript ฝั่ง browser มีแค่สามไฟล์เล็ก

**Tech Stack:** Node.js 24, Express 5.2, EJS 6, sqlite3 6, markdown-it 15, highlight.js 11, multer 2, cookie-parser 1.4, bcryptjs 3, node:test, GitHub Actions

**Spec:** `docs/superpowers/specs/2026-09-13-blog-portfolio-design.md`

## Global Constraints

- Runtime: Node.js 24 LTS และ `package.json` มี `"engines": { "node": ">=24" }`
- Module system: CommonJS ทั้งหมด (`require` และ `module.exports`)
- dependencies มีแค่ `express ^5.2.1`, `sqlite3 ^6.0.1`, `bcryptjs ^3.0.3`, `ejs ^6.0.1`, `markdown-it ^15.0.2`, `highlight.js ^11.12.0`, `multer ^2.3.0`, `cookie-parser ^1.4.7`
- ไม่มี `devDependencies` และต้องลบ `socket.io`, `stripe`, `cors`, `uuid`, `dotenv`, `nodemon`
- scripts: `"start": "node --env-file-if-exists=.env server.js"`, `"dev": "node --watch --env-file-if-exists=.env server.js"`, `"test": "node --test test/*.test.js"`
- Test ใช้ `node:test`, `node:assert/strict`, global `fetch` และ `app.listen(0)` ห้ามใช้ supertest, jsdom หรือ Playwright
- Launch gate คือ test 17 ไฟล์ตามเลข 1 ถึง 17 ใน spec ข้อ 3.4 และส่วนที่ 4 แต่ละไฟล์มี `test()` ระดับบนสุดตัวเดียว `npm test` จึงต้องรายงาน 17 tests
- ภาษามีแค่ `th` กับ `en` และค่า default คือ `th`
- slug ใช้ได้เฉพาะ `[a-z0-9-]`
- เวลาที่เก็บลง DB เป็น ISO-8601 UTC จาก `new Date().toISOString()`
- วันที่ที่แสดงบนหน้าใช้ `Intl.DateTimeFormat` พร้อม `{ dateStyle: 'medium', timeZone: 'Asia/Bangkok' }` และส่ง `new Date(...)` ให้ `format` เสมอ
- `DATA_DIR` default คือ `data` resolve จาก root ของโปรเจกต์ DB อยู่ที่ `DATA_DIR/site.db` รูปอยู่ที่ `DATA_DIR/uploads` และห้ามเปิด `data/talkalways.db`
- EJS ใช้ `<%-` ได้เฉพาะกับ `md.render(...)` และ `include(...)`
- markdown-it ใช้ `html: false`, `linkify: false`, `breaks: false`
- ทุก mutation เป็น POST ใต้ `/admin` และ cookie ของ admin เป็น `SameSite=Lax` โดยไม่มี CSRF token
- หน้า admin เป็นภาษาไทยอย่างเดียว
- custom property ทุกตัวประกาศใน `:root` block เดียวที่หัว `public/css/site.css` และห้ามเขียน `var(--x, fallback)`
- ไม่มี build step และ JavaScript ฝั่ง browser มีแค่ `public/js/theme.js`, `public/js/admin.js`, `public/js/consent.js`
- environment variables: `PORT`, `NODE_ENV`, `DATA_DIR`, `SITE_URL`, `SESSION_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `GA_MEASUREMENT_ID`
- บน Windows test ต้องรอ `close()` ของ DB เสร็จก่อนลบ `DATA_DIR`
- ห้ามแก้อะไรใน `archive/` หลัง Task 2
- commit message ใช้รูปแบบ `feat:`, `fix:`, `test:`, `chore:`, `ci:`, `docs:` และระบุไฟล์ที่ add ทีละไฟล์

## File Structure

```
.github/workflows/ci.yml        CI รัน npm ci, npm test และตรวจ <%-                     Task 7
.env.example                    ตัวอย่าง env ทุกตัว                                       Task 4, 8, 19
package.json                    dependencies, scripts, engines                         Task 4
server.js                       รอ db.ready แล้ว listen PORT                            Task 5
archive/                        MVP เดิมทั้งหมด ย้ายด้วย git mv                          Task 2
archive/README.md               เหตุผลที่เก็บโค้ดเดิมไว้                                   Task 2
scripts/hash-password.js        พิมพ์ bcrypt hash cost 12                               Task 8
scripts/backup.sh               VACUUM INTO, tar uploads, rclone                        Task 20
src/app.js                      สร้าง express app, app.locals, ลำดับ middleware          Task 5 แล้วเพิ่มใน 8, 15, 18, 19
src/db.js                       เปิด DB, PRAGMA, schema, run/get/all/transaction        Task 5
src/schema.sql                  CREATE TABLE IF NOT EXISTS 8 ตาราง                      Task 5
src/markdown.js                 markdown-it กับ highlight.js lib/common และ dockerfile   Task 4
src/slug.js                     toSlug, hasThai, resolveSlugs                          Task 10
src/strings.js                  ข้อความ UI สาธารณะ th และ en                             Task 5 แล้วเพิ่มในแต่ละ task
src/routes/public.js            ทุก route ใต้ /th และ /en                                Task 5 แล้วเพิ่มใน 9, 12, 14, 16, 17, 19
src/routes/admin.js             login, logout, guard, epoch, revoke, tags, settings, upload   Task 8 แล้วเพิ่มใน 14, 15, 16
src/routes/admin-posts.js       รายการ, editor, บันทึก, ลบ, preview ของบทความ             Task 10, 11
src/routes/admin-projects.js    รายการ, editor, บันทึก, ลบ, preview ของโปรเจกต์            Task 13
views/partials/head.ejs         <head> และ SEO meta จาก meta.*                          Task 5 แล้วเพิ่มใน 9, 17, 19
views/partials/header.ejs       ชื่อเว็บ, nav, ลิงก์สลับภาษา, ปุ่มธีม                     Task 5 แล้วเพิ่มใน 17
views/partials/footer.ejs       social links, ลิงก์ privacy, ©                           Task 5 แล้วเพิ่มใน 16, 19
views/partials/post-card.ejs    การ์ดบทความ ใช้ใน home, blog, tag, search               Task 9
views/partials/consent.ejs      แถบ cookie                                             Task 19
views/home.ejs                  tagline, featured projects, บทความล่าสุด                 Task 5 แล้วเพิ่มใน 9, 12
views/blog.ejs                  รายการบทความและหน้าแท็ก                                 Task 9 แล้วเพิ่มใน 14
views/post.ejs                  บทความและ preview                                      Task 9, 11
views/projects.ejs              รายการโปรเจกต์                                          Task 12
views/project.ejs               รายละเอียดโปรเจกต์                                      Task 12
views/about.ejs                 หน้า About                                             Task 16
views/search.ejs                หน้าค้นหา                                              Task 17
views/privacy.ejs               ตาราง cookie และนโยบาย                                  Task 19
views/error.ejs                 หน้า 404 และ error                                     Task 5
views/admin/head.ejs            ส่วนหัวของหน้า admin                                     Task 8
views/admin/foot.ejs            ส่วนท้ายของหน้า admin                                    Task 8
views/admin/login.ejs           ฟอร์ม login                                            Task 8
views/admin/posts.ejs           รายการบทความพร้อม chip สถานะ                             Task 8 แล้วเพิ่มใน 10
views/admin/post-edit.ejs       editor บทความสองภาษา                                    Task 10 แล้วเพิ่มใน 15
views/admin/projects.ejs        รายการโปรเจกต์                                          Task 13
views/admin/project-edit.ejs    editor โปรเจกต์สองภาษา                                   Task 13 แล้วเพิ่มใน 15
views/admin/tags.ejs            จัดการแท็ก                                              Task 14
views/admin/settings.ejs        settings, About, privacy, ปุ่มออกจากระบบทุกเครื่อง          Task 16 แล้วเพิ่มใน 19
public/css/site.css             tokens, ฟอนต์, layout, components, prose, code         Task 6 แล้วเพิ่มในทุก task ที่มี view ใหม่
public/css/admin.css            layout ของ editor, chip, แถบ preview                    Task 8 แล้วเพิ่มใน 10
public/fonts/anuphan-latin.woff2, anuphan-thai.woff2   ฟอนต์ self-host                  Task 6
public/js/theme.js              ปุ่มสลับธีม                                            Task 6
public/js/admin.js              upload และแทรกรูป                                      Task 15
public/js/consent.js            แถบ cookie และโหลด Google Analytics                     Task 19
public/favicon.svg              favicon placeholder                                    Task 6
test/helpers.js                 DATA_DIR ชั่วคราว, start, req, login, insert*, signCookie   Task 5 แล้วเพิ่มใน 8, 9, 12, 14
test/01-markdown.test.js ... test/17-consent-privacy.test.js   launch gate 17 ไฟล์     ตามตารางใน Task Index
```

## Interfaces

ชื่อทั้งหมดในหัวข้อนี้ทุก task ต้องใช้ตรงตัว

### `src/db.js`

```js
const { db, ready, run, get, all, transaction, close, DATA_DIR, UPLOAD_DIR } = require('./db');
```

- `DATA_DIR`: `path.resolve(__dirname, '..', process.env.DATA_DIR || 'data')` ค่า absolute ที่ส่งมาจะถูกใช้ตรงๆ
- `UPLOAD_DIR`: `path.join(DATA_DIR, 'uploads')` ถูกสร้างด้วย `fs.mkdirSync(UPLOAD_DIR, { recursive: true })` ก่อนเปิด DB
- `db`: `sqlite3.Database` ของ `path.join(DATA_DIR, 'site.db')`
- `ready`: `Promise<void>` resolve หลังรัน `PRAGMA foreign_keys = ON`, `PRAGMA journal_mode = WAL` และ `schema.sql` เสร็จ
- `run(sql, params = []) -> Promise<{ lastID: number, changes: number }>`
- `get(sql, params = []) -> Promise<object | undefined>`
- `all(sql, params = []) -> Promise<object[]>`
- `transaction(fn) -> Promise<T>` รัน `BEGIN IMMEDIATE` แล้ว `await fn()` แล้ว `COMMIT` ถ้า throw จะ `ROLLBACK` แล้ว throw ต่อ
- `close() -> Promise<void>`
- `params` เป็น array หรือ object ที่ key ขึ้นต้นด้วย `$` ก็ได้

### `src/markdown.js`

- `module.exports = md` เป็น instance ของ `MarkdownIt` ใช้ `md.render(src)` ได้ string HTML

### `src/slug.js`

- `toSlug(s) -> string`
- `hasThai(s) -> boolean`
- `resolveSlugs(input) -> { th: string, en: string }` โดย `input` คือ `{ th: { status, slug, title }, en: { status, slug, title } }` ภาษาที่ status เป็น `'none'` ได้ `''` ลำดับการหาตาม spec ข้อ 2.3 ภาษาที่หาไม่ได้ก็ได้ `''` แล้วผู้เรียกแสดง error

### `src/strings.js`

- `module.exports = { th: {...}, en: {...} }` สอง object ต้องมี key ชุดเดียวกันเสมอ task ไหนเพิ่มข้อความต้องเพิ่มทั้งสองภาษา

### `src/app.js`

- `module.exports = app` คือ express app ที่ยังไม่ listen
- `app.locals.v`: string สำหรับ cache busting จาก `Date.now().toString(36)`
- `app.locals.md`: instance จาก `src/markdown.js`
- `app.locals.siteUrl`: `SITE_URL` ที่ตัด `/` ท้ายแล้ว ค่า default `''`
- `app.locals.formatDate(lang, iso) -> string`
- ลำดับ middleware ใน state สุดท้าย
  1. default locals: `lang = 'th'`, `other = 'en'`, `t = strings.th`, `settings = {}`, `meta = {}`
  2. `cookieParser(process.env.SESSION_SECRET)`
  3. `GET /` redirect ตาม cookie `lang`, Accept-Language แล้วค่อย `th`
  4. `express.static(public, { index: false, maxAge: '30d' })`
  5. `/uploads` เป็น static ของ `UPLOAD_DIR` พร้อม `X-Content-Type-Options: nosniff`, `maxAge: '365d'`, `immutable: true`
  6. `/th` และ `/en`: middleware ตั้ง `lang`, `other`, `t` แล้วต่อ `require('./routes/public')`
  7. `/admin`: `require('./routes/admin')`
  8. 404: `res.status(404).render('error', { status: 404 })`
  9. error handler: ถ้า `res.headersSent` ให้ `next(err)` ไม่อย่างนั้น `res.status(err.status || 500).render('error', { status: err.status || 500 })`

### locals และ view

- `settings`: object ที่ key คือชื่อ setting ค่าคือ string โหลดโดย `loadSettings(lang)` ใน `src/routes/public.js` ซึ่ง query `WHERE lang IN (?, '*')`
- `meta`: `{ title, description, canonical, alternates: [{ lang, href }], image, noindex, type }` ทุก field optional และเป็น path ไม่ใช่ URL เต็ม `head.ejs` เป็นที่เดียวที่ต่อ `siteUrl`
- card row ของบทความ: `{ post_id, lang, slug, title, excerpt, published_at, cover_image }`
- `render('home', { featured, posts, meta })`
- `render('blog', { posts, page, hasNext, tag, meta })` ใช้ทั้งหน้า blog และหน้าแท็ก `tag` เป็น `null` บนหน้า blog
- `render('post', { post, tr, tags, alternates, preview, meta })`
- `render('projects', { projects, meta })`
- `render('project', { project, tr, tags, meta })`
- `render('about', { aboutLang, aboutBody, meta })`
- `render('search', { q, tooShort, projects, posts, meta })`
- `render('privacy', { meta })`
- `render('error', { status })`
- template อ่านค่าที่อาจไม่มีผ่าน `locals.x` เช่น `locals.publicPage`, `locals.consent`, `locals.gaId`

### `src/routes/admin.js`

- `module.exports = router`
- ชื่อภายใน: `COOKIE`, `MAX_AGE`, `issue(res, epoch)`, `sessionEpoch() -> Promise<string>`, `requireAdmin`
- หลัง `router.use(requireAdmin)` จะ mount `router.use('/posts', require('./admin-posts'))` และ `router.use('/projects', require('./admin-projects'))`

### `test/helpers.js`

```js
const { start, toForm, insertPost, insertProject, insertTag, signCookie, run, get, all } = require('./helpers');
```

- ตอน require ไฟล์นี้จะตั้ง `DATA_DIR` เป็น `fs.mkdtempSync(path.join(os.tmpdir(), 'site-test-'))` เสมอ แล้วตั้ง `SESSION_SECRET = 'test-secret'`, `SITE_URL = 'http://test.local'`, `ADMIN_USERNAME = 'admin'`, `ADMIN_PASSWORD_HASH = bcrypt.hashSync('pw', 4)`, `NODE_ENV = 'test'` ก่อน require app และห้ามเขียนทับ `GA_MEASUREMENT_ID`
- `start() -> Promise<H>` รอ `ready` แล้ว listen ที่ `127.0.0.1` port 0
- `H.base`: เช่น `'http://127.0.0.1:54321'`
- `H.req(path, opts = {}) -> Promise<{ status, location, headers, text, setCookie }>`
  - `opts`: `{ method = 'GET', form, body, headers = {}, cookie, jar = true }`
  - `form` เป็น object ถูกแปลงด้วย `toForm` แล้วส่งเป็น `application/x-www-form-urlencoded`
  - ใช้ `redirect: 'manual'` เสมอ
  - ถ้า `jar` เป็น true จะเก็บ cookie จาก `setCookie` ไว้ส่งใน request ถัดไป และลบ cookie ที่หมดอายุหรือค่าว่าง
  - `cookie` เป็น string ที่ต่อท้าย header `Cookie`
- `H.login(password = 'pw')` POST `{ username: 'admin', password }` ไป `/admin/login`
- `H.stop() -> Promise<void>` ปิด server แล้ว `await close()` แล้วลบ `DATA_DIR`
- `toForm(obj) -> URLSearchParams` แปลง object ซ้อนเป็น `a[b]` และ array เป็น key ซ้ำ
- `insertPost({ cover_image, th, en, tags }) -> Promise<number>` แต่ละภาษาคือ `{ status = 'published', slug, title, excerpt = '', body_markdown = '', cover_image_alt = '', seo_title = '', seo_description = '', published_at }` ถ้าไม่ส่ง `published_at` จะเป็นเวลาปัจจุบันเมื่อ published และเป็น `null` เมื่อเป็น draft
- `insertProject({ thumbnail, repo_url, demo_url, featured = 0, sort_order = 0, th, en, tags }) -> Promise<number>` แต่ละภาษาคือ `{ status = 'published', slug, title, summary = '', body_markdown = '', thumbnail_alt = '', published_at }`
- `insertTag({ slug, name_th, name_en }) -> Promise<number>`
- `signCookie(value, secret = 'test-secret') -> string` คืน `'s:' + value + '.' + signature` โดย signature เป็น base64 ของ HMAC-SHA256 ที่ตัด `=` ท้ายออก ยังไม่ URL-encode
- `run`, `get`, `all` ส่งต่อมาจาก `src/db.js`
- ไฟล์ test ทุกไฟล์มี `test('NN ชื่อ', async () => { ... })` ตัวเดียว เรียก `start()` ต้นไฟล์และ `stop()` ใน `finally`

## Task Index

```
Phase  Task  ชื่อ                                                            Gate tests
0      1     Node 24, snapshot DB เดิม, git init, commit แรก                   ตรวจด้วยมือ
0      2     ย้าย MVP เดิมไป archive/                                         ตรวจด้วยมือ
0      3     สร้าง repo บน GitHub แล้ว push                                    ตรวจด้วยมือ (เจ้าของเลือก public หรือ private)
1      4     dependencies และ markdown renderer                              01-markdown
1      5     DB, app skeleton, routing, หน้า error, test helpers              02-routing
1      6     CSS พื้นฐาน, ฟอนต์, ปุ่มธีม, favicon                                ตรวจด้วยมือ
1      7     GitHub Actions CI                                              ตรวจด้วยมือ
2      8     admin login, guard, epoch, revoke, สคริปต์ hash                   07-admin-guard, 08-login-cookie
3      9     หน้า blog สาธารณะ, การ์ด fallback, pagination, สลับภาษา, SEO       03-publish-per-language, 05-blog-hidden
3      10    รายการและ editor บทความ, บันทึก, ลบ, validation, slug, แท็ก        04-published-at, 06-delete-cascade, 09-editor-validation
3      11    preview บทความ                                                  10-preview
4      12    หน้าโปรเจกต์สาธารณะและ featured บนหน้าแรก                         12-project-order
4      13    editor โปรเจกต์ใน admin                                          ตรวจด้วยมือ
5      14    จัดการแท็กและหน้าแท็ก                                             13-tag-page
5      15    อัปโหลดรูปและ admin.js                                           11-upload
5      16    settings, หน้า About, ปุ่มออกจากระบบทุกเครื่อง                     14-settings-about
6      17    search                                                         15-search
6      18    cookie จำภาษา                                                   16-lang-cookie
6      19    แถบ consent, Google Analytics, หน้า privacy                      17-consent-privacy
7      20    สคริปต์ backup และซ้อม restore                                   ตรวจด้วยมือ (ต้องเลือก host ก่อน)
7      21    launch checklist และ deploy                                     ตรวจด้วยมือ (ต้องเลือก host ก่อน)
```

---

## Phase 0: ทำให้ย้อนกลับได้ก่อน

Phase นี้ยังไม่เขียนโค้ดใหม่ เป้าหมายคือทำให้ทุกอย่างย้อนกลับได้ก่อนเริ่ม ได้แก่ Node 24, สำเนา DB เดิมพร้อม sha256, git history ของ MVP ตามสภาพเดิม, การย้าย MVP ไป `archive/` แบบ rename ล้วน และ repo บน GitHub

- ทุกคำสั่งที่ไม่ได้ขึ้นต้นด้วย **Owner:** รันใน Git Bash ที่ root ของโปรเจกต์ `D:/Ikkyusan/Downloads/TalkAlways_MVP/talkalways` ซึ่งใน Git Bash คือ `/d/Ikkyusan/Downloads/TalkAlways_MVP/talkalways`
- ทุกคำสั่ง git ใน Task 1 ถึง 3 ถูกซ้อมแล้วใน copy ของโปรเจกต์ (ไม่รวม `node_modules`, `data`, `.env` แล้วเติม `.env` ปลอม, สำเนา `data/talkalways.db` และ `node_modules/` ปลอมเพื่อให้การตรวจ `.gitignore` มีความหมาย) Expected ทุกบรรทัดมาจากการซ้อมนั้น มีแค่ path ของโฟลเดอร์ที่เปลี่ยนเป็น path จริง ส่วนเลข commit hash จะไม่ตรงกันเพราะเวลาของ commit ต่างกัน
- ถ้า output จริงต่างจาก Expected ในเรื่องอื่นนอกจาก path และ commit hash ให้หยุดและรายงานเจ้าของ ห้ามแก้ด้วยการเดา

### Task 1: Node 24, snapshot DB เดิม, git init, commit แรก

**Phase:** 0 · **Gate tests:** ไม่มี (ตรวจด้วยมือ)

**Files:**
- Create: `.git/` จาก `git init -b main`
- Create (นอก repo): `../talkalways-backup/talkalways.db` และ `../talkalways-backup/talkalways.db.sha256`
- Commit ที่ 1 (ไฟล์เดิม ไม่แก้เนื้อหา): 24 ไฟล์ของ MVP ตามรายการใน Step 9
- Commit ที่ 2: `docs/superpowers/specs/2026-09-13-blog-portfolio-design.md` และ `docs/superpowers/plans/2026-09-13-blog-portfolio.md`
- Test: ไม่มี

**Interfaces:**
- Consumes: ไม่มี เพราะเป็น task แรก
- Produces: git repo ที่ root ของโปรเจกต์ บน branch `main` มี 2 commit, ไฟล์ `../talkalways-backup/talkalways.db.sha256` ที่ manual checklist ตอน launch ใช้เทียบ sha256 ของ `data/talkalways.db`, และ `node` บน PATH เป็น `v24.21.0` สำหรับทุก task ต่อจากนี้

- [ ] **Step 1: สลับเครื่องไปใช้ Node 24**

**Owner:** เปิด PowerShell ด้วย Run as administrator แล้วรัน `nvm use 24.21.0` ตัว Node 24.21.0 ติดตั้งไว้แล้วที่ `C:\Users\Admin\AppData\Local\nvm\v24.21.0` คำสั่งนี้เปลี่ยน symlink `C:\nvm4w\nodejs` ซึ่งตอนนี้ชี้ไป `v20.19.5` จึงต้องใช้สิทธิ์ admin จากนั้นปิด terminal ทุกหน้าต่างรวมถึง session ของ Claude Code แล้วเปิดใหม่ executor ห้ามรัน `nvm` เอง ให้หยุดรอจนเจ้าของบอกว่าทำเสร็จแล้ว

- [ ] **Step 2: ตรวจเวอร์ชัน Node และ npm**

Run: `node -v && npm -v`
Expected:

```
v24.21.0
11.19.0
```

ถ้ายังได้ `v20.19.5` ให้กลับไป Step 1

- [ ] **Step 3: ตรวจว่าอยู่ที่ root ของโปรเจกต์และยังไม่มี git**

Run: `pwd && test -e .git && echo HAS_GIT || echo NO_GIT`
Expected:

```
/d/Ikkyusan/Downloads/TalkAlways_MVP/talkalways
NO_GIT
```

ถ้าได้ `HAS_GIT` ให้หยุดและถามเจ้าของ เพราะ task นี้ถือว่ายังไม่เคย `git init`

- [ ] **Step 4: คัดลอก DB เดิมไปไว้นอก repo**

`data/talkalways.db` ถูก gitignore ไว้ git จึงไม่เก็บไฟล์นี้ให้ ต้องมีสำเนานอก repo ก่อนแตะอย่างอื่น

Run: `mkdir -p ../talkalways-backup && cp -p data/talkalways.db ../talkalways-backup/talkalways.db && ls -l ../talkalways-backup`
Expected:

```
total 36
-rw-r--r-- 1 Admin 197609 36864 Oct 11  2025 talkalways.db
```

- [ ] **Step 5: จด sha256 ของ DB เดิม**

Run: `(cd data && sha256sum talkalways.db) > ../talkalways-backup/talkalways.db.sha256 && cat ../talkalways-backup/talkalways.db.sha256`
Expected:

```
a6728e7397006282fa80df2b840d7e33a1dd169f922abcad6e16dcfec2abb0bb *talkalways.db
```

- ไฟล์ `talkalways.db.sha256` คือค่าที่ manual checklist ตอน launch ใช้เทียบ
- ถ้า hash ไม่ตรงกับบรรทัดข้างบน แปลว่าไฟล์เปลี่ยนไปหลังวันที่เขียนแผน ให้ใช้ค่าที่ได้จริงต่อไปและแจ้งเจ้าของ

- [ ] **Step 6: ตรวจว่าสำเนาตรงกับต้นฉบับ**

Run: `(cd ../talkalways-backup && sha256sum -c talkalways.db.sha256)`
Expected: `talkalways.db: OK`

- [ ] **Step 7: สร้าง git repo บน branch main**

ต้องใส่ `-b main` เพราะ `C:/Program Files/Git/etc/gitconfig` ของเครื่องนี้ตั้ง `init.defaultBranch = master` ไว้ ส่วน CI ใน Task 7 ทำงานเมื่อ push ไปที่ `main`

Run: `git init -b main`
Expected: `Initialized empty Git repository in D:/Ikkyusan/Downloads/TalkAlways_MVP/talkalways/.git/`

- [ ] **Step 8: ตรวจว่า .gitignore กันไฟล์ที่ห้ามขึ้น git**

Run: `git check-ignore -v .env data/talkalways.db node_modules`
Expected:

```
.gitignore:53:.env	.env
.gitignore:15:data/	data/talkalways.db
.gitignore:37:node_modules/	node_modules
```

ถ้าบรรทัดไหนหายไป ห้าม commit และถามเจ้าของ

- [ ] **Step 9: stage ไฟล์ MVP ทีละไฟล์ โดยไม่รวม docs/**

```bash
git add package.json package-lock.json .gitignore server.js README.md DEPLOYMENT.md MVP_SUMMARY.md
git add config/database.js src/controllers/authController.js src/controllers/chatController.js src/controllers/paymentController.js src/models/Message.js src/models/Room.js src/models/User.js src/routes/auth.js src/routes/chat.js src/routes/payment.js
git add public/index.html public/payment.html public/test.html public/css/style.css public/js/app.js public/js/payment.js public/images/brand-mockup.png
```

Expected: ไม่มี output

- [ ] **Step 10: ตรวจสิ่งที่ stage แล้ว**

Run: `git status --short | grep -c '^A '`
Expected: `24`

Run: `git status --short | grep -v '^A '`
Expected: `?? docs/`

ถ้ามีบรรทัด `??` อื่นนอกจาก `docs/` เช่น `.claude/` ห้าม add ไฟล์นั้น ให้ถามเจ้าของก่อน

- [ ] **Step 11: Commit MVP ตามสภาพเดิม**

```bash
git commit -m "chore: snapshot chat MVP as-is before portfolio rewrite"
```

Expected: บรรทัดแรกขึ้นต้นด้วย `[main (root-commit)` บรรทัดที่สองคือ ` 24 files changed, 6579 insertions(+)` แล้วตามด้วยบรรทัด `create mode 100644` อีก 24 บรรทัด

- [ ] **Step 12: ตรวจ commit แรกด้วย git show**

Run: `git show --stat --format= HEAD`
Expected: ไม่มี `.env`, `data/` หรือ `docs/` ในรายการ

```
 .gitignore                           |   73 +
 DEPLOYMENT.md                        |  147 ++
 MVP_SUMMARY.md                       |  179 +++
 README.md                            |  142 ++
 config/database.js                   |  129 ++
 package-lock.json                    | 2861 ++++++++++++++++++++++++++++++++++
 package.json                         |   33 +
 public/css/style.css                 |  351 +++++
 public/images/brand-mockup.png       |  Bin 0 -> 1597350 bytes
 public/index.html                    |  191 +++
 public/js/app.js                     |  468 ++++++
 public/js/payment.js                 |  354 +++++
 public/payment.html                  |   86 +
 public/test.html                     |   36 +
 server.js                            |   54 +
 src/controllers/authController.js    |  208 +++
 src/controllers/chatController.js    |  279 ++++
 src/controllers/paymentController.js |  286 ++++
 src/models/Message.js                |  148 ++
 src/models/Room.js                   |  153 ++
 src/models/User.js                   |  217 +++
 src/routes/auth.js                   |   68 +
 src/routes/chat.js                   |   84 +
 src/routes/payment.js                |   32 +
 24 files changed, 6579 insertions(+)
```

Run: `git ls-files -- .env data docs node_modules | wc -l`
Expected: `0`

- [ ] **Step 13: ตรวจว่ามี spec และ plan ครบก่อน commit ที่สอง**

Run: `ls docs/superpowers/specs/2026-09-13-blog-portfolio-design.md docs/superpowers/plans/2026-09-13-blog-portfolio.md`
Expected:

```
docs/superpowers/plans/2026-09-13-blog-portfolio.md
docs/superpowers/specs/2026-09-13-blog-portfolio-design.md
```

ถ้า `ls` บอกว่าไฟล์ plan ไม่มี ให้หยุดและถามเจ้าของว่าไฟล์แผนฉบับนี้อยู่ที่ไหน

- [ ] **Step 14: Commit spec และ plan**

```bash
git add docs/superpowers/specs/2026-09-13-blog-portfolio-design.md docs/superpowers/plans/2026-09-13-blog-portfolio.md
git commit -m "docs: add blog portfolio design spec and implementation plan"
```

Expected: บรรทัดแรกขึ้นต้นด้วย `[main ` บรรทัดที่สองขึ้นต้นด้วย ` 2 files changed,` แล้วตามด้วย `create mode 100644 docs/superpowers/plans/2026-09-13-blog-portfolio.md` และ `create mode 100644 docs/superpowers/specs/2026-09-13-blog-portfolio-design.md` จำนวน insertions ขึ้นกับความยาวของไฟล์แผน

- [ ] **Step 15: ตรวจว่ามี 2 commit และ working tree สะอาด**

Run: `git log --oneline | wc -l`
Expected: `2`

Run: `git status --short | wc -l`
Expected: `0`

### Task 2: ย้าย MVP เดิมไป archive/

**Phase:** 0 · **Gate tests:** ไม่มี (ตรวจด้วยมือ)

**Files:**
- Create: `archive/README.md`
- Modify (ย้ายด้วย `git mv` โดยไม่แก้เนื้อหา): `server.js` ไป `archive/server.js`, `config/` ไป `archive/config/`, `src/` ไป `archive/src/`, `public/` ไป `archive/public/`, `DEPLOYMENT.md` ไป `archive/DEPLOYMENT.md`, `MVP_SUMMARY.md` ไป `archive/MVP_SUMMARY.md`, `README.md` ไป `archive/MVP_README.md`
- Test: ไม่มี

**Interfaces:**
- Consumes: git repo บน branch `main` ที่มี 2 commit และ working tree สะอาดจาก Task 1
- Produces: root ของ repo ที่ track แค่ `.gitignore`, `package.json`, `package-lock.json`, `docs/` และ `archive/` path `server.js`, `src/`, `public/` จึงว่างให้ Task 4 ถึง 6 สร้างใหม่ และตั้งแต่ commit ของ task นี้ไป ห้ามแก้อะไรใน `archive/`

spec ข้อ 2.5 วาง `README.md` ไว้ใน `archive/` สองไฟล์ คือไฟล์ที่อธิบายว่าเก็บโค้ดไว้ทำไม กับ `README.md` เดิมของ MVP ซึ่งอยู่ในโฟลเดอร์เดียวกันไม่ได้ task นี้จึงย้าย README เดิมไปเป็น `archive/MVP_README.md` ทุกไฟล์ยังเป็น rename 100% จึงย้อนกลับได้ด้วย `git mv` ตัวเดียว

- [ ] **Step 1: ตรวจว่า working tree สะอาดก่อนย้าย**

Run: `git status --short | wc -l`
Expected: `0`

- [ ] **Step 2: ย้ายโค้ด MVP เข้า archive/ ด้วย git mv**

Run: `mkdir archive && git mv server.js config src public DEPLOYMENT.md MVP_SUMMARY.md archive/`
Expected: ไม่มี output

ใช้ `git mv` เท่านั้น ห้ามลบไฟล์ใด และห้ามย้ายด้วย `mv` ธรรมดา

- [ ] **Step 3: ย้าย README เดิมไปเป็น archive/MVP_README.md**

Run: `git mv README.md archive/MVP_README.md`
Expected: ไม่มี output

- [ ] **Step 4: ตรวจด้วย git status ว่าทุกไฟล์เป็น rename**

Run: `git status`
Expected: ทุกบรรทัดเป็น `renamed:` ไม่มี `deleted:` หรือ `new file:`

```
On branch main
Changes to be committed:
  (use "git restore --staged <file>..." to unstage)
	renamed:    DEPLOYMENT.md -> archive/DEPLOYMENT.md
	renamed:    README.md -> archive/MVP_README.md
	renamed:    MVP_SUMMARY.md -> archive/MVP_SUMMARY.md
	renamed:    config/database.js -> archive/config/database.js
	renamed:    public/css/style.css -> archive/public/css/style.css
	renamed:    public/images/brand-mockup.png -> archive/public/images/brand-mockup.png
	renamed:    public/index.html -> archive/public/index.html
	renamed:    public/js/app.js -> archive/public/js/app.js
	renamed:    public/js/payment.js -> archive/public/js/payment.js
	renamed:    public/payment.html -> archive/public/payment.html
	renamed:    public/test.html -> archive/public/test.html
	renamed:    server.js -> archive/server.js
	renamed:    src/controllers/authController.js -> archive/src/controllers/authController.js
	renamed:    src/controllers/chatController.js -> archive/src/controllers/chatController.js
	renamed:    src/controllers/paymentController.js -> archive/src/controllers/paymentController.js
	renamed:    src/models/Message.js -> archive/src/models/Message.js
	renamed:    src/models/Room.js -> archive/src/models/Room.js
	renamed:    src/models/User.js -> archive/src/models/User.js
	renamed:    src/routes/auth.js -> archive/src/routes/auth.js
	renamed:    src/routes/chat.js -> archive/src/routes/chat.js
	renamed:    src/routes/payment.js -> archive/src/routes/payment.js
```

- [ ] **Step 5: นับให้แน่ว่าไม่มีบรรทัดที่ไม่ใช่ rename**

Run: `git status --short | grep -c '^R '`
Expected: `21`

Run: `git status --short | grep -vc '^R '`
Expected: `0`

- [ ] **Step 6: เขียน archive/README.md**

สร้างไฟล์ `archive/README.md` ที่มีเนื้อหานี้ทุกตัวอักษร

```markdown
# archive

โฟลเดอร์นี้เก็บโค้ด TalkAlways chat MVP เดิมทั้งหมด (Express, socket.io, Stripe และ SQLite) ตามสภาพใน commit แรกของ repo นี้ ทุกไฟล์ถูกย้ายมาด้วย `git mv` โดยไม่แก้เนื้อหา ส่วน `README.md` เดิมเปลี่ยนชื่อเป็น `MVP_README.md` เพื่อให้ไฟล์นี้ใช้อธิบายโฟลเดอร์ แอปใหม่ที่เป็น dev portfolio และ tech blog ไม่ mount และไม่ require อะไรจากโฟลเดอร์นี้ เหตุผลที่เก็บไว้แทนการลบคือเผื่อใช้ทำระบบ comment หรือ private messenger ภายหลัง ถ้าจะเอากลับมาใช้ต้อง install `socket.io`, `stripe`, `cors`, `uuid`, `dotenv` และ `nodemon` ใหม่ เพราะ `package.json` ของแอปใหม่ไม่มีแล้ว ส่วน DB เดิมยังอยู่ที่ `data/talkalways.db` นอก git และไม่มีโค้ดใหม่เปิดไฟล์นั้น ห้ามแก้ไฟล์ในโฟลเดอร์นี้ ถ้าจะใช้โค้ดส่วนไหนให้คัดลอกออกไปแก้ข้างนอก
```

- [ ] **Step 7: ตรวจเนื้อหาของ archive/**

Run: `ls archive`
Expected:

```
DEPLOYMENT.md
MVP_README.md
MVP_SUMMARY.md
README.md
config
public
server.js
src
```

- [ ] **Step 8: Commit**

```bash
git add archive/README.md
git commit -m "chore: move chat MVP into archive/"
```

Expected: บรรทัดแรกขึ้นต้นด้วย `[main ` บรรทัดที่สองคือ ` 22 files changed, 3 insertions(+)` แล้วตามด้วยบรรทัด `rename` ที่ลงท้ายด้วย `(100%)` 21 บรรทัด และ `create mode 100644 archive/README.md` 1 บรรทัด

- [ ] **Step 9: ตรวจ commit ว่าย้ายครบและไม่มีไฟล์ถูกลบ**

Run: `git show --format= --name-status HEAD | awk '{print $1}' | sort | uniq -c`
Expected:

```
      1 A
     21 R100
```

Run: `git ls-tree --name-only HEAD`
Expected:

```
.gitignore
archive
docs
package-lock.json
package.json
```

### Task 3: สร้าง repo บน GitHub แล้ว push

**Phase:** 0 · **Gate tests:** ไม่มี (ตรวจด้วยมือ และเจ้าของต้องเลือก public หรือ private ก่อน)

**Files:**
- Create: ไม่มีไฟล์ใหม่ใน repo task นี้สร้าง repo บน GitHub และเพิ่ม remote `origin`
- Test: ไม่มี

**Interfaces:**
- Consumes: branch `main` ที่มี 3 commit และ working tree สะอาดจาก Task 1 และ 2, `gh` ที่ login ด้วยบัญชี `Su-Korawit` และใช้ protocol https
- Produces: remote `origin` ที่ชี้ไป `https://github.com/Su-Korawit/portfolio.git` (หรือชื่อที่เจ้าของเลือกใน Step 1) โดย `main` track `origin/main` แล้ว Task 7 ใช้ remote นี้ push และดูผลด้วย `gh run watch`

ข้อเท็จจริงที่ตรวจตอนเขียนแผน (2026-09-13) ด้วยคำสั่งอ่านอย่างเดียว

- บัญชี `Su-Korawit` มี repo `TalkAlways` อยู่แล้ว เป็น public สร้างเมื่อ 2025-10-11 มี 2 commit คือ `first commit` กับ `Vercel commit::none WebSocket` และมี `api/`, `vercel.json`, `.vercelignore` ที่ไม่มีในเครื่อง
- history ของ repo นั้นไม่เกี่ยวกับ repo ที่เพิ่ง `git init` ใน Task 1 ถ้า push ไปที่นั่น git จะปฏิเสธ และถ้า force push จะทับ 2 commit นั้นทิ้งถาวร
- `gh repo view Su-Korawit/talkalways` ตอบกลับเป็น repo `TalkAlways` แปลว่า GitHub ไม่แยกตัวพิมพ์เล็กใหญ่ของชื่อ `gh repo create talkalways` จึงสร้างไม่ได้เพราะชื่อซ้ำ
- task นี้จึงสร้าง repo ใหม่ชื่อ `portfolio` และไม่แตะ `Su-Korawit/TalkAlways` เลย

- [ ] **Step 1: เจ้าของเลือก public หรือ private และยืนยันชื่อ repo**

**Owner:** ตอบสองข้อนี้ก่อน executor ทำ step ถัดไป เพราะการ push คือการเผยแพร่โค้ดออกนอกเครื่อง executor ต้องหยุดรอคำตอบและห้ามเลือกเอง

1. repo ใหม่เป็น private หรือ public ถ้าเป็น public ทุกคนจะเห็นทั้ง 3 commit รวมถึงโค้ด MVP เดิมใน `archive/`
2. ใช้ชื่อ `portfolio` ตามแผนหรือไม่ ถ้าเจ้าของตั้งชื่ออื่น executor ต้องใช้ชื่อนั้นแทน `portfolio` ในทุกคำสั่งของ Step 3, 5 และ 6 และห้ามใช้ชื่อ `talkalways` เพราะชนกับ `Su-Korawit/TalkAlways`

- [ ] **Step 2: ตรวจว่า gh login ไว้แล้ว**

Run: `gh auth status`
Expected: มีบรรทัดเหล่านี้ และ token ถูกซ่อนด้วย `*`

```
github.com
  ✓ Logged in to github.com account Su-Korawit (keyring)
  - Active account: true
  - Git operations protocol: https
  - Token scopes: 'gist', 'read:org', 'repo', 'workflow'
```

- [ ] **Step 3: ตรวจว่า repo เดิมยังอยู่และชื่อใหม่ยังว่าง**

Run: `gh repo view Su-Korawit/TalkAlways --json visibility,defaultBranchRef --jq '.visibility + " " + .defaultBranchRef.name'`
Expected: `PUBLIC main` คำสั่งนี้แค่บันทึกว่า repo เดิมยังอยู่และไม่ถูกแตะ ถ้าเจ้าของลบไปแล้วมันจะ error ซึ่งไม่ต้องหยุด

Run: `gh repo view Su-Korawit/portfolio --json name`
Expected: exit code 1 และข้อความ

```
GraphQL: Could not resolve to a Repository with the name 'Su-Korawit/portfolio'. (repository)
```

ถ้าคำสั่งที่สองพิมพ์ JSON ออกมา แปลว่าชื่อนี้ถูกใช้แล้ว ให้กลับไปถามเจ้าของที่ Step 1

- [ ] **Step 4: ตรวจว่าไม่มี secret หรือไฟล์ env และ DB ใน history ที่จะ push**

Run: `git grep -nIE "sk[_](test|live)[_]|rk[_](test|live)[_]|whsec[_]" HEAD | wc -l`
Expected: `0`

Run: `git log --all --format= --name-only | grep -cE '(^|/)[.]env$|[.]db$'`
Expected: `0`

- pattern แรกหา Stripe secret key, restricted key และ webhook secret โดยเขียน `_` เป็น `[_]` เพื่อไม่ให้ไปเจอตัวคำสั่งนี้เองในไฟล์แผนที่ commit ไว้
- `archive/public/js/payment.js` มี Stripe publishable key ปลอมที่ขึ้นต้นด้วย `pk` อยู่หนึ่งที่ publishable key ไม่ใช่ความลับ pattern จึงไม่นับ
- ถ้าเลขที่ได้ไม่ใช่ `0` ห้าม push และแจ้งเจ้าของ

- [ ] **Step 5: สร้าง repo บน GitHub แล้ว push**

ถ้าเจ้าของเลือก private

```bash
gh repo create portfolio --private --source=. --remote=origin --push
```

ถ้าเจ้าของเลือก public

```bash
gh repo create portfolio --public --source=. --remote=origin --push
```

Expected: exit code 0

- คำสั่งนี้ซ้อมจริงไม่ได้ เพราะจะสร้าง repo จริงบน GitHub ตอนเขียนแผนตรวจแล้วว่า `gh repo create --help` ของ gh 2.92.0 มี `--private`, `--public`, `--source`, `--remote` และ `--push`
- ส่วน push ซ้อมกับ bare repo ในเครื่องด้วย `git push --set-upstream origin HEAD` แล้วได้ `branch 'main' set up to track 'origin/main'.` และ ` * [new branch]      HEAD -> main`
- git ใช้ credential จาก Git Credential Manager ซึ่งเก็บบัญชี `Su-Korawit` ไว้แล้ว จึงไม่ควรมีหน้าต่าง login ถ้ามีหน้าต่างเด้งขึ้นมา **Owner:** login ด้วยบัญชี `Su-Korawit` ในหน้าต่างนั้น

- [ ] **Step 6: ตรวจ remote, upstream และ visibility**

Run: `git remote -v`
Expected:

```
origin	https://github.com/Su-Korawit/portfolio.git (fetch)
origin	https://github.com/Su-Korawit/portfolio.git (push)
```

Run: `git status`
Expected:

```
On branch main
Your branch is up to date with 'origin/main'.

nothing to commit, working tree clean
```

ถ้าบรรทัดที่สองไม่มี `origin/main` แปลว่า upstream ยังไม่ถูกตั้ง ให้รัน `git push --set-upstream origin main` ซึ่งจะพิมพ์ `branch 'main' set up to track 'origin/main'.` และ `Everything up-to-date` แล้วรัน `git status` อีกครั้ง

Run: `git log --oneline origin/main | wc -l`
Expected: `3`

Run: `gh repo view Su-Korawit/portfolio --json visibility,defaultBranchRef --jq '.visibility + " " + .defaultBranchRef.name'`
Expected: `PRIVATE main` ถ้าเลือก private หรือ `PUBLIC main` ถ้าเลือก public

Task นี้ไม่มี commit ใหม่ เพราะไม่มีไฟล์ใน repo เปลี่ยน

## Phase 1: โครงแอปที่ render ได้

Phase นี้สร้างแอปใหม่ที่ root ของ repo หลังจาก Phase 0 ย้าย MVP เดิมไป `archive/` แล้ว พอจบ phase นี้ `npm test` จะผ่าน 2 tests, `GET /` redirect ไป `/th`, หน้า `/th` และ `/en` render ได้พร้อม CSS, ฟอนต์ และปุ่มสลับธีม และ GitHub Actions จะรัน test ให้ทุกครั้งที่ push

- ทุกคำสั่งรันใน Git Bash ที่ root ของโปรเจกต์ `/d/Ikkyusan/Downloads/TalkAlways_MVP/talkalways` และ `node -v` ต้องได้ `v24.21.0` ตาม Task 1
- Expected ทุกบรรทัดของ Task 4 และ 5 มาจากการรันจริงบน Node 24.21.0 กับ npm 11.19.0 ในโฟลเดอร์ทดลองที่สร้างจากโค้ดในแผนนี้ตามลำดับ path ใน output เปลี่ยนเป็น path จริงของโปรเจกต์แล้ว ส่วนตัวเลขเวลา เช่น `(28.9151ms)`, `duration_ms` และ `in 39s` จะไม่ตรงกัน
- ถ้า output จริงต่างจาก Expected ในเรื่องอื่นนอกจาก path และเวลา ให้หยุดและหาสาเหตุก่อนทำ step ถัดไป

### Task 4: dependencies และ markdown renderer

**Phase:** 1 · **Gate tests:** 01-markdown

**Files:**
- Modify: `package.json` (เขียนใหม่ทั้งไฟล์ ได้แก่ dependencies 8 ตัว, scripts, engines และลบ devDependencies)
- Modify: `package-lock.json` (ลบไฟล์เดิมแล้วให้ `npm install` สร้างใหม่)
- Create: `.env.example`
- Create: `src/markdown.js`
- Test: `test/01-markdown.test.js`

**Interfaces:**
- Consumes: root ของ repo หลัง Task 2 ที่ git track แค่ `.gitignore`, `package.json`, `package-lock.json`, `docs/` และ `archive/` (บนดิสก์ยังมี `node_modules/`, `data/` และ `.env` ที่ถูก gitignore) และ `node` บน PATH ที่เป็น `v24.21.0` จาก Task 1
- Produces:
  - `package.json` ที่มี dependencies 8 ตัวตาม Global Constraints ไม่มี `devDependencies` และมี scripts `start`, `dev`, `test` โดย `npm test` คือ `node --test test/*.test.js`
  - `src/markdown.js`: `module.exports = md` เป็น instance ของ `MarkdownIt` เรียก `md.render(src) -> string` ได้ ค่า `md.options.html`, `md.options.linkify`, `md.options.breaks` เป็น `false` ทั้งหมด highlight code block ด้วย `highlight.js/lib/common` บวกภาษา `dockerfile` ส่วนภาษาที่ไม่รู้จักจะถูก escape โดยไม่ throw
  - `.env.example` ที่มี `PORT`, `NODE_ENV`, `DATA_DIR`, `SITE_URL` แล้ว Task 8 จะเพิ่ม `SESSION_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH` และ Task 19 จะเพิ่ม `GA_MEASUREMENT_ID`
  - `test/01-markdown.test.js` เป็นไฟล์เดียวที่ไม่ได้เรียก `start()` และ `stop()` เพราะทดสอบแค่ `src/markdown.js` ซึ่งไม่ต้องใช้ DB หรือ server และ `test/helpers.js` ยังไม่มีจนถึง Task 5

- [ ] **Step 1: เขียน package.json ใหม่ทั้งไฟล์**

แทนที่เนื้อหาทั้งหมดของ `package.json` ด้วยข้อความนี้ ไฟล์ใหม่ไม่มี `socket.io`, `stripe`, `cors`, `uuid`, `dotenv` และ `nodemon` แล้ว และใส่ `"private": true` ไว้กันการเผลอ `npm publish`

```json
{
  "name": "talkalways",
  "version": "1.0.0",
  "private": true,
  "description": "Bilingual Thai and English dev portfolio and tech blog",
  "main": "server.js",
  "engines": {
    "node": ">=24"
  },
  "scripts": {
    "start": "node --env-file-if-exists=.env server.js",
    "dev": "node --watch --env-file-if-exists=.env server.js",
    "test": "node --test test/*.test.js"
  },
  "license": "MIT",
  "dependencies": {
    "bcryptjs": "^3.0.3",
    "cookie-parser": "^1.4.7",
    "ejs": "^6.0.1",
    "express": "^5.2.1",
    "highlight.js": "^11.12.0",
    "markdown-it": "^15.0.2",
    "multer": "^2.3.0",
    "sqlite3": "^6.0.1"
  }
}
```

- [ ] **Step 2: ลบ node_modules และ package-lock.json ของ MVP**

`node_modules/` ตอนนี้มี socket.io, stripe และ sqlite3 5.1.7 ที่ build ไว้กับ Node 20 ส่วน `package-lock.json` เดิมยังตรึง transitive dependency ของ MVP ไว้ ถ้า install ทับของเดิม lock ใหม่จะพก version เก่าบางตัวติดมาด้วย step นี้จึงลบทั้งสองอย่างแล้วให้ npm resolve ใหม่ทั้งหมด `package-lock.json` เดิมยังอยู่ใน commit แรกของ git และโค้ดใน `archive/` ไม่ได้ถูกรันจากที่ไหน

Run: `rm -rf node_modules package-lock.json && (test -e node_modules || test -e package-lock.json) && echo LEFT || echo CLEAN`
Expected: `CLEAN`

- [ ] **Step 3: ติดตั้ง dependencies ชุดใหม่**

Run: `npm install`
Expected: exit code 0 และ output

```
npm warn deprecated prebuild-install@7.1.3: No longer maintained. Please contact the author of the relevant native addon; alternatives are available.

added 146 packages, and audited 147 packages in 39s

43 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities
npm warn install-scripts 1 package has install scripts not yet covered by allowScripts:
npm warn install-scripts   sqlite3@6.0.1 (install: prebuild-install -r napi || node-gyp rebuild)
npm warn install-scripts
npm warn install-scripts Run `npm install-scripts ls` to review, or `npm install-scripts approve <pkg>` to allow.
```

- จำนวน packages อาจต่างไปเล็กน้อยถ้ามี patch version ใหม่ออกหลัง 2026-09-13 แต่ต้องมีบรรทัด `found 0 vulnerabilities`
- `prebuild-install` เป็น dependency ของ sqlite3 คำเตือน deprecated นี้ไม่ต้องแก้
- คำเตือน `install-scripts` ของ npm 11.19 บอกแค่ว่า script ติดตั้งของ sqlite3 ยังไม่อยู่ใน allowlist ตอนนี้ npm ยังรัน script นั้นให้ตามปกติ ห้ามรันคำสั่ง `npm install-scripts` ใดๆ เพราะจะไปแก้ config และ Step 4 จะพิสูจน์ว่า binary ของ sqlite3 โหลดได้จริง
- ถ้า install พังที่ sqlite3 แปลว่าดาวน์โหลด prebuilt binary ไม่ได้ ให้หยุดและแจ้งเจ้าของ เพราะการ build เองต้องมี build tools

- [ ] **Step 4: ตรวจว่า native binding ของ sqlite3 โหลดได้บน Node 24**

Run: `node -e 'const s=require("sqlite3");new s.Database(":memory:").get("SELECT sqlite_version() AS v",(e,r)=>console.log(e||r.v))'`
Expected: `3.52.0`

- [ ] **Step 5: ตรวจ dependencies ระดับบนสุด**

Run: `npm ls --depth=0`
Expected:

```
talkalways@1.0.0 D:\Ikkyusan\Downloads\TalkAlways_MVP\talkalways
+-- bcryptjs@3.0.3
+-- cookie-parser@1.4.7
+-- ejs@6.0.1
+-- express@5.2.1
+-- highlight.js@11.12.0
+-- markdown-it@15.0.2
+-- multer@2.3.0
`-- sqlite3@6.0.1
```

- [ ] **Step 6: ตรวจว่า package ของ MVP หายไปหมดแล้ว**

Run: `npm ls socket.io stripe cors uuid dotenv nodemon`
Expected: exit code 1 และ output

```
talkalways@1.0.0 D:\Ikkyusan\Downloads\TalkAlways_MVP\talkalways
`-- (empty)
```

- [ ] **Step 7: เขียน .env.example**

สร้างไฟล์ `.env.example` ที่มีเนื้อหานี้ ตอนนี้มีแค่ตัวแปรที่ Task 5 ใช้ Task 8 และ Task 19 จะเพิ่มตัวที่เหลือ ส่วน `.env` จริงของเครื่องนี้ยังเป็นของ MVP และยังไม่ต้องแก้ใน task นี้

```dotenv
# Copy this file to .env and edit the values. Never commit .env.
# Port that server.js listens on.
PORT=3000
# Must be production on the server, otherwise the admin cookie has no Secure flag.
NODE_ENV=development
# Folder for site.db and uploads/, resolved from the project root.
DATA_DIR=data
# Full site URL without a trailing slash. Used for canonical, hreflang, og:url and og:image.
SITE_URL=http://localhost:3000
```

- [ ] **Step 8: ตรวจว่า parser ของ Node อ่าน .env.example ได้**

Run: `node --env-file=.env.example -e 'console.log([process.env.PORT, process.env.NODE_ENV, process.env.DATA_DIR, process.env.SITE_URL].join(" "))'`
Expected: `3000 development data http://localhost:3000`

- [ ] **Step 9: เขียน test ที่ต้อง fail**

สร้าง `test/01-markdown.test.js` นอกจากสาม assertion ตาม spec ข้อ 3.4 test นี้ยังล็อก option ทั้งสามของ markdown-it ไว้ ถ้าวันหน้ามีคนเปิด `html` หรือ `linkify` test จะ fail ทันที และตรวจว่า `dockerfile` ถูก register จริง เพราะ `lib/common` ไม่มีภาษานี้

````js
const test = require('node:test');
const assert = require('node:assert/strict');
const md = require('../src/markdown');

test('01 markdown', async () => {
  assert.equal(md.options.html, false);
  assert.equal(md.options.linkify, false);
  assert.equal(md.options.breaks, false);

  const js = md.render('```js\nconst x = 1;\n```\n');
  assert.ok(js.includes('class="language-js"'), js);
  assert.ok(js.includes('class="hljs-keyword"'), js);

  const docker = md.render('```dockerfile\nFROM node:24\n```\n');
  assert.ok(docker.includes('class="hljs-keyword"'), docker);

  const xss = md.render('<script>alert(1)</script>\n');
  assert.ok(xss.includes('&lt;script&gt;'), xss);
  assert.ok(!xss.includes('<script'), xss);

  let unknown;
  assert.doesNotThrow(() => {
    unknown = md.render('```foobar\n<b>x</b>\n```\n');
  });
  assert.ok(unknown.includes('class="language-foobar"'), unknown);
  assert.ok(unknown.includes('&lt;b&gt;x&lt;/b&gt;'), unknown);
  assert.ok(!unknown.includes('<b>'), unknown);
});
````

- [ ] **Step 10: รัน test ให้เห็นว่า fail**

Run: `node --test test/01-markdown.test.js`
Expected: FAIL exit code 1 เพราะยังไม่มี `src/markdown.js` output มีบรรทัด

```
Error: Cannot find module '../src/markdown'
```

และจบด้วย

```
✖ test\01-markdown.test.js (110.1686ms)
ℹ tests 1
ℹ suites 0
ℹ pass 0
ℹ fail 1
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 123.4002

✖ failing tests:

test at test\01-markdown.test.js:1:1
✖ test\01-markdown.test.js (110.1686ms)
  'test failed'
```

- [ ] **Step 11: เขียน src/markdown.js**

ใส่ `html`, `linkify` และ `breaks` ไว้ตรงๆ แม้จะเป็นค่า default อยู่แล้ว เพื่อให้คนอ่านเห็นว่าเป็นการตัดสินใจ ถ้า `highlight` คืน string ว่าง markdown-it จะ escape โค้ดเอง

```js
const MarkdownIt = require('markdown-it');
const hljs = require('highlight.js/lib/common');

hljs.registerLanguage('dockerfile', require('highlight.js/lib/languages/dockerfile'));

module.exports = new MarkdownIt({
  html: false,
  linkify: false,
  breaks: false,
  highlight: (code, lang) =>
    lang && hljs.getLanguage(lang)
      ? hljs.highlight(code, { language: lang, ignoreIllegals: true }).value
      : ''
});
```

- [ ] **Step 12: รัน test ให้เห็นว่าผ่าน**

Run: `node --test test/01-markdown.test.js`
Expected: PASS exit code 0

```
✔ 01 markdown (28.9151ms)
ℹ tests 1
ℹ suites 0
ℹ pass 1
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2595.8258
```

- [ ] **Step 13: รัน npm test ทั้งชุด**

Run: `npm test`
Expected: PASS exit code 0 และมี 1 test

```
> talkalways@1.0.0 test
> node --test test/*.test.js

✔ 01 markdown (15.82ms)
ℹ tests 1
ℹ suites 0
ℹ pass 1
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 155.6512
```

- [ ] **Step 14: Commit**

```bash
git add package.json package-lock.json .env.example src/markdown.js test/01-markdown.test.js
git commit -m "feat: replace MVP dependencies and add markdown renderer"
```

### Task 5: DB, app skeleton, routing, หน้า error, test helpers

**Phase:** 1 · **Gate tests:** 02-routing

**Files:**
- Create: `src/schema.sql`
- Create: `src/db.js`
- Create: `src/strings.js`
- Create: `src/routes/public.js`
- Create: `src/app.js`
- Create: `views/partials/head.ejs`
- Create: `views/partials/header.ejs`
- Create: `views/partials/footer.ejs`
- Create: `views/home.ejs`
- Create: `views/error.ejs`
- Create: `server.js`
- Create: `test/helpers.js`
- Test: `test/02-routing.test.js`

**Interfaces:**
- Consumes: `src/markdown.js` ที่ `module.exports = md` และ dependencies 8 ตัวจาก Task 4
- Produces:
  - `src/db.js`: `module.exports = { db, ready, run, get, all, transaction, close, DATA_DIR, UPLOAD_DIR }` ตรงตามหัวข้อ Interfaces ของ plan โดย `transaction(fn)` ต่อคิวให้ transaction ทำงานทีละตัว และถ้า `fn` throw จะ `ROLLBACK` แล้ว throw error เดิมต่อ
  - `src/schema.sql`: 8 ตารางตาม spec ส่วนที่ 1 ทุกตัวอักษร
  - `src/strings.js`: `{ th, en }` ที่มี key `skipToContent`, `navMain`, `navBlog`, `navProjects`, `navAbout`, `switchLang`, `themeToggle`, `errorNotFoundTitle`, `errorNotFoundBody`, `errorBadRequestTitle`, `errorBadRequestBody`, `errorServerTitle`, `errorServerBody`, `errorBackToBlog`, `errorBackHome` ถ้า task ไหนเพิ่ม key แค่ภาษาเดียว test 02 จะ fail
  - `src/app.js`: `module.exports = app` พร้อม `app.locals.v`, `app.locals.md`, `app.locals.siteUrl` และ `app.locals.formatDate(lang, iso)` ลำดับ middleware ใน task นี้คือ default locals, `GET /`, static ของ `public/`, `/th` กับ `/en`, 404 และ error handler จุดที่ task หลังต้องแทรกเพื่อให้ได้ลำดับสุดท้ายตามหัวข้อ Interfaces ของ plan มีดังนี้
    - Task 8 แทรก `app.use(cookieParser(process.env.SESSION_SECRET))` ระหว่าง default locals กับ `GET /` และ mount `/admin` ต่อจาก loop ของภาษา
    - Task 15 แทรก static ของ `/uploads` ต่อจาก static ของ `public/`
    - Task 18 เปลี่ยน `GET /` ให้อ่าน cookie `lang` ก่อน Accept-Language และตั้ง `Vary: Accept-Language, Cookie`
  - `src/routes/public.js`: `module.exports = router` มีฟังก์ชัน `loadSettings(lang)` ในไฟล์ และ `router.use` ที่ใส่ `res.locals.settings` ให้ทุก request ใต้ `/th` และ `/en` รวมถึง request ที่จบด้วย 404 ส่วน `GET /` render `home` ด้วย `{ meta }` แล้ว Task 9 เพิ่ม `posts` และ Task 12 เพิ่ม `featured`
  - โครงของทุกหน้า public คือ `<%- include('partials/head') %>`, `<%- include('partials/header') %>`, `<main id="main">` แล้วจบด้วย `<%- include('partials/footer') %>` โดย `head.ejs` เปิดตั้งแต่ `<!doctype html>` จนถึง `<body>` และ `footer.ejs` ปิด `</body>` กับ `</html>`
  - `views/partials/head.ejs` อ่านแค่ `lang`, `v`, `siteUrl`, `settings.site_name` และ `meta.*` แสดง hreflang ในรูป `<link rel="alternate" hreflang="<%= alt.lang %>" href="<%= siteUrl + alt.href %>">` และอ้างไฟล์ `/css/site.css?v=`, `/js/theme.js?v=` แบบ `defer`, `/favicon.svg`, `/fonts/anuphan-latin.woff2` ทุกหน้า และ `/fonts/anuphan-thai.woff2` เฉพาะหน้าที่ `lang` เป็น `th` Task 6 ต้องสร้างไฟล์ตาม path เหล่านี้
  - `views/partials/header.ejs` มีปุ่ม `<button type="button" class="theme-toggle" data-theme-toggle aria-label="<%= t.themeToggle %>">` ให้ `public/js/theme.js` ของ Task 6 หาด้วย selector `[data-theme-toggle]` และมีลิงก์สลับภาษาในรูป `<a class="lang-switch" href="<%= switchHref %>" lang="<%= other %>" hreflang="<%= other %>">` ที่เลือก href ตามกติกาใน Step 10
  - class ที่ view ของ task นี้ใช้และ Task 6 ต้องเขียน CSS ให้: `skip-link`, `site-header`, `site-name`, `site-nav`, `lang-switch`, `theme-toggle`, `site-footer`, `home`, `intro`, `tagline`, `error-page`
  - `views/error.ejs`: `render('error', { status })` เลือกข้อความตาม 404, 4xx อื่น และ 5xx และมีลิงก์ไป `/<lang>/blog` กับ `/<lang>`
  - `test/helpers.js`: `module.exports = { start, toForm, run, get, all }` ทำงานตามหัวข้อ `test/helpers.js` ใน Interfaces ของ plan แล้ว Task 8 เพิ่ม `H.login` กับ `signCookie`, Task 9 เพิ่ม `insertPost`, Task 12 เพิ่ม `insertProject` และ Task 14 เพิ่ม `insertTag`
  - `server.js`: รอ `ready` แล้ว listen ที่ `PORT` หรือ 3000

- [ ] **Step 1: เขียน test/helpers.js**

สร้าง `test/helpers.js` ไฟล์นี้ตั้ง env ทุกตัวก่อน require `src/app` เพราะ `src/db.js` อ่าน `DATA_DIR` ตอนถูก require และ `DATA_DIR` ถูกกำหนดใหม่ทุกครั้งโดยไม่อ่านค่าเดิม test จึงไม่มีทางเปิด `data/site.db` จริงได้

- `req()` ใช้ `redirect: 'manual'` เสมอ และเก็บ cookie จาก `getSetCookie()` ไว้ใน jar ของ server ตัวนั้น cookie ที่ค่าว่าง, มี `Max-Age` ไม่เกิน 0 หรือมี `Expires` ที่ผ่านไปแล้ว จะถูกลบออกจาก jar
- jar ไม่สนใจ `Path` จึงส่ง cookie ทุกตัวไปทุก path ถ้า test ต้องคุม header `Cookie` เองทั้งหมด ให้ส่ง `jar: false`
- `stop()` ปิด server ก่อน แล้วรอ `close()` ของ DB ให้เสร็จ จึงค่อยลบ `DATA_DIR` บน Windows ถ้าลบก่อน DB ปิด จะเจอ `EPERM` เพราะไฟล์ `-wal` ยังถูกล็อก
- `ADMIN_PASSWORD_HASH` ใช้ cost 4 เพื่อให้ require ไฟล์นี้เร็ว ส่วนของจริงใช้ cost 12

```js
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { once } = require('node:events');

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'site-test-'));
process.env.SESSION_SECRET = 'test-secret';
process.env.SITE_URL = 'http://test.local';
process.env.ADMIN_USERNAME = 'admin';
process.env.ADMIN_PASSWORD_HASH = require('bcryptjs').hashSync('pw', 4);
process.env.NODE_ENV = 'test';

const app = require('../src/app');
const { ready, run, get, all, close, DATA_DIR } = require('../src/db');

function toForm(obj) {
  const form = new URLSearchParams();
  const add = (key, value) => {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) {
      for (const item of value) add(key, item);
    } else if (typeof value === 'object') {
      for (const [k, v] of Object.entries(value)) add(key + '[' + k + ']', v);
    } else {
      form.append(key, String(value));
    }
  };
  for (const [key, value] of Object.entries(obj)) add(key, value);
  return form;
}

function updateJar(jar, setCookie) {
  for (const line of setCookie) {
    const [pair, ...attrs] = line.split(';');
    const eq = pair.indexOf('=');
    const name = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();
    let expired = value === '';
    for (const attr of attrs) {
      const [key, val = ''] = attr.trim().split('=');
      if (key.toLowerCase() === 'max-age' && Number(val) <= 0) expired = true;
      if (key.toLowerCase() === 'expires' && Date.parse(val) <= Date.now()) expired = true;
    }
    if (expired) jar.delete(name);
    else jar.set(name, value);
  }
}

async function start() {
  await ready;
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = 'http://127.0.0.1:' + server.address().port;
  const jar = new Map();

  async function req(urlPath, opts = {}) {
    const { method = 'GET', form, body, headers = {}, cookie, jar: useJar = true } = opts;
    const cookies = [];
    if (useJar) for (const [name, value] of jar) cookies.push(name + '=' + value);
    if (cookie) cookies.push(cookie);
    const sendHeaders = { ...headers };
    if (cookies.length) sendHeaders.cookie = cookies.join('; ');
    const res = await fetch(base + urlPath, {
      method,
      headers: sendHeaders,
      body: form ? toForm(form) : body,
      redirect: 'manual'
    });
    const setCookie = res.headers.getSetCookie();
    if (useJar) updateJar(jar, setCookie);
    return {
      status: res.status,
      location: res.headers.get('location'),
      headers: res.headers,
      text: await res.text(),
      setCookie
    };
  }

  async function stop() {
    await new Promise((resolve, reject) => server.close(err => (err ? reject(err) : resolve())));
    await close();
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
  }

  return { base, req, stop };
}

module.exports = { start, toForm, run, get, all };
```

- [ ] **Step 2: เขียน test ที่ต้อง fail**

สร้าง `test/02-routing.test.js` นอกจากสี่ข้อของ spec ข้อ 3.4 test นี้ตรวจเพิ่มอีกสามอย่าง คือหน้า `/th` และ `/en` render ได้จริงพร้อม `lang` ของ `<html>`, ลิงก์สลับภาษาบนหน้าแรก และ `strings.th` กับ `strings.en` มี key ชุดเดียวกัน ข้อสุดท้ายมีไว้จับ task หลังที่เพิ่มข้อความแค่ภาษาเดียว

`fetch` ของ Node ส่ง `Accept-Language: *` ให้เองเมื่อไม่ได้ใส่ header ซึ่งมีความหมายเท่ากับไม่มีภาษาที่ชอบ assertion แรกจึงครอบกรณีไม่มี header ตาม spec

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { start } = require('./helpers');
const strings = require('../src/strings');

test('02 routing', async () => {
  const h = await start();
  try {
    // fetch sends "Accept-Language: *" when no header is given, which means no preference
    let r = await h.req('/');
    assert.equal(r.status, 302);
    assert.equal(r.location, '/th');
    assert.match(r.headers.get('vary'), /Accept-Language/);

    r = await h.req('/', { headers: { 'Accept-Language': 'en-US,en;q=0.9' } });
    assert.equal(r.status, 302);
    assert.equal(r.location, '/en');

    r = await h.req('/th/nope');
    assert.equal(r.status, 404);

    r = await h.req('/nope');
    assert.equal(r.status, 404);
    assert.ok(r.text.includes('<html lang="th">'), r.text);
    assert.ok(r.text.includes(strings.th.errorNotFoundTitle), r.text);
    assert.ok(!r.text.includes('node_modules'), r.text);

    r = await h.req('/th');
    assert.equal(r.status, 200);
    assert.ok(r.text.includes('<html lang="th">'), r.text);
    assert.ok(r.text.includes('href="/en" lang="en" hreflang="en"'), r.text);

    r = await h.req('/en');
    assert.equal(r.status, 200);
    assert.ok(r.text.includes('<html lang="en">'), r.text);
    assert.ok(r.text.includes('href="/th" lang="th" hreflang="th"'), r.text);

    assert.deepEqual(Object.keys(strings.en).sort(), Object.keys(strings.th).sort());
  } finally {
    await h.stop();
  }
});
```

- [ ] **Step 3: รัน test ให้เห็นว่า fail**

Run: `node --test test/02-routing.test.js`
Expected: FAIL exit code 1 เพราะยังไม่มี `src/app.js` output มีบรรทัด

```
Error: Cannot find module '../src/app'
```

และจบด้วย

```
✖ test\02-routing.test.js (209.0685ms)
ℹ tests 1
ℹ suites 0
ℹ pass 0
ℹ fail 1
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 217.9298

✖ failing tests:

test at test\02-routing.test.js:1:1
✖ test\02-routing.test.js (209.0685ms)
  'test failed'
```

run ที่ fail ตรงนี้ทิ้งโฟลเดอร์ว่าง `site-test-*` ไว้ใน temp ของ Windows หนึ่งโฟลเดอร์ เพราะ `mkdtempSync` ทำงานก่อนที่ require จะพัง โฟลเดอร์นี้ไม่มีผลกับ test รอบถัดไป

- [ ] **Step 4: เขียน src/schema.sql**

คัดลอกจาก spec ส่วนที่ 1 ทุกตัวอักษร

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

- [ ] **Step 5: เขียน src/db.js**

- สร้าง `UPLOAD_DIR` ก่อนเปิด DB เพราะโฟลเดอร์ `data/` ไม่มีบน server ที่เพิ่ง clone และไม่มีใน temp dir ของ test ถ้าไม่สร้าง sqlite3 จะเปิดไฟล์ไม่ได้ด้วย `SQLITE_CANTOPEN`
- `ready` รัน `PRAGMA foreign_keys = ON` ก่อน schema เพราะค่านี้ไม่ถูกเก็บในไฟล์ DB และต้องตั้งทุกครั้งที่เปิด connection
- `transaction` ต่อคิวไว้ เพราะแอปมี connection เดียว ถ้าสอง request เรียก `BEGIN IMMEDIATE` ซ้อนกัน sqlite จะตอบ `cannot start a transaction within a transaction`
- ถ้า `ROLLBACK` เองก็ fail เช่นเมื่อ sqlite rollback ให้เองไปแล้วหลัง error ร้ายแรงบางชนิด error ของ `ROLLBACK` จะถูกทิ้ง ผู้เรียกจึงเห็น error ต้นเหตุ
- ตอนเขียนแผนทดสอบแล้วว่า commit, rollback เมื่อ `fn` throw, transaction สามตัวที่เรียกพร้อมกัน, UNIQUE ที่พังกลาง transaction, transaction ถัดไปหลังจากนั้น และ `ON DELETE CASCADE` ทำงานถูกต้องทั้งหมด

```js
const fs = require('node:fs');
const path = require('node:path');
const sqlite3 = require('sqlite3');

const DATA_DIR = path.resolve(__dirname, '..', process.env.DATA_DIR || 'data');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const db = new sqlite3.Database(path.join(DATA_DIR, 'site.db'));

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

function exec(sql) {
  return new Promise((resolve, reject) => {
    db.exec(sql, err => (err ? reject(err) : resolve()));
  });
}

const ready = (async () => {
  await exec('PRAGMA foreign_keys = ON');
  await exec('PRAGMA journal_mode = WAL');
  await exec(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
})();

let queue = Promise.resolve();

function transaction(fn) {
  const result = queue.then(async () => {
    await run('BEGIN IMMEDIATE');
    try {
      const value = await fn();
      await run('COMMIT');
      return value;
    } catch (err) {
      await run('ROLLBACK').catch(() => {});
      throw err;
    }
  });
  queue = result.catch(() => {});
  return result;
}

function close() {
  return new Promise((resolve, reject) => {
    db.close(err => (err ? reject(err) : resolve()));
  });
}

module.exports = { db, ready, run, get, all, transaction, close, DATA_DIR, UPLOAD_DIR };
```

- [ ] **Step 6: เขียน src/strings.js**

ข้อความ UI สาธารณะชุดแรก `switchLang` ของภาษาไทยคือคำว่า English และของภาษาอังกฤษคือคำว่า ไทย เพราะลิงก์สลับภาษาแสดงชื่อของอีกภาษาและมี `lang` ของอีกภาษา

```js
module.exports = {
  th: {
    skipToContent: 'ข้ามไปที่เนื้อหา',
    navMain: 'เมนูหลัก',
    navBlog: 'บทความ',
    navProjects: 'โปรเจกต์',
    navAbout: 'เกี่ยวกับ',
    switchLang: 'English',
    themeToggle: 'สลับธีมสว่างหรือมืด',
    errorNotFoundTitle: 'ไม่พบหน้านี้',
    errorNotFoundBody: 'ลิงก์อาจพิมพ์ผิด หรือหน้านี้ถูกลบไปแล้ว',
    errorBadRequestTitle: 'ลิงก์ไม่ถูกต้อง',
    errorBadRequestBody: 'ลิงก์นี้อาจขาดหายระหว่างการแชร์ ลองเปิดจากหน้ารวมบทความแทน',
    errorServerTitle: 'เกิดข้อผิดพลาด',
    errorServerBody: 'ระบบขัดข้องชั่วคราว ลองใหม่อีกครั้งในอีกสักครู่',
    errorBackToBlog: 'ไปหน้ารวมบทความ',
    errorBackHome: 'กลับหน้าแรก'
  },
  en: {
    skipToContent: 'Skip to content',
    navMain: 'Main',
    navBlog: 'Blog',
    navProjects: 'Projects',
    navAbout: 'About',
    switchLang: 'ไทย',
    themeToggle: 'Toggle light or dark theme',
    errorNotFoundTitle: 'Page not found',
    errorNotFoundBody: 'The link may be mistyped, or the page has been removed.',
    errorBadRequestTitle: 'Invalid link',
    errorBadRequestBody: 'This link may have been cut off when it was shared. Try opening it from the blog index instead.',
    errorServerTitle: 'Something went wrong',
    errorServerBody: 'The site hit a temporary problem. Please try again in a moment.',
    errorBackToBlog: 'Go to the blog',
    errorBackHome: 'Back to home'
  }
};
```

- [ ] **Step 7: เขียน src/routes/public.js**

settings ถูกโหลดใน `router.use` ครั้งเดียวต่อ request ด้วย `WHERE lang IN (?, '*')` หน้าแรกใส่ hreflang ทั้งสองภาษาได้เลยตาม spec ข้อ 2.2 และ `canonical` กับ `alternates` เป็น path เสมอ

```js
const express = require('express');
const { all } = require('../db');

const router = express.Router();

async function loadSettings(lang) {
  const rows = await all("SELECT key, value FROM settings WHERE lang IN (?, '*')", [lang]);
  const settings = {};
  for (const row of rows) settings[row.key] = row.value;
  return settings;
}

router.use(async (req, res, next) => {
  res.locals.settings = await loadSettings(res.locals.lang);
  next();
});

router.get('/', (req, res) => {
  const { lang, settings } = res.locals;
  res.render('home', {
    meta: {
      description: settings.tagline,
      canonical: '/' + lang,
      alternates: [
        { lang: 'th', href: '/th' },
        { lang: 'en', href: '/en' }
      ],
      type: 'website'
    }
  });
});

module.exports = router;
```

- [ ] **Step 8: เขียน src/app.js**

- middleware ตัวแรกตั้งค่า default ห้าตัว เพื่อให้ 404 ที่เกิดนอก `/th` และ `/en` เช่น `/nope` render `error.ejs` ได้โดยไม่เจอ ReferenceError
- `GET /` ใน task นี้ดูแค่ Accept-Language ส่วน cookie `lang` มาใน Task 18
- `GET /` ต้องประกาศก่อน static และ static ต้องมี `index: false`
- `formatDate` สร้าง `Intl.DateTimeFormat` ไว้สองตัวตอน boot และส่ง `new Date(iso)` ให้ `format` เสมอ เพราะถ้าส่ง string ตรงๆ จะโยน `RangeError`
- `SITE_URL` ถูกตัด `/` ท้ายทิ้งครั้งเดียวตอน boot
- error handler log เฉพาะ status 500 ขึ้นไป 404 และ 400 จึงไม่ทำให้ log รก

```js
const path = require('node:path');
const express = require('express');
const md = require('./markdown');
const strings = require('./strings');
const publicRouter = require('./routes/public');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));
app.disable('x-powered-by');

const dateFormats = {
  th: new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeZone: 'Asia/Bangkok' }),
  en: new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'Asia/Bangkok' })
};

app.locals.v = Date.now().toString(36);
app.locals.md = md;
app.locals.siteUrl = (process.env.SITE_URL || '').replace(/\/+$/, '');
app.locals.formatDate = (lang, iso) => dateFormats[lang === 'en' ? 'en' : 'th'].format(new Date(iso));

app.use((req, res, next) => {
  res.locals.lang = 'th';
  res.locals.other = 'en';
  res.locals.t = strings.th;
  res.locals.settings = {};
  res.locals.meta = {};
  next();
});

app.get('/', (req, res) => {
  res.set('Vary', 'Accept-Language');
  res.redirect(302, '/' + (req.acceptsLanguages('th', 'en') || 'th'));
});

app.use(express.static(path.join(__dirname, '..', 'public'), { index: false, maxAge: '30d' }));

for (const lang of ['th', 'en']) {
  app.use('/' + lang, (req, res, next) => {
    res.locals.lang = lang;
    res.locals.other = lang === 'th' ? 'en' : 'th';
    res.locals.t = strings[lang];
    next();
  }, publicRouter);
}

app.use((req, res) => {
  res.status(404).render('error', { status: 404 });
});

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).render('error', { status });
});

module.exports = app;
```

- [ ] **Step 9: เขียน views/partials/head.ejs**

- script inline ของธีมอยู่ต่อจาก `<meta charset>` ทันที เพื่อให้ตั้ง `data-theme` ก่อน CSS โหลด หน้าจอจึงไม่กะพริบ
- `head.ejs` เป็นที่เดียวที่ต่อ `siteUrl` เข้ากับ `meta.canonical`, `meta.alternates[].href` และ `meta.image`
- `<title>` เป็น `meta.title | ชื่อเว็บ` และถ้าไม่มี `meta.title` จะเป็นชื่อเว็บอย่างเดียว
- ไฟล์ฟอนต์ไม่ต่อ `?v` เพราะ href ของ preload ต้องตรงกับ `url()` ใน `@font-face` ทุกตัวอักษร และ preload ต้องมี `crossorigin`
- `/css/site.css`, `/js/theme.js`, `/favicon.svg` และไฟล์ฟอนต์ยังไม่มีจนถึง Task 6 ระหว่างนี้หน้าเว็บจึงยังไม่มี style

```ejs
<!doctype html>
<html lang="<%= lang %>">
<head>
<meta charset="utf-8">
<script>try{var t=localStorage.getItem('theme');if(t)document.documentElement.dataset.theme=t}catch(e){}</script>
<meta name="viewport" content="width=device-width, initial-scale=1">
<%
const siteName = settings.site_name || 'Portfolio';
-%>
<title><%= meta.title ? meta.title + ' | ' + siteName : siteName %></title>
<% if (meta.description) { -%>
<meta name="description" content="<%= meta.description %>">
<% } -%>
<% if (meta.noindex) { -%>
<meta name="robots" content="noindex">
<% } -%>
<% if (meta.canonical) { -%>
<link rel="canonical" href="<%= siteUrl + meta.canonical %>">
<% } -%>
<% for (const alt of meta.alternates || []) { -%>
<link rel="alternate" hreflang="<%= alt.lang %>" href="<%= siteUrl + alt.href %>">
<% } -%>
<meta property="og:title" content="<%= meta.title || siteName %>">
<% if (meta.description) { -%>
<meta property="og:description" content="<%= meta.description %>">
<% } -%>
<% if (meta.image) { -%>
<meta property="og:image" content="<%= siteUrl + meta.image %>">
<% } -%>
<% if (meta.canonical) { -%>
<meta property="og:url" content="<%= siteUrl + meta.canonical %>">
<% } -%>
<meta property="og:type" content="<%= meta.type || 'website' %>">
<meta property="og:locale" content="<%= lang === 'th' ? 'th_TH' : 'en_US' %>">
<meta property="og:site_name" content="<%= siteName %>">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preload" href="/fonts/anuphan-latin.woff2" as="font" type="font/woff2" crossorigin>
<% if (lang === 'th') { -%>
<link rel="preload" href="/fonts/anuphan-thai.woff2" as="font" type="font/woff2" crossorigin>
<% } -%>
<link rel="stylesheet" href="/css/site.css?v=<%= v %>">
<script src="/js/theme.js?v=<%= v %>" defer></script>
</head>
<body>
```

- [ ] **Step 10: เขียน views/partials/header.ejs**

ลิงก์สลับภาษาเลือก href ตามลำดับนี้ ซึ่งให้ผลตรงกับตารางใน spec ข้อ 2.2 โดย route ไม่ต้องส่งค่าอื่นนอกจาก `meta`

1. ถ้า `meta.alternates` มีรายการของอีกภาษา ใช้ href นั้นโดยตัด query ทิ้ง เช่นหน้า `/th/blog?page=3` ได้ลิงก์ `/en/blog`
2. ถ้าไม่มี แต่มี `meta.canonical` ใช้ path ของ canonical ในอีกภาษาโดยตัด query และ segment สุดท้ายทิ้ง เช่นบทความ `/th/blog/x` ที่ยังไม่มีฉบับ en ได้ลิงก์ `/en/blog`
3. ถ้าไม่มีทั้งสองอย่าง เช่นหน้า error ได้ลิงก์ไปหน้าแรกของอีกภาษา

- กติกานี้ถูกต้องเมื่อหน้า list ทุกหน้า (blog, tags, projects, about, privacy) ส่ง `alternates` ครบสองภาษา และหน้า detail ส่ง `alternates` เฉพาะตอนที่ published ทั้งสองภาษา ตาม spec ข้อ 2.2
- ตอนเขียนแผนทดสอบกติกานี้กับ meta ของหน้าแรก, projects, about, blog หน้า 3, tag หน้า 2, บทความที่มีสองภาษา, บทความที่มีภาษาเดียวทั้งฝั่ง th และ en, โปรเจกต์ที่มีภาษาเดียว และหน้า error แล้วได้ href ตามตารางทุกกรณี
- `<a>` ของลิงก์สลับภาษามี `hreflang` เสมอตาม spec ข้อ 2.2 ดังนั้น test 03 ของ Task 9 ต้องตรวจว่าไม่มี `rel="alternate" hreflang="en"` ห้ามตรวจแค่คำว่า `hreflang="en"` เพราะคำนั้นจะเจอในลิงก์สลับภาษาทุกหน้า `/th`
- ไอคอนของปุ่มธีมเป็น SVG ตายตัว และ `aria-label` มาจาก `strings.js`
- ลิงก์ค้นหาใน nav มาใน Task 17

```ejs
<%
const otherAlt = (meta.alternates || []).find(alt => alt.lang === other);
let switchHref = '/' + other;
if (otherAlt) {
  switchHref = otherAlt.href.split('?')[0];
} else if (meta.canonical) {
  switchHref = '/' + other + meta.canonical.split('?')[0].slice(lang.length + 1).replace(/\/[^/]*$/, '');
}
-%>
<a class="skip-link" href="#main"><%= t.skipToContent %></a>
<header class="site-header">
  <a class="site-name" href="/<%= lang %>"><%= settings.site_name || 'Portfolio' %></a>
  <nav class="site-nav" aria-label="<%= t.navMain %>">
    <a href="/<%= lang %>/blog"><%= t.navBlog %></a>
    <a href="/<%= lang %>/projects"><%= t.navProjects %></a>
    <a href="/<%= lang %>/about"><%= t.navAbout %></a>
  </nav>
  <a class="lang-switch" href="<%= switchHref %>" lang="<%= other %>" hreflang="<%= other %>"><%= t.switchLang %></a>
  <button type="button" class="theme-toggle" data-theme-toggle aria-label="<%= t.themeToggle %>">
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/></svg>
  </button>
</header>
```

- [ ] **Step 11: เขียน views/partials/footer.ejs**

footer ปิด `</body>` และ `</html>` ของทุกหน้า ลิงก์โซเชียลมาใน Task 16 ส่วนลิงก์ privacy และ `include('partials/consent')` ก่อน `</body>` มาใน Task 19

```ejs
<footer class="site-footer">
  <p>© <%= new Date().getFullYear() %> <%= settings.site_name || 'Portfolio' %></p>
</footer>
</body>
</html>
```

- [ ] **Step 12: เขียน views/home.ejs**

หน้าแรกของ task นี้มีแค่ชื่อเว็บกับ tagline จาก settings แล้ว Task 9 เพิ่มบทความล่าสุด และ Task 12 เพิ่มโปรเจกต์ featured

```ejs
<%- include('partials/head') %>
<%- include('partials/header') %>
<main id="main" class="home">
  <section class="intro">
    <h1><%= settings.site_name || 'Portfolio' %></h1>
<% if (settings.tagline) { -%>
    <p class="tagline"><%= settings.tagline %></p>
<% } -%>
  </section>
</main>
<%- include('partials/footer') %>
```

- [ ] **Step 13: เขียน views/error.ejs**

หน้า error ส่ง `meta` ของตัวเองให้ head ผ่าน `include('partials/head', { meta: { title } })` เพื่อให้ `<title>` เป็นชื่อ error ส่วน header ยังเห็น `meta` ว่างจาก default ลิงก์สลับภาษาจึงพาไปหน้าแรกของอีกภาษา

```ejs
<%
const title = status === 404 ? t.errorNotFoundTitle : status < 500 ? t.errorBadRequestTitle : t.errorServerTitle;
const body = status === 404 ? t.errorNotFoundBody : status < 500 ? t.errorBadRequestBody : t.errorServerBody;
-%>
<%- include('partials/head', { meta: { title } }) %>
<%- include('partials/header') %>
<main id="main" class="error-page">
  <h1><%= title %></h1>
  <p><%= body %></p>
  <p><a href="/<%= lang %>/blog"><%= t.errorBackToBlog %></a> · <a href="/<%= lang %>"><%= t.errorBackHome %></a></p>
</main>
<%- include('partials/footer') %>
```

- [ ] **Step 14: เขียน server.js**

listen หลังจาก `ready` resolve เท่านั้น ถ้า schema พัง process จะจบพร้อม error และ Express 5 ส่ง error ของ `listen` เช่น `EADDRINUSE` มาที่ callback

```js
const app = require('./src/app');
const { ready } = require('./src/db');

const port = Number(process.env.PORT) || 3000;

ready.then(() => {
  app.listen(port, err => {
    if (err) throw err;
    console.log('Listening on http://localhost:' + port);
  });
});
```

- [ ] **Step 15: รัน test ให้เห็นว่าผ่าน**

Run: `node --test test/02-routing.test.js`
Expected: PASS exit code 0

```
✔ 02 routing (267.4523ms)
ℹ tests 1
ℹ suites 0
ℹ pass 1
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 6977.6372
```

- [ ] **Step 16: ตรวจ redirect ที่ / กับ server จริง**

Run: `PORT=3000 node --env-file-if-exists=.env server.js & curl -sI --retry 10 --retry-delay 1 --retry-connrefused http://localhost:3000/; kill $!; wait $! 2>/dev/null; curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/`
Expected: exit code 7 จาก curl ตัวสุดท้ายที่ต่อไม่ติด และ output

```
Listening on http://localhost:3000
HTTP/1.1 302 Found
Vary: Accept-Language, Accept
Location: /th
Content-Type: text/plain; charset=utf-8
Content-Length: 25
Date: Sun, 13 Sep 2026 16:14:07 GMT
Connection: keep-alive
Keep-Alive: timeout=5

000
```

- คำสั่งนี้รัน `node` ตรงแทน `npm start` เพื่อให้ `$!` เป็น process ของ server และ `kill $!` หยุดมันได้จริง แต่ยังอ่าน `.env` แบบเดียวกับ `npm start` และ `PORT=3000` ที่ใส่หน้าคำสั่งชนะค่า `PORT` ใน `.env` เดิมของ MVP
- ห้ามใส่ `cd <dir> &&` ไว้หน้าคำสั่ง เพราะ `&` จะส่งทั้งสายไปเป็น subshell แล้ว `$!` จะเป็น PID ของ subshell ตอนซ้อมแบบนั้น `kill` ไม่หยุด server
- ตอนซ้อมไม่มีไฟล์ `.env` Node จึงพิมพ์ `.env not found. Continuing without it.` ก่อนบรรทัด `Listening` ในโปรเจกต์จริงที่มี `.env` บรรทัดนั้นจะไม่มี
- `Vary` มี `Accept` ต่อท้าย เพราะ `res.redirect` ของ Express เติมให้เอง ส่วนบรรทัด `Date` จะเป็นเวลาที่รัน
- บรรทัดสุดท้าย `000` แปลว่า server หยุดแล้ว ถ้าได้เลขอื่น ให้หยุด process ที่ใช้ port 3000 ก่อนทำ step ถัดไป
- boot ครั้งนี้สร้าง `data/site.db` และ `data/uploads/` ซึ่ง `.gitignore` กันโฟลเดอร์ `data/` ไว้แล้ว

- [ ] **Step 17: ตรวจตาราง, WAL และ foreign_keys ของ data/site.db**

Run: `node -e 'const d=require("./src/db");d.ready.then(async()=>{const r=await d.all("SELECT name FROM sqlite_master WHERE type=? ORDER BY name",["table"]);console.log(r.length+" "+r.map(x=>x.name).join(" "));console.log("journal_mode="+(await d.get("PRAGMA journal_mode")).journal_mode+" foreign_keys="+(await d.get("PRAGMA foreign_keys")).foreign_keys);await d.close()})'`
Expected:

```
8 post_tags post_translations posts project_tags project_translations projects settings tags
journal_mode=wal foreign_keys=1
```

- [ ] **Step 18: ตรวจว่า formatDate ใช้เวลาไทยและปี พ.ศ.**

`2026-09-12T20:30:00.000Z` คือ 03:30 ของวันที่ 13 กันยายนตามเวลาไทย ถ้าลืม `timeZone` จะได้วันที่ 12

Run: `node -e 'const app=require("./src/app");const db=require("./src/db");const iso="2026-09-12T20:30:00.000Z";console.log(app.locals.formatDate("th",iso)+" | "+app.locals.formatDate("en",iso));db.ready.then(db.close)'`
Expected: `13 ก.ย. 2569 | Sep 13, 2026`

- [ ] **Step 19: ตรวจว่าไม่มีโค้ดใหม่อ้างถึง archive/**

Run: `grep -rn "archive/" --include=*.js . --exclude-dir=node_modules --exclude-dir=archive`
Expected: ไม่มี output และ exit code 1

- [ ] **Step 20: รัน npm test ทั้งชุด**

Run: `npm test`
Expected: PASS exit code 0 และมี 2 tests

```
> talkalways@1.0.0 test
> node --test test/*.test.js

✔ 01 markdown (19.0433ms)
✔ 02 routing (116.291ms)
ℹ tests 2
ℹ suites 0
ℹ pass 2
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 526.244
```

- [ ] **Step 21: Commit**

```bash
git add src/schema.sql src/db.js src/strings.js src/routes/public.js src/app.js
git add views/partials/head.ejs views/partials/header.ejs views/partials/footer.ejs views/home.ejs views/error.ejs
git add server.js test/helpers.js test/02-routing.test.js
git commit -m "feat: add database, app skeleton, public routing and error page"
```

### Task 6: CSS พื้นฐาน, ฟอนต์, ปุ่มธีม, favicon

**Phase:** 1 · **Gate tests:** ไม่มี (ตรวจด้วยมือ)

**Files:**
- Create: `public/fonts/anuphan-thai.woff2` (ดาวน์โหลดจาก Google Fonts)
- Create: `public/fonts/anuphan-latin.woff2` (ดาวน์โหลดจาก Google Fonts)
- Create: `public/css/site.css`
- Create: `public/js/theme.js`
- Create: `public/favicon.svg`
- Test: ไม่มีไฟล์ test ตรวจด้วยคำสั่งใน Step 3 และ Step 7 ถึง 11 แล้วตรวจใน browser ที่ Step 12

**Interfaces:**
- Consumes:
  - `views/partials/head.ejs` จาก Task 5 ที่มี inline script อ่าน `localStorage.getItem('theme')` แล้วตั้ง `document.documentElement.dataset.theme` และอ้างไฟล์ `/css/site.css?v=<%= v %>`, `/js/theme.js?v=<%= v %>` แบบ `defer`, `/favicon.svg`, preload `/fonts/anuphan-latin.woff2` ทุกหน้า และ preload `/fonts/anuphan-thai.woff2` เฉพาะหน้าที่ `lang` เป็น `th`
  - `views/partials/header.ejs` จาก Task 5 ที่มี `<button type="button" class="theme-toggle" data-theme-toggle aria-label="<%= t.themeToggle %>">`
  - class ที่ view ของ Task 5 ใช้: `skip-link`, `site-header`, `site-name`, `site-nav`, `lang-switch`, `theme-toggle`, `site-footer`, `home`, `intro`, `tagline`, `error-page`
  - `express.static` ของโฟลเดอร์ `public/` ที่ตั้ง `{ index: false, maxAge: '30d' }` ใน `src/app.js` และ `start()` จาก `test/helpers.js`
- Produces:
  - `public/css/site.css`
    - บรรทัดแรกของไฟล์คือ `:root {` ซึ่งเป็น block เดียวที่ประกาศ custom property ทั้ง 35 ตัวตาม spec ข้อ 3.2 ได้แก่ `--bg`, `--surface`, `--surface-soft`, `--text`, `--text-muted`, `--border`, `--border-strong`, `--accent`, `--code-bg`, `--syn-key`, `--syn-str`, `--syn-num`, `--syn-com`, `--syn-typ`, `--font-sans`, `--font-mono`, `--fs-sm`, `--fs-base`, `--fs-h3`, `--fs-h2`, `--fs-h1`, `--lh-body`, `--lh-tight`, `--sp-1`, `--sp-2`, `--sp-3`, `--sp-4`, `--sp-6`, `--sp-8`, `--sp-12`, `--r-sm`, `--r-md`, `--measure`, `--page`, `--gutter`
    - `:lang(th)` กำหนดค่าใหม่ให้ `--fs-base`, `--lh-body` และ `--lh-tight` ที่ประกาศไว้ใน `:root` แล้วตาม spec ข้อ 3.3 ไม่มีที่ไหนสร้าง token ชื่อใหม่นอก `:root`
    - style ของ element พื้นฐาน `a`, `:focus-visible`, `button`, `input`, `select`, `textarea`, `img`, `h1`, `h2`, `h3` ซึ่งหน้า admin ใช้ร่วมด้วยเพราะโหลด `site.css` ก่อน `admin.css`
    - `body` เป็น flex แนวตั้ง `main` ขยายเต็มความสูงที่เหลือ และ `.site-header`, `main`, `.site-footer` กว้างไม่เกิน `--page` จัดกลางจอ มี padding ซ้ายขวา `--gutter` ซึ่งเปลี่ยนเป็น `--sp-8` ตั้งแต่ 40rem หน้า admin ที่ใช้ `<main>` จะได้ layout นี้ด้วย ถ้าต้องการต่างไปให้ override ใน `admin.css`
    - style ของทุก class ในหัวข้อ Consumes, `.prose` สำหรับ markdown ที่ render แล้ว (heading, list, blockquote, img, hr, table ที่เลื่อนในกรอบของตัวเอง, inline code และ `pre` ที่ชนขอบจอบนมือถือ) และสี `.hljs-*` ตาม spec ข้อ 3.2
    - `.card` กับ `.excerpt` มีแค่ `font-size` และ `line-height` ใน rule typography ของ spec ข้อ 3.3 style อื่นของสอง class นี้ Task 9 เป็นคนเพิ่ม
    - task หลังที่เพิ่ม CSS ให้ต่อ section ของตัวเองท้ายไฟล์ ใช้ breakpoint ได้แค่ `@media (min-width: 40rem)` และ `@media (min-width: 64rem)` ห้ามเขียน `var(--x, fallback)` ถ้าต้องมี token ใหม่ให้เพิ่มใน `:root` block บนสุดเท่านั้น แล้วรันคำสั่งตรวจ token ของ Step 7 ใน task นี้ซ้ำ
  - `public/js/theme.js`
    - คลิก `[data-theme-toggle]` แล้ว `document.documentElement.dataset.theme` สลับระหว่าง `light` กับ `dark` และบันทึกค่าลง `localStorage` key `theme` ที่ inline script ใน `head.ejs` อ่าน
    - คลิกแรกของผู้ที่ยังไม่เคยเลือกธีม อ่าน `matchMedia('(prefers-color-scheme: dark)')` เพื่อสลับจากธีมที่เห็นอยู่จริง
    - โค้ดทั้งไฟล์อยู่ใน block `{ }` เพราะ classic script ทุกไฟล์ในหน้าเดียวกันใช้ global lexical scope ร่วมกัน ถ้าสองไฟล์ประกาศ `const` ชื่อซ้ำกันไว้ระดับบนสุด ไฟล์ที่โหลดทีหลังจะพังด้วย `SyntaxError` ดังนั้น `public/js/admin.js` ของ Task 15 และ `public/js/consent.js` ของ Task 19 ต้องห่อโค้ดด้วย block แบบนี้ด้วย
  - `public/fonts/anuphan-latin.woff2` ขนาด 35036 bytes และ `public/fonts/anuphan-thai.woff2` ขนาด 18924 bytes คือ Anuphan v6 แบบ variable น้ำหนัก 300 ถึง 700
  - `public/favicon.svg` เป็น placeholder สี่เหลี่ยมมุมมนสี `#1F5FA8` มีรูป `>_` จนกว่าเจ้าของจะเลือกแบรนด์

Expected ทุกบรรทัดของ Task 6 และ 7 มาจากการรันจริงบน Node 24.21.0 กับ npm 11.19.0 ในโฟลเดอร์ทดลองเดียวกับ Task 4 และ 5 ส่วนคำสั่ง git ซ้อมใน clone ของ repo จำลองจาก Phase 0 ที่ใส่ commit ของ Task 4 ถึง 7 ตามลำดับ path ใน output เปลี่ยนเป็น path จริงของโปรเจกต์แล้ว ตัวเลขเวลา, commit hash และค่า `v` จะไม่ตรงกัน

- [ ] **Step 1: ดู @font-face ของ Anuphan จาก Google Fonts**

Google Fonts ส่ง woff2 ให้เฉพาะ User-Agent ของ browser ใหม่ คำสั่งนี้จึงใส่ UA ของ Chrome ไว้ แอปใช้แค่ subset `thai` กับ `latin` ตาม spec ข้อ 3.3 ส่วน `vietnamese` และ `latin-ext` ไม่ใช้

Run:

```bash
curl -s -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36" "https://fonts.googleapis.com/css2?family=Anuphan:wght@300..700&display=swap"
```

Expected:

```css
/* thai */
@font-face {
  font-family: 'Anuphan';
  font-style: normal;
  font-weight: 300 700;
  font-display: swap;
  src: url(https://fonts.gstatic.com/s/anuphan/v6/2sDeZGxYgY7LkLT0mX4Dan29.woff2) format('woff2');
  unicode-range: U+02D7, U+0303, U+0331, U+0E01-0E5B, U+200C-200D, U+25CC;
}
/* vietnamese */
@font-face {
  font-family: 'Anuphan';
  font-style: normal;
  font-weight: 300 700;
  font-display: swap;
  src: url(https://fonts.gstatic.com/s/anuphan/v6/2sDeZGxYgY7LkLT0mWUDan29.woff2) format('woff2');
  unicode-range: U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB;
}
/* latin-ext */
@font-face {
  font-family: 'Anuphan';
  font-style: normal;
  font-weight: 300 700;
  font-display: swap;
  src: url(https://fonts.gstatic.com/s/anuphan/v6/2sDeZGxYgY7LkLT0mWQDan29.woff2) format('woff2');
  unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF;
}
/* latin */
@font-face {
  font-family: 'Anuphan';
  font-style: normal;
  font-weight: 300 700;
  font-display: swap;
  src: url(https://fonts.gstatic.com/s/anuphan/v6/2sDeZGxYgY7LkLT0mWoDag.woff2) format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}
```

- URL ของ block `thai` และ `latin` คือไฟล์ที่ Step 2 ดาวน์โหลด และ `unicode-range` ของสอง block นี้ถูกคัดลอกไปใส่ `site.css` ใน Step 4 ทุกตัวอักษร
- ถ้า URL หรือ `unicode-range` ของ block `thai` หรือ `latin` ต่างจากข้างบน แปลว่า Google ออกฟอนต์รุ่นใหม่แล้ว ให้หยุดและถามเจ้าของว่าจะใช้รุ่นไหน

- [ ] **Step 2: ดาวน์โหลดฟอนต์สองไฟล์**

Run: `mkdir -p public/fonts && curl -sSf -o public/fonts/anuphan-thai.woff2 https://fonts.gstatic.com/s/anuphan/v6/2sDeZGxYgY7LkLT0mX4Dan29.woff2 && curl -sSf -o public/fonts/anuphan-latin.woff2 https://fonts.gstatic.com/s/anuphan/v6/2sDeZGxYgY7LkLT0mWoDag.woff2`
Expected: ไม่มี output และ exit code 0

- [ ] **Step 3: ตรวจว่าได้ไฟล์ตัวเดียวกับตอนเขียนแผน**

Run: `sha256sum public/fonts/anuphan-latin.woff2 public/fonts/anuphan-thai.woff2 && wc -c public/fonts/anuphan-latin.woff2 public/fonts/anuphan-thai.woff2`
Expected:

```
3a98eb4685d98ab59073f8b2f9995629e23f850f737144025b3ce491f20372d6 *public/fonts/anuphan-latin.woff2
8a03cb45df9decacc349c794b1d626363109d99affb74f698a27d019996c220f *public/fonts/anuphan-thai.woff2
35036 public/fonts/anuphan-latin.woff2
18924 public/fonts/anuphan-thai.woff2
53960 total
```

- ขนาดตรงกับที่ spec ข้อ 3.3 ประมาณไว้ คือ latin 35 KB และ thai 19 KB
- ถ้า hash ไม่ตรง ห้ามใช้ไฟล์นั้น ให้หยุดและแจ้งเจ้าของ

- [ ] **Step 4: เขียน public/css/site.css**

สร้าง `public/css/site.css` ที่มีเนื้อหานี้

- `:root` block คัดลอกจาก spec ข้อ 3.2 ทุกตัวอักษรและเป็นบรรทัดแรกของไฟล์ ตามด้วย `:root[data-theme]` สองบรรทัดที่ทำให้ปุ่มธีมชนะค่าของ OS
- `src` ของ `@font-face` เขียนเป็น `/fonts/anuphan-latin.woff2` และ `/fonts/anuphan-thai.woff2` ตรงกับ href ของ preload ใน `head.ejs` ทุกตัวอักษร browser จึงดาวน์โหลดแต่ละไฟล์ครั้งเดียว และ `unicode-range` มาจาก Step 1
- rule typography (`:lang(th)`, `body, .prose, .card, .excerpt`, heading, `p, li`, `em` ภาษาไทย และ `.prose a, .prose code`) คัดลอกจาก spec ข้อ 3.3 ส่วน code block และสี `.hljs-*` คัดลอกจาก spec ข้อ 3.2
- `body` เป็น flex แนวตั้งและ `main` ขยายเต็มพื้นที่ที่เหลือ footer ของหน้าที่เนื้อหาสั้น เช่นหน้า error จึงอยู่ล่างสุดของจอ
- header ใช้ `flex-wrap` บนจอเล็ก `.site-nav` ตั้ง `order: 1` และ `flex-basis: 100%` แถวแรกจึงมีชื่อเว็บ, ลิงก์สลับภาษา และปุ่มธีม ส่วนแถวที่สองเป็นเมนู พอกว้างตั้งแต่ 40rem เมนูกลับมาอยู่แถวเดียวกัน ไม่มี hamburger menu
- บนจอเล็ก `.prose pre` ใช้ `margin-inline: calc(var(--gutter) * -1)` และตัดขอบซ้ายขวากับมุมมนออก code block จึงชนขอบจอพอดี ตั้งแต่ 40rem กลับมาเป็นกล่องในคอลัมน์ ส่วน `.prose table` เป็น `display: block` กับ `overflow-x: auto` ตารางกว้างจึงเลื่อนในกรอบของตัวเองแทนการดันหน้าให้เลื่อนแนวนอน
- `.home` เป็น flex แนวตั้งที่มี `gap` ไว้วาง section ที่ Task 9 และ 12 จะเพิ่ม
- `.error-page > *` จำกัดความกว้างที่ `--measure` แต่ตัว `main` ยังกว้างเท่า header ขอบซ้ายของเนื้อหาจึงตรงกับชื่อเว็บ
- ไฟล์นี้ไม่มี `letter-spacing`, `text-transform: uppercase`, `text-align: justify` และไม่ตั้ง `word-break` หรือ `overflow-wrap` ทั้งหน้า ตามกติกาภาษาไทยใน spec ข้อ 3.3
- ตอนเขียนแผนตรวจ `.prose` กับหน้าทดลองที่ render markdown ไทยจริงใน Edge แล้ว ที่ความกว้าง 400px หน้าไม่เลื่อนแนวนอนทั้งสองธีม `pre` กว้างเต็มจอ 0 ถึง 400px และเลื่อนในกรอบตัวเอง ตารางเลื่อนในกรอบตัวเอง `<em>` ภาษาไทยได้ `font-style: normal` กับน้ำหนัก 600 และ comment ของโค้ดไม่เอียง หน้าที่มี `.prose` จริงมาใน Task 9

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

/* Anuphan variable 300-700. src and unicode-range come from fonts.googleapis.com css2 (thai and latin subsets). */
@font-face {
  font-family: "Anuphan";
  font-style: normal;
  font-weight: 300 700;
  font-display: swap;
  src: url("/fonts/anuphan-thai.woff2") format("woff2");
  unicode-range: U+02D7, U+0303, U+0331, U+0E01-0E5B, U+200C-200D, U+25CC;
}
@font-face {
  font-family: "Anuphan";
  font-style: normal;
  font-weight: 300 700;
  font-display: swap;
  src: url("/fonts/anuphan-latin.woff2") format("woff2");
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}

/* Base */
*, *::before, *::after { box-sizing: border-box; }
body {
  margin: 0;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-sans);
}
img { max-width: 100%; height: auto; }
a { color: var(--accent); text-underline-offset: 0.2em; }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
button, input, select, textarea { font: inherit; color: inherit; }
button {
  padding: var(--sp-2) var(--sp-4);
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: var(--r-sm);
  cursor: pointer;
}
button:hover { border-color: var(--text); }
input, select, textarea {
  padding: var(--sp-2) var(--sp-3);
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: var(--r-sm);
}

/* Typography: Thai needs a larger size and taller lines so stacked marks do not touch the line above */
:lang(th) { --fs-base: 1.125rem; --lh-body: 1.9; --lh-tight: 1.45; }
body, .prose, .card, .excerpt { font-size: var(--fs-base); line-height: var(--lh-body); }
h1, h2, h3 { line-height: var(--lh-tight); text-wrap: balance; font-weight: 600; }
h1 { font-size: var(--fs-h1); }
h2 { font-size: var(--fs-h2); }
h3 { font-size: var(--fs-h3); }
p, li { text-wrap: pretty; }
:lang(th) em, :lang(th) i { font-style: normal; font-weight: 600; }
.prose a, .prose code { overflow-wrap: break-word; }

/* Layout: mobile first, breakpoints 40rem and 64rem */
.site-header, main, .site-footer {
  width: 100%;
  max-width: var(--page);
  margin-inline: auto;
  padding-inline: var(--gutter);
}
main { flex: 1 0 auto; padding-block: var(--sp-8) var(--sp-12); }

.skip-link {
  position: absolute;
  top: var(--sp-2);
  left: var(--sp-2);
  z-index: 1;
  padding: var(--sp-2) var(--sp-4);
  background: var(--surface);
  color: var(--text);
  border: 1px solid var(--border-strong);
  border-radius: var(--r-sm);
  transform: translateY(-200%);
}
.skip-link:focus { transform: none; }

.site-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--sp-2) var(--sp-4);
  padding-block: var(--sp-4);
  border-bottom: 1px solid var(--border);
}
.site-name, .site-nav a, .lang-switch { text-decoration: none; }
.site-name { margin-inline-end: auto; color: var(--text); font-weight: 600; }
.site-nav { order: 1; flex-basis: 100%; display: flex; flex-wrap: wrap; gap: var(--sp-1) var(--sp-6); }
.site-nav a, .lang-switch { color: var(--text-muted); }
.site-name:hover, .site-nav a:hover, .lang-switch:hover { color: var(--text); text-decoration: underline; }
.theme-toggle {
  display: inline-grid;
  place-items: center;
  width: 2.5rem;
  height: 2.5rem;
  padding: 0;
  background: transparent;
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 50%;
}
.theme-toggle:hover { border-color: var(--border-strong); }

.site-footer {
  padding-block: var(--sp-6) var(--sp-8);
  border-top: 1px solid var(--border);
  color: var(--text-muted);
  font-size: var(--fs-sm);
}
.site-footer p { margin: 0; }

.home { display: flex; flex-direction: column; gap: var(--sp-12); }
.intro h1 { margin: 0; }
.tagline { margin: var(--sp-3) 0 0; max-width: var(--measure); color: var(--text-muted); font-size: var(--fs-h3); }

.error-page > * { max-width: var(--measure); }
.error-page h1 { margin: 0 0 var(--sp-4); }
.error-page p { margin: 0 0 var(--sp-4); color: var(--text-muted); }

/* Prose: rendered markdown of posts, projects, About and privacy */
.prose { max-width: var(--measure); }
.prose h2 { margin: var(--sp-12) 0 var(--sp-4); }
.prose h3 { margin: var(--sp-8) 0 var(--sp-3); }
.prose p, .prose ul, .prose ol, .prose blockquote, .prose table { margin: 0 0 var(--sp-6); }
.prose ul, .prose ol { padding-inline-start: var(--sp-6); }
.prose li + li { margin-top: var(--sp-2); }
.prose blockquote { padding-inline-start: var(--sp-4); margin-inline: 0; border-inline-start: 3px solid var(--border-strong); color: var(--text-muted); }
.prose img { display: block; border-radius: var(--r-md); }
.prose hr { margin: var(--sp-12) 0; border: 0; border-top: 1px solid var(--border); }
.prose table { display: block; max-width: 100%; overflow-x: auto; border-collapse: collapse; }
.prose th, .prose td { padding: var(--sp-2) var(--sp-3); border: 1px solid var(--border); }
.prose :not(pre) > code { padding: 0.125em 0.375em; background: var(--surface-soft); border-radius: var(--r-sm); font-size: 0.875em; }

/* Code blocks and syntax colors. Comments stay upright because Thai has no italic. */
pre { background: var(--code-bg); overflow-x: auto; padding: var(--sp-4);
      border: 1px solid var(--border); border-radius: var(--r-md); tab-size: 2; }
pre, code { font-family: var(--font-mono); }
pre { font-size: var(--fs-sm); }
.prose pre { margin: 0 calc(var(--gutter) * -1) var(--sp-6); border-inline: 0; border-radius: 0; }
.hljs-keyword, .hljs-built_in, .hljs-literal, .hljs-name, .hljs-selector-tag  { color: var(--syn-key); }
.hljs-string, .hljs-regexp, .hljs-symbol, .hljs-addition                      { color: var(--syn-str); }
.hljs-number, .hljs-deletion                                                  { color: var(--syn-num); }
.hljs-comment, .hljs-quote                                                    { color: var(--syn-com); }
.hljs-title, .hljs-section, .hljs-selector-class, .hljs-selector-id           { color: var(--accent); }
.hljs-attr, .hljs-attribute, .hljs-type, .hljs-variable, .hljs-template-variable { color: var(--syn-typ); }

@media (min-width: 40rem) {
  .site-header, main, .site-footer { padding-inline: var(--sp-8); }
  .site-nav { order: 0; flex-basis: auto; margin-inline-end: var(--sp-2); }
  .prose pre { margin-inline: 0; border-inline: 1px solid var(--border); border-radius: var(--r-md); }
}

@media (min-width: 64rem) {
  main { padding-block-start: var(--sp-12); }
}
```

- [ ] **Step 5: เขียน public/js/theme.js**

สร้าง `public/js/theme.js` ไฟล์นี้โหลดแบบ `defer` จึงหาปุ่มเจอเสมอ ถ้า `localStorage` ถูกบล็อก ปุ่มยังสลับธีมได้ในหน้านั้นแต่จำค่าไม่ได้ และทั้งไฟล์อยู่ใน block `{ }` เพื่อไม่ให้ `const` ชนกับ script อื่นในหน้าเดียวกัน

```js
{
  const button = document.querySelector('[data-theme-toggle]');
  if (button) {
    button.addEventListener('click', () => {
      const root = document.documentElement;
      const current = root.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      const next = current === 'dark' ? 'light' : 'dark';
      root.dataset.theme = next;
      try { localStorage.setItem('theme', next); } catch {}
    });
  }
}
```

- [ ] **Step 6: เขียน public/favicon.svg**

สร้าง `public/favicon.svg` เป็น placeholder ที่ไม่ผูกกับชื่อ TalkAlways สีพื้นคือค่า light ของ `--accent`

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="7" fill="#1F5FA8"/>
  <path d="M9 11l5 5-5 5M17 21h7" fill="none" stroke="#FCFCFA" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
```

- [ ] **Step 7: ตรวจว่า var(--name) ทุกตัวประกาศไว้ใน :root**

คำสั่งนี้เป็นตัวตรวจแบบใช้ครั้งเดียว ไม่ได้เป็น script ใน `package.json` มันตรวจว่าไฟล์ขึ้นต้นด้วย `:root {` และมี block นี้แค่ block เดียว, ทุกชื่อที่ถูกเรียกด้วย `var()` มีอยู่ใน `:root`, ทุกชื่อที่ถูกกำหนดค่าที่ไหนก็ตามรวมถึงใน `:lang(th)` มีอยู่ใน `:root` และไม่มี `var()` ที่มี fallback

Run:

```bash
node -e 'const css=require("fs").readFileSync("public/css/site.css","utf8");const root=css.match(/^:root [{]([^}]*)[}]/)[1];const defined=new Set(root.match(/--[a-z0-9-]+(?=:)/g));const used=[...new Set(css.match(/var[(]--[a-z0-9-]+/g).map(s=>s.slice(4)))];const assigned=[...new Set(css.match(/--[a-z0-9-]+(?=:)/g))];console.log("file starts with :root { "+css.startsWith(":root {"));console.log(":root { blocks: "+css.match(/:root [{]/g).length);console.log("defined in :root: "+defined.size+", used with var(): "+used.length);console.log("used but not defined: "+(used.filter(n=>!defined.has(n)).join(" ")||"none"));console.log("assigned but not defined: "+(assigned.filter(n=>!defined.has(n)).join(" ")||"none"));console.log("var() with fallback: "+((css.match(/var[(][^)]*,/g)||[]).join(" ")||"none"))'
```

Expected:

```
file starts with :root { true
:root { blocks: 1
defined in :root: 35, used with var(): 35
used but not defined: none
assigned but not defined: none
var() with fallback: none
```

- [ ] **Step 8: ตรวจว่า url() ของ @font-face ตรงกับ href ของ preload**

Run: `grep -o 'url("/fonts/[^"]*")' public/css/site.css && grep -o 'href="/fonts/[^"]*"' views/partials/head.ejs`
Expected:

```
url("/fonts/anuphan-thai.woff2")
url("/fonts/anuphan-latin.woff2")
href="/fonts/anuphan-latin.woff2"
href="/fonts/anuphan-thai.woff2"
```

- [ ] **Step 9: ตรวจว่าทุกไฟล์ที่หน้า /th และ /en อ้างถึงโหลดได้จริง**

คำสั่งนี้เปิด app ผ่าน `start()` ของ `test/helpers.js` ซึ่งใช้ `DATA_DIR` ชั่วคราวและลบทิ้งตอนจบ ดึง href กับ src ที่ชี้ไป `/css`, `/js`, `/fonts` และ `/favicon` จากหน้า `/th` กับ `/en` แล้วขอทุกไฟล์นั้นอีกรอบ

Run:

```bash
node -e 'require("./test/helpers").start().then(async h=>{const seen=new Set();for(const page of ["/th","/en"]){const html=(await h.req(page)).text;const refs=html.match(/(href|src)="[/](css|js|fonts|favicon)[^"]*"/g).map(s=>s.slice(s.indexOf("=")+2,-1));console.log(page+" -> "+refs.join(" "));refs.forEach(u=>seen.add(u))}for(const u of seen){const r=await h.req(u);console.log(r.status+" "+r.headers.get("content-type")+" | "+r.headers.get("cache-control")+" | "+u)}await h.stop()})'
```

Expected: ค่าหลัง `?v=` เปลี่ยนทุกครั้งที่ app boot

```
/th -> /favicon.svg /fonts/anuphan-latin.woff2 /fonts/anuphan-thai.woff2 /css/site.css?v=mu0412n7 /js/theme.js?v=mu0412n7
/en -> /favicon.svg /fonts/anuphan-latin.woff2 /css/site.css?v=mu0412n7 /js/theme.js?v=mu0412n7
200 image/svg+xml | public, max-age=2592000 | /favicon.svg
200 font/woff2 | public, max-age=2592000 | /fonts/anuphan-latin.woff2
200 font/woff2 | public, max-age=2592000 | /fonts/anuphan-thai.woff2
200 text/css; charset=utf-8 | public, max-age=2592000 | /css/site.css?v=mu0412n7
200 text/javascript; charset=utf-8 | public, max-age=2592000 | /js/theme.js?v=mu0412n7
```

- [ ] **Step 10: ตรวจ logic ของ theme.js ด้วย DOM จำลอง**

รัน `theme.js` ใน `node:vm` กับ `document`, `matchMedia` และ `localStorage` ปลอม แล้วกดปุ่มสองครั้งในแต่ละกรณี แต่ละคู่ในผลลัพธ์คือ `ค่า data-theme/ค่าที่บันทึกใน localStorage` และ `-` แปลว่าไม่ได้บันทึก กรณีที่สามจำลองว่า inline script ใน `head.ejs` ตั้ง `data-theme="dark"` จาก localStorage ไว้แล้ว

Run:

```bash
node - <<'EOF'
const vm = require('node:vm');
const src = require('node:fs').readFileSync('public/js/theme.js', 'utf8');
function run(osDark, stored, storageThrows) {
  const store = new Map();
  let onClick;
  const root = { dataset: stored ? { theme: stored } : {} };
  const context = {
    document: {
      documentElement: root,
      querySelector: sel => (sel === '[data-theme-toggle]' ? { addEventListener: (type, fn) => { onClick = fn; } } : null)
    },
    matchMedia: query => ({ matches: osDark && query === '(prefers-color-scheme: dark)' }),
    localStorage: {
      setItem: (key, value) => { if (storageThrows) throw new Error('blocked'); store.set(key, value); }
    }
  };
  vm.runInNewContext(src, context);
  const seen = [];
  for (let i = 0; i < 2; i++) {
    onClick();
    seen.push(root.dataset.theme + '/' + (store.get('theme') || '-'));
  }
  return seen.join(' ');
}
console.log('os dark, no choice:        ' + run(true));
console.log('os light, no choice:       ' + run(false));
console.log('stored dark, os light:     ' + run(false, 'dark'));
console.log('localStorage blocked:      ' + run(true, undefined, true));
EOF
```

Expected:

```
os dark, no choice:        light/light dark/dark
os light, no choice:       dark/dark light/light
stored dark, os light:     light/light dark/dark
localStorage blocked:      light/- dark/-
```

- [ ] **Step 11: รัน npm test ทั้งชุด**

Run: `npm test`
Expected: PASS exit code 0 และยังมี 2 tests เพราะ task นี้ไม่มี test ใหม่

```
> talkalways@1.0.0 test
> node --test test/*.test.js

✔ 01 markdown (15.199ms)
✔ 02 routing (109.2455ms)
ℹ tests 2
ℹ suites 0
ℹ pass 2
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 517.8669
```

บางครั้ง npm พิมพ์ `npm notice New major version of npm available! 11.19.0 -> 12.0.2` ต่อท้าย ข้อความนี้ไม่เกี่ยวกับผล test และห้ามอัปเกรด npm ตาม notice เพราะ CI ใช้ npm ที่มากับ Node 24

- [ ] **Step 12: ตรวจธีม, ฟอนต์ และความกว้าง 400px ใน browser**

**Owner:** ทำทุกข้อข้างล่างใน Chrome หรือ Edge บนเครื่องนี้ แล้วบอก executor ว่าผ่านครบหรือข้อไหนไม่ผ่าน executor ต้องหยุดรอคำตอบและห้าม commit ถ้ามีข้อที่ไม่ผ่าน ตอนเขียนแผนตรวจข้อ 3, 4 และ 6 ถึง 10 ด้วย Edge แบบ headless ผ่าน DevTools Protocol แล้ว สีและจำนวนแถวข้างล่างมาจากการตรวจนั้น ส่วนข้อ 11 ตรวจแค่ว่า `favicon.svg` render ได้ที่ขนาด 16, 32 และ 128px และการดูว่าจอกะพริบหรือไม่ในข้อ 4 ต้องใช้ตาคน

1. เปิด Git Bash ที่ root ของโปรเจกต์แล้วรัน `PORT=3000 npm start` ต้องเห็น `Listening on http://localhost:3000` การใส่ `PORT=3000` หน้าคำสั่งทำให้ไม่สนค่า `PORT` ใน `.env` เดิมของ MVP
2. เปิด `http://localhost:3000/th` กด F12 ไปที่แท็บ Application แล้วเลือก Local storage > `http://localhost:3000` ถ้ามี key `theme` ให้ลบทิ้งแล้ว reload
3. กด Ctrl+Shift+P ใน DevTools พิมพ์ `Show Rendering` แล้วกด Enter ตั้ง Emulate CSS media feature prefers-color-scheme เป็น `prefers-color-scheme: light` แท็บ Elements > `<body>` > Computed ต้องมี `background-color: rgb(252, 252, 250)` จากนั้นเปลี่ยนเป็น `prefers-color-scheme: dark` หน้าต้องมืดทันทีโดยไม่ต้อง reload และ `background-color` ต้องเป็น `rgb(18, 19, 21)`
4. ขณะที่ยังจำลอง dark อยู่ กดปุ่มวงกลมที่มุมขวาบน หน้าต้องสว่างและ Local storage ต้องมี `theme` เป็น `light` กด F5 หน้าต้องยังสว่างโดยไม่มีจังหวะที่จอมืดวาบขึ้นมาก่อน กดปุ่มอีกครั้ง `theme` ต้องเป็น `dark` แล้วกด F5 หน้าต้องยังมืด
5. ลบ key `theme` แล้วตั้ง Rendering กลับเป็น `No emulation`
6. ไปแท็บ Network ติ๊ก Disable cache เลือก filter Font แล้ว reload หน้า `/th` ต้องมี `anuphan-latin.woff2` หนึ่งแถวและ `anuphan-thai.woff2` หนึ่งแถว สถานะ 200 ทั้งคู่ ถ้าไฟล์ไหนขึ้นสองแถว แปลว่า href ของ preload กับ `url()` ใน `@font-face` ไม่ตรงกัน
7. ไปแท็บ Elements คลิก `<h1>` แล้วเลื่อนแท็บ Computed ลงไปที่ Rendered Fonts ต้องเป็น `Anuphan` แบบ Network resource ไม่ใช่ฟอนต์ของเครื่อง
8. เปิด `http://localhost:3000/en` แท็บ Network ต้องมีฟอนต์ละหนึ่งแถวเช่นกัน ไฟล์ thai ถูกโหลดบนหน้า `/en` เพราะลิงก์สลับภาษาเขียนว่า ไทย แต่ไม่ได้ถูก preload ตาม spec ข้อ 3.3
9. กด Ctrl+Shift+M เปิด device toolbar ตั้งความกว้าง 400 ความสูง 900 แล้วเปิด `/th`, `/en` และ `http://localhost:3000/nope` ทีละหน้า ทั้งธีมสว่างและมืดโดยสลับด้วยปุ่มธีม ทุกหน้าต้องไม่มี scrollbar แนวนอน header แถวแรกมีชื่อเว็บ ลิงก์สลับภาษา และปุ่มธีม ส่วนแถวที่สองมีเมนู บทความ โปรเจกต์ เกี่ยวกับ (บนหน้า `/en` คือ Blog Projects About) หน้า `/nope` ต้องแสดง ไม่พบหน้านี้ พร้อมลิงก์สองลิงก์ และ footer อยู่ล่างสุดของจอ
10. กด F5 บนหน้า `/th` แล้วกด Tab หนึ่งครั้งโดยไม่คลิกอะไร ลิงก์ ข้ามไปที่เนื้อหา ต้องโผล่ที่มุมซ้ายบนพร้อมกรอบสีน้ำเงิน ลบ key `theme` ทิ้งถ้ามีค่าค้างจากข้อ 9 แล้วปิด device toolbar
11. แท็บของ browser ต้องแสดง favicon เป็นสี่เหลี่ยมสีน้ำเงินที่มีรูป `>_` สีขาว
12. กลับไปที่ Git Bash แล้วกด Ctrl+C เพื่อหยุด server

- [ ] **Step 13: Commit**

```bash
git add public/css/site.css public/js/theme.js public/favicon.svg public/fonts/anuphan-latin.woff2 public/fonts/anuphan-thai.woff2
git commit -m "feat: add base stylesheet, self-hosted Anuphan fonts, theme toggle and favicon"
```

Expected:

```
[main 21c9d8c] feat: add base stylesheet, self-hosted Anuphan fonts, theme toggle and favicon
 5 files changed, 203 insertions(+)
 create mode 100644 public/css/site.css
 create mode 100644 public/favicon.svg
 create mode 100644 public/fonts/anuphan-latin.woff2
 create mode 100644 public/fonts/anuphan-thai.woff2
 create mode 100644 public/js/theme.js
```

### Task 7: GitHub Actions CI

**Phase:** 1 · **Gate tests:** ไม่มี (ตรวจด้วยมือ)

**Files:**
- Create: `.github/workflows/ci.yml`
- Test: ไม่มีไฟล์ test ขั้นตรวจ `<%-` ถูกซ้อมในเครื่องที่ Step 4 และ 5 และผลบน GitHub ตรวจที่ Step 14 ถึง 17

**Interfaces:**
- Consumes:
  - `package-lock.json` ที่ commit ใน Task 4 ซึ่ง `npm ci` และ `cache: npm` ของ `actions/setup-node` ต้องใช้
  - script `npm test` ที่เป็น `node --test test/*.test.js` จาก Task 4 และ test 01, 02 กับ `test/helpers.js` จาก Task 4 และ 5
  - template ใน `views/` จาก Task 5 ที่ใช้ `<%-` แค่กับ `include(`
  - remote `origin` พร้อม upstream `origin/main` จาก Task 3, `gh` ที่ login บัญชี `Su-Korawit` และมี scope `workflow` ตาม Task 3 Step 2 และ commit ของ Task 4, 5, 6 ที่ยังไม่ได้ push
- Produces:
  - workflow ชื่อ `ci` ที่ `.github/workflows/ci.yml` มี job `test` บน `ubuntu-latest` ทำงานเมื่อ push ไป `main` และทุก pull request ขั้นตอนคือ `actions/checkout@v7`, `actions/setup-node@v7` (`node-version: 24`, `cache: npm`), `npm ci`, `npm test` และขั้นตรวจ `<%-`
  - ขั้นตรวจ `<%-` ดูทีละบรรทัด task หลังที่เขียน `<%-` ต้องให้ `md.render(` หรือ `include(` อยู่บรรทัดเดียวกับ `<%-` ไม่อย่างนั้น CI จะ fail
  - ตั้งแต่ task นี้ ทุก push ไป `main` รัน test ทั้งชุดบน GitHub task หลังไม่ต้องแก้ไฟล์นี้ และหา run ของ commit ล่าสุดได้ด้วย `gh run list --workflow ci.yml --commit "$(git rev-parse HEAD)"`

- [ ] **Step 1: เขียน .github/workflows/ci.yml**

สร้าง `.github/workflows/ci.yml` โดยคัดลอกจาก spec ข้อ 4.4 ทุกตัวอักษร รวมบรรทัด comment แรก

- ตรวจเมื่อ 2026-09-14 ด้วย `git ls-remote` แล้วว่า `actions/checkout` และ `actions/setup-node` มี tag `v7` จริง
- Node 24 รุ่นล่าสุดตอนเขียนแผนคือ v24.21.0 ซึ่งมากับ npm 11.19.0 ตัวเดียวกับในเครื่อง `npm ci` บน GitHub จึงควรได้ผลเหมือน Step 7

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

- [ ] **Step 2: ตรวจว่า YAML parse ได้และมีโครงตามที่ตั้งใจ**

`npx -y` แค่เติม npm cache ของผู้ใช้ ไม่ได้เพิ่มอะไรใน `package.json`

Run: `npx -y js-yaml@5.4.2 .github/workflows/ci.yml`
Expected: exit code 0 และ output

```json
{
  "name": "ci",
  "on": {
    "push": {
      "branches": [
        "main"
      ]
    },
    "pull_request": null
  },
  "jobs": {
    "test": {
      "runs-on": "ubuntu-latest",
      "steps": [
        {
          "uses": "actions/checkout@v7"
        },
        {
          "uses": "actions/setup-node@v7",
          "with": {
            "node-version": 24,
            "cache": "npm"
          }
        },
        {
          "run": "npm ci"
        },
        {
          "run": "npm test"
        },
        {
          "name": "unescaped EJS only for md.render and include",
          "run": "if grep -rn \"<%-\" views/ | grep -v -e \"md.render(\" -e \"include(\"; then\n  echo \"found <%- outside md.render or include\"\n  exit 1\nfi\n"
        }
      ]
    }
  }
}
```

- key `on` ยังเป็น string `"on"` ไม่กลายเป็น `true` แบบ YAML 1.1
- `"pull_request": null` แปลว่าทำงานกับทุก pull request โดยไม่กรอง branch

- [ ] **Step 3: ตรวจ workflow กับ schema ของ GitHub Actions**

Run: `npx -y @action-validator/cli@0.6.0 .github/workflows/ci.yml`
Expected: ไม่มี output และ exit code 0

ตอนเขียนแผนลองกับไฟล์ที่ไม่มี `runs-on` และมี `steps: 42` แล้ว เครื่องมือนี้ตอบ exit code 1 พร้อม JSON ที่มี error `required` ที่ path `/jobs/test/runs-on` จึงรู้ว่ามันตรวจจริง ไม่ได้ผ่านทุกไฟล์

- [ ] **Step 4: รันขั้นตรวจ <%- กับ views ปัจจุบัน**

คำสั่งนี้ดึง script ของขั้นสุดท้ายออกมาจาก YAML ที่ parse แล้ว จึงทดสอบข้อความเดียวกับที่ GitHub จะรัน แล้วรันสองแบบ คือ `bash -e` ซึ่งเป็น shell default ของ `run` บน ubuntu และ `bash --noprofile --norc -eo pipefail` ซึ่ง GitHub ใช้เมื่อระบุ `shell: bash`

Run:

```bash
T=$(mktemp -d) && npx -y js-yaml@5.4.2 .github/workflows/ci.yml > "$T/ci.json" && node -e 'require("fs").writeFileSync(process.argv[2], require(process.argv[1]).jobs.test.steps.at(-1).run)' "$T/ci.json" "$T/guard.sh" && cat "$T/guard.sh" && bash -e "$T/guard.sh"; echo "bash -e exit=$?"; bash --noprofile --norc -eo pipefail "$T/guard.sh"; echo "bash -eo pipefail exit=$?"; rm -rf "$T"
```

Expected: script ที่ดึงออกมา แล้วตามด้วย exit 0 ทั้งสองแบบโดยไม่มีบรรทัดอื่น เพราะ `<%-` ทุกตัวใน `views/` ตอนนี้เป็น `include(`

```
if grep -rn "<%-" views/ | grep -v -e "md.render(" -e "include("; then
  echo "found <%- outside md.render or include"
  exit 1
fi
bash -e exit=0
bash -eo pipefail exit=0
```

- [ ] **Step 5: ตรวจว่าขั้นนี้ fail เมื่อมี <%- ที่ไม่ปลอดภัย**

ทดสอบกับสำเนาของ `views/` ใน temp dir จึงไม่มีไฟล์ปลอมหลงอยู่ใน repo ไฟล์ปลอมมีสองบรรทัด บรรทัดแรกใช้ `md.render(` จึงต้องผ่าน บรรทัดที่สองส่ง title ออกไปโดยไม่ escape จึงต้องถูกจับ

Run:

```bash
T=$(mktemp -d) && npx -y js-yaml@5.4.2 .github/workflows/ci.yml > "$T/ci.json" && node -e 'require("fs").writeFileSync(process.argv[2], require(process.argv[1]).jobs.test.steps.at(-1).run)' "$T/ci.json" "$T/guard.sh" && cp -r views "$T/views" && echo '<%- md.render(tr.body_markdown) %>' > "$T/views/bad.ejs" && echo '<h1><%- post.title %></h1>' >> "$T/views/bad.ejs" && (cd "$T" && bash -e guard.sh; echo "bash -e exit=$?"; bash --noprofile --norc -eo pipefail guard.sh; echo "bash -eo pipefail exit=$?"); rm -rf "$T"
```

Expected:

```
views/bad.ejs:2:<h1><%- post.title %></h1>
found <%- outside md.render or include
bash -e exit=1
views/bad.ejs:2:<h1><%- post.title %></h1>
found <%- outside md.render or include
bash -eo pipefail exit=1
```

- [ ] **Step 6: ตรวจว่า package-lock.json อยู่ใน git**

Run: `git ls-files package-lock.json`
Expected: `package-lock.json`

ถ้าไม่มี output ทั้ง `cache: npm` และ `npm ci` บน GitHub จะ fail ทันที ให้กลับไปตรวจ commit ของ Task 4

- [ ] **Step 7: ติดตั้ง dependencies แบบเดียวกับ CI**

- `npm ci` ลบ `node_modules` แล้วติดตั้งตาม `package-lock.json` ทุกตัวอักษร ถ้า lock ไม่ตรงกับ `package.json` คำสั่งจะ fail ในเครื่องแบบเดียวกับที่จะ fail บน GitHub
- คำเตือน `install-scripts` ท้าย output แค่บอกว่า script ติดตั้งของ sqlite3 ยังไม่อยู่ใน `allowScripts` npm 11.19.0 ยังรัน script นั้นให้ และ Step 8 พิสูจน์ว่า sqlite3 โหลดได้เพราะ test 02 เปิด DB จริง
- ห้ามรันคำสั่ง `npm install-scripts` ใดๆ เพราะคำสั่งนั้นเขียน field `allowScripts` ลง `package.json` ซึ่งไม่อยู่ในรายการ Files ของ task นี้

Run: `npm ci`
Expected: exit code 0 และ output

```
npm warn deprecated prebuild-install@7.1.3: No longer maintained. Please contact the author of the relevant native addon; alternatives are available.

added 146 packages, and audited 147 packages in 7s

43 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities
npm warn install-scripts 1 package has install scripts not yet covered by allowScripts:
npm warn install-scripts   sqlite3@6.0.1 (install: prebuild-install -r napi || node-gyp rebuild)
npm warn install-scripts
npm warn install-scripts Run `npm install-scripts ls` to review, or `npm install-scripts approve <pkg>` to allow.
```

- [ ] **Step 8: รัน npm test หลัง npm ci**

Run: `npm test`
Expected: PASS exit code 0 และมี 2 tests

```
> talkalways@1.0.0 test
> node --test test/*.test.js

✔ 01 markdown (30.4853ms)
✔ 02 routing (309.5838ms)
ℹ tests 2
ℹ suites 0
ℹ pass 2
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 3600.7698
```

ตอนเขียนแผนยังซ้อมอีกชั้นหนึ่ง คือ clone repo จำลองที่มี commit ของ Task 4 ถึง 7 ไปไว้ในโฟลเดอร์ใหม่ที่ไม่มีไฟล์นอก git แล้วรัน `npm ci`, `npm test` และขั้นตรวจ `<%-` ตามลำดับของ workflow ทุกขั้นได้ exit code 0 และ test ผ่าน 2 ข้อ แปลว่า commit ของ Task 4 ถึง 7 มีไฟล์ครบสำหรับ CI

- [ ] **Step 9: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: run tests and the unescaped EJS check on GitHub Actions"
```

Expected:

```
[main 384d208] ci: run tests and the unescaped EJS check on GitHub Actions
 1 file changed, 23 insertions(+)
 create mode 100644 .github/workflows/ci.yml
```

- [ ] **Step 10: ตรวจว่ามี 4 commit ที่ยังไม่ได้ push และไม่มีไฟล์ค้าง**

Run: `git status --short | wc -l`
Expected: `0`

Run: `git status -sb | head -1`
Expected: `## main...origin/main [ahead 4]`

Run: `git log --format=%s origin/main..HEAD`
Expected:

```
ci: run tests and the unescaped EJS check on GitHub Actions
feat: add base stylesheet, self-hosted Anuphan fonts, theme toggle and favicon
feat: add database, app skeleton, public routing and error page
feat: replace MVP dependencies and add markdown renderer
```

ถ้า `git status --short | wc -l` ไม่ได้ `0` ให้ดู `git status --short` ว่าไฟล์ไหนค้าง แล้วหยุดถามเจ้าของก่อน push ห้าม add ไฟล์ที่ไม่อยู่ในรายการ Files ของ Task 4 ถึง 7

- [ ] **Step 11: push ไป GitHub แล้วตรวจผล**

Run: `git push origin main`
Expected: exit code 0 และ output สองบรรทัดนี้ ส่วนเลข commit คือ commit ของ Task 2 กับ commit ของ Task 7 ในเครื่อง

```
To https://github.com/Su-Korawit/portfolio.git
   36c531f..384d208  main -> main
```

- ถ้าเจ้าของตั้งชื่อ repo อื่นใน Task 3 URL จะเป็นชื่อนั้น
- ถ้า exit code ไม่ใช่ 0 และ output มีข้อความ ``without `workflow` scope`` แปลว่า credential ที่ Git Credential Manager ใช้ push ไม่มีสิทธิ์สร้างไฟล์ workflow ให้ทำ Step 12
- ถ้า push ถูกปฏิเสธด้วยสาเหตุอื่น ให้หยุดและแจ้งเจ้าของพร้อม output ทั้งหมด ห้ามใช้ `--force`
- ถ้า push ผ่าน ให้ข้าม Step 12 ไป Step 13

- [ ] **Step 12: ให้ git ใช้ credential ของ gh แล้ว push ใหม่ (ทำเฉพาะเมื่อ Step 11 ถูกปฏิเสธเรื่อง workflow scope)**

**Owner:** รัน `gh auth setup-git` ใน Git Bash คำสั่งนี้แก้ `~/.gitconfig` ระดับ global ให้ git ใช้ `gh` เป็น credential helper ของทุก host ที่ `gh` login ไว้ ซึ่ง token ของ `gh` มี scope `workflow` แล้วตาม Task 3 Step 2 การเปลี่ยน credential helper กระทบทุก repo ในเครื่อง executor จึงห้ามรันเองและต้องรอให้เจ้าของบอกว่าทำแล้ว จากนั้น executor รัน `git push origin main` อีกครั้ง ต้องได้ exit code 0 และ output ตาม Step 11

- [ ] **Step 13: ตรวจว่า branch ตรงกับ origin แล้ว**

Run: `git status`
Expected:

```
On branch main
Your branch is up to date with 'origin/main'.

nothing to commit, working tree clean
```

Run: `git log --oneline origin/main | wc -l`
Expected: `7`

- [ ] **Step 14: รอ run ของ commit นี้แล้วดูจนจบ**

Run:

```bash
SHA=$(git rev-parse HEAD); RUN_ID=""; for i in $(seq 1 24); do RUN_ID=$(gh run list --workflow ci.yml --commit "$SHA" --json databaseId -q '.[0].databaseId'); [ -n "$RUN_ID" ] && break; sleep 5; done; echo "run=$RUN_ID"; gh run watch "$RUN_ID" --exit-status
```

Expected: exit code 0 บรรทัดแรกเป็น `run=` ตามด้วยเลข run และบรรทัดสุดท้ายลงท้ายด้วย `completed with 'success'`

- GitHub ใช้เวลาไม่กี่วินาทีกว่า run จะขึ้น loop จึงถามซ้ำทุก 5 วินาทีนานสุด 2 นาที `gh run list` พิมพ์ว่างเมื่อยังไม่มี run ของ commit นั้น
- ถ้าตอนเริ่ม watch run จบไปแล้ว `gh run watch` จะพิมพ์บรรทัดเดียวในรูป `Run ci (<เลข run>) has already completed with 'success'` รูปแบบนี้และพฤติกรรมของ `gh run list` ตอนไม่มี run ตรวจกับ run จริงของ repo สาธารณะ `actions/checkout` แล้ว
- ถ้าได้ `run=` ว่าง แปลว่า workflow ไม่ถูก trigger ให้ตรวจว่า Step 11 push ไป `main` สำเร็จและไฟล์อยู่ที่ `.github/workflows/ci.yml` จริง
- ถ้า exit code ไม่ใช่ 0 ให้รัน `gh run view <เลข run> --log-failed` ดูขั้นที่พัง แก้ให้ผ่านแล้ว commit กับ push ใหม่ ห้ามเริ่ม Task 8 จนกว่า CI จะผ่าน

- [ ] **Step 15: ยืนยันว่า run ที่ผ่านเป็นของ commit ล่าสุด**

Run: `gh run list --workflow ci.yml --commit "$(git rev-parse HEAD)" --json status,conclusion,headSha -q '.[0] | .status + " " + .conclusion + " " + .headSha' && git rev-parse HEAD`
Expected: สองบรรทัด บรรทัดแรกคือ `completed success` ตามด้วยช่องว่างหนึ่งตัวและ sha 40 ตัวของ commit ที่ run ใช้ บรรทัดที่สองคือ sha 40 ตัวของ `HEAD` ในเครื่อง และ sha ทั้งสองบรรทัดต้องเท่ากันทุกตัวอักษร

- คำสั่งเดียวกันนี้ตรวจกับ run ที่ผ่านของ repo สาธารณะ `actions/checkout` แล้ว (ใส่ `-R actions/checkout --workflow test.yml`) บรรทัดแรกได้ `completed success 17f35cde8e19f26048cbdf6c7b11d9eb77b747e2`
- ถ้าบรรทัดแรกไม่ขึ้นต้นด้วย `completed success` หรือ sha ไม่ตรงกัน ห้ามเริ่ม Task 8 ให้กลับไป Step 14

- [ ] **Step 16: หา URL ของหน้า Actions**

Run: `echo "$(gh repo view --json url -q .url)/actions"`
Expected: `https://github.com/Su-Korawit/portfolio/actions` หรือชื่อ repo ที่เจ้าของเลือกใน Task 3

- [ ] **Step 17: ดูเครื่องหมายผ่านบนหน้า Actions**

**Owner:** เปิด URL จาก Step 16 ใน browser run บนสุดต้องมีชื่อ `ci: run tests and the unescaped EJS check on GitHub Actions` พร้อมเครื่องหมายถูกสีเขียว คลิกเข้าไปแล้ว job `test` ต้องมีขั้น `Run npm ci`, `Run npm test` และ `unescaped EJS only for md.render and include` ที่ผ่านทุกขั้น

Task นี้มี commit เดียวที่ Step 9 ส่วน Step 11 ถึง 17 ไม่มีไฟล์เปลี่ยน

## Phase 2: Admin login

Phase นี้เพิ่มหน้า login ของ admin คนเดียว, guard ที่บังคับ login ให้ทุก route ใต้ `/admin`, cookie ในรูป `เวลาหมดอายุ:epoch`, route ออกจากระบบทุกเครื่อง และสคริปต์สร้าง hash ของรหัสผ่าน พอจบ phase นี้ `npm test` จะผ่าน 4 tests และเจ้าของ login ใน browser ด้วยรหัสที่ hash ไว้ใน `.env` ได้ ส่วนปุ่มออกจากระบบทุกเครื่องในหน้า settings มาใน Task 16

- ทุกคำสั่งรันใน Git Bash ที่ root ของโปรเจกต์ `/d/Ikkyusan/Downloads/TalkAlways_MVP/talkalways` และ `node -v` ต้องได้ `v24.21.0`
- Expected ทุกบรรทัดมาจากการรันจริงบน Node 24.21.0 ในโฟลเดอร์ทดลองที่สร้างจากโค้ดในแผนนี้ตามลำดับตั้งแต่ Task 4 path ใน output เปลี่ยนเป็น path จริงของโปรเจกต์แล้ว ส่วนตัวเลขเวลา เช่น `(116.0295ms)` และ `duration_ms` จะไม่ตรงกัน
- คำสั่ง git ของ Step 25 และ 26 ซ้อมใน repo ทิ้งได้ที่มีไฟล์ของ Task 1 ถึง 7 commit ไว้แล้ว เลข commit hash จึงไม่ตรงกัน
- ถ้า output จริงต่างจาก Expected ในเรื่องอื่นนอกจาก path, เวลา และ commit hash ให้หยุดและหาสาเหตุก่อนทำ step ถัดไป

### Task 8: admin login, guard, epoch, revoke, สคริปต์ hash

**Phase:** 2 · **Gate tests:** 07-admin-guard, 08-login-cookie

**Files:**
- Create: `scripts/hash-password.js`
- Create: `src/routes/admin.js`
- Create: `views/admin/head.ejs`
- Create: `views/admin/foot.ejs`
- Create: `views/admin/login.ejs`
- Create: `views/admin/posts.ejs`
- Create: `public/css/admin.css`
- Modify: `src/app.js` (เพิ่ม require ของ `cookie-parser` กับ `./routes/admin`, แทรก `app.use(cookieParser(process.env.SESSION_SECRET))` ระหว่าง middleware ค่า default กับ `GET /` และ mount `/admin` ต่อจาก loop ของภาษา)
- Modify: `test/helpers.js` (เพิ่ม `signCookie` และ `H.login`)
- Modify: `.env.example` (เพิ่ม `SESSION_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`)
- Modify (นอก git): `.env` ของเครื่องนี้ โดยเจ้าของใน Step 22
- Test: `test/07-admin-guard.test.js`
- Test: `test/08-login-cookie.test.js`

**Interfaces:**
- Consumes:
  - `src/db.js` จาก Task 5: `run(sql, params)`, `get(sql, params)`, `all(sql, params)` และตาราง `settings (key, lang, value)` ที่มี `PRIMARY KEY (key, lang)`
  - `src/app.js` จาก Task 5: middleware ค่า default ห้าตัว, `app.locals.v`, `app.locals.formatDate(lang, iso)`, 404 handler และ error handler ที่ render `views/error.ejs`
  - `test/helpers.js` จาก Task 5: `start()`, `H.req(path, opts)` ที่มี cookie jar, `toForm(obj)` และ env `SESSION_SECRET = 'test-secret'`, `ADMIN_USERNAME = 'admin'`, `ADMIN_PASSWORD_HASH = bcrypt.hashSync('pw', 4)`, `NODE_ENV = 'test'`
  - `public/css/site.css` จาก Task 6: token ใน `:root`, style ของ `button`, `input`, `:focus-visible` และ class `skip-link`, `site-header`, `site-name`, `site-nav`
  - dependencies `express`, `cookie-parser`, `bcryptjs` จาก Task 4
- Produces:
  - `src/routes/admin.js`: `module.exports = router` มีชื่อภายใน `COOKIE`, `MAX_AGE`, `issue(res, epoch)`, `sessionEpoch() -> Promise<string>` และ `requireAdmin` ลำดับในไฟล์คือ `express.urlencoded({ extended: true, limit: '1mb' })`, `GET /login`, `POST /login`, `router.use(requireAdmin)`, `GET /`, `POST /logout`, `POST /sessions/revoke`, `GET /posts` แล้วจึง `module.exports`
    - Task 10 ลบ route ที่ขึ้นต้นด้วย `router.get('/posts', async (req, res) => {` ทั้ง block ออกจากไฟล์นี้ ย้าย query รายการบทความไปเป็น `router.get('/')` ใน `src/routes/admin-posts.js` แล้วใส่ `router.use('/posts', require('./admin-posts'))` ไว้ที่เดิม
    - Task 13 เพิ่ม `router.use('/projects', require('./admin-projects'))` ส่วน Task 14, 15, 16 เพิ่ม route ของ `/tags`, `/upload`, `/settings` ทุกตัวต่อจาก `router.use(requireAdmin)` และก่อน `module.exports`
    - cookie `ta_admin` มีค่า `<เวลาหมดอายุเป็น ms>:<epoch>` ที่ sign ด้วย `SESSION_SECRET` ส่วน epoch เก็บเป็น text ใน `settings` ที่ `key = 'session_epoch'` และ `lang = '*'` ถ้าไม่มี row ถือว่าเป็น `'0'` Task 16 แค่เพิ่มปุ่มที่ POST ไป `/admin/sessions/revoke` เพราะ route นี้มีแล้ว
    - `POST /admin/login` ที่ผิดตอบ 401 และ render `admin/login` ด้วย `{ error, username }` ที่ถูกตอบ 303 ไป `/admin/posts`
  - `views/admin/head.ejs`: เปิดตั้งแต่ `<!doctype html>` จนถึงแถบเมนูหลัง `<body>` มี `<html lang="th">`, `<meta name="robots" content="noindex">`, `<title><%= locals.title %> | หลังบ้าน</title>`, โหลด `site.css` ก่อน `admin.css` พร้อม `?v=` และมีแถบเมนู บทความ โปรเจกต์ แท็ก ตั้งค่า ลิงก์ ดูหน้าเว็บ และปุ่ม ออกจากระบบ ไฟล์นี้เป็นฉบับสุดท้าย task หลังไม่ต้องแก้ ลิงก์ของหน้าที่ยังไม่มีจะได้ 404 จนกว่า Task 13, 14 และ 16 จะสร้าง
  - รูปแบบของทุกหน้า admin คือ `<%- include('head', { title: '<ชื่อหน้า>', section: '<posts|projects|tags|settings>' }) %>`, `<main id="main">` แล้วจบด้วย `<%- include('foot') %>` ส่วนหน้าที่ไม่ต้องมีแถบเมนูส่ง `nav: false`
  - `views/admin/foot.ejs`: ปิด `</body>` กับ `</html>` เท่านั้น และไม่โหลด `admin.js` Task 15 จะใส่ `<script src="/js/admin.js?v=<%= v %>" defer></script>` ใน editor ของบทความและโปรเจกต์เอง
  - `views/admin/login.ejs`: อ่าน `locals.error` และ `locals.username`
  - `views/admin/posts.ejs`: `render('admin/posts', { posts })` แต่ละแถวคือ `{ id, updated_at, title, th, en }` โดย `th` กับ `en` เป็น `'published'`, `'draft'` หรือ `null` แสดง chip `เผยแพร่`, `แบบร่าง`, `ไม่มีฉบับแปล` และข้อความ `ยังไม่มีบทความ` เมื่อไม่มีแถว หน้านี้ยังไม่มีลิงก์ใดๆ Task 10 เพิ่มลิงก์ไป `/admin/posts/new` และทำให้หัวข้อเป็นลิงก์ไป `/admin/posts/:id`
  - `public/css/admin.css`: class `admin-view-site`, `admin-logout`, `admin-form`, `form-error`, `admin-login`, `admin-empty`, `table-scroll`, `admin-table`, `admin-date`, `chip`, `chip-published`, `chip-draft`, `chip-none` และ `.site-nav a[aria-current="page"]` Task 10 และ 13 ใช้ `table-scroll`, `admin-table`, `admin-date` และ `chip` ซ้ำได้ Task 10 ต่อ section ของ editor และแถบ preview ท้ายไฟล์ ไฟล์นี้ใช้กติกาเดียวกับ `site.css` คือห้ามประกาศ custom property, ห้ามเขียน `var(--x, fallback)` และใช้ breakpoint ได้แค่ `40rem` กับ `64rem`
  - `test/helpers.js`: `module.exports = { start, toForm, signCookie, run, get, all }` และ `start()` คืน `{ base, req, login, stop }`
    - `H.login(password = 'pw')` POST `{ username: 'admin', password }` ไป `/admin/login` ผ่าน jar request ถัดไปของ `H.req` จึงมี cookie ของ admin
    - `signCookie(value, secret = 'test-secret')` คืน `'s:' + value + '.' + signature` ที่ยังไม่ encode test ส่งเป็น `{ jar: false, cookie: 'ta_admin=' + encodeURIComponent(signCookie(exp + ':' + epoch)) }`
    - Task 9, 12 และ 14 เพิ่ม `insertPost`, `insertProject` และ `insertTag` เข้า `module.exports` ตัวเดียวกันนี้
  - `scripts/hash-password.js`: พิมพ์ bcrypt hash cost 12 ที่ขึ้นต้นด้วย `$2b$12$` ยาว 60 ตัวอักษร และ exit 1 พร้อมบรรทัด usage เมื่อจำนวน argument ไม่ใช่หนึ่งตัวหรือ passphrase สั้นกว่า 20 ตัวอักษร
  - `.env.example`: มี 7 ตัวแปร Task 19 จะเพิ่ม `GA_MEASUREMENT_ID`

- [ ] **Step 1: เพิ่ม signCookie และ H.login ใน test/helpers.js**

แทนที่เนื้อหาทั้งหมดของ `test/helpers.js` ด้วยข้อความนี้ ส่วนที่เปลี่ยนจาก Task 5 มีสี่จุด คือ `require('node:crypto')`, ฟังก์ชัน `signCookie`, ฟังก์ชัน `login` ใน `start()` และ `module.exports` ที่เพิ่ม `signCookie`

- `signCookie` คำนวณ HMAC-SHA256 ด้วย `node:crypto` แบบเดียวกับที่ cookie-parser ใช้ผ่าน `cookie-signature` แล้วตัด `=` ท้ายออก ตาม spec ข้อ 3.4 test 8 ที่ห้าม require `cookie-signature` ตรงๆ เพราะเป็น dependency ทางอ้อมที่ไม่ได้ประกาศใน `package.json`
- `signCookie` คืนค่าที่ยังไม่ encode ส่วน test เป็นคน `encodeURIComponent` เองแบบเดียวกับที่ `res.cookie` ของ Express ทำ
- `login` ใช้ `req` ตัวเดียวกับ test จึงเก็บ cookie ลง jar ให้เอง

```js
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { once } = require('node:events');

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'site-test-'));
process.env.SESSION_SECRET = 'test-secret';
process.env.SITE_URL = 'http://test.local';
process.env.ADMIN_USERNAME = 'admin';
process.env.ADMIN_PASSWORD_HASH = require('bcryptjs').hashSync('pw', 4);
process.env.NODE_ENV = 'test';

const app = require('../src/app');
const { ready, run, get, all, close, DATA_DIR } = require('../src/db');

function toForm(obj) {
  const form = new URLSearchParams();
  const add = (key, value) => {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) {
      for (const item of value) add(key, item);
    } else if (typeof value === 'object') {
      for (const [k, v] of Object.entries(value)) add(key + '[' + k + ']', v);
    } else {
      form.append(key, String(value));
    }
  };
  for (const [key, value] of Object.entries(obj)) add(key, value);
  return form;
}

// Same format as cookie-parser: 's:' + value + '.' + base64 HMAC-SHA256 without trailing '='.
function signCookie(value, secret = 'test-secret') {
  const signature = crypto.createHmac('sha256', secret).update(value).digest('base64').replace(/=+$/, '');
  return 's:' + value + '.' + signature;
}

function updateJar(jar, setCookie) {
  for (const line of setCookie) {
    const [pair, ...attrs] = line.split(';');
    const eq = pair.indexOf('=');
    const name = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();
    let expired = value === '';
    for (const attr of attrs) {
      const [key, val = ''] = attr.trim().split('=');
      if (key.toLowerCase() === 'max-age' && Number(val) <= 0) expired = true;
      if (key.toLowerCase() === 'expires' && Date.parse(val) <= Date.now()) expired = true;
    }
    if (expired) jar.delete(name);
    else jar.set(name, value);
  }
}

async function start() {
  await ready;
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = 'http://127.0.0.1:' + server.address().port;
  const jar = new Map();

  async function req(urlPath, opts = {}) {
    const { method = 'GET', form, body, headers = {}, cookie, jar: useJar = true } = opts;
    const cookies = [];
    if (useJar) for (const [name, value] of jar) cookies.push(name + '=' + value);
    if (cookie) cookies.push(cookie);
    const sendHeaders = { ...headers };
    if (cookies.length) sendHeaders.cookie = cookies.join('; ');
    const res = await fetch(base + urlPath, {
      method,
      headers: sendHeaders,
      body: form ? toForm(form) : body,
      redirect: 'manual'
    });
    const setCookie = res.headers.getSetCookie();
    if (useJar) updateJar(jar, setCookie);
    return {
      status: res.status,
      location: res.headers.get('location'),
      headers: res.headers,
      text: await res.text(),
      setCookie
    };
  }

  function login(password = 'pw') {
    return req('/admin/login', { method: 'POST', form: { username: 'admin', password } });
  }

  async function stop() {
    await new Promise((resolve, reject) => server.close(err => (err ? reject(err) : resolve())));
    await close();
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
  }

  return { base, req, login, stop };
}

module.exports = { start, toForm, signCookie, run, get, all };
```

- [ ] **Step 2: เขียน test 07 ที่ต้อง fail**

สร้าง `test/07-admin-guard.test.js` นอกจากสามข้อของ spec ข้อ 3.4 test นี้ตรวจเพิ่มอีกสี่อย่าง

- หน้า login มี `<html lang="th">`, `noindex` และช่องรหัสผ่าน
- `GET /admin`, `GET /admin/settings` ที่ยังไม่มี route, `POST /admin/logout` และ `POST /admin/sessions/revoke` ของคนที่ไม่ได้ login ได้ 302 ไป `/admin/login` โดยไม่มี `Set-Cookie` และไม่สร้าง row `session_epoch` จึงพิสูจน์ว่า `router.use(requireAdmin)` คุมทุก route ที่ประกาศทีหลัง รวมถึงของ task หลัง
- cookie `ta_admin` ที่ไม่ได้ sign แต่เวลาหมดอายุยังไม่ถึงต้องได้ 302 ตามกติกาใน spec ข้อ 2.4 ที่ห้ามอ่าน `req.cookies` เพื่อตรวจสิทธิ์
- ฟอร์มที่ POST ไป `/admin/posts` ใช้ชื่อ field ของ editor ตาม spec ข้อ 2.4 เช่น `th[title]` และ `en[status]` พอ Task 10 เพิ่ม route บันทึกบทความแล้ว test นี้ยังพิสูจน์ได้ว่า guard ทำงานก่อน

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { start, get } = require('./helpers');

test('07 admin guard', async () => {
  const h = await start();
  try {
    const countPosts = async () => (await get('SELECT COUNT(*) AS n FROM posts')).n;

    let r = await h.req('/admin/posts');
    assert.equal(r.status, 302);
    assert.equal(r.location, '/admin/login');

    const before = await countPosts();
    r = await h.req('/admin/posts', {
      method: 'POST',
      form: {
        cover_image: '',
        th: {
          status: 'published',
          title: 'บทความทดสอบ',
          slug: 'guard-test',
          excerpt: 'เกริ่นนำ',
          body_markdown: '# hello',
          cover_image_alt: '',
          seo_title: '',
          seo_description: ''
        },
        en: { status: 'none' }
      }
    });
    assert.equal(r.status, 302);
    assert.equal(r.location, '/admin/login');
    assert.equal(await countPosts(), before);

    r = await h.req('/admin/login');
    assert.equal(r.status, 200);
    assert.ok(r.text.includes('<html lang="th">'), r.text);
    assert.ok(r.text.includes('<meta name="robots" content="noindex">'), r.text);
    assert.ok(r.text.includes('name="password"'), r.text);

    // everything declared after requireAdmin is guarded, including routes that later tasks add
    for (const [method, urlPath] of [
      ['GET', '/admin'],
      ['GET', '/admin/settings'],
      ['POST', '/admin/logout'],
      ['POST', '/admin/sessions/revoke']
    ]) {
      r = await h.req(urlPath, { method });
      assert.equal(r.status, 302, method + ' ' + urlPath);
      assert.equal(r.location, '/admin/login', method + ' ' + urlPath);
      assert.deepEqual(r.setCookie, [], method + ' ' + urlPath);
    }
    assert.equal(await get("SELECT value FROM settings WHERE key = 'session_epoch'"), undefined);

    // the guard reads signed cookies only, so an unsigned "expiry:epoch" value is rejected
    r = await h.req('/admin/posts', { cookie: 'ta_admin=' + encodeURIComponent(Date.now() + 60000 + ':0') });
    assert.equal(r.status, 302);
    assert.equal(r.location, '/admin/login');
  } finally {
    await h.stop();
  }
});
```

- [ ] **Step 3: เขียน test 08 ที่ต้อง fail**

สร้าง `test/08-login-cookie.test.js` ครอบทุกข้อของ spec ข้อ 3.4 test 8 และตรวจเพิ่มดังนี้

- `Set-Cookie` ของ login มี `Max-Age=2592000` และไม่มี `Secure` เพราะ test ตั้ง `NODE_ENV = 'test'`
- ค่าที่ decode แล้วอยู่ในรูป `s:<เวลาหมดอายุ>:0.<signature>` และเวลาหมดอายุห่างจากตอนนี้ 30 วัน
- `GET /admin/posts` หลัง login ได้ cookie ใบใหม่ ซึ่งคือ sliding renewal ตาม spec ข้อ 2.4
- cookie ที่ `signCookie` sign เองและยังไม่หมดอายุได้ 200 ข้อนี้พิสูจน์ว่า `signCookie` ตรงกับ cookie-parser จริง 302 ของ cookie ที่หมดอายุในบรรทัดถัดไปจึงมาจากเวลาหมดอายุ ไม่ใช่ signature ผิด
- `Set-Cookie` ตัวสุดท้ายของ revoke หมดอายุปี 1970 และ `settings` เก็บ epoch เป็น text `'1'`
- cookie ของการ login รอบใหม่มี epoch `1`
- `POST /admin/logout` ลบ cookie ออกจาก jar แล้ว request ถัดไปเด้งกลับหน้า login ข้อนี้ครอบการตรวจ logout ของ spec ข้อ 3.5 Phase 2

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { start, signCookie, get } = require('./helpers');

test('08 login cookie', async () => {
  const h = await start();
  try {
    const asCookie = value => 'ta_admin=' + encodeURIComponent(value);

    let r = await h.login('wrong');
    assert.equal(r.status, 401);
    assert.deepEqual(r.setCookie, []);
    assert.ok(r.text.includes('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'), r.text);

    r = await h.login();
    assert.equal(r.status, 303);
    assert.equal(r.location, '/admin/posts');
    assert.equal(r.setCookie.length, 1);
    const setCookie = r.setCookie[0];
    assert.ok(setCookie.startsWith('ta_admin=s%3A'), setCookie);
    assert.match(setCookie, /; HttpOnly(;|$)/);
    assert.match(setCookie, /; SameSite=Lax(;|$)/);
    assert.match(setCookie, /; Path=\/admin(;|$)/);
    assert.match(setCookie, /; Max-Age=2592000(;|$)/);
    assert.doesNotMatch(setCookie, /Secure/);

    // the value is "expiry:epoch" signed by cookie-parser, and the expiry is 30 days from now
    const issued = setCookie.split(';')[0];
    const value = decodeURIComponent(issued.slice('ta_admin='.length));
    assert.match(value, /^s:\d+:0\.[A-Za-z0-9+/]+$/);
    const exp = Number(value.slice(2, value.indexOf(':', 2)));
    assert.ok(Math.abs(exp - (Date.now() + 30 * 864e5)) < 60000, String(exp));

    r = await h.req('/admin/posts');
    assert.equal(r.status, 200);
    assert.ok(r.setCookie.some(c => c.startsWith('ta_admin=s%3A')), 'sliding renewal');

    // signCookie matches cookie-parser, so a self-signed cookie that has not expired is accepted
    r = await h.req('/admin/posts', { jar: false, cookie: asCookie(signCookie(Date.now() + 60000 + ':0')) });
    assert.equal(r.status, 200);

    // correctly signed "expiry:epoch" whose expiry has passed
    r = await h.req('/admin/posts', { jar: false, cookie: asCookie(signCookie(Date.now() - 1000 + ':0')) });
    assert.equal(r.status, 302);
    assert.equal(r.location, '/admin/login');

    // tampered: a later expiry with the original signature
    const tampered = value.replace(/^s:\d+/, 's:' + (exp + 864e5));
    r = await h.req('/admin/posts', { jar: false, cookie: asCookie(tampered) });
    assert.equal(r.status, 302);
    assert.equal(r.location, '/admin/login');

    r = await h.req('/admin/sessions/revoke', { method: 'POST' });
    assert.equal(r.status, 303);
    assert.equal(r.location, '/admin/login');
    assert.match(r.setCookie.at(-1), /^ta_admin=.*; Expires=Thu, 01 Jan 1970 00:00:00 GMT/);
    assert.deepEqual(await get("SELECT value FROM settings WHERE key = 'session_epoch' AND lang = '*'"), { value: '1' });

    // the cookie issued before revoke no longer works
    r = await h.req('/admin/posts', { jar: false, cookie: issued });
    assert.equal(r.status, 302);
    assert.equal(r.location, '/admin/login');

    r = await h.login();
    assert.equal(r.status, 303);
    assert.match(decodeURIComponent(r.setCookie[0]), /^ta_admin=s:\d+:1\./);
    r = await h.req('/admin/posts');
    assert.equal(r.status, 200);

    // logout clears the cookie from the jar, so the next request goes back to the login page
    r = await h.req('/admin/logout', { method: 'POST' });
    assert.equal(r.status, 303);
    assert.equal(r.location, '/admin/login');
    r = await h.req('/admin/posts');
    assert.equal(r.status, 302);
    assert.equal(r.location, '/admin/login');
  } finally {
    await h.stop();
  }
});
```

- [ ] **Step 4: รัน test ให้เห็นว่า fail**

ตอนนี้ app ยังไม่มี router ของ `/admin` ทุก request จึงตกไปที่ 404 handler

Run: `node --test test/07-admin-guard.test.js`
Expected: FAIL exit code 1 และ output

```
✖ 07 admin guard (116.0295ms)
ℹ tests 1
ℹ suites 0
ℹ pass 0
ℹ fail 1
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 509.6837

✖ failing tests:

test at test\07-admin-guard.test.js:5:1
✖ 07 admin guard (116.0295ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  
  404 !== 302
  
      at TestContext.<anonymous> (D:\Ikkyusan\Downloads\TalkAlways_MVP\talkalways\test\07-admin-guard.test.js:11:12)
      at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
      at async Test.run (node:internal/test_runner/test:1409:7)
      at async startSubtestAfterBootstrap (node:internal/test_runner/harness:387:3) {
    generatedMessage: true,
    code: 'ERR_ASSERTION',
    actual: 404,
    expected: 302,
    operator: 'strictEqual',
    diff: 'simple'
  }
```

Run: `node --test test/08-login-cookie.test.js`
Expected: FAIL exit code 1 และ output

```
✖ 08 login cookie (134.1225ms)
ℹ tests 1
ℹ suites 0
ℹ pass 0
ℹ fail 1
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 608.2999

✖ failing tests:

test at test\08-login-cookie.test.js:5:1
✖ 08 login cookie (134.1225ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  
  404 !== 401
  
      at TestContext.<anonymous> (D:\Ikkyusan\Downloads\TalkAlways_MVP\talkalways\test\08-login-cookie.test.js:11:12)
      at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
      at async Test.run (node:internal/test_runner/test:1409:7)
      at async startSubtestAfterBootstrap (node:internal/test_runner/harness:387:3) {
    generatedMessage: true,
    code: 'ERR_ASSERTION',
    actual: 404,
    expected: 401,
    operator: 'strictEqual',
    diff: 'simple'
  }
```

- [ ] **Step 5: เขียน scripts/hash-password.js**

สร้าง `scripts/hash-password.js` สคริปต์นี้ใช้ทั้งตอนตั้งรหัสครั้งแรกและตอน reset รหัสผ่าน

- ใช้ cost 12 ตาม spec ข้อ 2.4 และใช้ `hashSync` ได้เพราะเป็นคำสั่งที่รันครั้งเดียวจบ ไม่ได้อยู่ใน server
- ปฏิเสธเมื่อจำนวน argument ไม่ใช่หนึ่งตัว ถ้าลืมใส่เครื่องหมายคำพูดครอบ passphrase ที่มีช่องว่าง shell จะแยกเป็นหลาย argument และถ้าไม่ปฏิเสธ สคริปต์จะ hash แค่คำแรกโดยไม่มีใครรู้
- ปฏิเสธ passphrase ที่สั้นกว่า 20 ตัวอักษร เพราะ spec ข้อ 2.4 กับภาคผนวก ค ข้อ 9 ไม่มี login throttle และพึ่ง passphrase ยาวจาก password manager แทน
- stdout มีแค่ hash บรรทัดเดียว จึงใช้ใน command substitution ของ shell ได้ตรงๆ แบบที่ Step 8 และ Step 20 ทำ

```js
const bcrypt = require('bcryptjs');

const passphrase = process.argv[2];
if (process.argv.length !== 3 || passphrase.length < 20) {
  console.error("usage: node scripts/hash-password.js '<passphrase of at least 20 characters>'");
  process.exit(1);
}
console.log(bcrypt.hashSync(passphrase, 12));
```

- [ ] **Step 6: ตรวจว่าสคริปต์ปฏิเสธ argument ที่ผิด**

สามกรณีคือไม่มี argument, passphrase สั้นเกินไป และ passphrase ที่ลืมใส่เครื่องหมายคำพูด

Run: `node scripts/hash-password.js; echo "exit=$?"; node scripts/hash-password.js 'short passphrase'; echo "exit=$?"; node scripts/hash-password.js correct horse battery staple; echo "exit=$?"`
Expected:

```
usage: node scripts/hash-password.js '<passphrase of at least 20 characters>'
exit=1
usage: node scripts/hash-password.js '<passphrase of at least 20 characters>'
exit=1
usage: node scripts/hash-password.js '<passphrase of at least 20 characters>'
exit=1
```

- [ ] **Step 7: เพิ่มตัวแปรของ admin ใน .env.example**

แทนที่เนื้อหาทั้งหมดของ `.env.example` ด้วยข้อความนี้ แปดบรรทัดแรกที่มี `PORT`, `NODE_ENV`, `DATA_DIR` และ `SITE_URL` ไม่เปลี่ยนจาก Task 4

- `SESSION_SECRET` และ `ADMIN_PASSWORD_HASH` ปล่อยว่างโดยตั้งใจ ถ้าใส่ค่าตัวอย่างไว้ คนที่ copy ไฟล์นี้ไปใช้เลยจะได้ secret และรหัสผ่านที่ทุกคนรู้
- ถ้า `SESSION_SECRET` ว่าง cookie-parser จะไม่มี secret และ `res.cookie` ของ Express จะโยน `cookieParser("secret") required for signed cookies` ตอน login จึงได้หน้า 500 พร้อม log ถ้า `ADMIN_PASSWORD_HASH` ว่าง `bcrypt.compare` จะคืน `false` ทุกครั้งจึงได้ 401 ทั้งสองแบบ login ไม่ได้ ไม่มีกรณีที่เข้าได้โดยไม่มีรหัส
- comment บอกคำสั่งสร้างค่าไว้ในไฟล์เลย ตามข้อ "ตั้งค่าบน server" ใน spec ข้อ 3.6

```dotenv
# Copy this file to .env and edit the values. Never commit .env.
# Port that server.js listens on.
PORT=3000
# Must be production on the server, otherwise the admin cookie has no Secure flag.
NODE_ENV=development
# Folder for site.db and uploads/, resolved from the project root.
DATA_DIR=data
# Full site URL without a trailing slash. Used for canonical, hreflang, og:url and og:image.
SITE_URL=http://localhost:3000
# Signs the admin cookie. Changing it logs out every session. Generate one with:
# node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
SESSION_SECRET=
# Admin login name.
ADMIN_USERNAME=admin
# bcrypt hash (cost 12) of the admin passphrase. Generate it with:
# node scripts/hash-password.js '<passphrase of at least 20 characters>'
# Paste the hash without quotes. Node does not expand the $ signs in it.
ADMIN_PASSWORD_HASH=
```

- [ ] **Step 8: ตรวจ .env.example และ hash ที่มี $ กับ parser ของ Node**

คำสั่งแรกอ่าน `.env.example` ด้วย parser ของ Node คำสั่งที่สองสร้าง hash จริงด้วยสคริปต์ใน Step 5 เขียนลงไฟล์ env ชั่วคราว อ่านกลับด้วย `--env-file` แล้วเทียบกับ passphrase เดิม ข้อนี้พิสูจน์ข้อความใน spec ข้อ 2.4 ว่า `.env` ไม่ expand ตัว `$` ใน hash

Run: `node --env-file=.env.example -e 'for (const k of ["PORT","NODE_ENV","DATA_DIR","SITE_URL","SESSION_SECRET","ADMIN_USERNAME","ADMIN_PASSWORD_HASH"]) console.log(k + "=" + JSON.stringify(process.env[k]))'`
Expected:

```
PORT="3000"
NODE_ENV="development"
DATA_DIR="data"
SITE_URL="http://localhost:3000"
SESSION_SECRET=""
ADMIN_USERNAME="admin"
ADMIN_PASSWORD_HASH=""
```

Run: `T=$(mktemp -d) && printf 'ADMIN_PASSWORD_HASH=%s\n' "$(node scripts/hash-password.js 'correct horse battery staple')" > "$T/.env" && node --env-file="$T/.env" -e 'const h = process.env.ADMIN_PASSWORD_HASH; require("bcryptjs").compare("correct horse battery staple", h).then(ok => console.log(h.slice(0, 7) + " length=" + h.length + " match=" + ok))'; rm -rf "$T"`
Expected: `$2b$12$ length=60 match=true`

- [ ] **Step 9: เขียน src/routes/admin.js**

สร้าง `src/routes/admin.js`

- `COOKIE`, `MAX_AGE`, `issue` และ `requireAdmin` มาจาก spec ข้อ 2.4 ส่วน `sessionEpoch` มาจาก spec ข้อ 4.3
- `signed: true` ต้องอยู่ใน `COOKIE` ถ้าลืม cookie จะไม่ถูก sign แล้ว `req.signedCookies.ta_admin` จะว่างเสมอ login จะวนกลับหน้าเดิมไม่รู้จบ
- guard อ่านแค่ `req.signedCookies` cookie ที่ signature ไม่ตรงจะได้ค่า `false` จาก cookie-parser ซึ่ง `String(false || '')` กลายเป็น string ว่างและถูกปฏิเสธ
- `POST /login` เรียก `bcrypt.compare` ทุกครั้งก่อนเทียบชื่อผู้ใช้ เวลาตอบจึงไม่บอกว่าชื่อผู้ใช้ถูกหรือไม่ และใช้แบบ async ตาม spec เพราะ `compareSync` บล็อก event loop
- ใช้ `String(password || '')` แทน `password || ''` เพราะ `urlencoded({ extended: true })` แปลง `password[]=x` เป็น array และตอนเขียนแผนทดสอบแล้วว่า bcryptjs 3.0.3 reject ค่าที่ไม่ใช่ string ด้วย `Illegal arguments` ซึ่งจะกลายเป็น 500
- `String(username || '') !== process.env.ADMIN_USERNAME` ทำให้ไม่มีใคร login ได้ถ้าลืมตั้ง `ADMIN_USERNAME`
- login ที่ผิดส่ง `username` กลับไปที่ฟอร์ม เจ้าของจึงพิมพ์แค่รหัสใหม่
- `POST /logout` และ `POST /sessions/revoke` อยู่หลัง `requireAdmin` ซึ่งต่อ cookie ใบใหม่ไว้ใน response แล้ว `clearCookie` จึงเพิ่ม `Set-Cookie` บรรทัดที่สองที่หมดอายุปี 1970 browser ประมวลผล `Set-Cookie` ตามลำดับ cookie จึงถูกลบ test 08 ตรวจว่าบรรทัดสุดท้ายคือบรรทัดที่ลบ
- `clearCookie('ta_admin', COOKIE)` ต้องส่ง `COOKIE` ไปด้วย เพราะ browser ลบ cookie ได้เฉพาะเมื่อ `Path` ตรงกัน Express 5 ไม่สน `maxAge` ใน `clearCookie` อยู่แล้ว
- revoke ใช้ upsert ที่ `CAST(value AS INTEGER) + 1` คอลัมน์ `value` เป็น `TEXT` sqlite จึงเก็บผลกลับเป็น text `'1'`, `'2'` ตามลำดับ ตอนเขียนแผนทดสอบแล้ว การเทียบ `ep === epoch` แบบ string จึงใช้ได้
- Express 5 ส่ง error จาก async handler ต่อให้ error handler เอง จึงไม่มี try/catch ตาม spec ข้อ 4.3
- `GET /posts` อยู่ในไฟล์นี้ชั่วคราว เพราะ `src/routes/admin-posts.js` มาใน Task 10 query คัดลอกจาก spec ข้อ 2.4
- path ที่ไม่มี route ใต้ `/admin` หลัง login แล้ว เช่น `/admin/tags` ในตอนนี้ จะหลุดไปที่ 404 handler ของ app และ render `error.ejs` ด้วยค่า default ภาษาไทย

```js
const express = require('express');
const bcrypt = require('bcryptjs');
const { run, get, all } = require('../db');

const router = express.Router();

const COOKIE = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/admin',
  signed: true
};
const MAX_AGE = 30 * 864e5;
const issue = (res, epoch) => res.cookie('ta_admin', (Date.now() + MAX_AGE) + ':' + epoch, { ...COOKIE, maxAge: MAX_AGE });

async function sessionEpoch() {
  const row = await get("SELECT value FROM settings WHERE key = 'session_epoch' AND lang = '*'");
  return row ? row.value : '0';
}

async function requireAdmin(req, res, next) {
  const [exp, ep] = String(req.signedCookies.ta_admin || '').split(':');
  const epoch = await sessionEpoch();
  if (!(Number(exp) > Date.now() && ep === epoch)) return res.redirect('/admin/login');
  issue(res, epoch);
  next();
}

router.use(express.urlencoded({ extended: true, limit: '1mb' }));

router.get('/login', (req, res) => {
  res.render('admin/login');
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body ?? {};
  const ok = await bcrypt.compare(String(password || ''), process.env.ADMIN_PASSWORD_HASH);
  if (!ok || String(username || '') !== process.env.ADMIN_USERNAME) {
    return res.status(401).render('admin/login', {
      error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',
      username: String(username || '')
    });
  }
  issue(res, await sessionEpoch());
  res.redirect(303, '/admin/posts');
});

router.use(requireAdmin);

router.get('/', (req, res) => {
  res.redirect(303, '/admin/posts');
});

router.post('/logout', (req, res) => {
  res.clearCookie('ta_admin', COOKIE);
  res.redirect(303, '/admin/login');
});

router.post('/sessions/revoke', async (req, res) => {
  await run(`INSERT INTO settings (key, lang, value) VALUES ('session_epoch', '*', '1')
             ON CONFLICT(key, lang) DO UPDATE SET value = CAST(value AS INTEGER) + 1`);
  res.clearCookie('ta_admin', COOKIE);
  res.redirect(303, '/admin/login');
});

router.get('/posts', async (req, res) => {
  const posts = await all(`
    SELECT p.id, p.updated_at,
      (SELECT title FROM post_translations WHERE post_id = p.id ORDER BY lang = 'th' DESC LIMIT 1) AS title,
      (SELECT status FROM post_translations WHERE post_id = p.id AND lang = 'th') AS th,
      (SELECT status FROM post_translations WHERE post_id = p.id AND lang = 'en') AS en
    FROM posts p ORDER BY p.updated_at DESC`);
  res.render('admin/posts', { posts });
});

module.exports = router;
```

- [ ] **Step 10: เขียน views/admin/head.ejs**

สร้าง `views/admin/head.ejs` ไฟล์นี้เป็นฉบับสุดท้ายที่ทุกหน้า admin ใช้ task หลังไม่ต้องแก้

- script inline ของธีมเหมือนใน `views/partials/head.ejs` หน้า admin จึงใช้ธีมเดียวกับที่เลือกไว้บนหน้า public ส่วนปุ่มสลับธีมไม่มีในหน้า admin
- `<meta name="robots" content="noindex">` ตาม spec ข้อ 2.4
- preload ฟอนต์ทั้งสองไฟล์เพราะหน้า admin เป็นภาษาไทยอย่างเดียว
- แถบเมนูใช้ class `site-header`, `site-name` และ `site-nav` จาก `site.css` จึงได้ layout สองแถวบนจอเล็กแบบเดียวกับหน้า public
- `locals.nav === false` ซ่อนแถบเมนู หน้า login ใช้ค่านี้เพราะยังไม่ได้ login
- `locals.section` ใส่ `aria-current="page"` ให้เมนูของหน้าปัจจุบัน attribute นี้เขียนด้วย `<% if %>` เพราะ `<%= %>` จะ escape เครื่องหมายคำพูดจน attribute พัง
- ปุ่ม ออกจากระบบ เป็นฟอร์ม POST เพราะทุก mutation ใต้ `/admin` ต้องเป็น POST ตาม Global Constraints
- ลิงก์ ดูหน้าเว็บ ชี้ไป `/` ซึ่ง redirect ไปภาษาที่เหมาะเอง

```ejs
<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<script>try{var t=localStorage.getItem('theme');if(t)document.documentElement.dataset.theme=t}catch(e){}</script>
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title><%= locals.title %> | หลังบ้าน</title>
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preload" href="/fonts/anuphan-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/anuphan-thai.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/css/site.css?v=<%= v %>">
<link rel="stylesheet" href="/css/admin.css?v=<%= v %>">
</head>
<body>
<a class="skip-link" href="#main">ข้ามไปที่เนื้อหา</a>
<% if (locals.nav !== false) { -%>
<header class="site-header">
  <a class="site-name" href="/admin/posts">หลังบ้าน</a>
  <nav class="site-nav" aria-label="เมนูหลังบ้าน">
<% for (const [section, href, label] of [
     ['posts', '/admin/posts', 'บทความ'],
     ['projects', '/admin/projects', 'โปรเจกต์'],
     ['tags', '/admin/tags', 'แท็ก'],
     ['settings', '/admin/settings', 'ตั้งค่า']
   ]) { -%>
    <a href="<%= href %>"<% if (locals.section === section) { %> aria-current="page"<% } %>><%= label %></a>
<% } -%>
  </nav>
  <a class="admin-view-site" href="/">ดูหน้าเว็บ</a>
  <form class="admin-logout" method="post" action="/admin/logout">
    <button type="submit">ออกจากระบบ</button>
  </form>
</header>
<% } -%>
```

- [ ] **Step 11: เขียน views/admin/foot.ejs**

สร้าง `views/admin/foot.ejs` หน้า admin ไม่มี footer ไฟล์นี้จึงปิดแค่ `</body>` และ `</html>` script `admin.js` ของ Task 15 ใส่ใน editor ไม่ใส่ที่นี่ หน้ารายการจึงไม่โหลด JavaScript ที่ไม่ได้ใช้

```ejs
</body>
</html>
```

- [ ] **Step 12: เขียน views/admin/login.ejs**

สร้าง `views/admin/login.ejs`

- `include('head')` ใน `views/admin/` หา `views/admin/head.ejs` จากโฟลเดอร์ของไฟล์ที่เรียก จึงไม่ต้องใส่ `admin/` นำหน้า
- ข้อความ error ใช้ `role="alert"` screen reader จึงอ่านทันทีหลัง login ผิด
- `autocomplete="username"` และ `autocomplete="current-password"` ให้ password manager เติมค่าได้ ซึ่งสำคัญเพราะรหัสยาว 20 ตัวขึ้นไป

```ejs
<%- include('head', { title: 'เข้าสู่ระบบ', nav: false }) %>
<main id="main" class="admin-login">
  <h1>เข้าสู่ระบบ</h1>
<% if (locals.error) { -%>
  <p class="form-error" role="alert"><%= error %></p>
<% } -%>
  <form class="admin-form" method="post" action="/admin/login">
    <label>ชื่อผู้ใช้
      <input name="username" value="<%= locals.username || '' %>" autocomplete="username" autocapitalize="none" spellcheck="false" required>
    </label>
    <label>รหัสผ่าน
      <input type="password" name="password" autocomplete="current-password" required>
    </label>
    <button type="submit">เข้าสู่ระบบ</button>
  </form>
</main>
<%- include('foot') %>
```

- [ ] **Step 13: เขียน views/admin/posts.ejs**

สร้าง `views/admin/posts.ejs`

- คอลัมน์และคำบน chip มาจาก spec ข้อ 2.4 คือ หัวข้อ, ไทย, EN, แก้ไขล่าสุด และ `เผยแพร่`, `แบบร่าง`, `ไม่มีฉบับแปล` ค่า `null` ของภาษาที่ไม่มี row ได้ `chip-none`
- วันที่แก้ไขล่าสุดใช้ `formatDate('th', post.updated_at)` จาก `app.locals` จึงเป็นเวลาไทยและปี พ.ศ. แบบเดียวกับหน้า public
- ตารางอยู่ใน `.table-scroll` บนจอแคบตารางจึงเลื่อนในกรอบของตัวเอง
- ตอนนี้ยังไม่มีทางสร้างบทความผ่านหน้าเว็บ จึงยังไม่มีลิงก์ใดๆ Step 19 ตรวจหน้านี้ด้วยแถวที่ insert ผ่าน SQL

```ejs
<%
const chipLabels = { published: 'เผยแพร่', draft: 'แบบร่าง' };
-%>
<%- include('head', { title: 'บทความ', section: 'posts' }) %>
<main id="main">
  <h1>บทความ</h1>
<% if (posts.length === 0) { -%>
  <p class="admin-empty">ยังไม่มีบทความ</p>
<% } else { -%>
  <div class="table-scroll">
    <table class="admin-table">
      <thead>
        <tr><th scope="col">หัวข้อ</th><th scope="col">ไทย</th><th scope="col">EN</th><th scope="col">แก้ไขล่าสุด</th></tr>
      </thead>
      <tbody>
<% for (const post of posts) { -%>
        <tr>
          <td><%= post.title %></td>
<% for (const status of [post.th, post.en]) { -%>
          <td><span class="chip chip-<%= status || 'none' %>"><%= chipLabels[status] || 'ไม่มีฉบับแปล' %></span></td>
<% } -%>
          <td class="admin-date"><%= formatDate('th', post.updated_at) %></td>
        </tr>
<% } -%>
      </tbody>
    </table>
  </div>
<% } -%>
</main>
<%- include('foot') %>
```

- [ ] **Step 14: เขียน public/css/admin.css**

สร้าง `public/css/admin.css` ไฟล์นี้โหลดหลัง `site.css` จึงใช้ token, ปุ่ม, ช่องกรอก และ layout ของ header ชุดเดียวกัน

- chip ใช้แค่ `--accent`, `--surface-soft` และเส้นประ ไม่มีสีแดงตาม spec ข้อ 2.4 chip `เผยแพร่` เป็นตัวอักษรสี `--bg` บนพื้น `--accent` ซึ่ง contrast 6.27 ในธีมสว่างและ 8.43 ในธีมมืดตาม spec ข้อ 3.2
- `.admin-table` มี `min-width: 36rem` ตอนเขียนแผนตรวจที่ความกว้าง 400px แล้วว่าถ้าไม่มีบรรทัดนี้ ตารางจะบีบคอลัมน์หัวข้อจนเหลือบรรทัดละคำและวันที่ถูกตัด พอใส่แล้วตารางกว้าง 576px เลื่อนในกรอบ 368px ของ `.table-scroll` และหน้าไม่เลื่อนแนวนอน
- `th` ของตารางตั้ง `text-align: start` เพราะค่า default ของ browser คือจัดกลาง
- ไม่มี `letter-spacing` และ `text-transform` ตามกติกาภาษาไทยใน spec ข้อ 3.3

```css
/* Admin pages only. Loaded after site.css, so tokens, buttons, inputs and .site-header come from there. */

/* Header bar */
.site-nav a[aria-current="page"] { color: var(--text); font-weight: 600; }
.admin-view-site { color: var(--text-muted); text-decoration: none; }
.admin-view-site:hover { color: var(--text); text-decoration: underline; }
.admin-logout { margin: 0; }

/* Forms */
.admin-form { display: grid; gap: var(--sp-4); }
.admin-form label { display: grid; gap: var(--sp-1); }
.admin-form button { justify-self: start; }
.form-error {
  padding: var(--sp-3) var(--sp-4);
  background: var(--surface-soft);
  border-inline-start: 3px solid var(--accent);
  border-radius: var(--r-sm);
}
.admin-login { max-width: 24rem; }

/* Lists: on a narrow screen the table scrolls inside .table-scroll instead of squeezing the title column */
.admin-empty { color: var(--text-muted); }
.table-scroll { overflow-x: auto; }
.admin-table { width: 100%; min-width: 36rem; border-collapse: collapse; }
.admin-table th, .admin-table td { padding: var(--sp-2) var(--sp-3); border-bottom: 1px solid var(--border); }
.admin-table th { text-align: start; color: var(--text-muted); font-size: var(--fs-sm); font-weight: 600; }
.admin-date { white-space: nowrap; }

/* Status chips: neutral words and colors, never red */
.chip {
  display: inline-block;
  padding: 0 var(--sp-2);
  border: 1px solid var(--border-strong);
  border-radius: var(--r-sm);
  font-size: var(--fs-sm);
  white-space: nowrap;
}
.chip-published { background: var(--accent); border-color: var(--accent); color: var(--bg); }
.chip-draft { background: var(--surface-soft); }
.chip-none { border-style: dashed; color: var(--text-muted); }
```

- [ ] **Step 15: ต่อ cookie-parser และ admin router ใน src/app.js**

แทนที่เนื้อหาทั้งหมดของ `src/app.js` ด้วยข้อความนี้ ส่วนที่เปลี่ยนจาก Task 5 มีสี่บรรทัด คือ `require('cookie-parser')`, `require('./routes/admin')`, `app.use(cookieParser(process.env.SESSION_SECRET))` และ `app.use('/admin', adminRouter)`

- cookie-parser อยู่ระดับ app ตัวเดียวตาม spec ข้อ 4.2 วางต่อจาก middleware ค่า default และก่อน `GET /` ตามลำดับในหัวข้อ Interfaces ของ plan Task 18 จะอ่าน `req.cookies.lang` ใน `GET /` ได้โดยไม่ต้องย้ายบรรทัดนี้
- `/admin` mount ต่อจาก loop ของภาษาและก่อน 404 handler Task 15 จะแทรก static ของ `/uploads` ต่อจาก static ของ `public/`
- `SESSION_SECRET` ถูกอ่านตอน require ไฟล์นี้ `test/helpers.js` จึงต้องตั้ง env ก่อน require `src/app` ซึ่งทำอยู่แล้ว

```js
const path = require('node:path');
const express = require('express');
const cookieParser = require('cookie-parser');
const md = require('./markdown');
const strings = require('./strings');
const publicRouter = require('./routes/public');
const adminRouter = require('./routes/admin');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));
app.disable('x-powered-by');

const dateFormats = {
  th: new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeZone: 'Asia/Bangkok' }),
  en: new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'Asia/Bangkok' })
};

app.locals.v = Date.now().toString(36);
app.locals.md = md;
app.locals.siteUrl = (process.env.SITE_URL || '').replace(/\/+$/, '');
app.locals.formatDate = (lang, iso) => dateFormats[lang === 'en' ? 'en' : 'th'].format(new Date(iso));

app.use((req, res, next) => {
  res.locals.lang = 'th';
  res.locals.other = 'en';
  res.locals.t = strings.th;
  res.locals.settings = {};
  res.locals.meta = {};
  next();
});

app.use(cookieParser(process.env.SESSION_SECRET));

app.get('/', (req, res) => {
  res.set('Vary', 'Accept-Language');
  res.redirect(302, '/' + (req.acceptsLanguages('th', 'en') || 'th'));
});

app.use(express.static(path.join(__dirname, '..', 'public'), { index: false, maxAge: '30d' }));

for (const lang of ['th', 'en']) {
  app.use('/' + lang, (req, res, next) => {
    res.locals.lang = lang;
    res.locals.other = lang === 'th' ? 'en' : 'th';
    res.locals.t = strings[lang];
    next();
  }, publicRouter);
}

app.use('/admin', adminRouter);

app.use((req, res) => {
  res.status(404).render('error', { status: 404 });
});

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).render('error', { status });
});

module.exports = app;
```

- [ ] **Step 16: รัน test ให้เห็นว่าผ่าน**

Run: `node --test test/07-admin-guard.test.js`
Expected: PASS exit code 0

```
✔ 07 admin guard (689.8805ms)
ℹ tests 1
ℹ suites 0
ℹ pass 1
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1213.5645
```

Run: `node --test test/08-login-cookie.test.js`
Expected: PASS exit code 0

```
✔ 08 login cookie (169.4667ms)
ℹ tests 1
ℹ suites 0
ℹ pass 1
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 573.4704
```

- [ ] **Step 17: ตรวจว่า admin.css ใช้แค่ token ที่ประกาศใน site.css**

คำสั่งนี้ตรวจว่าทุกชื่อที่ `admin.css` เรียกด้วย `var()` มีอยู่ใน `:root` ของ `site.css`, `admin.css` ไม่ประกาศ custom property เอง, ไม่มี `var()` ที่มี fallback และไม่มี breakpoint อื่น task ที่ต่อ CSS ใน `admin.css` ให้รันคำสั่งนี้ซ้ำ

Run:

```bash
node -e 'const fs=require("fs");const site=fs.readFileSync("public/css/site.css","utf8");const css=fs.readFileSync("public/css/admin.css","utf8");const defined=new Set(site.match(/^:root [{]([^}]*)[}]/)[1].match(/--[a-z0-9-]+(?=:)/g));const used=[...new Set(css.match(/var[(]--[a-z0-9-]+/g).map(s=>s.slice(4)))];console.log("used with var(): "+used.length);console.log("used but not defined in site.css :root: "+(used.filter(n=>!defined.has(n)).join(" ")||"none"));console.log("custom properties declared in admin.css: "+((css.match(/--[a-z0-9-]+(?=:)/g)||[]).join(" ")||"none"));console.log("var() with fallback: "+((css.match(/var[(][^)]*,/g)||[]).join(" ")||"none"));console.log("@media in admin.css: "+((css.match(/@media[^{]*/g)||[]).join(" | ")||"none"))'
```

Expected:

```
used with var(): 13
used but not defined in site.css :root: none
custom properties declared in admin.css: none
var() with fallback: none
@media in admin.css: none
```

- [ ] **Step 18: ตรวจ <%- ใน views ด้วยขั้นตรวจเดียวกับ CI**

บรรทัดแรกแสดง `<%-` ทุกตัวในหน้า admin ซึ่งเป็น `include(` ทั้งหมด ส่วน `bash -e -c` รัน script ตัวเดียวกับขั้นสุดท้ายของ `.github/workflows/ci.yml` ใน Task 7

Run: `grep -rn "<%-" views/admin; bash -e -c 'if grep -rn "<%-" views/ | grep -v -e "md.render(" -e "include("; then echo "found <%- outside md.render or include"; exit 1; fi'; echo "guard exit=$?"`
Expected:

```
views/admin/login.ejs:1:<%- include('head', { title: 'เข้าสู่ระบบ', nav: false }) %>
views/admin/login.ejs:17:<%- include('foot') %>
views/admin/posts.ejs:4:<%- include('head', { title: 'บทความ', section: 'posts' }) %>
views/admin/posts.ejs:30:<%- include('foot') %>
guard exit=0
```

- [ ] **Step 19: ตรวจหน้ารายการบทความที่มีข้อมูล**

test 08 เห็นหน้านี้แค่ตอนที่ยังว่าง คำสั่งนี้เปิด app ผ่าน `start()` ที่ใช้ `DATA_DIR` ชั่วคราว insert บทความสองตัวผ่าน SQL เพราะ `insertPost` ยังไม่มีจนถึง Task 9 แล้ว login และพิมพ์ `<title>`, เมนูของหน้าปัจจุบัน และทุกแถวของตาราง บทความตัวแรกมี th published กับ en draft ตัวที่สองมีแค่ en draft จึงเห็น chip ครบสามแบบ `updated_at` ของทั้งสองตัวคือวันที่ 13 กันยายนตามเวลาไทย และตัวที่สองใหม่กว่าจึงขึ้นก่อน

Run:

```bash
node - <<'EOF'
const { start, run } = require('./test/helpers');
start().then(async h => {
  const now = new Date().toISOString();
  const a = (await run('INSERT INTO posts (updated_at) VALUES (?)', ['2026-09-12T20:30:00.000Z'])).lastID;
  await run("INSERT INTO post_translations (post_id, lang, status, slug, title, published_at, updated_at) VALUES (?, 'th', 'published', 'docker-101', 'Docker TH', ?, ?)", [a, now, now]);
  await run("INSERT INTO post_translations (post_id, lang, status, slug, title, updated_at) VALUES (?, 'en', 'draft', 'docker-101', 'Docker EN', ?)", [a, now]);
  const b = (await run('INSERT INTO posts (updated_at) VALUES (?)', ['2026-09-13T01:00:00.000Z'])).lastID;
  await run("INSERT INTO post_translations (post_id, lang, status, slug, title, updated_at) VALUES (?, 'en', 'draft', 'sqlite-wal', 'SQLite WAL', ?)", [b, now]);
  await h.login();
  const html = (await h.req('/admin/posts')).text;
  console.log(html.match(/<title>.*<[/]title>/)[0]);
  console.log(html.match(/<a href="[/]admin[/]posts" aria-current="page">[^<]*<[/]a>/)[0]);
  for (const row of html.match(/<tr>[^]*?<[/]tr>/g)) console.log(row.replace(/\s+/g, ' ').trim());
  const css = await h.req('/css/admin.css');
  console.log(css.status + ' ' + css.headers.get('content-type'));
  await h.stop();
});
EOF
```

Expected:

```
<title>บทความ | หลังบ้าน</title>
<a href="/admin/posts" aria-current="page">บทความ</a>
<tr><th scope="col">หัวข้อ</th><th scope="col">ไทย</th><th scope="col">EN</th><th scope="col">แก้ไขล่าสุด</th></tr>
<tr> <td>SQLite WAL</td> <td><span class="chip chip-none">ไม่มีฉบับแปล</span></td> <td><span class="chip chip-draft">แบบร่าง</span></td> <td class="admin-date">13 ก.ย. 2569</td> </tr>
<tr> <td>Docker TH</td> <td><span class="chip chip-published">เผยแพร่</span></td> <td><span class="chip chip-draft">แบบร่าง</span></td> <td class="admin-date">13 ก.ย. 2569</td> </tr>
200 text/css; charset=utf-8
```

- [ ] **Step 20: ตรวจ login และ logout กับ server จริง**

คำสั่งนี้เปิด `server.js` ด้วยไฟล์ env ชั่วคราวที่มี hash cost 12 จริงจากสคริปต์ใน Step 5 แล้วใช้ curl ไล่ลำดับเดียวกับที่เจ้าของจะทำใน browser ที่ Step 24

- ใช้ port 3001 จึงไม่ชนกับ dev server ที่อาจเปิดค้างไว้ที่ 3000 และใช้ `DATA_DIR=data/login-check` ที่ลบทิ้งตอนจบ `data/site.db` จึงไม่ถูกแตะ โฟลเดอร์นี้อยู่ใต้ `data/` ที่ `.gitignore` กันไว้แล้ว
- `--env-file` ชี้ไปไฟล์ชั่วคราว จึงไม่อ่าน `.env` ของโปรเจกต์และไม่ต้องรอ Step 22
- รัน `node` ตรงเพื่อให้ `$!` เป็น process ของ server ห้ามใส่ `cd <dir> &&` ไว้หน้าคำสั่งเหตุผลเดียวกับ Task 5 Step 16
- `sed` ซ่อนค่า cookie กับวันหมดอายุที่เปลี่ยนทุกครั้ง ส่วน `000` แปลว่า server หยุดแล้ว และ `REMOVED` แปลว่าลบโฟลเดอร์ทดลองแล้ว ถ้าได้ `LEFT` ให้ลบ `data/login-check` เอง

Run:

```bash
T=$(mktemp -d)
printf 'PORT=3001\nDATA_DIR=data/login-check\nSESSION_SECRET=local-check-secret\nADMIN_USERNAME=admin\nADMIN_PASSWORD_HASH=%s\n' "$(node scripts/hash-password.js 'correct horse battery staple')" > "$T/.env"
node --env-file="$T/.env" server.js &
curl -s -o /dev/null --retry 10 --retry-delay 1 --retry-connrefused -w 'GET /admin/posts -> %{http_code} %{redirect_url}\n' http://localhost:3001/admin/posts
curl -s -o /dev/null -D "$T/headers" -c "$T/jar" --data-urlencode 'username=admin' --data-urlencode 'password=correct horse battery staple' -w 'POST /admin/login -> %{http_code} %{redirect_url}\n' http://localhost:3001/admin/login
grep -i '^set-cookie' "$T/headers" | sed 's/=s%3A[^;]*/=s%3A<signed>/; s/Expires=[^;]*/Expires=<date>/'
curl -s -o /dev/null -b "$T/jar" -c "$T/jar" -w 'GET /admin/posts -> %{http_code}\n' http://localhost:3001/admin/posts
curl -s -o /dev/null -b "$T/jar" -c "$T/jar" -X POST -w 'POST /admin/logout -> %{http_code} %{redirect_url}\n' http://localhost:3001/admin/logout
curl -s -o /dev/null -b "$T/jar" -w 'GET /admin/posts -> %{http_code} %{redirect_url}\n' http://localhost:3001/admin/posts
kill $!; wait $! 2>/dev/null
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3001/admin/login
rm -rf "$T" data/login-check; test -e data/login-check && echo LEFT || echo REMOVED
```

Expected:

```
Listening on http://localhost:3001
GET /admin/posts -> 302 http://localhost:3001/admin/login
POST /admin/login -> 303 http://localhost:3001/admin/posts
Set-Cookie: ta_admin=s%3A<signed>; Max-Age=2592000; Path=/admin; Expires=<date>; HttpOnly; SameSite=Lax
GET /admin/posts -> 200
POST /admin/logout -> 303 http://localhost:3001/admin/login
GET /admin/posts -> 302 http://localhost:3001/admin/login
000
REMOVED
```

- [ ] **Step 21: รัน npm test ทั้งชุด**

Run: `npm test`
Expected: PASS exit code 0 และมี 4 tests

```
> talkalways@1.0.0 test
> node --test test/*.test.js

✔ 01 markdown (21.3789ms)
✔ 02 routing (132.7709ms)
✔ 07 admin guard (147.2675ms)
✔ 08 login cookie (172.1416ms)
ℹ tests 4
ℹ suites 0
ℹ pass 4
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 608.4403
```

- [ ] **Step 22: สร้าง secret และ hash ของรหัสผ่าน แล้วเขียน .env ใหม่**

**Owner:** ทำทุกข้อข้างล่างใน Git Bash ที่ root ของโปรเจกต์ executor ต้องหยุดรอจนเจ้าของบอกว่าเสร็จ และห้ามขอดู passphrase, ค่า `SESSION_SECRET` หรือ hash

1. `.env` ตอนนี้ยังเป็นของ MVP นอกจาก `PORT` กับ `NODE_ENV` ยังมี `DB_PATH`, `JWT_SECRET`, `BCRYPT_ROUNDS`, `DEFAULT_ROOM_PASSWORD`, `ROOM_EXPIRY_DAYS`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PAYMENT_SUCCESS_URL`, `PAYMENT_CANCEL_URL` และ `ALLOWED_ORIGINS` ซึ่ง spec ข้อ 2.6 ให้ลบ ข้อ 3 จะเขียนทับทั้งไฟล์ ถ้าอยากเก็บค่าไหนไว้ใช้กับโค้ดใน `archive/` ให้คัดลอกไปเก็บใน password manager ก่อน
2. สร้าง passphrase ยาว 20 ตัวอักษรขึ้นไปใน password manager โดยไม่มีเครื่องหมาย `'` เพราะคำสั่งในข้อ 5 ใช้ `'` ครอบ
3. รัน `cp .env.example .env`
4. รัน `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` แล้วนำผลที่ยาว 43 ตัวอักษรไปวางต่อท้าย `SESSION_SECRET=` ใน `.env`
5. รัน `node scripts/hash-password.js 'passphrase จากข้อ 2'` โดยแทนข้อความในเครื่องหมายคำพูดด้วย passphrase จริง แล้วนำบรรทัดที่ขึ้นต้นด้วย `$2b$12$` และยาว 60 ตัวอักษรไปวางต่อท้าย `ADMIN_PASSWORD_HASH=` ใน `.env` โดยไม่ใส่เครื่องหมายคำพูด
6. ถ้าอยากใช้ชื่อผู้ใช้อื่นนอกจาก `admin` ให้แก้ `ADMIN_USERNAME` ใน `.env` ตอนนี้
7. บันทึก `.env` แล้วบอก executor ว่าเสร็จแล้ว

- [ ] **Step 23: ตรวจ .env โดยไม่พิมพ์ค่าลับ**

คำสั่งนี้พิมพ์แค่ความยาวของค่าลับและ 7 ตัวอักษรแรกของ hash ซึ่งเป็นแค่ชื่ออัลกอริทึมกับ cost จึงไม่เปิดเผยรหัส

Run:

```bash
node --env-file=.env -e 'const e = process.env; const mvp = ["DB_PATH", "JWT_SECRET", "BCRYPT_ROUNDS", "DEFAULT_ROOM_PASSWORD", "ROOM_EXPIRY_DAYS", "STRIPE_PUBLISHABLE_KEY", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "PAYMENT_SUCCESS_URL", "PAYMENT_CANCEL_URL", "ALLOWED_ORIGINS"]; const len = k => (e[k] || "").length; console.log("PORT=" + e.PORT + " NODE_ENV=" + e.NODE_ENV); console.log("SESSION_SECRET length=" + len("SESSION_SECRET")); console.log("ADMIN_USERNAME length=" + len("ADMIN_USERNAME")); console.log("ADMIN_PASSWORD_HASH prefix=" + (e.ADMIN_PASSWORD_HASH || "").slice(0, 7) + " length=" + len("ADMIN_PASSWORD_HASH")); console.log("MVP keys left: " + (mvp.filter(k => k in e).join(" ") || "none"))'
```

Expected:

```
PORT=3000 NODE_ENV=development
SESSION_SECRET length=43
ADMIN_USERNAME length=5
ADMIN_PASSWORD_HASH prefix=$2b$12$ length=60
MVP keys left: none
```

- `ADMIN_USERNAME length=5` คือชื่อ `admin` ถ้าเจ้าของตั้งชื่ออื่นในข้อ 6 ของ Step 22 ตัวเลขจะเป็นความยาวของชื่อนั้น
- ถ้า `SESSION_SECRET length=0` หรือ hash ไม่ใช่ `prefix=$2b$12$ length=60` ให้เจ้าของกลับไปทำ Step 22 ข้อ 4 หรือ 5 ใหม่
- ถ้าบรรทัดสุดท้ายมีชื่อ key เช่น `MVP keys left: STRIPE_SECRET_KEY` แปลว่ายังไม่ได้เขียนทับ `.env` ในข้อ 3 ให้เจ้าของลบ key นั้นออก

- [ ] **Step 24: ตรวจ login และ logout ใน browser**

**Owner:** ทำทุกข้อข้างล่างใน Chrome หรือ Edge บนเครื่องนี้ แล้วบอก executor ว่าผ่านครบหรือข้อไหนไม่ผ่าน executor ต้องหยุดรอคำตอบและห้าม commit ถ้ามีข้อที่ไม่ผ่าน ตอนเขียนแผนตรวจลำดับเดียวกันด้วย curl ใน Step 20 แล้ว และตรวจหน้าจอด้วย Edge แบบ headless ที่ความกว้าง 1024px กับใน iframe กว้าง 400px ซึ่ง `scrollWidth` เท่ากับ `clientWidth` ทุกหน้า

1. รัน `npm start` ต้องเห็น `Listening on http://localhost:3000` เพราะ `.env` จาก Step 22 ตั้ง `PORT=3000` แล้ว
2. เปิด `http://localhost:3000/admin/posts` ช่อง URL ต้องเปลี่ยนเป็น `/admin/login` หน้ามีหัวข้อ เข้าสู่ระบบ ช่อง ชื่อผู้ใช้ ช่อง รหัสผ่าน และไม่มีแถบเมนู
3. กด F12 ไปแท็บ Network แล้วกรอกชื่อผู้ใช้ถูกแต่รหัสผิด กด เข้าสู่ระบบ request `login` ต้องได้สถานะ 401 หน้าต้องมีกล่องข้อความ ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง และช่องชื่อผู้ใช้ยังมีค่าเดิม
4. กรอก passphrase ที่ถูกต้องแล้วกด เข้าสู่ระบบ ต้องมาอยู่ที่ `/admin/posts` มีแถบบนสุดที่มี หลังบ้าน, เมนู บทความ (ตัวหนา) โปรเจกต์ แท็ก ตั้งค่า, ลิงก์ ดูหน้าเว็บ และปุ่ม ออกจากระบบ ใต้แถบมีหัวข้อ บทความ และข้อความ ยังไม่มีบทความ
5. ไปแท็บ Application แล้วเลือก Cookies > `http://localhost:3000` ต้องมี `ta_admin` แถวเดียว ช่อง Path เป็น `/admin` ช่อง HttpOnly ติ๊กถูก ช่อง SameSite เป็น `Lax` ช่อง Secure ว่าง และ Expires / Max-Age เป็นวันที่อีก 30 วันนับจากวันนี้
6. กด Ctrl+Shift+M ตั้งความกว้าง 400 หน้าต้องไม่มี scrollbar แนวนอน แถวแรกของแถบบนมี หลังบ้าน ดูหน้าเว็บ และปุ่ม ออกจากระบบ ส่วนแถวที่สองมีเมนูสี่คำ แล้วปิด device toolbar
7. กดปุ่ม ออกจากระบบ ต้องกลับมาที่ `/admin/login` และในแท็บ Application ต้องไม่มี `ta_admin` แล้ว
8. เปิด `http://localhost:3000/admin/posts` อีกครั้ง ต้องเด้งไป `/admin/login`
9. กลับไปที่ Git Bash แล้วกด Ctrl+C เพื่อหยุด server

- [ ] **Step 25: ตรวจว่า .env ไม่ถูก commit และมีแค่ไฟล์ของ task นี้ที่เปลี่ยน**

Run: `git check-ignore -v .env data/site.db node_modules`
Expected:

```
.gitignore:53:.env	.env
.gitignore:15:data/	data/site.db
.gitignore:37:node_modules/	node_modules
```

Run: `git status --short`
Expected:

```
 M .env.example
 M src/app.js
 M test/helpers.js
?? public/css/admin.css
?? scripts/
?? src/routes/admin.js
?? test/07-admin-guard.test.js
?? test/08-login-cookie.test.js
?? views/admin/
```

ถ้ามีบรรทัดอื่นนอกจากนี้ เช่น `.env` หรือ `.claude/` ห้าม add ไฟล์นั้นและให้หยุดถามเจ้าของ

- [ ] **Step 26: Commit**

```bash
git add scripts/hash-password.js src/routes/admin.js src/app.js .env.example
git add views/admin/head.ejs views/admin/foot.ejs views/admin/login.ejs views/admin/posts.ejs public/css/admin.css
git add test/helpers.js test/07-admin-guard.test.js test/08-login-cookie.test.js
git commit -m "feat: add admin login, session guard, revoke-all and password hash script"
```

Expected:

```
[main 6759ee4] feat: add admin login, session guard, revoke-all and password hash script
 12 files changed, 380 insertions(+), 2 deletions(-)
 create mode 100644 public/css/admin.css
 create mode 100644 scripts/hash-password.js
 create mode 100644 src/routes/admin.js
 create mode 100644 test/07-admin-guard.test.js
 create mode 100644 test/08-login-cookie.test.js
 create mode 100644 views/admin/foot.ejs
 create mode 100644 views/admin/head.ejs
 create mode 100644 views/admin/login.ejs
 create mode 100644 views/admin/posts.ejs
```

Run: `git status --short | wc -l`
Expected: `0`

## Phase 3: โพสต์ครบวงจร

Phase นี้ทำให้บทความใช้งานได้ครบวงจร ฝั่ง public มีหน้า blog index, หน้าบทความ, การ์ด fallback ของอีกภาษา, ลิงก์สลับภาษา, canonical, hreflang และ pagination ฝั่ง admin มี editor สองภาษา, validation, การลบ และ preview พอจบ phase นี้ `npm test` จะผ่าน 10 tests (เพิ่ม 03, 04, 05, 06, 09 และ 10) Task 9 ทำฝั่ง public ก่อน จึงยังไม่มีทางสร้างบทความผ่านหน้าเว็บ test และการตรวจใน browser ของ task นี้ insert ข้อมูลด้วย SQL ตรง

- ทุกคำสั่งรันใน Git Bash ที่ root ของโปรเจกต์ `/d/Ikkyusan/Downloads/TalkAlways_MVP/talkalways` และ `node -v` ต้องได้ `v24.21.0`
- Expected ทุกบรรทัดมาจากการรันจริงบน Node 24.21.0 ในโฟลเดอร์ทดลองที่สร้างจากโค้ดในแผนนี้ตามลำดับตั้งแต่ Task 4 path ใน output เปลี่ยนเป็น path จริงของโปรเจกต์แล้ว ส่วนตัวเลขเวลา เช่น `(131.9814ms)` และ `duration_ms` จะไม่ตรงกัน
- คำสั่ง git ของ Step 19 และ 20 ซ้อมใน repo ทิ้งได้ที่มีไฟล์ของ Task 1 ถึง 8 commit ไว้แล้ว เลข commit hash จึงไม่ตรงกัน
- ถ้า output จริงต่างจาก Expected ในเรื่องอื่นนอกจาก path, เวลา และ commit hash ให้หยุดและหาสาเหตุก่อนทำ step ถัดไป

### Task 9: หน้า blog สาธารณะ, การ์ด fallback, pagination, สลับภาษา, SEO

**Phase:** 3 · **Gate tests:** 03-publish-per-language, 05-blog-hidden

**Files:**
- Modify: `test/helpers.js` (เพิ่มฟังก์ชัน `insertPost` ต่อจาก `signCookie` และเพิ่ม `insertPost` ใน `module.exports`)
- Modify: `src/strings.js` (เพิ่ม key 10 ตัวท้าย object ทั้ง `th` และ `en`)
- Modify: `src/routes/public.js` (เพิ่ม `PAGE_SIZE`, `LIST_SQL`, `pageNumber`, ให้ `GET /` ส่ง `posts` และเพิ่ม `GET /blog` กับ `GET /blog/:slug`)
- Create: `views/partials/post-card.ejs`
- Create: `views/blog.ejs`
- Create: `views/post.ejs`
- Modify: `views/home.ejs` (เพิ่ม section บทความล่าสุดต่อจาก `.intro`)
- Modify: `public/css/site.css` (ต่อ section ของรายการบทความ, การ์ด, pagination และหน้าบทความท้ายไฟล์)
- Test: `test/03-publish-per-language.test.js`
- Test: `test/05-blog-hidden.test.js`

**Interfaces:**
- Consumes:
  - `src/db.js` จาก Task 5: `get(sql, params)`, `all(sql, params)`, `run(sql, params)` และตาราง `posts`, `post_translations`, `tags`, `post_tags` ตาม `src/schema.sql`
  - `src/app.js` จาก Task 5 และ 8: `app.locals.md`, `app.locals.formatDate(lang, iso)`, `app.locals.siteUrl`, middleware ของ `/th` กับ `/en` ที่ตั้ง `lang`, `other`, `t` ก่อน public router, 404 handler และ error handler ที่ render `error` ด้วย `err.status || 500`
  - `src/routes/public.js` จาก Task 5: `loadSettings(lang)`, `router.use` ที่ใส่ `res.locals.settings` และ meta ของ `GET /`
  - `views/partials/head.ejs` จาก Task 5: อ่าน `meta.title`, `meta.description`, `meta.canonical`, `meta.alternates`, `meta.image`, `meta.type` แล้วต่อ `siteUrl` ข้างหน้า path ทุกตัว
  - `views/partials/header.ejs` จาก Task 5: ลิงก์สลับภาษาเลือก href จาก `meta.alternates` ของอีกภาษาโดยตัด query ทิ้ง ถ้าไม่มีใช้ `meta.canonical` ในอีกภาษาที่ตัด segment สุดท้ายทิ้ง ถ้าไม่มีทั้งสองอย่างใช้ `/<other>`
  - `views/error.ejs` จาก Task 5: มีลิงก์ไป `/<lang>/blog` และข้อความ `errorBadRequestTitle` เมื่อ status เป็น 4xx ที่ไม่ใช่ 404
  - `public/css/site.css` จาก Task 6: token ใน `:root`, rule typography `body, .prose, .card, .excerpt`, `:lang(th)`, `.prose`, `.home` ที่เป็น flex แนวตั้ง และสี `.hljs-*`
  - `test/helpers.js` จาก Task 8: `start()`, `H.req(path, opts)`, `run`, `get`, `all`, `toForm`, `signCookie`
- Produces:
  - `test/helpers.js`: `module.exports = { start, toForm, insertPost, signCookie, run, get, all }`
    - `insertPost({ cover_image, th, en, tags }) -> Promise<number>` ตรงตามหัวข้อ `test/helpers.js` ใน Interfaces ของ plan คืน `posts.id` ภาษาที่ไม่ส่งมาจะไม่มี row และ `tags` เป็น array ของ `tags.id` ที่ถูก insert ลง `post_tags`
    - Task 12 เพิ่ม `insertProject` และ Task 14 เพิ่ม `insertTag` เข้า `module.exports` ตัวเดียวกันนี้
  - `src/routes/public.js`: ลำดับในไฟล์คือ `router.use` ของ settings, `GET /`, `GET /blog`, `GET /blog/:slug` แล้วจึง `module.exports` route ของ task หลัง (`/projects` ใน Task 12, `/tags/:slug` ใน Task 14, `/about` ใน Task 16, `/search` ใน Task 17, `/privacy` ใน Task 19) เพิ่มก่อน `module.exports`
    - `LIST_SQL` คือ fallback query ของ spec ข้อ 2.1 ที่รับ params `[lang, lang, limit, offset]` คืน card row `{ post_id, lang, slug, title, excerpt, published_at, cover_image }` เรียง `t.published_at DESC, t.post_id DESC` หน้าแรกเรียกด้วย `[lang, lang, 5, 0]` หน้า blog เรียกด้วย `[lang, lang, 11, (page - 1) * 10]` Task 14 เขียน query ของหน้าแท็กโดยคัดลอก `LIST_SQL` แล้วแทรก `JOIN post_tags pt ON pt.post_id = t.post_id AND pt.tag_id = ?` ต่อจาก `JOIN posts p ON p.id = t.post_id` params จึงเป็น `[tagId, lang, lang, limit, offset]`
    - `PAGE_SIZE = 10` และ `pageNumber(req) -> number | null` ที่คืน `null` เมื่อ `?page` ไม่ใช่จำนวนเต็มตั้งแต่ 1 ขึ้นไป Task 14 ใช้ทั้งสองตัวซ้ำได้
    - `GET /` render `home` ด้วย `{ posts, meta }` โดย `posts` คือ card row 5 แถว Task 12 เพิ่ม `featured`
    - `GET /blog` render `blog` ด้วย `{ posts, page, hasNext, tag: null, meta }` หน้า N ที่มากกว่า 1 มี `meta.title` เป็น `บทความ · หน้า N`, `meta.canonical` เป็น `/<lang>/blog?page=N` และ `meta.alternates` เป็น `/th/blog?page=N` กับ `/en/blog?page=N` หน้า 1 ไม่มี `?page`
    - `GET /blog/:slug` render `post` ด้วย `{ post, tr, tags, alternates, preview: false, meta }` โดย `post = { id, cover_image }`, `tr` คือทั้ง row ของ `post_translations`, `tags = [{ slug, name }]` ที่ `name` เป็นชื่อในภาษาของหน้า และ `alternates` เป็น `[]` จนกว่าทั้งสองภาษาจะ published `meta` มี `title`, `description`, `canonical`, `alternates`, `image`, `type: 'article'` ตาม spec ข้อ 2.2
  - `views/partials/post-card.ejs`: เรียกด้วย `<%- include('partials/post-card', { card, level }) %>` โดย `card` คือ card row และ `level` คือ 2 หรือ 3 ใช้เป็นระดับ heading ของชื่อเรื่อง การ์ดที่ `card.lang` ไม่ตรงกับ `lang` ของหน้าได้ `lang="<card.lang>"` ที่ `<article class="card">`, `lang="<lang ของหน้า>"` ที่ `.card-meta` และ badge `t.badgeOtherLang` ลิงก์ชี้ไป `/<card.lang>/blog/<slug>` Task 17 ใช้ partial นี้บนหน้า search ด้วย `level: 3` ใต้หัวข้อ `h2` ของส่วนบทความ
  - `views/blog.ejs`: อ่าน `posts`, `page`, `hasNext` และยังไม่อ่าน `tag` Task 14 เปลี่ยนสองจุด คือ `<h1><%= t.navBlog %></h1>` กับ `const base = '/' + lang + '/blog';` ให้ใช้ชื่อและ slug ของแท็กเมื่อ `tag` ไม่ใช่ `null`
  - `views/post.ejs`: อ่าน `post.cover_image`, `tr.title`, `tr.published_at` (ถ้าว่างจะไม่แสดงวันที่), `tr.cover_image_alt`, `tr.body_markdown`, `tags[].slug`, `tags[].name` และยังไม่อ่าน `preview` กับ `alternates` ระดับบนสุด Task 11 เพิ่มแถบ preview ที่อ่าน `preview` และส่ง `tags` ในรูป `[{ slug, name }]` แบบเดียวกัน
  - `views/home.ejs`: section `.latest` อยู่ต่อจาก `.intro` Task 12 แทรก section โปรเจกต์ featured ระหว่าง `.intro` กับ `.latest`
  - `src/strings.js`: key ใหม่ `latestPosts`, `allPosts`, `noPosts`, `badgeOtherLang`, `postTags`, `backToBlog`, `pagination`, `pageLabel`, `pageNewer`, `pageOlder`
  - `public/css/site.css`: class `blog`, `empty`, `section-head`, `post-list`, `card`, `card-body`, `card-title`, `card-meta`, `badge`, `excerpt`, `card-thumb`, `pagination`, `pagination-newer`, `pagination-older`, `post-article`, `post-header`, `post-meta`, `tag-list`, `tag`, `post-cover`, `post-back` และ `.prose > :first-child` ส่วน `latest` กับ `post` เป็นแค่ชื่อ hook ที่ยังไม่มี style Task 12 ใช้ `section-head` บนหน้าแรกซ้ำได้ และใช้ `<ul class="tag-list">` กับ `<span class="tag">` เป็นชิปแท็กแบบข้อความของโปรเจกต์ได้

- [ ] **Step 1: เพิ่ม insertPost ใน test/helpers.js**

แทนที่เนื้อหาทั้งหมดของ `test/helpers.js` ด้วยข้อความนี้ ส่วนที่เปลี่ยนจาก Task 8 มีสองจุด คือฟังก์ชัน `insertPost` ที่วางต่อจาก `signCookie` และ `module.exports` ที่เพิ่ม `insertPost`

- insert ด้วย SQL ตรงผ่าน `run` ของ `src/db.js` ตาม spec ข้อ 3.4 เพราะ editor ของบทความยังไม่มีจนถึง Task 10
- ภาษาที่ไม่ได้ส่งมาจะไม่มี row ตรงกับหลักการใน spec ส่วนที่ 1 ที่ว่าภาษาที่ยังไม่มีฉบับแปลคือภาษาที่ไม่มี row
- ค่า default ของ `published_at` เขียนเป็น destructuring default ซึ่งทำงานเฉพาะเมื่อค่าเป็น `undefined` ถ้า test ส่ง `null` มาเองก็จะได้ `null` ตามที่ส่ง
- `tags` เป็น array ของ id ของแท็ก Task 14 จะเพิ่ม `insertTag` ที่คืน id นี้ ระหว่างนี้ test 03 insert แท็กด้วย `run`
- `posts.updated_at` กับ `created_at` ใช้ค่า default ของ schema

```js
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { once } = require('node:events');

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'site-test-'));
process.env.SESSION_SECRET = 'test-secret';
process.env.SITE_URL = 'http://test.local';
process.env.ADMIN_USERNAME = 'admin';
process.env.ADMIN_PASSWORD_HASH = require('bcryptjs').hashSync('pw', 4);
process.env.NODE_ENV = 'test';

const app = require('../src/app');
const { ready, run, get, all, close, DATA_DIR } = require('../src/db');

function toForm(obj) {
  const form = new URLSearchParams();
  const add = (key, value) => {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) {
      for (const item of value) add(key, item);
    } else if (typeof value === 'object') {
      for (const [k, v] of Object.entries(value)) add(key + '[' + k + ']', v);
    } else {
      form.append(key, String(value));
    }
  };
  for (const [key, value] of Object.entries(obj)) add(key, value);
  return form;
}

// Same format as cookie-parser: 's:' + value + '.' + base64 HMAC-SHA256 without trailing '='.
function signCookie(value, secret = 'test-secret') {
  const signature = crypto.createHmac('sha256', secret).update(value).digest('base64').replace(/=+$/, '');
  return 's:' + value + '.' + signature;
}

// Inserts a post straight into the DB. th and en are optional; a language that is left out has no row.
// published_at defaults to now for a published translation and to null for a draft.
async function insertPost({ cover_image = null, th, en, tags = [] } = {}) {
  const now = new Date().toISOString();
  const { lastID: id } = await run('INSERT INTO posts (cover_image) VALUES (?)', [cover_image]);
  for (const [lang, tr] of [['th', th], ['en', en]]) {
    if (!tr) continue;
    const {
      status = 'published',
      slug,
      title,
      excerpt = '',
      body_markdown = '',
      cover_image_alt = '',
      seo_title = '',
      seo_description = '',
      published_at = status === 'published' ? now : null
    } = tr;
    await run(
      `INSERT INTO post_translations
         (post_id, lang, status, slug, title, excerpt, body_markdown, cover_image_alt,
          seo_title, seo_description, published_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, lang, status, slug, title, excerpt, body_markdown, cover_image_alt, seo_title, seo_description, published_at, now]
    );
  }
  for (const tagId of tags) {
    await run('INSERT INTO post_tags (post_id, tag_id) VALUES (?, ?)', [id, tagId]);
  }
  return id;
}

function updateJar(jar, setCookie) {
  for (const line of setCookie) {
    const [pair, ...attrs] = line.split(';');
    const eq = pair.indexOf('=');
    const name = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();
    let expired = value === '';
    for (const attr of attrs) {
      const [key, val = ''] = attr.trim().split('=');
      if (key.toLowerCase() === 'max-age' && Number(val) <= 0) expired = true;
      if (key.toLowerCase() === 'expires' && Date.parse(val) <= Date.now()) expired = true;
    }
    if (expired) jar.delete(name);
    else jar.set(name, value);
  }
}

async function start() {
  await ready;
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = 'http://127.0.0.1:' + server.address().port;
  const jar = new Map();

  async function req(urlPath, opts = {}) {
    const { method = 'GET', form, body, headers = {}, cookie, jar: useJar = true } = opts;
    const cookies = [];
    if (useJar) for (const [name, value] of jar) cookies.push(name + '=' + value);
    if (cookie) cookies.push(cookie);
    const sendHeaders = { ...headers };
    if (cookies.length) sendHeaders.cookie = cookies.join('; ');
    const res = await fetch(base + urlPath, {
      method,
      headers: sendHeaders,
      body: form ? toForm(form) : body,
      redirect: 'manual'
    });
    const setCookie = res.headers.getSetCookie();
    if (useJar) updateJar(jar, setCookie);
    return {
      status: res.status,
      location: res.headers.get('location'),
      headers: res.headers,
      text: await res.text(),
      setCookie
    };
  }

  function login(password = 'pw') {
    return req('/admin/login', { method: 'POST', form: { username: 'admin', password } });
  }

  async function stop() {
    await new Promise((resolve, reject) => server.close(err => (err ? reject(err) : resolve())));
    await close();
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
  }

  return { base, req, login, stop };
}

module.exports = { start, toForm, insertPost, signCookie, run, get, all };
```

- [ ] **Step 2: เขียน test 03 ที่ต้อง fail**

สร้าง `test/03-publish-per-language.test.js` ใช้บทความที่ฉบับไทย published slug `x` และฉบับอังกฤษ draft slug `x` title `EN DRAFT` ตาม spec ข้อ 3.4 test 3

- ข้อ "title ไทยอยู่ใน element ที่มี `lang="th"`" ตรวจโดยดึงทุก element ที่ขึ้นต้นด้วย `<article class="card"` ในหน้า หาตัวที่มีชื่อเรื่อง แล้วตรวจว่าขึ้นต้นด้วย `<article class="card" lang="th">`
- ข้อ "ไม่มี `hreflang="en"`" ตรวจเป็น `rel="alternate" hreflang="en"` เพราะลิงก์สลับภาษาใน header มี `hreflang` เสมอตาม Task 5 ถ้าตรวจแค่ `hreflang="en"` test จะ fail ทุกหน้า `/th`

นอกจากสามข้อของ spec test นี้ตรวจเพิ่มดังนี้

- การ์ดไทยบน `/en/blog` มี badge จาก `strings.en`, ลิงก์ไป `/th/blog/x`, วันที่เป็นรูปแบบ en-US ตามเวลาไทย (`2026-09-12T20:30:00.000Z` คือวันที่ 13 ตามเวลาไทย) และ thumbnail ที่มี `alt=""` กับ `loading="lazy"` ตาม spec ข้อ 2.2 และ 3.3
- ทิศทางกลับกัน บทความที่มีแค่ฉบับอังกฤษขึ้นบน `/th/blog` เป็นการ์ด `lang="en"` พร้อม badge จาก `strings.th` และ `/th/blog/en-only` ได้ 404 ไม่มี redirect ตาม spec ข้อ 2.0
- หน้า 404 ของ `/en/blog/x` มีลิงก์กลับไป `/en/blog` ตาม spec ข้อ 2.2
- หน้า `/th/blog/x` มี syntax highlight, วันที่ไทยแบบ พ.ศ., alt ของภาพปกจากฉบับไทย, ชิปแท็กที่ลิงก์ไป `/th/tags/containers`, canonical, `og:image` ที่เป็น URL เต็ม, `og:type` เป็น `article` และลิงก์สลับภาษาไป `/en/blog` เพราะฉบับอังกฤษยังเป็น draft
- หลังเปลี่ยนฉบับอังกฤษเป็น published แล้ว `/en/blog` เปลี่ยนเป็นการ์ดอังกฤษที่ไม่มี `lang` และไม่มีชื่อไทยเหลือ หน้า `/en/blog/x` มี `<html lang="en">`, alt และชื่อแท็กภาษาอังกฤษ และหน้าบทความทั้งสองภาษามี hreflang ชี้หากันกับลิงก์สลับภาษาไป `/en/blog/x`

````js
const test = require('node:test');
const assert = require('node:assert/strict');
const { start, insertPost, run } = require('./helpers');
const strings = require('../src/strings');

test('03 publish per language', async () => {
  const h = await start();
  try {
    const cards = html => html.match(/<article class="card"[^]*?<\/article>/g) || [];
    const { lastID: tagId } = await run(
      "INSERT INTO tags (slug, name_th, name_en) VALUES ('containers', 'คอนเทนเนอร์', 'Containers')"
    );
    const id = await insertPost({
      cover_image: '/uploads/cover.png',
      tags: [tagId],
      th: {
        slug: 'x',
        title: 'บทความไทย X',
        excerpt: 'เกริ่นนำภาษาไทย',
        body_markdown: '```js\nconst x = 1;\n```\n',
        cover_image_alt: 'ภาพปกภาษาไทย',
        published_at: '2026-09-12T20:30:00.000Z'
      },
      en: { status: 'draft', slug: 'x', title: 'EN DRAFT', cover_image_alt: 'English cover' }
    });
    await insertPost({ en: { slug: 'en-only', title: 'English only post', published_at: '2026-09-01T00:00:00.000Z' } });

    // /en/blog shows the published Thai translation as a Thai card and never the English draft
    let r = await h.req('/en/blog');
    assert.equal(r.status, 200);
    assert.ok(!r.text.includes('EN DRAFT'), r.text);
    let card = cards(r.text).find(c => c.includes('บทความไทย X'));
    assert.ok(card, r.text);
    assert.ok(card.startsWith('<article class="card" lang="th">'), card);
    assert.ok(card.includes('href="/th/blog/x"'), card);
    assert.ok(card.includes(strings.en.badgeOtherLang), card);
    assert.ok(card.includes('<time datetime="2026-09-12T20:30:00.000Z">Sep 13, 2026</time>'), card);
    assert.ok(card.includes('<img class="card-thumb" src="/uploads/cover.png" alt="" loading="lazy">'), card);

    // the other direction: an English-only post is an English card with a badge on /th/blog
    r = await h.req('/th/blog');
    card = cards(r.text).find(c => c.includes('English only post'));
    assert.ok(card && card.startsWith('<article class="card" lang="en">'), r.text);
    assert.ok(card.includes('href="/en/blog/en-only"'), card);
    assert.ok(card.includes(strings.th.badgeOtherLang), card);
    assert.equal((await h.req('/th/blog/en-only')).status, 404);

    r = await h.req('/en/blog/x');
    assert.equal(r.status, 404);
    assert.ok(r.text.includes('href="/en/blog"'), r.text);

    r = await h.req('/th/blog/x');
    assert.equal(r.status, 200);
    assert.ok(r.text.includes('<h1>บทความไทย X</h1>'), r.text);
    assert.ok(r.text.includes('class="hljs-keyword"'), r.text);
    assert.ok(r.text.includes('<time datetime="2026-09-12T20:30:00.000Z">13 ก.ย. 2569</time>'), r.text);
    assert.ok(r.text.includes('<img class="post-cover" src="/uploads/cover.png" alt="ภาพปกภาษาไทย">'), r.text);
    assert.ok(r.text.includes('<a class="tag" href="/th/tags/containers">คอนเทนเนอร์</a>'), r.text);
    assert.ok(r.text.includes('<link rel="canonical" href="http://test.local/th/blog/x">'), r.text);
    assert.ok(r.text.includes('<meta property="og:image" content="http://test.local/uploads/cover.png">'), r.text);
    assert.ok(r.text.includes('<meta property="og:type" content="article">'), r.text);
    // the header switch link always has hreflang, so the check is on <link rel="alternate">
    assert.ok(!r.text.includes('rel="alternate" hreflang="en"'), r.text);
    assert.ok(!r.text.includes('rel="alternate" hreflang="th"'), r.text);
    assert.ok(r.text.includes('class="lang-switch" href="/en/blog" lang="en" hreflang="en"'), r.text);

    // once English is published, /en/blog uses the English card and both detail pages point at each other
    await run(
      "UPDATE post_translations SET status = 'published', title = 'EN PUBLISHED', published_at = ? WHERE post_id = ? AND lang = 'en'",
      ['2026-09-13T08:00:00.000Z', id]
    );
    r = await h.req('/en/blog');
    card = cards(r.text).find(c => c.includes('href="/en/blog/x"'));
    assert.ok(card && card.startsWith('<article class="card">'), r.text);
    assert.ok(card.includes('EN PUBLISHED'), card);
    assert.ok(!r.text.includes('บทความไทย X'), r.text);

    r = await h.req('/en/blog/x');
    assert.equal(r.status, 200);
    assert.ok(r.text.includes('<html lang="en">'), r.text);
    assert.ok(r.text.includes('<img class="post-cover" src="/uploads/cover.png" alt="English cover">'), r.text);
    assert.ok(r.text.includes('<a class="tag" href="/en/tags/containers">Containers</a>'), r.text);
    assert.ok(r.text.includes('<link rel="alternate" hreflang="th" href="http://test.local/th/blog/x">'), r.text);
    assert.ok(r.text.includes('<link rel="alternate" hreflang="en" href="http://test.local/en/blog/x">'), r.text);

    r = await h.req('/th/blog/x');
    assert.ok(r.text.includes('<link rel="alternate" hreflang="en" href="http://test.local/en/blog/x">'), r.text);
    assert.ok(r.text.includes('class="lang-switch" href="/en/blog/x" lang="en" hreflang="en"'), r.text);
  } finally {
    await h.stop();
  }
});
````

- [ ] **Step 3: เขียน test 05 ที่ต้อง fail**

สร้าง `test/05-blog-hidden.test.js` ใช้บทความที่มีแค่ฉบับไทยแบบ draft ตาม spec ข้อ 3.4 test 5 และครอบทั้งสี่ข้อของ spec

- มีบทความ published อีกหนึ่งตัวเป็นตัวควบคุม ถ้าหน้าไม่ได้แสดงบทความเลย การตรวจว่า "ไม่มี title ของ draft" จะผ่านโดยไม่ได้พิสูจน์อะไร
- ตรวจ `/en/blog` และ `/en` ด้วย เพราะ fallback query ต้องไม่หยิบ draft มาเป็นการ์ดของอีกภาษา
- `GET /th/blog/%E0%` ได้ 400 เพราะ router ของ Express 5 โยน `URIError` ที่มี `status = 400` ตอน decode `:slug` แล้ว error handler ของ app render หน้า error ที่มีข้อความ `errorBadRequestTitle`
- นอกจาก `?page=abc` ยังตรวจ `0`, `-1`, `1.5`, `1e300` และ `2` ซึ่งเกินหน้าสุดท้าย ทุกค่าต้องได้ 404 ตอนเขียนแผนลองแล้วว่า `Number.isInteger(1e300)` เป็น `true` และ sqlite3 ตอบ `SQLITE_MISMATCH: datatype mismatch` เมื่อได้ OFFSET นั้น ถ้าตรวจด้วย `Number.isInteger` ตามโค้ดใน spec ข้อ 2.1 ค่านี้จะกลายเป็น 500
- pagination ใช้บทความ published รวม 12 ตัว หน้า 1 ต้องมี 10 ตัวที่ใหม่ที่สุดตามลำดับ มีลิงก์ไปหน้า 2 และไม่มีลิงก์หน้าใหม่กว่า หน้า 2 ต้องมี 2 ตัว ลิงก์กลับหน้า 1 เป็น `/th/blog` ไม่มี `?page=1` canonical ชี้ตัวเอง hreflang ของหน้า 2 ชี้ `/en/blog?page=2` และลิงก์สลับภาษาไม่พก `page` ตาม spec ข้อ 2.1 และ 2.2 ส่วนหน้า 3 ได้ 404
- หน้าแรกแสดง 5 บทความที่ใหม่ที่สุดและลิงก์ ดูบทความทั้งหมด ตาม spec ข้อ 2.1

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { start, insertPost } = require('./helpers');
const strings = require('../src/strings');

test('05 blog hidden', async () => {
  const h = await start();
  try {
    const cards = html => html.match(/<article class="card"[^]*?<\/article>/g) || [];
    const hrefs = html => cards(html).map(c => c.match(/href="([^"]*)"/)[1]);

    await insertPost({ th: { status: 'draft', slug: 'secret-draft', title: 'ร่างที่ยังไม่เผยแพร่' } });
    // a published post proves that these pages list posts at all, so the "not included" checks are not empty passes
    await insertPost({ th: { slug: 'visible', title: 'บทความที่เผยแพร่แล้ว', published_at: '2026-01-01T00:00:00.000Z' } });

    for (const urlPath of ['/th/blog', '/th', '/en/blog', '/en']) {
      const page = await h.req(urlPath);
      assert.equal(page.status, 200, urlPath);
      assert.ok(page.text.includes('บทความที่เผยแพร่แล้ว'), urlPath);
      assert.ok(!page.text.includes('ร่างที่ยังไม่เผยแพร่'), urlPath);
      assert.ok(!page.text.includes('secret-draft'), urlPath);
    }

    let r = await h.req('/th/blog/secret-draft');
    assert.equal(r.status, 404);

    // a broken percent escape in the slug gives the 400 error page, not a stack trace
    r = await h.req('/th/blog/%E0%');
    assert.equal(r.status, 400);
    assert.ok(!r.text.includes('node_modules'), r.text);
    assert.ok(r.text.includes(strings.th.errorBadRequestTitle), r.text);

    r = await h.req('/th/blog?page=abc');
    assert.equal(r.status, 404);
    // 1e300 passes Number.isInteger, but SQLite rejects that OFFSET with SQLITE_MISMATCH, so it must be a 404 and not a 500
    for (const page of ['0', '-1', '1.5', '1e300', '2']) {
      r = await h.req('/th/blog?page=' + page);
      assert.equal(r.status, 404, 'page=' + page);
    }

    // pagination: 12 published posts in total, 10 per page, newest first
    for (let i = 1; i <= 11; i++) {
      const day = String(i).padStart(2, '0');
      await insertPost({ th: { slug: 'p' + i, title: 'ลำดับ ' + i, published_at: '2026-02-' + day + 'T00:00:00.000Z' } });
    }

    r = await h.req('/th/blog');
    assert.deepEqual(hrefs(r.text), [11, 10, 9, 8, 7, 6, 5, 4, 3, 2].map(i => '/th/blog/p' + i));
    assert.ok(r.text.includes('<a class="pagination-older" href="/th/blog?page=2">'), r.text);
    assert.ok(!r.text.includes('pagination-newer'), r.text);
    assert.ok(r.text.includes('<link rel="canonical" href="http://test.local/th/blog">'), r.text);

    r = await h.req('/th/blog?page=2');
    assert.equal(r.status, 200);
    assert.deepEqual(hrefs(r.text), ['/th/blog/p1', '/th/blog/visible']);
    // the link back to page 1 is /th/blog without ?page=1
    assert.ok(r.text.includes('<a class="pagination-newer" href="/th/blog">'), r.text);
    assert.ok(!r.text.includes('pagination-older'), r.text);
    assert.ok(r.text.includes('<link rel="canonical" href="http://test.local/th/blog?page=2">'), r.text);
    assert.ok(r.text.includes('<link rel="alternate" hreflang="en" href="http://test.local/en/blog?page=2">'), r.text);
    // the language switch does not carry ?page
    assert.ok(r.text.includes('class="lang-switch" href="/en/blog" lang="en" hreflang="en"'), r.text);
    assert.ok(!r.text.includes('ร่างที่ยังไม่เผยแพร่'), r.text);

    r = await h.req('/th/blog?page=3');
    assert.equal(r.status, 404);

    // the home page shows the 5 newest posts
    r = await h.req('/th');
    assert.deepEqual(hrefs(r.text), [11, 10, 9, 8, 7].map(i => '/th/blog/p' + i));
    assert.ok(r.text.includes('href="/th/blog">' + strings.th.allPosts + '</a>'), r.text);
  } finally {
    await h.stop();
  }
});
```

- [ ] **Step 4: รัน test ให้เห็นว่า fail**

`insertPost` จาก Step 1 ทำงานแล้ว test จึงผ่านบรรทัด insert มาได้ และไป fail ที่ request แรก เพราะยังไม่มี route `/blog` ทุก request จึงตกไปที่ 404 handler

Run: `node --test test/03-publish-per-language.test.js`
Expected: FAIL exit code 1 และ output

```
✖ 03 publish per language (131.9814ms)
ℹ tests 1
ℹ suites 0
ℹ pass 0
ℹ fail 1
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 551.3549

✖ failing tests:

test at test\03-publish-per-language.test.js:6:1
✖ 03 publish per language (131.9814ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  
  404 !== 200
  
      at TestContext.<anonymous> (D:\Ikkyusan\Downloads\TalkAlways_MVP\talkalways\test\03-publish-per-language.test.js:30:12)
      at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
      at async Test.run (node:internal/test_runner/test:1409:7)
      at async startSubtestAfterBootstrap (node:internal/test_runner/harness:387:3) {
    generatedMessage: true,
    code: 'ERR_ASSERTION',
    actual: 404,
    expected: 200,
    operator: 'strictEqual',
    diff: 'simple'
  }
```

Run: `node --test test/05-blog-hidden.test.js`
Expected: FAIL exit code 1 และ output

```
✖ 05 blog hidden (112.4114ms)
ℹ tests 1
ℹ suites 0
ℹ pass 0
ℹ fail 1
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 553.6306

✖ failing tests:

test at test\05-blog-hidden.test.js:6:1
✖ 05 blog hidden (112.4114ms)
  AssertionError [ERR_ASSERTION]: /th/blog
  
  404 !== 200
  
      at TestContext.<anonymous> (D:\Ikkyusan\Downloads\TalkAlways_MVP\talkalways\test\05-blog-hidden.test.js:18:14)
      at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
      at async Test.run (node:internal/test_runner/test:1409:7)
      at async startSubtestAfterBootstrap (node:internal/test_runner/harness:387:3) {
    generatedMessage: false,
    code: 'ERR_ASSERTION',
    actual: 404,
    expected: 200,
    operator: 'strictEqual',
    diff: 'simple'
  }
```

- [ ] **Step 5: เพิ่มข้อความของหน้า blog ใน src/strings.js**

แทนที่เนื้อหาทั้งหมดของ `src/strings.js` ด้วยข้อความนี้ key 15 ตัวแรกไม่เปลี่ยนจาก Task 5 และ key ใหม่ 10 ตัวต่อท้ายทั้งสองภาษา

- `badgeOtherLang` คือชื่อของอีกภาษาเขียนด้วยภาษาของหน้า หน้า `/th` แสดงการ์ดอังกฤษพร้อมคำว่า ภาษาอังกฤษ ส่วนหน้า `/en` แสดงการ์ดไทยพร้อมคำว่า `Thai` ตาม spec ข้อ 2.2
- `pageLabel` ใช้ใน `<title>` ของหน้า 2 ขึ้นไป `pagination` เป็น `aria-label` ของ `<nav>` ของ pagination
- test 02 ตรวจว่า `th` กับ `en` มี key ชุดเดียวกัน

```js
module.exports = {
  th: {
    skipToContent: 'ข้ามไปที่เนื้อหา',
    navMain: 'เมนูหลัก',
    navBlog: 'บทความ',
    navProjects: 'โปรเจกต์',
    navAbout: 'เกี่ยวกับ',
    switchLang: 'English',
    themeToggle: 'สลับธีมสว่างหรือมืด',
    errorNotFoundTitle: 'ไม่พบหน้านี้',
    errorNotFoundBody: 'ลิงก์อาจพิมพ์ผิด หรือหน้านี้ถูกลบไปแล้ว',
    errorBadRequestTitle: 'ลิงก์ไม่ถูกต้อง',
    errorBadRequestBody: 'ลิงก์นี้อาจขาดหายระหว่างการแชร์ ลองเปิดจากหน้ารวมบทความแทน',
    errorServerTitle: 'เกิดข้อผิดพลาด',
    errorServerBody: 'ระบบขัดข้องชั่วคราว ลองใหม่อีกครั้งในอีกสักครู่',
    errorBackToBlog: 'ไปหน้ารวมบทความ',
    errorBackHome: 'กลับหน้าแรก',
    latestPosts: 'บทความล่าสุด',
    allPosts: 'ดูบทความทั้งหมด',
    noPosts: 'ยังไม่มีบทความ',
    badgeOtherLang: 'ภาษาอังกฤษ',
    postTags: 'แท็ก',
    backToBlog: 'กลับไปหน้ารวมบทความ',
    pagination: 'การแบ่งหน้า',
    pageLabel: 'หน้า',
    pageNewer: 'บทความใหม่กว่า',
    pageOlder: 'บทความเก่ากว่า'
  },
  en: {
    skipToContent: 'Skip to content',
    navMain: 'Main',
    navBlog: 'Blog',
    navProjects: 'Projects',
    navAbout: 'About',
    switchLang: 'ไทย',
    themeToggle: 'Toggle light or dark theme',
    errorNotFoundTitle: 'Page not found',
    errorNotFoundBody: 'The link may be mistyped, or the page has been removed.',
    errorBadRequestTitle: 'Invalid link',
    errorBadRequestBody: 'This link may have been cut off when it was shared. Try opening it from the blog index instead.',
    errorServerTitle: 'Something went wrong',
    errorServerBody: 'The site hit a temporary problem. Please try again in a moment.',
    errorBackToBlog: 'Go to the blog',
    errorBackHome: 'Back to home',
    latestPosts: 'Latest posts',
    allPosts: 'All posts',
    noPosts: 'No posts yet.',
    badgeOtherLang: 'Thai',
    postTags: 'Tags',
    backToBlog: 'Back to the blog',
    pagination: 'Pagination',
    pageLabel: 'Page',
    pageNewer: 'Newer posts',
    pageOlder: 'Older posts'
  }
};
```

- [ ] **Step 6: เขียน src/routes/public.js ใหม่ทั้งไฟล์**

แทนที่เนื้อหาทั้งหมดของ `src/routes/public.js` ด้วยข้อความนี้ `loadSettings` และ `router.use` ไม่เปลี่ยนจาก Task 5

- `LIST_SQL` คือ fallback query จาก spec ข้อ 2.1 ต่างกันสองจุด
  - ใช้ `LIMIT ? OFFSET ?` แทน `LIMIT 11 OFFSET ?` หน้าแรกจึงใช้ query เดียวกันด้วย limit 5
  - เพิ่ม `t.post_id DESC` เป็นตัวตัดสินเมื่อ `published_at` เท่ากัน SQLite ไม่รับประกันลำดับของแถวที่ค่าเรียงเท่ากัน ถ้าไม่มีตัวนี้ บทความอาจซ้ำหรือหายระหว่างหน้า 1 กับหน้า 2 การเรียงยังมาจาก `t.published_at` เป็นหลักตาม spec
- ทุกบทความที่มีฉบับ published อย่างน้อยหนึ่งภาษาได้แถวเดียวทั้งบนหน้า `/th` และ `/en` จำนวนแถวของสองภาษาจึงเท่ากันเสมอ `?page=N` ของสองภาษาเป็นหน้าคู่กัน และใส่ hreflang ข้ามกันได้ตาม spec ข้อ 2.2 ที่ให้หน้า list มี hreflang ทั้งสองภาษา
- `pageNumber` คือโค้ด pagination ของ spec ข้อ 2.1 ที่เปลี่ยน `Number.isInteger` เป็น `Number.isSafeInteger` เหตุผลอยู่ใน Step 3
- หน้า `?page=N` ที่ N มากกว่า 1 มี canonical ชี้ตัวเองตาม spec ข้อ 2.2 และ header ตัด query ออกจากลิงก์สลับภาษาเอง
- `GET /blog/:slug` หา translation ด้วย `lang`, `slug` และ `status = 'published'` ถ้าไม่เจอเรียก `next()` ซึ่งได้ 404 จากนั้นหา sibling ด้วย query ของ spec ข้อ 2.2 และใส่ `alternates` ก็ต่อเมื่อทั้งสองภาษา published
- `tags` ถูกแปลงเป็น `{ slug, name }` ในภาษาของหน้าตั้งแต่ใน route `views/post.ejs` และ preview ของ Task 11 จึงไม่ต้องรู้จัก `name_th` กับ `name_en`
- `meta` สร้างตามตัวอย่างใน spec ข้อ 2.2 canonical สร้างจาก `lang` กับ slug ที่ได้จาก DB ไม่ได้มาจาก `req.originalUrl` และ `image` เป็น path ที่ `head.ejs` ต่อ `SITE_URL` ให้
- `preview: false` และ `alternates` ระดับบนสุดส่งตาม render signature ใน Interfaces ของ plan แม้ `views/post.ejs` ของ task นี้ยังไม่อ่าน
- Express 5 ส่ง error จาก async handler ต่อให้ error handler เอง จึงไม่มี try/catch

```js
const express = require('express');
const { get, all } = require('../db');

const router = express.Router();

const PAGE_SIZE = 10;

// Fallback list query from spec 2.1. Each post appears once: in the page language when that
// translation is published, otherwise as the published translation in the other language.
// post_id breaks ties, so two posts with the same published_at never swap places between pages.
const LIST_SQL = `
  SELECT t.post_id, t.lang, t.slug, t.title, t.excerpt, t.published_at, p.cover_image
  FROM post_translations t
  JOIN posts p ON p.id = t.post_id
  WHERE t.status = 'published'
    AND (t.lang = ? OR NOT EXISTS (
          SELECT 1 FROM post_translations x
          WHERE x.post_id = t.post_id AND x.lang = ? AND x.status = 'published'))
  ORDER BY t.published_at DESC, t.post_id DESC
  LIMIT ? OFFSET ?`;

async function loadSettings(lang) {
  const rows = await all("SELECT key, value FROM settings WHERE lang IN (?, '*')", [lang]);
  const settings = {};
  for (const row of rows) settings[row.key] = row.value;
  return settings;
}

// ?page=N from spec 2.1. Anything but a whole number from 1 up gives null, and the route answers 404.
// isSafeInteger, not isInteger: 1e300 is an integer to JavaScript, but SQLite rejects it as OFFSET.
function pageNumber(req) {
  const page = Number(req.query.page || 1);
  return Number.isSafeInteger(page) && page >= 1 ? page : null;
}

router.use(async (req, res, next) => {
  res.locals.settings = await loadSettings(res.locals.lang);
  next();
});

router.get('/', async (req, res) => {
  const { lang, settings } = res.locals;
  const posts = await all(LIST_SQL, [lang, lang, 5, 0]);
  res.render('home', {
    posts,
    meta: {
      description: settings.tagline,
      canonical: '/' + lang,
      alternates: [
        { lang: 'th', href: '/th' },
        { lang: 'en', href: '/en' }
      ],
      type: 'website'
    }
  });
});

router.get('/blog', async (req, res, next) => {
  const { lang, t } = res.locals;
  const page = pageNumber(req);
  if (!page) return next();
  const rows = await all(LIST_SQL, [lang, lang, PAGE_SIZE + 1, (page - 1) * PAGE_SIZE]);
  if (page > 1 && rows.length === 0) return next();
  const query = page > 1 ? '?page=' + page : '';
  res.render('blog', {
    posts: rows.slice(0, PAGE_SIZE),
    page,
    hasNext: rows.length > PAGE_SIZE,
    tag: null,
    meta: {
      title: page > 1 ? t.navBlog + ' · ' + t.pageLabel + ' ' + page : t.navBlog,
      canonical: '/' + lang + '/blog' + query,
      alternates: [
        { lang: 'th', href: '/th/blog' + query },
        { lang: 'en', href: '/en/blog' + query }
      ],
      type: 'website'
    }
  });
});

router.get('/blog/:slug', async (req, res, next) => {
  const { lang } = res.locals;
  const tr = await get(
    "SELECT * FROM post_translations WHERE lang = ? AND slug = ? AND status = 'published'",
    [lang, req.params.slug]
  );
  if (!tr) return next();
  const post = await get('SELECT id, cover_image FROM posts WHERE id = ?', [tr.post_id]);
  const siblings = await all(
    "SELECT lang, slug FROM post_translations WHERE post_id = ? AND status = 'published' ORDER BY lang DESC",
    [tr.post_id]
  );
  const tagRows = await all(
    `SELECT tg.slug, tg.name_th, tg.name_en
     FROM post_tags pt JOIN tags tg ON tg.id = pt.tag_id
     WHERE pt.post_id = ? ORDER BY tg.slug`,
    [tr.post_id]
  );
  const tags = tagRows.map(tag => ({ slug: tag.slug, name: lang === 'th' ? tag.name_th : tag.name_en }));
  // hreflang only when both languages are published (spec 2.2)
  const alternates = siblings.length === 2
    ? siblings.map(s => ({ lang: s.lang, href: '/' + s.lang + '/blog/' + s.slug }))
    : [];
  res.render('post', {
    post,
    tr,
    tags,
    alternates,
    preview: false,
    meta: {
      title: tr.seo_title || tr.title,
      description: tr.seo_description || tr.excerpt,
      canonical: '/' + lang + '/blog/' + tr.slug,
      alternates,
      image: post.cover_image,
      type: 'article'
    }
  });
});

module.exports = router;
```

- [ ] **Step 7: เขียน views/partials/post-card.ejs**

สร้าง `views/partials/post-card.ejs` การ์ดนี้ใช้ในหน้าแรก, blog, หน้าแท็ก และหน้า search

- `foreign` เป็นจริงเมื่อภาษาของการ์ดไม่ตรงกับหน้า การ์ดจึงได้ `lang` ของตัวเองที่ `<article>` ตาม spec ข้อ 2.2 และ `:lang(th)` ใน `site.css` ให้ขนาดตัวอักษรกับ line-height ของภาษาไทยกับการ์ดนั้นบนหน้า `/en`
- วันที่และ badge เขียนด้วยภาษาของหน้า `.card-meta` จึงได้ `lang` ของหน้ากลับคืน screen reader จะอ่านคำว่า Thai ด้วยเสียงอังกฤษ ไม่ใช่เสียงไทย
- วันที่ใช้ `formatDate(lang, card.published_at)` จึงเป็นเวลาไทยในรูปแบบของภาษาของหน้า
- ระดับ heading มาจาก `level` หน้า blog ส่ง 2 เพราะอยู่ใต้ `h1` หน้าแรกส่ง 3 เพราะอยู่ใต้ `h2` ของ section ลำดับ heading จึงไม่กระโดด CSS จึงใช้ `.card-title a::after` แทน `.card h3 a::after` ใน spec ข้อ 3.3
- ลิงก์ชี้ไป `/<ภาษาของการ์ด>/blog/<slug>` ตาม spec ข้อ 2.2
- thumbnail อยู่หลังเนื้อหาใน DOM มี `alt=""` และ `loading="lazy"` ตาม spec ข้อ 3.3 และ CSS ซ่อนไว้บนจอที่แคบกว่า 40rem ซึ่ง browser จะไม่โหลดรูป lazy ที่ถูกซ่อน
- ชื่อตัวแปร `foreign` กับ `heading` ตั้งไม่ให้ซ้ำกับ locals `other` และ `tag` ที่ template อื่นส่งมา เพราะ EJS รัน template ใน `with (locals)`

```ejs
<%
const foreign = card.lang !== lang;
const heading = 'h' + (locals.level || 2);
-%>
<article class="card"<% if (foreign) { %> lang="<%= card.lang %>"<% } %>>
  <div class="card-body">
    <<%= heading %> class="card-title"><a href="/<%= card.lang %>/blog/<%= card.slug %>"><%= card.title %></a></<%= heading %>>
    <p class="card-meta"<% if (foreign) { %> lang="<%= lang %>"<% } %>>
      <time datetime="<%= card.published_at %>"><%= formatDate(lang, card.published_at) %></time>
<% if (foreign) { -%>
      <span class="badge"><%= t.badgeOtherLang %></span>
<% } -%>
    </p>
<% if (card.excerpt) { -%>
    <p class="excerpt"><%= card.excerpt %></p>
<% } -%>
  </div>
<% if (card.cover_image) { -%>
  <img class="card-thumb" src="<%= card.cover_image %>" alt="" loading="lazy">
<% } -%>
</article>
```

- [ ] **Step 8: เขียน views/blog.ejs**

สร้าง `views/blog.ejs`

- หน้าที่ยังไม่มีบทความแสดง `noPosts` ส่วนหน้า 2 ขึ้นไปที่ว่างไม่มีทางมาถึง template เพราะ route ตอบ 404 ไปแล้ว
- ลิงก์ บทความใหม่กว่า ของหน้า 2 เป็น `base` เฉยๆ ไม่มี `?page=1` ตาม spec ข้อ 2.1
- ไม่ใส่ `rel="prev"` หรือ `rel="next"` เพราะ spec ข้อ 2.2 ตัด `rel=prev/next` ออก
- บรรทัดที่มี `<%-` ทุกบรรทัดมี `include(` อยู่บรรทัดเดียวกัน จึงผ่านขั้นตรวจของ CI
- template นี้ยังไม่อ่าน `tag` Task 14 เปลี่ยน `<h1>` และ `base` ให้ใช้แท็ก

```ejs
<%
const base = '/' + lang + '/blog';
-%>
<%- include('partials/head') %>
<%- include('partials/header') %>
<main id="main" class="blog">
  <h1><%= t.navBlog %></h1>
<% if (posts.length === 0) { -%>
  <p class="empty"><%= t.noPosts %></p>
<% } else { -%>
  <div class="post-list">
<% for (const card of posts) { -%>
    <%- include('partials/post-card', { card, level: 2 }) %>
<% } -%>
  </div>
<% } -%>
<% if (page > 1 || hasNext) { -%>
  <nav class="pagination" aria-label="<%= t.pagination %>">
<% if (page > 1) { -%>
    <a class="pagination-newer" href="<%= page === 2 ? base : base + '?page=' + (page - 1) %>"><%= t.pageNewer %></a>
<% } -%>
<% if (hasNext) { -%>
    <a class="pagination-older" href="<%= base + '?page=' + (page + 1) %>"><%= t.pageOlder %></a>
<% } -%>
  </nav>
<% } -%>
</main>
<%- include('partials/footer') %>
```

- [ ] **Step 9: เขียน views/post.ejs**

สร้าง `views/post.ejs`

- `<%- md.render(tr.body_markdown) %>` เป็นที่เดียวที่ส่ง HTML ออกไปโดยไม่ escape นอกจาก `include` ส่วน title, alt, ชื่อแท็ก และวันที่ใช้ `<%= %>` ทั้งหมดตาม spec ข้อ 2.4
- วันที่แสดงเมื่อ `tr.published_at` มีค่า หน้าจริงมีค่าเสมอ เงื่อนไขนี้มีไว้ให้ preview ของ Task 11 ที่ render ฉบับที่ยังไม่เคย publish
- ชิปแท็กลิงก์ไป `/<lang>/tags/<slug>` ตาม spec ข้อ 2.4 ลิงก์เหล่านี้ได้ 404 จนกว่า Task 14 จะสร้างหน้าแท็ก
- alt ของภาพปกมาจากฉบับของภาษาที่แสดงอยู่ตาม spec ข้อ 2.1
- `<header>` ที่อยู่ใน `<article>` ไม่นับเป็น banner landmark จึงไม่ชนกับ header ของเว็บ

```ejs
<%- include('partials/head') %>
<%- include('partials/header') %>
<main id="main" class="post">
  <article class="post-article">
    <header class="post-header">
      <h1><%= tr.title %></h1>
<% if (tr.published_at) { -%>
      <p class="post-meta"><time datetime="<%= tr.published_at %>"><%= formatDate(lang, tr.published_at) %></time></p>
<% } -%>
<% if (tags.length) { -%>
      <ul class="tag-list" aria-label="<%= t.postTags %>">
<% for (const tag of tags) { -%>
        <li><a class="tag" href="/<%= lang %>/tags/<%= tag.slug %>"><%= tag.name %></a></li>
<% } -%>
      </ul>
<% } -%>
    </header>
<% if (post.cover_image) { -%>
    <img class="post-cover" src="<%= post.cover_image %>" alt="<%= tr.cover_image_alt %>">
<% } -%>
    <div class="prose">
      <%- md.render(tr.body_markdown) %>
    </div>
  </article>
  <p class="post-back"><a href="/<%= lang %>/blog"><%= t.backToBlog %></a></p>
</main>
<%- include('partials/footer') %>
```

- [ ] **Step 10: เพิ่มบทความล่าสุดใน views/home.ejs**

แทนที่เนื้อหาทั้งหมดของ `views/home.ejs` ด้วยข้อความนี้ section `.intro` ไม่เปลี่ยนจาก Task 5

- section บทความล่าสุดแสดงเมื่อมีบทความ published อย่างน้อยหนึ่งตัว เว็บที่เพิ่งเริ่มจึงไม่มีหัวข้อที่ว่างเปล่า
- การ์ดใช้ `level: 3` เพราะอยู่ใต้ `h2` ของ section
- Task 12 แทรก section โปรเจกต์ featured ระหว่าง `.intro` กับ `.latest`

```ejs
<%- include('partials/head') %>
<%- include('partials/header') %>
<main id="main" class="home">
  <section class="intro">
    <h1><%= settings.site_name || 'Portfolio' %></h1>
<% if (settings.tagline) { -%>
    <p class="tagline"><%= settings.tagline %></p>
<% } -%>
  </section>
<% if (posts.length) { -%>
  <section class="latest">
    <div class="section-head">
      <h2><%= t.latestPosts %></h2>
      <a href="/<%= lang %>/blog"><%= t.allPosts %></a>
    </div>
    <div class="post-list">
<% for (const card of posts) { -%>
      <%- include('partials/post-card', { card, level: 3 }) %>
<% } -%>
    </div>
  </section>
<% } -%>
</main>
<%- include('partials/footer') %>
```

- [ ] **Step 11: ต่อ CSS ของรายการบทความ, การ์ด และหน้าบทความท้าย public/css/site.css**

แทนที่สามบรรทัดสุดท้ายของ `public/css/site.css` ซึ่งตอนนี้คือ

```css
@media (min-width: 64rem) {
  main { padding-block-start: var(--sp-12); }
}
```

ด้วยข้อความนี้ ส่วนต้นของไฟล์ไม่เปลี่ยน

- blog index เป็นรายการคั่นด้วยเส้นบาง ไม่ใช่ card grid ตาม spec ข้อ 3.3 เส้นอยู่ที่ `.card + .card` จึงไม่มีเส้นเกินหัวหรือท้ายรายการ
- ทั้งการ์ดคลิกได้ด้วย `::after` ที่ `position: absolute; inset: 0` ของลิงก์ชื่อเรื่อง ตาม spec ข้อ 3.3 โดย accessibility tree ยังมีลิงก์เดียวต่อการ์ด
- `.excerpt` ตัดเหลือ 3 บรรทัดด้วย `-webkit-line-clamp` และยังได้ `line-height: var(--lh-body)` จาก rule typography ของ Task 6 ตามกติกาใน spec ข้อ 3.3 ที่กันวรรณยุกต์บรรทัดแรกโดนตัด
- thumbnail กว้าง 8rem แสดงตั้งแต่ 40rem ขึ้นไปตาม spec ข้อ 3.3 และใช้ `aspect-ratio` กับ `object-fit: cover` รูปทุกขนาดจึงสูงเท่ากัน
- `.pagination-older` ใช้ `margin-inline-start: auto` ลิงก์ บทความเก่ากว่า จึงชิดขวาแม้อยู่ตัวเดียวบนหน้า 1
- `.prose > :first-child` ตัด margin บนของ element แรกใน body บทความที่ขึ้นต้นด้วย `##` จึงไม่มีช่องว่าง 3rem ใต้ภาพปก
- ไม่มี token ใหม่, ใช้ breakpoint แค่ `40rem` และไม่มี `letter-spacing` หรือ `text-transform` ตามกติกาของ Task 6

```css
@media (min-width: 64rem) {
  main { padding-block-start: var(--sp-12); }
}

/* Post lists and cards (Task 9). The blog index is a list divided by thin rules, not a card grid. */
.blog > * { max-width: var(--measure); }
.blog h1 { margin: 0 0 var(--sp-6); }
.empty { color: var(--text-muted); }
.section-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--sp-2) var(--sp-4);
  max-width: var(--measure);
  margin-bottom: var(--sp-2);
}
.section-head h2 { margin: 0; }
.post-list { max-width: var(--measure); }
.card { position: relative; display: flex; align-items: flex-start; gap: var(--sp-6); padding-block: var(--sp-6); }
.card:first-child { padding-block-start: var(--sp-2); }
.card + .card { border-top: 1px solid var(--border); }
.card-body { flex: 1; min-width: 0; }
.card-title { margin: 0; font-size: var(--fs-h3); }
.card-title a { color: var(--text); text-decoration: none; }
.card-title a::after { content: ""; position: absolute; inset: 0; }
.card:hover .card-title a { text-decoration: underline; }
.card-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--sp-1) var(--sp-3);
  margin: var(--sp-1) 0 0;
  color: var(--text-muted);
  font-size: var(--fs-sm);
}
.badge { padding: 0 var(--sp-2); border: 1px solid var(--border-strong); border-radius: var(--r-sm); }
/* line-height stays var(--lh-body) from the typography rule, so the clamp does not cut Thai marks on the first line */
.excerpt {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  overflow: hidden;
  margin: var(--sp-2) 0 0;
  color: var(--text-muted);
}
.card-thumb { display: none; }

.pagination {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-4);
  margin-top: var(--sp-6);
  padding-top: var(--sp-6);
  border-top: 1px solid var(--border);
}
.pagination-older { margin-inline-start: auto; }

/* Post page */
.post-article { max-width: var(--measure); }
.post-header h1 { margin: 0; }
.post-meta { margin: var(--sp-2) 0 0; color: var(--text-muted); font-size: var(--fs-sm); }
.tag-list { display: flex; flex-wrap: wrap; gap: var(--sp-2); margin: var(--sp-4) 0 0; padding: 0; list-style: none; }
.tag {
  display: inline-block;
  padding: 0 var(--sp-2);
  border: 1px solid var(--border-strong);
  border-radius: var(--r-sm);
  color: var(--text-muted);
  font-size: var(--fs-sm);
  text-decoration: none;
}
a.tag:hover { color: var(--text); border-color: var(--text); }
.post-cover { display: block; margin-top: var(--sp-8); border-radius: var(--r-md); }
.post-article .prose { margin-top: var(--sp-8); }
.prose > :first-child { margin-top: 0; }
.post-back { max-width: var(--measure); margin: var(--sp-12) 0 0; padding-top: var(--sp-6); border-top: 1px solid var(--border); }

@media (min-width: 40rem) {
  .card-thumb { display: block; flex: none; width: 8rem; aspect-ratio: 4 / 3; object-fit: cover; border-radius: var(--r-md); }
}
```

- [ ] **Step 12: รัน test ให้เห็นว่าผ่าน**

Run: `node --test test/03-publish-per-language.test.js`
Expected: PASS exit code 0

```
✔ 03 publish per language (198.5337ms)
ℹ tests 1
ℹ suites 0
ℹ pass 1
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 701.5306
```

Run: `node --test test/05-blog-hidden.test.js`
Expected: PASS exit code 0

```
✔ 05 blog hidden (283.7881ms)
ℹ tests 1
ℹ suites 0
ℹ pass 1
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 710.7323
```

- [ ] **Step 13: ตรวจ token และ breakpoint ของ site.css**

คำสั่งแรกคือคำสั่งตรวจ token ของ Task 6 Step 7 ตัวเดิมทุกตัวอักษร คำสั่งที่สองพิมพ์ media query ทุกตัวในไฟล์ ซึ่งต้องมีแค่ `40rem` กับ `64rem`

Run:

```bash
node -e 'const css=require("fs").readFileSync("public/css/site.css","utf8");const root=css.match(/^:root [{]([^}]*)[}]/)[1];const defined=new Set(root.match(/--[a-z0-9-]+(?=:)/g));const used=[...new Set(css.match(/var[(]--[a-z0-9-]+/g).map(s=>s.slice(4)))];const assigned=[...new Set(css.match(/--[a-z0-9-]+(?=:)/g))];console.log("file starts with :root { "+css.startsWith(":root {"));console.log(":root { blocks: "+css.match(/:root [{]/g).length);console.log("defined in :root: "+defined.size+", used with var(): "+used.length);console.log("used but not defined: "+(used.filter(n=>!defined.has(n)).join(" ")||"none"));console.log("assigned but not defined: "+(assigned.filter(n=>!defined.has(n)).join(" ")||"none"));console.log("var() with fallback: "+((css.match(/var[(][^)]*,/g)||[]).join(" ")||"none"))' && grep -o '@media [(][^)]*[)]' public/css/site.css
```

Expected:

```
file starts with :root { true
:root { blocks: 1
defined in :root: 35, used with var(): 35
used but not defined: none
assigned but not defined: none
var() with fallback: none
@media (min-width: 40rem)
@media (min-width: 64rem)
@media (min-width: 40rem)
```

- [ ] **Step 14: ตรวจ <%- ใน views ด้วยขั้นตรวจเดียวกับ CI**

บรรทัดแรกแสดง `<%-` ทุกตัวใน template ของ task นี้ ซึ่งเป็น `include(` ทั้งหมดยกเว้น `md.render(` หนึ่งตัวใน `post.ejs` ส่วน `bash -e -c` รัน script ตัวเดียวกับขั้นสุดท้ายของ `.github/workflows/ci.yml` ใน Task 7

Run: `grep -rn "<%-" views/blog.ejs views/post.ejs views/home.ejs views/partials/post-card.ejs; bash -e -c 'if grep -rn "<%-" views/ | grep -v -e "md.render(" -e "include("; then echo "found <%- outside md.render or include"; exit 1; fi'; echo "guard exit=$?"`
Expected:

```
views/blog.ejs:4:<%- include('partials/head') %>
views/blog.ejs:5:<%- include('partials/header') %>
views/blog.ejs:13:    <%- include('partials/post-card', { card, level: 2 }) %>
views/blog.ejs:28:<%- include('partials/footer') %>
views/post.ejs:1:<%- include('partials/head') %>
views/post.ejs:2:<%- include('partials/header') %>
views/post.ejs:22:      <%- md.render(tr.body_markdown) %>
views/post.ejs:27:<%- include('partials/footer') %>
views/home.ejs:1:<%- include('partials/head') %>
views/home.ejs:2:<%- include('partials/header') %>
views/home.ejs:18:      <%- include('partials/post-card', { card, level: 3 }) %>
views/home.ejs:24:<%- include('partials/footer') %>
guard exit=0
```

- [ ] **Step 15: รัน npm test ทั้งชุด**

Run: `npm test`
Expected: PASS exit code 0 และมี 6 tests

```
> talkalways@1.0.0 test
> node --test test/*.test.js

✔ 01 markdown (22.5848ms)
✔ 02 routing (169.3328ms)
✔ 03 publish per language (235.187ms)
✔ 05 blog hidden (268.8439ms)
✔ 07 admin guard (190.135ms)
✔ 08 login cookie (229.1356ms)
ℹ tests 6
ℹ suites 0
ℹ pass 6
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 759.35
```

- [ ] **Step 16: สร้างบทความทดลองใน data/blog-check**

คำสั่งนี้สร้าง DB ทดลองแยกไว้ที่ `data/blog-check` สำหรับการตรวจใน browser ที่ Step 17 `data/site.db` จึงไม่ถูกแตะ โฟลเดอร์นี้อยู่ใต้ `data/` ที่ `.gitignore` กันไว้แล้ว และ Step 18 จะลบทิ้ง

- บทความแรกมีฉบับไทย published ที่มี excerpt ยาวซึ่งขึ้นต้นด้วย ปั๊ก ที่ ญี่ปุ่น, body ที่มี `<em>` ภาษาไทย, code block ที่มี comment ไทยและบรรทัดยาว, ตาราง, แท็ก ด็อกเกอร์ และฉบับอังกฤษแบบ draft
- บทความที่สองมีแค่ฉบับอังกฤษ published จึงเป็นการ์ดพร้อม badge บนหน้า `/th/blog`
- บันทึกสั้นอีก 11 ตัวทำให้มีบทความ published 13 ตัว จึงเห็นหน้า 2 ของ pagination
- ภาพปกใช้ `/favicon.svg` เพราะ route `/uploads` ยังไม่มีจนถึง Task 15 SVG ไฟล์นี้ไม่มีขนาดในตัว ภาพปกบนหน้าบทความจึงกว้างเต็มคอลัมน์ ส่วนรูป JPEG หรือ PNG จริงจะใช้ขนาดของรูปเองไม่เกินความกว้างคอลัมน์
- ถ้าต้องรันซ้ำ ให้ทำ Step 18 ก่อน ไม่อย่างนั้นแท็ก `docker` จะชน `UNIQUE`

Run:

````bash
DATA_DIR=data/blog-check node - <<'EOF'
const { ready, run, close } = require('./src/db');

async function addPost(cover, rows, tagIds = []) {
  const now = new Date().toISOString();
  const { lastID } = await run('INSERT INTO posts (cover_image) VALUES (?)', [cover]);
  for (const [lang, status, slug, title, excerpt, body, publishedAt] of rows) {
    await run(
      `INSERT INTO post_translations
         (post_id, lang, status, slug, title, excerpt, body_markdown, cover_image_alt, published_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [lastID, lang, status, slug, title, excerpt, body, lang === 'th' ? 'ไอคอนสี่เหลี่ยมสีน้ำเงิน' : 'Blue square icon', publishedAt, now]
    );
  }
  for (const tagId of tagIds) await run('INSERT INTO post_tags (post_id, tag_id) VALUES (?, ?)', [lastID, tagId]);
}

const body = [
  'ย่อหน้าแรกมีคำว่า ปั๊ก ที่ ญี่ปุ่น และคำที่ *เน้น* ซึ่งต้องเป็นตัวหนา ไม่ใช่ตัวเอียง',
  '',
  '## ตัวอย่างโค้ด',
  '',
  '```js',
  '// คอมเมนต์ภาษาไทยต้องไม่เอียง',
  'const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25];',
  "const label = 'container';",
  '```',
  '',
  '| คำสั่ง | ความหมาย | ตัวอย่างผลลัพธ์ที่ยาวพอจะทำให้ตารางกว้างกว่าจอโทรศัพท์ |',
  '| --- | --- | --- |',
  '| `docker ps` | ดู container ที่กำลังทำงาน | CONTAINER ID IMAGE COMMAND CREATED STATUS PORTS NAMES |'
].join('\n');

ready.then(async () => {
  const { lastID: tagId } = await run("INSERT INTO tags (slug, name_th, name_en) VALUES ('docker', 'ด็อกเกอร์', 'Docker')");
  await addPost('/favicon.svg', [
    ['th', 'published', 'docker-101', 'เริ่มต้นใช้ Docker กับแอป Node ที่เก็บข้อมูลใน SQLite',
      'ปั๊ก ที่ ญี่ปุ่น อยู่ต้นบรรทัดแรกเพื่อดูว่าวรรณยุกต์ไม่โดนตัด บทความนี้เล่าตั้งแต่ติดตั้ง Docker จนถึง deploy และยาวพอที่จะถูกตัดเหลือสามบรรทัด ส่วนที่เกินต้องหายไปพร้อมจุดไข่ปลาท้ายบรรทัดที่สาม',
      body, '2026-09-12T20:30:00.000Z'],
    ['en', 'draft', 'docker-101', 'Docker 101 draft', 'Draft excerpt', 'Draft body', null]
  ], [tagId]);
  await addPost(null, [
    ['en', 'published', 'sqlite-wal', 'SQLite WAL in practice',
      'Why the app turns on WAL mode and what the -wal file next to site.db is for.', 'English only body.', '2026-09-10T03:00:00.000Z']
  ]);
  for (let i = 1; i <= 11; i++) {
    const day = String(i).padStart(2, '0');
    await addPost(i % 3 === 0 ? '/favicon.svg' : null, [
      ['th', 'published', 'note-' + i, 'บันทึกสั้น ตอนที่ ' + i, 'สรุปสิ่งที่เรียนรู้ในสัปดาห์นี้', 'เนื้อหาตอนที่ ' + i, '2026-08-' + day + 'T02:00:00.000Z']
    ]);
  }
  await close();
  console.log('seeded 13 posts into data/blog-check');
});
EOF
````

Expected: `seeded 13 posts into data/blog-check`

- [ ] **Step 17: ตรวจหน้า blog และหน้าบทความใน browser**

**Owner:** ทำทุกข้อข้างล่างใน Chrome หรือ Edge บนเครื่องนี้ แล้วบอก executor ว่าผ่านครบหรือข้อไหนไม่ผ่าน executor ต้องหยุดรอคำตอบและห้าม commit ถ้ามีข้อที่ไม่ผ่าน

1. ใน Git Bash ที่ root ของโปรเจกต์ รัน `DATA_DIR=data/blog-check PORT=3001 SITE_URL=http://localhost:3001 npm start` ต้องเห็น `Listening on http://localhost:3001` ค่าที่ใส่หน้าคำสั่งชนะค่าใน `.env` ซึ่งตอนเขียนแผนตรวจกับ `node --env-file-if-exists=.env` แล้ว
2. เปิด `http://localhost:3001/th/blog` ที่ความกว้างปกติของหน้าต่าง หน้ามีหัวข้อ บทความ ตามด้วยรายการ 10 รายการที่คั่นด้วยเส้นบาง ไม่ใช่ตาราง grid การ์ดแรก เริ่มต้นใช้ Docker กับแอป Node ที่เก็บข้อมูลใน SQLite มีรูปสี่เหลี่ยมสีน้ำเงินกว้างราว 8rem ทางขวา การ์ดที่สอง SQLite WAL in practice มีกรอบคำว่า ภาษาอังกฤษ ต่อจากวันที่ และท้ายรายการมีลิงก์ บทความเก่ากว่า ชิดขวา
3. คลิกที่ข้อความ excerpt ของการ์ดแรกโดยไม่คลิกที่ชื่อเรื่อง ต้องไปที่ `/th/blog/docker-101`
4. หน้าบทความต้องมีชื่อเรื่อง, วันที่ 13 ก.ย. 2569, ชิป ด็อกเกอร์, ภาพปก, คำว่า เน้น เป็นตัวหนาไม่เอียง, code block ที่คำว่า `const` เป็นสีม่วงและ comment ภาษาไทยไม่เอียง และตารางอยู่ในคอลัมน์ เอาเมาส์ชี้ลิงก์ English ใน header แถบสถานะของ browser ต้องแสดง `localhost:3001/en/blog` เพราะฉบับอังกฤษยังเป็น draft ส่วนชิป ด็อกเกอร์ ยังได้ 404 จนถึง Task 14
5. กดปุ่มธีมให้เป็นธีมมืด คำว่า `const` ต้องเปลี่ยนเป็นสีม่วงอ่อน ตัวเลขเป็นสีส้มอ่อน และอ่านออกชัด แล้วกดปุ่มธีมกลับเป็นสว่าง
6. เปิด `http://localhost:3001/en/blog` การ์ดแรกต้องเป็นชื่อภาษาไทยพร้อมกรอบคำว่า Thai และวันที่ Sep 13, 2026 และทั้งหน้าไม่มีคำว่า Docker 101 draft
7. กด F12 แล้วกด Ctrl+Shift+M ตั้งความกว้าง 400 ความสูง 900 แล้วเปิด `/th`, `/th/blog`, `/en/blog` และ `/th/blog/docker-101` ทีละหน้า ทั้งธีมสว่างและมืด ทุกหน้าต้องไม่มี scrollbar แนวนอน รายการบทความต้องไม่มีรูป thumbnail excerpt ของการ์ดแรกต้องเหลือ 3 บรรทัดพร้อมจุดไข่ปลาท้ายบรรทัดที่สาม และวรรณยุกต์ของคำว่า ปั๊ก กับ ญี่ปุ่น ในบรรทัดแรกต้องไม่ถูกตัด บนหน้าบทความ code block ต้องชนขอบจอซ้ายขวาและเลื่อนแนวนอนได้ในกรอบของตัวเอง
8. ยังอยู่ที่ความกว้าง 400 เปิด `/th/blog?page=2` ต้องมี 3 รายการคือ บันทึกสั้น ตอนที่ 3, 2 และ 1 มีลิงก์ บทความใหม่กว่า ชิดซ้าย ที่ชี้ไป `/th/blog` และลิงก์ English ใน header ชี้ไป `/en/blog`
9. เปิด `/th` ต้องมีหัวข้อ บทความล่าสุด, ลิงก์ ดูบทความทั้งหมด และการ์ด 5 ใบ แล้วปิด device toolbar
10. กลับไปที่ Git Bash แล้วกด Ctrl+C เพื่อหยุด server

ตอนเขียนแผนตรวจข้อ 2 ถึง 9 ด้วย Edge แบบ headless ผ่าน DevTools Protocol ที่ความกว้าง 400 และ 1024px ทั้งธีมสว่างและมืด ส่วนที่ต้องใช้ตาคนคือความสวยงามของหน้าและการคลิกจริง ค่าที่วัดได้มีดังนี้

- ทุกหน้า `scrollWidth` เท่ากับ `clientWidth` จึงไม่มีการเลื่อนแนวนอน
- excerpt ภาษาไทยมี `line-height` 34.2px สูง 103px ซึ่งคือ 3 บรรทัด และ `scrollHeight` 171px จึงถูกตัดจริง ภาพหน้าจอที่ 400px เห็นวรรณยุกต์ของ ปั๊ก และ ญี่ปุ่น ครบ
- `document.elementFromPoint` ที่กลาง excerpt ของการ์ดแรกคืนลิงก์ `/th/blog/docker-101`
- `.card-thumb` เป็น `display: none` ที่ 400px และ `block` ที่ 1024px
- การ์ดไทยบนหน้า `/en/blog` มี `font-size` 18px และ `line-height` 34.2px ของภาษาไทย และ badge `Thai` อยู่ใน element ที่มี `lang="en"`
- code block ที่ 400px อยู่ตั้งแต่ขอบซ้าย 0px จนถึงขอบขวาของพื้นที่แสดงผล และเลื่อนในกรอบได้
- `<em>` ภาษาไทยได้ `font-style: normal` น้ำหนัก 600 และ `.hljs-comment` ได้ `font-style: normal`
- สีของ `.hljs-keyword` คือ `rgb(138, 59, 146)` ในธีมสว่างและ `rgb(213, 160, 232)` ในธีมมืด ตรงกับ `--syn-key` ใน spec ข้อ 3.2

- [ ] **Step 18: ลบบทความทดลอง**

Run: `rm -rf data/blog-check; test -e data/blog-check && echo LEFT || echo REMOVED`
Expected: `REMOVED`

ถ้าได้ `LEFT` แปลว่า server จาก Step 17 ยังไม่หยุด ให้กด Ctrl+C ในหน้าต่างนั้นแล้วรันคำสั่งนี้อีกครั้ง

- [ ] **Step 19: ตรวจว่ามีแค่ไฟล์ของ task นี้ที่เปลี่ยน**

Run: `git status --short`
Expected:

```
 M public/css/site.css
 M src/routes/public.js
 M src/strings.js
 M test/helpers.js
 M views/home.ejs
?? test/03-publish-per-language.test.js
?? test/05-blog-hidden.test.js
?? views/blog.ejs
?? views/partials/post-card.ejs
?? views/post.ejs
```

ถ้ามีบรรทัดอื่นนอกจากนี้ เช่น `.env`, `data/` หรือ `.claude/` ห้าม add ไฟล์นั้นและให้หยุดถามเจ้าของ

- [ ] **Step 20: Commit**

```bash
git add src/strings.js src/routes/public.js views/partials/post-card.ejs views/blog.ejs views/post.ejs views/home.ejs public/css/site.css
git add test/helpers.js test/03-publish-per-language.test.js test/05-blog-hidden.test.js
git commit -m "feat: add public blog index, post page, fallback cards and pagination"
```

Expected:

```
[main 09b489d] feat: add public blog index, post page, fallback cards and pagination
 10 files changed, 480 insertions(+), 5 deletions(-)
 create mode 100644 test/03-publish-per-language.test.js
 create mode 100644 test/05-blog-hidden.test.js
 create mode 100644 views/blog.ejs
 create mode 100644 views/partials/post-card.ejs
 create mode 100644 views/post.ejs
```

Run: `git status --short | wc -l`
Expected: `0`

### Task 10: รายการและ editor บทความ, บันทึก, ลบ, validation, slug, แท็ก

**Phase:** 3 · **Gate tests:** 04-published-at, 06-delete-cascade, 09-editor-validation

**Files:**
- Create: `src/slug.js`
- Create: `src/routes/admin-posts.js`
- Create: `views/admin/post-edit.ejs`
- Modify: `src/routes/admin.js` (แทนที่ route `GET /posts` ชั่วคราวของ Task 8 ด้วย `router.use('/posts', require('./admin-posts'))`)
- Modify: `views/admin/posts.ejs` (เขียนใหม่ทั้งไฟล์ เพิ่มลิงก์ เขียนบทความใหม่ และให้หัวข้อของแต่ละแถวเป็นลิงก์ไป editor)
- Modify: `public/css/admin.css` (ต่อ section ของหัวของหน้าที่มีปุ่มอยู่ข้างๆ, editor และแถบ preview ท้ายไฟล์)
- Test: `test/04-published-at.test.js`
- Test: `test/06-delete-cascade.test.js`
- Test: `test/09-editor-validation.test.js`

**Interfaces:**
- Consumes:
  - `src/db.js` จาก Task 5: `run(sql, params)`, `get(sql, params)`, `all(sql, params)`, `transaction(fn)` ที่ต่อคิวให้ทำงานทีละตัวและ `ROLLBACK` เมื่อ `fn` throw และตาราง `posts`, `post_translations`, `tags`, `post_tags` ที่ตารางลูกมี `ON DELETE CASCADE`
  - `src/routes/admin.js` จาก Task 8: `express.urlencoded({ extended: true, limit: '1mb' })` ที่แยก `th[title]` เป็น `req.body.th.title`, `router.use(requireAdmin)` และ route ชั่วคราว `GET /posts` ที่ task นี้ย้ายออก
  - `views/admin/head.ejs` กับ `views/admin/foot.ejs` จาก Task 8 ที่เรียกด้วย `<%- include('head', { title, section }) %>` และ `<%- include('foot') %>`, `app.locals.formatDate(lang, iso)` และ class `admin-form`, `form-error`, `admin-empty`, `table-scroll`, `admin-table`, `admin-date`, `chip`, `chip-published`, `chip-draft`, `chip-none` ใน `public/css/admin.css`
  - `test/helpers.js` จาก Task 9: `start()`, `H.req`, `H.login`, `insertPost`, `run`, `get`, `all`
  - `GET /th/blog/:slug` จาก Task 9 ที่ test 04 และ 06 ใช้ดูผลบนหน้า public
- Produces:
  - `src/slug.js`: `module.exports = { toSlug, hasThai, resolveSlugs }` ตรงตามหัวข้อ Interfaces ของ plan Task 13 ใช้ `resolveSlugs` กับโปรเจกต์ได้ทันที และ Task 14 ใช้ `toSlug(slug || name_en)` กับแท็ก
  - `src/routes/admin-posts.js`: `module.exports = router` ที่ mount ไว้ที่ `/admin/posts` หลัง `requireAdmin` ลำดับ route คือ `GET /`, `GET /new`, `POST /`, `GET /:id`, `POST /:id`, `POST /:id/delete` แล้ว Task 11 แทรก `POST /preview/:lang` ต่อจาก `POST /` ชื่อภายในไฟล์ที่ Task 11 ใช้มีดังนี้
    - `LANGS = ['th', 'en']`
    - `readForm(body) -> values` โดย `values = { cover_image, tags, th, en }`, `cover_image` เป็น string ที่ trim แล้ว, `tags` เป็น array ของ id ที่เป็นจำนวนเต็มบวกและไม่ซ้ำ และแต่ละภาษาคือ `{ status, title, slug, excerpt, body_markdown, cover_image_alt, seo_title, seo_description }` ที่ `status` เป็น `'none'`, `'draft'` หรือ `'published'` และ field อื่นเป็น string เสมอ
    - `parseId(value) -> number | null`
  - `views/admin/post-edit.ejs`: `render('admin/post-edit', { id, values, errors, tags, stored, saved })` โดย `id` เป็น `null` เมื่อเป็นบทความใหม่, `values` มาจาก `readForm`, `errors` เป็น object ที่ key คือ `'form'` หรือ `'<lang>.<field>'`, `tags` คือ `[{ id, slug }]`, `stored` คือ `{ th, en }` ที่เป็นสถานะใน DB หรือ `null` และ `saved` เป็น boolean
    - ปุ่ม ดูตัวอย่าง ของแต่ละภาษาคือ `<button type="submit" formaction="/admin/posts/preview/<lang>" formtarget="_blank">` ซึ่งได้ 404 จนกว่า Task 11 จะเพิ่ม route
    - Task 15 เพิ่มปุ่มอัปโหลดข้างช่อง ภาพหน้าปก และ `<script src="/js/admin.js?v=<%= v %>" defer></script>` ในไฟล์นี้
  - `views/admin/posts.ejs`: ลิงก์ เขียนบทความใหม่ ไป `/admin/posts/new` ใน `.page-head` และหัวข้อแต่ละแถวเป็นลิงก์ไป `/admin/posts/:id` Task 13 ใช้โครงเดียวกันกับ `views/admin/projects.ejs`
  - `public/css/admin.css`: class ใหม่ `page-head`, `button-link`, `editor`, `editor-body`, `form-saved`, `field-hint`, `field-error`, `tag-options`, `translation`, `translation-fields`, `field-pair`, `editor-delete` และ `preview-bar` ที่ `views/post.ejs` ของ Task 11 ใช้ Task 13 ใช้ class ของ editor ชุดนี้กับ `views/admin/project-edit.ejs` ได้โดยไม่ต้องเพิ่ม CSS
  - ข้อตกลงของ editor ที่ Task 13 ทำตาม: validation ที่ไม่ต้องใช้ DB ทำก่อนเปิด transaction, การเช็ก slug ซ้ำอยู่ใน transaction เดียวกับการเขียน, ภาษาที่เป็น `none` ถูก DELETE, แท็กถูก insert ผ่าน `json_each`, validation ที่ไม่ผ่านได้ 400 พร้อมฟอร์มเดิม และ `:id` ที่ไม่ใช่จำนวนเต็มบวกหรือหาแถวไม่เจอได้ 404

- คำสั่ง git ของ Step 19 และ 20 ซ้อมใน repo ทิ้งได้ที่มีไฟล์ของ Task 4 ถึง 9 commit ไว้แล้ว เลข commit hash จึงไม่ตรงกัน
- ข้อความ UI ของหน้า admin เป็นภาษาไทยอย่างเดียวตาม Global Constraints task นี้จึงไม่เพิ่ม key ใน `src/strings.js`

- [ ] **Step 1: เขียน test 04 ที่ต้อง fail**

สร้าง `test/04-published-at.test.js` ทุกขั้นทำผ่านฟอร์มของ admin ตาม spec ข้อ 3.4 test 4

- `form()` ส่งทุก field ของทั้งสองภาษาแบบที่ browser ส่งจริงจาก editor
- หลัง publish ครั้งแรก test ย้าย `published_at` ใน DB ไปเป็นวันในอดีตด้วย `UPDATE` ถ้าโค้ดตั้งค่าใหม่ทุกครั้งที่ save ค่าจะเปลี่ยนแน่นอน ถ้าเทียบกับค่าที่จดไว้ตรงๆ test อาจผ่านโดยบังเอิญเมื่อสอง request เกิดในมิลลิวินาทีเดียวกัน
- ตรวจเพิ่มว่า publish ครั้งแรกได้เวลาปัจจุบันในรูป ISO-8601, หน้า editor หลัง redirect มีคำว่า บันทึกแล้ว, ฉบับอังกฤษได้ `published_at` ของตัวเอง, ช่วงที่ฉบับไทยเป็น draft หน้า `/th/blog/docker-101` ได้ 404, หลัง publish ใหม่หน้า public แสดงวันที่เดิม และหน้ารายการมีลิงก์ไป editor กับ chip เผยแพร่ สองอัน

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { start, run, get } = require('./helpers');

test('04 published at', async () => {
  const h = await start();
  try {
    const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
    const row = (id, lang) =>
      get('SELECT status, title, published_at FROM post_translations WHERE post_id = ? AND lang = ?', [id, lang]);
    const blank = { title: '', slug: '', excerpt: '', body_markdown: '', cover_image_alt: '', seo_title: '', seo_description: '' };
    // the whole editor form, the way the browser sends it: both languages with every field
    const form = (th, en = { status: 'none' }) => ({
      cover_image: '',
      th: { ...blank, excerpt: 'เกริ่นนำ', body_markdown: 'เนื้อหา', ...th },
      en: { ...blank, ...en }
    });
    const thPublished = { status: 'published', title: 'เริ่มต้นใช้ Docker', slug: 'docker-101' };
    const enPublished = { status: 'published', title: 'Getting started with Docker', slug: 'docker-101' };

    await h.login();

    // 1. publish th through the editor and note published_at
    let r = await h.req('/admin/posts', { method: 'POST', form: form(thPublished) });
    assert.equal(r.status, 303);
    const [, idText] = String(r.location).match(/^\/admin\/posts\/(\d+)\?saved=1$/) || [];
    assert.ok(idText, r.location);
    const id = Number(idText);
    const first = (await row(id, 'th')).published_at;
    assert.match(first, ISO);
    assert.ok(Math.abs(Date.parse(first) - Date.now()) < 60000, first);
    assert.equal(await row(id, 'en'), undefined);

    r = await h.req(r.location);
    assert.equal(r.status, 200);
    assert.ok(r.text.includes('บันทึกแล้ว'), r.text);

    // Move the stored date into the past, so a save that wrongly resets it to "now" always changes it,
    // however few milliseconds pass between two requests.
    const ORIGINAL = '2026-01-02T03:04:05.678Z';
    await run('UPDATE post_translations SET published_at = ? WHERE post_id = ?', [ORIGINAL, id]);

    // 2. edit the title and save again: the date stays
    r = await h.req('/admin/posts/' + id, { method: 'POST', form: form({ ...thPublished, title: 'เริ่มต้นใช้ Docker ฉบับแก้' }) });
    assert.equal(r.status, 303);
    assert.equal(r.location, '/admin/posts/' + id + '?saved=1');
    assert.deepEqual(await row(id, 'th'), { status: 'published', title: 'เริ่มต้นใช้ Docker ฉบับแก้', published_at: ORIGINAL });

    // 3. publish en: th keeps its date and en gets a date of its own
    r = await h.req('/admin/posts/' + id, { method: 'POST', form: form(thPublished, enPublished) });
    assert.equal(r.status, 303);
    assert.equal((await row(id, 'th')).published_at, ORIGINAL);
    const enDate = (await row(id, 'en')).published_at;
    assert.match(enDate, ISO);
    assert.ok(Math.abs(Date.parse(enDate) - Date.now()) < 60000, enDate);

    // 4. th back to draft: the public page is gone, but the row keeps its date
    r = await h.req('/admin/posts/' + id, { method: 'POST', form: form({ ...thPublished, status: 'draft' }, enPublished) });
    assert.equal(r.status, 303);
    assert.deepEqual(await row(id, 'th'), { status: 'draft', title: 'เริ่มต้นใช้ Docker', published_at: ORIGINAL });
    assert.equal((await h.req('/th/blog/docker-101')).status, 404);

    // publish th again: the first date is still the date on the page
    r = await h.req('/admin/posts/' + id, { method: 'POST', form: form(thPublished, enPublished) });
    assert.equal(r.status, 303);
    assert.equal((await row(id, 'th')).published_at, ORIGINAL);
    assert.equal((await row(id, 'en')).published_at, enDate);
    r = await h.req('/th/blog/docker-101');
    assert.equal(r.status, 200);
    assert.ok(r.text.includes('<time datetime="2026-01-02T03:04:05.678Z">2 ม.ค. 2569</time>'), r.text);

    // the list links to the editor and shows both translations as published
    r = await h.req('/admin/posts');
    assert.ok(r.text.includes('href="/admin/posts/new"'), r.text);
    assert.ok(r.text.includes('<a href="/admin/posts/' + id + '">เริ่มต้นใช้ Docker</a>'), r.text);
    assert.equal((r.text.match(/chip chip-published/g) || []).length, 2, r.text);
  } finally {
    await h.stop();
  }
});
```

- [ ] **Step 2: เขียน test 06 ที่ต้อง fail**

สร้าง `test/06-delete-cascade.test.js` ใช้บทความที่มีสองภาษาและสองแท็กตาม spec ข้อ 3.4 test 6

- มีบทความอีกตัวที่ใช้แท็ก `nodejs` ร่วมกัน เพื่อพิสูจน์ว่าการลบเอาไปแค่แถวของบทความที่ถูกลบ และตาราง `tags` ไม่ถูกแตะ
- ตรวจว่า guard ทำงานก่อน route ลบ และหน้า editor มีฟอร์มลบที่มี `onsubmit="return confirm('ลบบทความนี้?')"` ตาม spec ข้อ 2.4
- ตรวจกติกา `:id` ของ spec ข้อ 2.4 กับทุก route ที่มี `:id` ได้แก่ id ที่ลบไปแล้ว, `abc`, `0`, `1.5`, `-1`, เลขที่เกิน `Number.MAX_SAFE_INTEGER` และ `007` ทุกค่าต้องได้ 404 และไม่มีบทความถูกสร้าง `007` ถูกปฏิเสธเพราะ editor หนึ่งตัวควรมี URL เดียว

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { start, insertPost, run, get } = require('./helpers');

test('06 delete cascade', async () => {
  const h = await start();
  try {
    const count = async (table, postId) =>
      (await get('SELECT COUNT(*) AS n FROM ' + table + ' WHERE post_id = ?', [postId])).n;
    const { lastID: nodeTag } = await run("INSERT INTO tags (slug, name_th, name_en) VALUES ('nodejs', 'โหนดเจเอส', 'Node.js')");
    const { lastID: sqliteTag } = await run("INSERT INTO tags (slug, name_th, name_en) VALUES ('sqlite', 'เอสคิวไลต์', 'SQLite')");
    const id = await insertPost({
      th: { slug: 'to-delete', title: 'บทความที่จะถูกลบ' },
      en: { slug: 'to-delete', title: 'Post to delete' },
      tags: [nodeTag, sqliteTag]
    });
    // another post on the same tag shows that the delete removes only the rows of its own post
    const keep = await insertPost({ th: { slug: 'keep', title: 'บทความที่ต้องอยู่ต่อ' }, tags: [nodeTag] });
    assert.equal(await count('post_translations', id), 2);
    assert.equal(await count('post_tags', id), 2);

    // the guard runs before the delete route
    let r = await h.req('/admin/posts/' + id + '/delete', { method: 'POST' });
    assert.equal(r.status, 302);
    assert.equal(r.location, '/admin/login');
    assert.equal(await count('post_translations', id), 2);

    await h.login();
    r = await h.req('/admin/posts/' + id);
    assert.equal(r.status, 200);
    assert.ok(
      r.text.includes('<form class="editor-delete" method="post" action="/admin/posts/' + id + '/delete" onsubmit="return confirm(\'ลบบทความนี้?\')">'),
      r.text
    );

    r = await h.req('/admin/posts/' + id + '/delete', { method: 'POST' });
    assert.equal(r.status, 303);
    assert.equal(r.location, '/admin/posts');
    assert.equal(await get('SELECT id FROM posts WHERE id = ?', [id]), undefined);
    // ON DELETE CASCADE only works because src/db.js turns on PRAGMA foreign_keys for the connection
    assert.equal(await count('post_translations', id), 0);
    assert.equal(await count('post_tags', id), 0);
    assert.equal((await get('SELECT COUNT(*) AS n FROM tags')).n, 2);
    assert.equal(await count('post_translations', keep), 1);
    assert.equal(await count('post_tags', keep), 1);
    assert.equal((await h.req('/th/blog/to-delete')).status, 404);
    assert.equal((await h.req('/en/blog/to-delete')).status, 404);
    assert.equal((await h.req('/th/blog/keep')).status, 200);

    r = await h.req('/admin/posts');
    assert.ok(!r.text.includes('บทความที่จะถูกลบ'), r.text);
    assert.ok(r.text.includes('บทความที่ต้องอยู่ต่อ'), r.text);

    // :id must be a positive integer of a post that exists, otherwise every :id route is a 404
    const form = { th: { status: 'draft', title: 'ไม่ควรถูกสร้าง', slug: 'should-not-exist' }, en: { status: 'none' } };
    for (const [method, urlPath] of [
      ['POST', '/admin/posts/' + id + '/delete'],
      ['POST', '/admin/posts/abc/delete'],
      ['POST', '/admin/posts/0/delete'],
      ['POST', '/admin/posts/1.5/delete'],
      ['GET', '/admin/posts/' + id],
      ['GET', '/admin/posts/abc'],
      ['GET', '/admin/posts/-1'],
      ['GET', '/admin/posts/99999999999999999999'],
      ['POST', '/admin/posts/' + id],
      ['POST', '/admin/posts/007']
    ]) {
      r = await h.req(urlPath, method === 'POST' ? { method, form } : { method });
      assert.equal(r.status, 404, method + ' ' + urlPath);
    }
    assert.equal((await get('SELECT COUNT(*) AS n FROM posts')).n, 1);
  } finally {
    await h.stop();
  }
});
```

- [ ] **Step 3: เขียน test 09 ที่ต้อง fail**

สร้าง `test/09-editor-validation.test.js` สามข้อของ spec ข้อ 3.4 test 9 อยู่ตรงคอมเมนต์ `spec test 9, case 1` ถึง `case 3`

- ส่วนแรกทดสอบ `src/slug.js` ตรงๆ ตามลำดับสี่ขั้นของ spec ข้อ 2.3 รวมถึงหัวข้อไทยที่มีคำอังกฤษปน เช่น `เริ่มต้นใช้ Docker` ซึ่งต้องไม่ได้ slug ครึ่งๆ อย่าง `docker` เพราะขั้นที่ 2 ใช้หัวข้อเฉพาะเมื่อไม่มีตัวอักษรไทย, ภาษาที่เป็น none ไม่ให้ยืม slug และ slug ภาษาไทยที่พิมพ์เองซึ่ง strip แล้วเหลือค่าว่าง
- แท็กมี id 1, 2 และ 12 เพราะ spec ข้อ 2.4 บอกว่าติ๊กแท็กเดียวแล้ว body ได้ string `'12'` ถ้าวนลูปตรงๆ จะได้แท็ก 1 กับ 2
- ตรวจเพิ่มว่า editor ว่างเริ่มที่ฉบับไทยเป็น draft และเปิดอยู่ ฉบับอังกฤษเป็น none และปิดอยู่, ช่อง slug มี `pattern`, หลัง 400 ข้อความทุกช่องยังอยู่และถูก escape, editor ของบทความที่บันทึกแล้วมี confirm ก่อนลบฉบับภาษาและคำเตือนเรื่องลิงก์เดิมเฉพาะฉบับที่ published, slug ซ้ำตอนแก้บทความเดิมไม่แตะแถวใน DB, `UNIQUE (lang, slug)` แยกตามภาษา, ต้องมีอย่างน้อยหนึ่งภาษาที่ไม่ใช่ none, ภาษาที่ไม่ใช่ none ต้องมีหัวข้อ และ field ที่ถูกส่งซ้ำจนเป็น array ต้องไม่กลายเป็น 500

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { start, insertPost, run, get, all } = require('./helpers');
const { toSlug, hasThai, resolveSlugs } = require('../src/slug');

test('09 editor validation', async () => {
  const h = await start();
  try {
    // src/slug.js follows the order in spec 2.3 and gives '' to a language that is none or has no usable slug
    assert.equal(toSlug('  Docker 101: Getting Started!  '), 'docker-101-getting-started');
    assert.equal(toSlug('เริ่มต้นใช้ Docker'), 'docker');
    assert.equal(toSlug('ภาษาไทยล้วน'), '');
    assert.equal(toSlug(undefined), '');
    assert.equal(hasThai('เริ่มต้นใช้ Docker'), true);
    assert.equal(hasThai('Docker 101'), false);
    assert.equal(hasThai(undefined), false);
    const none = { status: 'none', slug: '', title: '' };
    // 1. a typed slug wins and is normalized
    assert.deepEqual(resolveSlugs({ th: { status: 'draft', slug: 'My First Post', title: 'บทความแรก' }, en: none }), { th: 'my-first-post', en: '' });
    // 2. no typed slug and a title without Thai
    assert.deepEqual(resolveSlugs({ th: none, en: { status: 'published', slug: '', title: 'Hello, World' } }), { th: '', en: 'hello-world' });
    // 3. still empty: the slug of the other language, never a partial slug such as "docker" from a Thai title
    assert.deepEqual(
      resolveSlugs({ th: { status: 'draft', slug: '', title: 'เริ่มต้นใช้ Docker' }, en: { status: 'draft', slug: 'docker-101', title: 'Docker' } }),
      { th: 'docker-101', en: 'docker-101' }
    );
    // 4. nothing usable, so the caller shows the error
    assert.deepEqual(resolveSlugs({ th: { status: 'draft', slug: '', title: 'เริ่มต้นใช้ Docker' }, en: none }), { th: '', en: '' });
    // a language that is none does not lend its slug
    assert.deepEqual(
      resolveSlugs({ th: { status: 'draft', slug: '', title: 'เริ่มต้นใช้ Docker' }, en: { ...none, slug: 'docker-101' } }),
      { th: '', en: '' }
    );
    // a Thai slug typed by hand strips to '' and falls through to the other language
    assert.deepEqual(
      resolveSlugs({ th: { status: 'published', slug: 'ด็อกเกอร์', title: 'Docker' }, en: { status: 'draft', slug: '', title: 'Docker Basics' } }),
      { th: 'docker-basics', en: 'docker-basics' }
    );

    const countPosts = async () => (await get('SELECT COUNT(*) AS n FROM posts')).n;
    const sections = html => html.split('<details').slice(1);
    const blank = { title: '', slug: '', excerpt: '', body_markdown: '', cover_image_alt: '', seo_title: '', seo_description: '' };
    const body = '## ขั้นตอน\n\n```js\nconst tag = "<b>x</b>";\n```\n';
    const thai = { ...blank, status: 'published', title: 'เริ่มต้นใช้ Docker', excerpt: 'เกริ่นนำที่พิมพ์ไว้', body_markdown: body };
    // tag ids 1, 2 and 12: a single ticked "12" must stay tag 12 and never turn into tags 1 and 2
    await run("INSERT INTO tags (id, slug, name_th, name_en) VALUES (1, 'one', 'หนึ่ง', 'One'), (2, 'two', 'สอง', 'Two'), (12, 'twelve', 'สิบสอง', 'Twelve')");

    await h.login();

    // the empty editor: th starts as draft and open, en as none and closed
    let r = await h.req('/admin/posts/new');
    assert.equal(r.status, 200);
    let [th, en] = sections(r.text);
    assert.ok(th.startsWith(' class="translation" lang="th" open>'), th);
    assert.ok(en.startsWith(' class="translation" lang="en">'), en);
    assert.ok(th.includes('<option value="draft" selected>'), th);
    assert.ok(en.includes('<option value="none" selected>'), en);
    // the hyphen is escaped because browsers compile pattern= with the v flag
    assert.ok(th.includes('pattern="[a-z0-9\\-]*"'), th);
    // a new post has no saved translation, so choosing none asks nothing
    assert.ok(!r.text.includes('onchange='), r.text);

    // spec test 9, case 1: Thai title, empty slug, en none
    const before = await countPosts();
    r = await h.req('/admin/posts', {
      method: 'POST',
      form: { cover_image: '/uploads/cover.png', tags: '12', th: thai, en: { ...blank, status: 'none' } }
    });
    assert.equal(r.status, 400);
    assert.equal(await countPosts(), before);
    assert.ok(r.text.includes('กรุณาใส่ slug ภาษาอังกฤษ (a-z, 0-9, -)'), r.text);
    // everything typed is still in the form, HTML-escaped
    assert.ok(r.text.includes('## ขั้นตอน'), r.text);
    assert.ok(r.text.includes('const tag = &#34;&lt;b&gt;x&lt;/b&gt;&#34;;'), r.text);
    assert.ok(!r.text.includes('<b>x</b>'), r.text);
    assert.ok(r.text.includes('value="เริ่มต้นใช้ Docker"'), r.text);
    assert.ok(r.text.includes('เกริ่นนำที่พิมพ์ไว้'), r.text);
    assert.ok(r.text.includes('value="/uploads/cover.png"'), r.text);
    assert.ok(r.text.includes('value="12" checked'), r.text);
    assert.ok(!r.text.includes('value="1" checked'), r.text);
    assert.ok(r.text.includes('action="/admin/posts"'), r.text);

    // spec test 9, case 2: the same form with an en slug saves, and th takes the en slug
    r = await h.req('/admin/posts', {
      method: 'POST',
      form: { cover_image: '/uploads/cover.png', tags: '12', th: thai, en: { ...blank, status: 'draft', title: 'Getting started with Docker', slug: 'docker-101' } }
    });
    assert.equal(r.status, 303);
    const id = Number((String(r.location).match(/^\/admin\/posts\/(\d+)\?saved=1$/) || [])[1]);
    assert.ok(id, r.location);
    assert.equal(await countPosts(), before + 1);
    assert.deepEqual(
      await all('SELECT lang, status, slug FROM post_translations WHERE post_id = ? ORDER BY lang DESC', [id]),
      [{ lang: 'th', status: 'published', slug: 'docker-101' }, { lang: 'en', status: 'draft', slug: 'docker-101' }]
    );
    assert.deepEqual(await all('SELECT tag_id FROM post_tags WHERE post_id = ?', [id]), [{ tag_id: 12 }]);
    assert.equal((await get("SELECT body_markdown FROM post_translations WHERE post_id = ? AND lang = 'th'", [id])).body_markdown, body);

    // the editor of the saved post: en is open because it has a row, both selects confirm before a translation is
    // deleted, and only the published th slug carries the broken-link warning
    r = await h.req('/admin/posts/' + id + '?saved=1');
    assert.equal(r.status, 200);
    assert.ok(r.text.includes('บันทึกแล้ว'), r.text);
    [th, en] = sections(r.text);
    assert.ok(en.startsWith(' class="translation" lang="en" open>'), en);
    assert.ok(th.includes("confirm('ลบฉบับภาษานี้เมื่อบันทึก?')"), th);
    assert.ok(en.includes("confirm('ลบฉบับภาษานี้เมื่อบันทึก?')"), en);
    assert.ok(th.includes('ลิงก์เดิมจะใช้ไม่ได้'), th);
    assert.ok(!en.includes('ลิงก์เดิมจะใช้ไม่ได้'), en);
    assert.ok(th.includes('value="docker-101"'), th);

    // spec test 9, case 3: a slug that another post uses in the same language is a 400 with a message, not a 500
    await insertPost({ th: { slug: 'taken', title: 'บทความที่ใช้ slug นี้แล้ว' } });
    const count = await countPosts();
    r = await h.req('/admin/posts', {
      method: 'POST',
      form: { th: { ...blank, status: 'draft', title: 'บทความใหม่', slug: 'taken' }, en: { ...blank, status: 'none' } }
    });
    assert.equal(r.status, 400);
    assert.ok(r.text.includes('slug นี้ถูกใช้แล้ว'), r.text);
    assert.equal(await countPosts(), count);

    // the same check on edit leaves the saved row alone, and the form still posts to this post
    r = await h.req('/admin/posts/' + id, {
      method: 'POST',
      form: { th: { ...thai, slug: 'taken' }, en: { ...blank, status: 'draft', title: 'Getting started with Docker', slug: 'docker-101' } }
    });
    assert.equal(r.status, 400);
    assert.ok(r.text.includes('slug นี้ถูกใช้แล้ว'), r.text);
    assert.ok(r.text.includes('action="/admin/posts/' + id + '"'), r.text);
    assert.equal((await get("SELECT slug FROM post_translations WHERE post_id = ? AND lang = 'th'", [id])).slug, 'docker-101');

    // UNIQUE (lang, slug) is per language, so en may use "taken", and saving th with its own slug is not a clash
    r = await h.req('/admin/posts/' + id, {
      method: 'POST',
      form: { tags: ['1', '2'], th: { ...thai, slug: 'docker-101' }, en: { ...blank, status: 'draft', title: 'Getting started with Docker', slug: 'taken' } }
    });
    assert.equal(r.status, 303);
    assert.deepEqual(await all('SELECT slug FROM post_translations WHERE post_id = ? ORDER BY lang DESC', [id]), [{ slug: 'docker-101' }, { slug: 'taken' }]);
    assert.deepEqual(await all('SELECT tag_id FROM post_tags WHERE post_id = ? ORDER BY tag_id', [id]), [{ tag_id: 1 }, { tag_id: 2 }]);

    // at least one language must not be none
    r = await h.req('/admin/posts', { method: 'POST', form: { th: { ...blank, status: 'none', title: 'ทิ้งไว้' }, en: { ...blank, status: 'none' } } });
    assert.equal(r.status, 400);
    assert.ok(r.text.includes('ต้องมีอย่างน้อยหนึ่งภาษา'), r.text);

    // an active language needs a title, and the language with the error is open so the message is not hidden
    r = await h.req('/admin/posts', {
      method: 'POST',
      form: { th: { ...blank, status: 'draft', title: 'มีหัวข้อ', slug: 'no-title' }, en: { ...blank, status: 'draft', body_markdown: 'English body without a title' } }
    });
    assert.equal(r.status, 400);
    assert.ok(r.text.includes('กรุณาใส่หัวข้อ'), r.text);
    assert.ok(sections(r.text)[1].startsWith(' class="translation" lang="en" open>'), r.text);
    assert.ok(r.text.includes('English body without a title'), r.text);

    // a field sent twice arrives as an array, which counts as empty and never becomes a 500
    r = await h.req('/admin/posts', { method: 'POST', form: { th: { ...blank, status: 'draft', slug: 'twice', title: ['a', 'b'] }, en: { status: 'none' } } });
    assert.equal(r.status, 400);
    assert.equal(await countPosts(), count);
  } finally {
    await h.stop();
  }
});
```

- [ ] **Step 4: รัน test ให้เห็นว่า fail**

ตอนนี้ `src/routes/admin.js` มีแค่ `GET /posts` ชั่วคราวของ Task 8 test 04 จึง login ได้แต่ `POST /admin/posts` ตกไปที่ 404 handler test 06 ผ่านขั้นที่ guard ต้องทำงานก่อนแล้วไป fail ที่ `GET /admin/posts/:id` ส่วน test 09 require `src/slug.js` ที่ยังไม่มี

Run: `node --test test/04-published-at.test.js`
Expected: FAIL exit code 1 และ output

```
✖ 04 published at (159.3626ms)
ℹ tests 1
ℹ suites 0
ℹ pass 0
ℹ fail 1
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 554.1521

✖ failing tests:

test at test\04-published-at.test.js:5:1
✖ 04 published at (159.3626ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  
  404 !== 303
  
      at TestContext.<anonymous> (D:\Ikkyusan\Downloads\TalkAlways_MVP\talkalways\test\04-published-at.test.js:25:12)
      at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
      at async Test.run (node:internal/test_runner/test:1409:7)
      at async startSubtestAfterBootstrap (node:internal/test_runner/harness:387:3) {
    generatedMessage: true,
    code: 'ERR_ASSERTION',
    actual: 404,
    expected: 303,
    operator: 'strictEqual',
    diff: 'simple'
  }
```

Run: `node --test test/06-delete-cascade.test.js`
Expected: FAIL exit code 1 และ output

```
✖ 06 delete cascade (141.7035ms)
ℹ tests 1
ℹ suites 0
ℹ pass 0
ℹ fail 1
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 643.8832

✖ failing tests:

test at test\06-delete-cascade.test.js:5:1
✖ 06 delete cascade (141.7035ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  
  404 !== 200
  
      at TestContext.<anonymous> (D:\Ikkyusan\Downloads\TalkAlways_MVP\talkalways\test\06-delete-cascade.test.js:30:12)
      at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
      at async Test.run (node:internal/test_runner/test:1409:7)
      at async startSubtestAfterBootstrap (node:internal/test_runner/harness:387:3) {
    generatedMessage: true,
    code: 'ERR_ASSERTION',
    actual: 404,
    expected: 200,
    operator: 'strictEqual',
    diff: 'simple'
  }
```

Run: `node --test test/09-editor-validation.test.js`
Expected: FAIL exit code 1 เพราะยังไม่มี `src/slug.js` output มีบรรทัด

```
Error: Cannot find module '../src/slug'
```

และจบด้วย

```
✖ test\09-editor-validation.test.js (390.3571ms)
ℹ tests 1
ℹ suites 0
ℹ pass 0
ℹ fail 1
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 398.8527

✖ failing tests:

test at test\09-editor-validation.test.js:1:1
✖ test\09-editor-validation.test.js (390.3571ms)
  'test failed'
```

- [ ] **Step 5: เขียน src/slug.js**

สร้าง `src/slug.js`

- `toSlug` กับ `hasThai` คัดลอกจาก spec ข้อ 2.3 ช่วงตัวอักษรใน regex ของ `hasThai` คือ U+0E00 ถึง U+0E7F ซึ่งเป็น block ภาษาไทยทั้งหมด
- `resolveSlugs` หา slug ของแต่ละภาษาด้วยขั้นที่ 1 และ 2 ก่อน แล้วภาษาที่ยังว่างยืมผลนั้นของอีกภาษาในขั้นที่ 3 ภาษาที่ยังว่างหลังขั้นที่ 3 คือขั้นที่ 4 ซึ่งผู้เรียกเป็นคนแสดง error
- ภาษาที่สถานะไม่ใช่ `draft` หรือ `published` ได้ `''` และไม่ให้ภาษาอื่นยืม slug เพราะ spec บอกว่าลำดับนี้ทำเฉพาะภาษาที่สถานะไม่ใช่ none
- slug ที่พิมพ์เป็นภาษาไทยล้วนถือว่าพิมพ์มาแล้ว มันจึงกลายเป็นค่าว่างในขั้นที่ 1 แล้วไปขั้นที่ 3 โดยไม่ย้อนไปใช้หัวข้อในขั้นที่ 2 ตามลำดับของ spec

```js
// Slugs are ASCII only (spec 2.3). Thai letters are stripped, so a title in Thai only gives ''.
const toSlug = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// The class is U+0E00 to U+0E7F, the Thai block, written with literal characters exactly as in spec 2.3.
const hasThai = s => /[฀-๿]/.test(s || '');

const ACTIVE = ['draft', 'published'];

// Steps 1 and 2 of spec 2.3 for one language: the typed slug, otherwise the title when it has no Thai letters.
// A slug typed in Thai still counts as typed, so it strips to '' and goes on to step 3, not step 2.
function ownSlug({ slug, title }) {
  if (String(slug || '').trim()) return toSlug(slug);
  return hasThai(title) ? '' : toSlug(title);
}

// input is { th: { status, slug, title }, en: { status, slug, title } }. A language that is none gets ''.
// Step 3 borrows the other language's slug from steps 1 and 2, and a language that is none has nothing to lend.
// A language that is still '' is step 4, and the caller shows the error.
function resolveSlugs(input) {
  const active = lang => ACTIVE.includes((input[lang] || {}).status);
  const own = lang => (active(lang) ? ownSlug(input[lang]) : '');
  return {
    th: active('th') ? own('th') || own('en') : '',
    en: active('en') ? own('en') || own('th') : ''
  };
}

module.exports = { toSlug, hasThai, resolveSlugs };
```

- [ ] **Step 6: เขียน src/routes/admin-posts.js**

สร้าง `src/routes/admin-posts.js`

- `readForm` แปลงทั้ง `req.body` และแถวจาก DB ให้เป็น `values` รูปเดียวกัน editor จึงมี template เดียวสำหรับบทความใหม่, บทความเดิม และฟอร์มที่ validation ไม่ผ่าน
- `readForm` เก็บแค่ค่าที่เป็น string field ที่ถูกส่งซ้ำจนกลายเป็น array จึงนับเป็นค่าว่างแทนการไปถึง SQL สถานะที่ไม่ใช่สามค่าของ select นับเป็น `none` และ `body_markdown` ไม่ถูก trim เพราะช่องว่างต้นบรรทัดของ markdown มีความหมาย
- แท็กแปลงเป็น array ด้วย `[].concat(body.tags || [])` ตาม spec ข้อ 2.4
- validation มีสองชั้น ชั้นแรกไม่ใช้ DB คือต้องมีอย่างน้อยหนึ่งภาษาที่ไม่ใช่ none, ภาษาที่ไม่ใช่ none ต้องมีหัวข้อ และต้องหา slug ได้ตาม spec ข้อ 2.3 ชั้นที่สองคือ slug ซ้ำด้วย query ของ spec ข้อ 2.4 ซึ่งอยู่ใน transaction เดียวกับการเขียน `transaction` ของ Task 5 ต่อคิวไว้ จึงไม่มีการบันทึกอื่นแทรกระหว่างเช็กกับเขียน
- หัวข้อที่บังคับกรอกไม่ได้เขียนไว้ใน spec แต่ถ้าไม่บังคับ บทความที่ published จะมี `<h1>` ว่างและการ์ดที่ลิงก์ไม่มีข้อความ
- validation ที่ไม่ผ่านตอบ 400 และ render editor ด้วย `values` จาก `readForm(req.body)` ข้อความที่พิมพ์ไว้จึงไม่หาย spec เขียนเป็น `{ values: req.body, errors }` แต่ค่าที่ผ่าน `readForm` แล้วทำให้ template ไม่ต้องกันค่าที่เป็น array หรือ `undefined`
- `write` ทำตามลำดับใน spec คือ insert หรือ update `posts`, upsert หรือ DELETE translation ของแต่ละภาษา แล้วลบ `post_tags` และ insert ใหม่ `UPSERT_SQL` คัดลอกจาก spec และตอน insert ส่ง `published_at` เป็นเวลาปัจจุบันเฉพาะเมื่อ `status` เป็น `published`
- แท็กถูก insert ด้วย `INSERT INTO post_tags` ที่ `SELECT` id จากตาราง `tags` เฉพาะตัวที่อยู่ใน `json_each` ของรายการที่ติ๊ก แท็กที่ถูกลบไประหว่างที่ editor เปิดอยู่จึงถูกข้ามแทนที่จะทำให้ foreign key พัง
- `parseId` รับเฉพาะจำนวนเต็มบวกที่ไม่มี 0 นำหน้าและไม่เกิน `Number.MAX_SAFE_INTEGER` ตามกติกา `:id` ของ spec ข้อ 2.4
- `GET /new` ประกาศก่อน `GET /:id` ตาม spec ข้อ 2.4 และหน้าใหม่เริ่มที่ `th=draft` กับ `en=none`
- การลบใช้ `DELETE FROM posts` คำสั่งเดียว translation และ `post_tags` หายไปเองด้วย `ON DELETE CASCADE`
- query ของหน้ารายการย้ายมาจาก `src/routes/admin.js` โดยไม่เปลี่ยน
- Express 5 ส่ง error จาก async handler ต่อให้ error handler เอง จึงไม่มี try/catch

```js
const express = require('express');
const { run, get, all, transaction } = require('../db');
const { resolveSlugs } = require('../slug');

const router = express.Router();

const LANGS = ['th', 'en'];
const STATUSES = ['none', 'draft', 'published'];
const FIELDS = ['title', 'slug', 'excerpt', 'body_markdown', 'cover_image_alt', 'seo_title', 'seo_description'];

// Upsert from spec 2.4. published_at is set the first time a language is published and is never reset,
// not by a later save and not by going back to draft.
const UPSERT_SQL = `
  INSERT INTO post_translations
    (post_id, lang, status, slug, title, excerpt, body_markdown, seo_title, seo_description,
     cover_image_alt, published_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(post_id, lang) DO UPDATE SET
    status = excluded.status, slug = excluded.slug, title = excluded.title,
    excerpt = excluded.excerpt, body_markdown = excluded.body_markdown,
    seo_title = excluded.seo_title, seo_description = excluded.seo_description,
    cover_image_alt = excluded.cover_image_alt, updated_at = excluded.updated_at,
    published_at = CASE WHEN excluded.status = 'published'
                        THEN COALESCE(post_translations.published_at, excluded.published_at)
                        ELSE post_translations.published_at END`;

// :id must be a positive integer (spec 2.4). null makes the route answer 404.
function parseId(value) {
  return /^[1-9][0-9]*$/.test(value) && Number.isSafeInteger(Number(value)) ? Number(value) : null;
}

const text = value => (typeof value === 'string' ? value : '');

// Turns a request body, or DB rows shaped like one, into the values that the editor shows and the save writes.
// Only strings are kept, so a field sent twice (an array) counts as empty instead of reaching SQL.
function readForm(body) {
  const values = {
    cover_image: text(body.cover_image).trim(),
    // one ticked checkbox arrives as the string '12'; [].concat keeps it whole instead of looping over '1' and '2'
    tags: [...new Set([].concat(body.tags || []).map(Number))].filter(n => Number.isSafeInteger(n) && n > 0)
  };
  for (const lang of LANGS) {
    const src = body[lang] && typeof body[lang] === 'object' ? body[lang] : {};
    const tr = { status: STATUSES.includes(src.status) ? src.status : 'none' };
    for (const field of FIELDS) {
      tr[field] = field === 'body_markdown' ? text(src[field]) : text(src[field]).trim();
    }
    values[lang] = tr;
  }
  return values;
}

// Checks that need no DB. Keys are 'form' or '<lang>.<field>', so the editor can show a message next to its field.
function validate(values, slugs) {
  const errors = {};
  const active = LANGS.filter(lang => values[lang].status !== 'none');
  if (active.length === 0) errors.form = 'ต้องมีอย่างน้อยหนึ่งภาษาที่สถานะไม่ใช่ ไม่มีฉบับนี้';
  for (const lang of active) {
    if (!values[lang].title) errors[lang + '.title'] = 'กรุณาใส่หัวข้อ';
    if (!slugs[lang]) errors[lang + '.slug'] = 'กรุณาใส่ slug ภาษาอังกฤษ (a-z, 0-9, -)';
  }
  return errors;
}

// Runs inside one transaction, so no other save can take a slug between the duplicate check and the writes.
async function write(id, values, slugs) {
  const errors = {};
  for (const lang of LANGS) {
    if (values[lang].status === 'none') continue;
    const clash = await get(
      'SELECT 1 FROM post_translations WHERE lang = ? AND slug = ? AND post_id <> ?',
      [lang, slugs[lang], id || 0]
    );
    if (clash) errors[lang + '.slug'] = 'slug นี้ถูกใช้แล้วในบทความอื่นของภาษานี้';
  }
  if (Object.keys(errors).length) return { errors };

  const now = new Date().toISOString();
  const cover = values.cover_image || null;
  let postId = id;
  if (postId) {
    await run('UPDATE posts SET cover_image = ?, updated_at = ? WHERE id = ?', [cover, now, postId]);
  } else {
    postId = (await run('INSERT INTO posts (cover_image, created_at, updated_at) VALUES (?, ?, ?)', [cover, now, now])).lastID;
  }
  for (const lang of LANGS) {
    const tr = values[lang];
    if (tr.status === 'none') {
      // none means no row (spec 2.4)
      await run('DELETE FROM post_translations WHERE post_id = ? AND lang = ?', [postId, lang]);
      continue;
    }
    await run(UPSERT_SQL, [
      postId, lang, tr.status, slugs[lang], tr.title, tr.excerpt, tr.body_markdown,
      tr.seo_title, tr.seo_description, tr.cover_image_alt,
      tr.status === 'published' ? now : null, now
    ]);
  }
  await run('DELETE FROM post_tags WHERE post_id = ?', [postId]);
  // a tag id that no longer exists is skipped instead of failing the foreign key
  await run(
    'INSERT INTO post_tags (post_id, tag_id) SELECT ?, id FROM tags WHERE id IN (SELECT value FROM json_each(?))',
    [postId, JSON.stringify(values.tags)]
  );
  return { id: postId };
}

async function renderEditor(res, id, values, errors, saved) {
  const tags = await all('SELECT id, slug FROM tags ORDER BY slug');
  // statuses of the rows in the DB: the confirm before deleting a translation and the slug warning depend on them
  const stored = { th: null, en: null };
  if (id) {
    for (const row of await all('SELECT lang, status FROM post_translations WHERE post_id = ?', [id])) {
      stored[row.lang] = row.status;
    }
  }
  res.render('admin/post-edit', { id, values, errors, tags, stored, saved });
}

async function save(req, res, id) {
  const values = readForm(req.body ?? {});
  const slugs = resolveSlugs(values);
  const errors = validate(values, slugs);
  const result = Object.keys(errors).length ? { errors } : await transaction(() => write(id, values, slugs));
  if (result.errors) {
    // spec 2.4: show the form again with what was typed, never a redirect and never a 500
    res.status(400);
    return renderEditor(res, id, values, result.errors, false);
  }
  res.redirect(303, '/admin/posts/' + result.id + '?saved=1');
}

router.get('/', async (req, res) => {
  const posts = await all(`
    SELECT p.id, p.updated_at,
      (SELECT title FROM post_translations WHERE post_id = p.id ORDER BY lang = 'th' DESC LIMIT 1) AS title,
      (SELECT status FROM post_translations WHERE post_id = p.id AND lang = 'th') AS th,
      (SELECT status FROM post_translations WHERE post_id = p.id AND lang = 'en') AS en
    FROM posts p ORDER BY p.updated_at DESC`);
  res.render('admin/posts', { posts });
});

// declared before /:id (spec 2.4); a new post starts as th=draft and en=none
router.get('/new', async (req, res) => {
  await renderEditor(res, null, readForm({ th: { status: 'draft' } }), {}, false);
});

router.post('/', (req, res) => save(req, res, null));

router.get('/:id', async (req, res, next) => {
  const id = parseId(req.params.id);
  const post = id && (await get('SELECT id, cover_image FROM posts WHERE id = ?', [id]));
  if (!post) return next();
  const body = { cover_image: post.cover_image || '' };
  for (const row of await all('SELECT * FROM post_translations WHERE post_id = ?', [id])) body[row.lang] = row;
  body.tags = (await all('SELECT tag_id FROM post_tags WHERE post_id = ?', [id])).map(row => row.tag_id);
  await renderEditor(res, id, readForm(body), {}, req.query.saved === '1');
});

router.post('/:id', async (req, res, next) => {
  const id = parseId(req.params.id);
  if (!id || !(await get('SELECT id FROM posts WHERE id = ?', [id]))) return next();
  await save(req, res, id);
});

router.post('/:id/delete', async (req, res, next) => {
  const id = parseId(req.params.id);
  if (!id) return next();
  // post_translations and post_tags go by ON DELETE CASCADE, which needs PRAGMA foreign_keys = ON from src/db.js
  const { changes } = await run('DELETE FROM posts WHERE id = ?', [id]);
  if (changes === 0) return next();
  res.redirect(303, '/admin/posts');
});

module.exports = router;
```

- [ ] **Step 7: ต่อ admin-posts เข้า src/routes/admin.js**

ใน `src/routes/admin.js` แทนที่ route ชั่วคราวท้ายไฟล์ ซึ่งตอนนี้คือ

```js
router.get('/posts', async (req, res) => {
  const posts = await all(`
    SELECT p.id, p.updated_at,
      (SELECT title FROM post_translations WHERE post_id = p.id ORDER BY lang = 'th' DESC LIMIT 1) AS title,
      (SELECT status FROM post_translations WHERE post_id = p.id AND lang = 'th') AS th,
      (SELECT status FROM post_translations WHERE post_id = p.id AND lang = 'en') AS en
    FROM posts p ORDER BY p.updated_at DESC`);
  res.render('admin/posts', { posts });
});

module.exports = router;
```

ด้วยข้อความนี้

```js
router.use('/posts', require('./admin-posts'));

module.exports = router;
```

- ส่วนต้นของไฟล์ไม่เปลี่ยน รวมถึงบรรทัด `const { run, get, all } = require('../db');` ตัว `all` ไม่ถูกใช้ในไฟล์นี้ชั่วคราว จนกว่า route ของ Task 14 และ 16 ในไฟล์นี้จะใช้อีกครั้ง
- `router.use('/posts', require('./admin-posts'))` อยู่หลัง `router.use(requireAdmin)` ทุก route ของบทความจึงถูกบังคับ login ซึ่ง test 07 ตรวจอยู่แล้ว

- [ ] **Step 8: เขียน views/admin/post-edit.ejs**

สร้าง `views/admin/post-edit.ejs` layout ตาม spec ข้อ 2.4

- ภาพหน้าปกกับแท็กอยู่ด้านบน แต่ละภาษาเป็น `<details lang>` หนึ่งก้อน ฉบับไทยเปิดเสมอ ฉบับอังกฤษเปิดเมื่อสถานะในฟอร์มไม่ใช่ none ซึ่งตอนเปิดบทความเดิมคือเมื่อมี row อยู่แล้ว และตอนที่ validation ไม่ผ่านคือภาษาที่อาจมีข้อความ error
- `<summary>` แสดงชื่อภาษาและสถานะ เช่น `ไทย · แบบร่าง` และ `English · ไม่มีฉบับแปล` ตามภาพใน spec ส่วนตัวเลือกใน select ใช้คำ `ไม่มีฉบับนี้`
- select สถานะมีสามค่า และมี inline `onchange` ที่ขึ้น `confirm('ลบฉบับภาษานี้เมื่อบันทึก?')` เฉพาะภาษาที่มี row ใน DB ถ้ากดยกเลิก select จะกลับไปเป็นค่าก่อนหน้าที่เก็บไว้ใน `data-prev`
- label ภาษาไทยใน section อังกฤษมี `<span lang="th">` screen reader จึงอ่านด้วยเสียงไทย ส่วนช่องกรอกยังได้ `lang="en"` จาก `<details>` spellcheck ของ browser จึงตรวจเป็นภาษาอังกฤษ
- ช่อง slug ใช้ `pattern="[a-z0-9\-]*"` ที่ escape `-` ไว้ เพราะ browser compile `pattern` ด้วย flag `v` ซึ่ง `[a-z0-9-]*` ใน spec ข้อ 2.3 ใช้ไม่ได้ Step 13 พิสูจน์เรื่องนี้
- คำเตือนว่าลิงก์เดิมจะใช้ไม่ได้แสดงเมื่อฉบับใน DB เป็น published ตาม spec ข้อ 2.3
- textarea ของเนื้อหาขึ้นบรรทัดใหม่หลังแท็กเปิด เพราะ HTML parser ตัด newline ตัวแรกหลัง `<textarea>` ทิ้ง markdown ที่ขึ้นต้นด้วยบรรทัดว่างจึงไม่หาย
- ปุ่ม บันทึก ตัวแรกอยู่ก่อนปุ่ม ดูตัวอย่าง ใน DOM การกด Enter ในช่องกรอกจึงบันทึก ไม่ใช่เปิด preview
- ข้อความ error แสดงสองที่ คือกล่องสรุปบนสุดที่มี `role="alert"` และข้อความใต้ช่องที่ผิด
- ฟอร์มลบแยกจากฟอร์มหลักเพราะ HTML ซ้อนฟอร์มไม่ได้ และมี `onsubmit="return confirm('ลบบทความนี้?')"` ตาม spec ข้อ 2.4
- ทุกค่าใช้ `<%= %>` ส่วน `<%-` มีแค่ `include`

```ejs
<%
const pageTitle = id ? 'แก้ไขบทความ' : 'บทความใหม่';
const langNames = { th: 'ไทย', en: 'English' };
const errorPrefix = { th: 'ฉบับไทย: ', en: 'ฉบับอังกฤษ: ' };
const statusLabels = { none: 'ไม่มีฉบับแปล', draft: 'แบบร่าง', published: 'เผยแพร่' };
const statusOptions = [['none', 'ไม่มีฉบับนี้'], ['draft', 'แบบร่าง'], ['published', 'เผยแพร่']];
const errorList = Object.entries(errors).map(([key, message]) => (errorPrefix[key.split('.')[0]] || '') + message);
-%>
<%- include('head', { title: pageTitle, section: 'posts' }) %>
<main id="main" class="editor">
  <form class="admin-form" method="post" action="<%= id ? '/admin/posts/' + id : '/admin/posts' %>">
    <div class="page-head">
      <h1><%= pageTitle %></h1>
      <button type="submit">บันทึก</button>
    </div>
<% if (saved) { -%>
    <p class="form-saved" role="status">บันทึกแล้ว</p>
<% } -%>
<% if (errorList.length) { -%>
    <div class="form-error" role="alert">
      <p>ยังไม่ได้บันทึก กรุณาแก้ตามรายการนี้</p>
      <ul>
<% for (const message of errorList) { -%>
        <li><%= message %></li>
<% } -%>
      </ul>
    </div>
<% } -%>
    <label>ภาพหน้าปก
      <input name="cover_image" value="<%= values.cover_image %>" placeholder="/uploads/" spellcheck="false">
    </label>
    <fieldset class="tag-options">
      <legend>แท็ก</legend>
<% if (tags.length === 0) { -%>
      <p class="field-hint">ยังไม่มีแท็ก</p>
<% } -%>
<% for (const tag of tags) { -%>
      <label><input type="checkbox" name="tags" value="<%= tag.id %>"<% if (values.tags.includes(tag.id)) { %> checked<% } %>> <%= tag.slug %></label>
<% } -%>
    </fieldset>
<% for (const lang of ['th', 'en']) {
     const tr = values[lang];
-%>
    <details class="translation" lang="<%= lang %>"<% if (lang === 'th' || tr.status !== 'none') { %> open<% } %>>
      <summary><%= langNames[lang] %> · <span lang="th"><%= statusLabels[tr.status] %></span></summary>
      <div class="translation-fields">
        <label><span lang="th">สถานะ</span>
          <select name="<%= lang %>[status]" lang="th"<% if (stored[lang]) { %> data-prev="<%= tr.status %>" onchange="if (this.value === 'none') { if (!confirm('ลบฉบับภาษานี้เมื่อบันทึก?')) this.value = this.dataset.prev } this.dataset.prev = this.value"<% } %>>
<% for (const [value, label] of statusOptions) { -%>
            <option value="<%= value %>"<% if (tr.status === value) { %> selected<% } %>><%= label %></option>
<% } -%>
          </select>
        </label>
        <div class="field-pair">
          <label><span lang="th">หัวข้อ</span>
            <input name="<%= lang %>[title]" value="<%= tr.title %>">
<% if (errors[lang + '.title']) { -%>
            <span class="field-error" lang="th"><%= errors[lang + '.title'] %></span>
<% } -%>
          </label>
          <label>slug
            <input name="<%= lang %>[slug]" value="<%= tr.slug %>" pattern="[a-z0-9\-]*" autocapitalize="none" spellcheck="false">
<% if (errors[lang + '.slug']) { -%>
            <span class="field-error" lang="th"><%= errors[lang + '.slug'] %></span>
<% } -%>
            <span class="field-hint" lang="th">ใช้ได้เฉพาะ a-z, 0-9 และ - ถ้าเว้นว่าง ระบบใช้หัวข้อที่ไม่มีภาษาไทย หรือ slug ของอีกภาษา</span>
<% if (stored[lang] === 'published') { -%>
            <span class="field-hint" lang="th">ฉบับนี้เผยแพร่แล้ว ถ้าแก้ slug ลิงก์เดิมจะใช้ไม่ได้</span>
<% } -%>
          </label>
        </div>
        <label><span lang="th">เกริ่นนำ</span>
          <textarea name="<%= lang %>[excerpt]" rows="3"><%= tr.excerpt %></textarea>
        </label>
        <label><span lang="th">alt ภาพปก</span>
          <input name="<%= lang %>[cover_image_alt]" value="<%= tr.cover_image_alt %>">
        </label>
        <label><span lang="th">เนื้อหา (markdown)</span>
          <textarea class="editor-body" name="<%= lang %>[body_markdown]" rows="18">
<%= tr.body_markdown %></textarea>
        </label>
        <div class="field-pair">
          <label>SEO title
            <input name="<%= lang %>[seo_title]" value="<%= tr.seo_title %>">
          </label>
          <label>SEO description
            <textarea name="<%= lang %>[seo_description]" rows="2"><%= tr.seo_description %></textarea>
          </label>
        </div>
        <button type="submit" formaction="/admin/posts/preview/<%= lang %>" formtarget="_blank" lang="th">ดูตัวอย่าง</button>
      </div>
    </details>
<% } -%>
    <button type="submit">บันทึก</button>
  </form>
<% if (id) { -%>
  <form class="editor-delete" method="post" action="/admin/posts/<%= id %>/delete" onsubmit="return confirm('ลบบทความนี้?')">
    <button type="submit">ลบบทความ</button>
  </form>
<% } -%>
</main>
<%- include('foot') %>
```

- [ ] **Step 9: เขียน views/admin/posts.ejs ใหม่ทั้งไฟล์**

แทนที่เนื้อหาทั้งหมดของ `views/admin/posts.ejs` ด้วยข้อความนี้ ส่วนตาราง, chip และวันที่ไม่เปลี่ยนจาก Task 8

- ลิงก์ เขียนบทความใหม่ อยู่ใน `.page-head` ข้าง `<h1>` เป็นลิงก์ที่แต่งให้ดูเหมือนปุ่มด้วย `.button-link` เพราะเป็นการเปิดหน้า ไม่ใช่ mutation
- หัวข้อทุกแถวเป็นลิงก์ไป editor บทความที่ไม่มี translation เลยเกิดได้แค่จากการ insert ด้วย SQL ตรง แถวนั้นจะแสดง `(ไม่มีหัวข้อ)` แทนลิงก์ที่ไม่มีข้อความ

```ejs
<%
const chipLabels = { published: 'เผยแพร่', draft: 'แบบร่าง' };
-%>
<%- include('head', { title: 'บทความ', section: 'posts' }) %>
<main id="main">
  <div class="page-head">
    <h1>บทความ</h1>
    <a class="button-link" href="/admin/posts/new">เขียนบทความใหม่</a>
  </div>
<% if (posts.length === 0) { -%>
  <p class="admin-empty">ยังไม่มีบทความ</p>
<% } else { -%>
  <div class="table-scroll">
    <table class="admin-table">
      <thead>
        <tr><th scope="col">หัวข้อ</th><th scope="col">ไทย</th><th scope="col">EN</th><th scope="col">แก้ไขล่าสุด</th></tr>
      </thead>
      <tbody>
<% for (const post of posts) { -%>
        <tr>
          <td><a href="/admin/posts/<%= post.id %>"><%= post.title || '(ไม่มีหัวข้อ)' %></a></td>
<% for (const status of [post.th, post.en]) { -%>
          <td><span class="chip chip-<%= status || 'none' %>"><%= chipLabels[status] || 'ไม่มีฉบับแปล' %></span></td>
<% } -%>
          <td class="admin-date"><%= formatDate('th', post.updated_at) %></td>
        </tr>
<% } -%>
      </tbody>
    </table>
  </div>
<% } -%>
</main>
<%- include('foot') %>
```

- [ ] **Step 10: ต่อ CSS ของ editor ท้าย public/css/admin.css**

แทนที่บรรทัดสุดท้ายของ `public/css/admin.css` ซึ่งตอนนี้คือ

```css
.chip-none { border-style: dashed; color: var(--text-muted); }
```

ด้วยข้อความนี้ ส่วนต้นของไฟล์ไม่เปลี่ยน

- rule ที่ทำให้ช่องกรอกกว้างเต็มคอลัมน์ขึ้นต้นด้วย `.editor` หน้า login ที่ใช้ `.admin-form` เหมือนกันจึงไม่เปลี่ยน
- `.admin-form .tag-options label` เขียนทับ `display: grid` ของ `.admin-form label` จาก Task 8 checkbox จึงอยู่บรรทัดเดียวกับชื่อแท็ก
- `.field-pair` วางหัวข้อคู่กับ slug และ SEO title คู่กับ SEO description เป็นสองคอลัมน์ตั้งแต่ 40rem บนจอเล็กเรียงเป็นคอลัมน์เดียว
- `.editor-body` ใช้ `--font-mono` ซึ่งมี Anuphan อยู่ในสแต็กตาม Task 6 ภาษาไทยใน markdown จึงยังใช้ฟอนต์เดียวกับหน้าเว็บ
- `.preview-bar` เป็นแถบบนหน้า preview ของ Task 11 ซึ่งอยู่ใน task นี้ตาม File Structure ของ plan ที่ให้ `admin.css` มีแถบ preview สีพื้น `--accent` กับตัวอักษร `--bg` คือคู่สีเดียวกับ chip เผยแพร่ ซึ่ง contrast ผ่าน AA ทั้งสองธีม
- ไม่มี custom property ใหม่, ไม่มี `var()` ที่มี fallback, ใช้ breakpoint แค่ `40rem` และไม่มี `letter-spacing` หรือ `text-transform` ตามกติกาของ Task 6 และ 8

```css
.chip-none { border-style: dashed; color: var(--text-muted); }

/* Page heading with an action beside it: post list and editor (Task 10) */
.page-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-3) var(--sp-4);
  margin-bottom: var(--sp-6);
}
.page-head h1 { margin: 0; }
.button-link {
  display: inline-block;
  padding: var(--sp-2) var(--sp-4);
  background: var(--surface);
  color: var(--text);
  border: 1px solid var(--border-strong);
  border-radius: var(--r-sm);
  text-decoration: none;
}
.button-link:hover { border-color: var(--text); }
.admin-table td a { color: var(--text); }

/* Post editor. Each language is a <details> with its own lang, so :lang(th) in site.css sizes the Thai fields. */
.editor .page-head { margin-bottom: 0; }
.editor input:not([type="checkbox"]), .editor select, .editor textarea { width: 100%; }
.editor textarea { resize: vertical; }
.editor-body { font-family: var(--font-mono); font-size: var(--fs-sm); }
.form-saved { margin: 0; padding: var(--sp-3) var(--sp-4); background: var(--surface-soft); border-radius: var(--r-sm); }
.form-error > p { margin: 0; }
.form-error > ul { margin: var(--sp-2) 0 0; padding-inline-start: var(--sp-6); }
.field-hint { margin: 0; color: var(--text-muted); font-size: var(--fs-sm); }
.field-error { font-size: var(--fs-sm); font-weight: 600; }
.tag-options { display: flex; flex-wrap: wrap; gap: var(--sp-2) var(--sp-4); margin: 0; padding: 0; border: 0; }
.tag-options legend { margin-bottom: var(--sp-1); padding: 0; }
.admin-form .tag-options label { display: flex; align-items: center; gap: var(--sp-2); }
.translation { border: 1px solid var(--border); border-radius: var(--r-md); }
.translation > summary { padding: var(--sp-3) var(--sp-4); cursor: pointer; font-weight: 600; }
.translation[open] > summary { border-bottom: 1px solid var(--border); }
.translation-fields { display: grid; gap: var(--sp-4); padding: var(--sp-4); }
.field-pair { display: grid; gap: var(--sp-4); }
.editor-delete { margin-top: var(--sp-12); padding-top: var(--sp-6); border-top: 1px solid var(--border); }

/* Bar at the top of a post preview. views/post.ejs links this file only when it renders a preview (Task 11). */
.preview-bar {
  margin: 0;
  padding: var(--sp-2) var(--gutter);
  background: var(--accent);
  color: var(--bg);
  font-weight: 600;
  text-align: center;
}

@media (min-width: 40rem) {
  .field-pair { grid-template-columns: 1fr 1fr; align-items: start; }
}
```

- [ ] **Step 11: รัน test ให้เห็นว่าผ่าน**

Run: `node --test test/04-published-at.test.js`
Expected: PASS exit code 0

```
✔ 04 published at (204.2306ms)
ℹ tests 1
ℹ suites 0
ℹ pass 1
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 608.0547
```

Run: `node --test test/06-delete-cascade.test.js`
Expected: PASS exit code 0

```
✔ 06 delete cascade (219.6362ms)
ℹ tests 1
ℹ suites 0
ℹ pass 1
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 619.0184
```

Run: `node --test test/09-editor-validation.test.js`
Expected: PASS exit code 0

```
✔ 09 editor validation (213.0845ms)
ℹ tests 1
ℹ suites 0
ℹ pass 1
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 644.5134
```

- [ ] **Step 12: ตรวจว่า admin.css ใช้แค่ token ที่ประกาศใน site.css**

คำสั่งนี้คือคำสั่งของ Task 8 Step 17 ตัวเดิมทุกตัวอักษร

Run:

```bash
node -e 'const fs=require("fs");const site=fs.readFileSync("public/css/site.css","utf8");const css=fs.readFileSync("public/css/admin.css","utf8");const defined=new Set(site.match(/^:root [{]([^}]*)[}]/)[1].match(/--[a-z0-9-]+(?=:)/g));const used=[...new Set(css.match(/var[(]--[a-z0-9-]+/g).map(s=>s.slice(4)))];console.log("used with var(): "+used.length);console.log("used but not defined in site.css :root: "+(used.filter(n=>!defined.has(n)).join(" ")||"none"));console.log("custom properties declared in admin.css: "+((css.match(/--[a-z0-9-]+(?=:)/g)||[]).join(" ")||"none"));console.log("var() with fallback: "+((css.match(/var[(][^)]*,/g)||[]).join(" ")||"none"));console.log("@media in admin.css: "+((css.match(/@media[^{]*/g)||[]).join(" | ")||"none"))'
```

Expected:

```
used with var(): 19
used but not defined in site.css :root: none
custom properties declared in admin.css: none
var() with fallback: none
@media in admin.css: @media (min-width: 40rem)
```

- [ ] **Step 13: ตรวจว่า pattern ของช่อง slug ใช้ได้กับ flag v**

browser ตรวจ `pattern` ด้วย `new RegExp('^(?:' + pattern + ')$', 'v')` คำสั่งนี้อ่าน `pattern` จาก template แล้ว compile แบบเดียวกัน ทั้งค่าใน template และค่าที่ลบ backslash ออกซึ่งตรงกับ spec ข้อ 2.3 ถ้า compile ไม่ได้ browser จะเมิน `pattern` ทั้งอันและไม่เตือนอะไรเลย

Run: `node -e 'const html=require("fs").readFileSync("views/admin/post-edit.ejs","utf8");const pattern=html.match(/pattern="([^"]*)"/)[1];for(const p of [pattern, pattern.split(String.fromCharCode(92)).join("")]){try{new RegExp("^(?:"+p+")$","v");console.log(p+" -> valid with the v flag")}catch(e){console.log(p+" -> "+e.message)}}'`
Expected:

```
[a-z0-9\-]* -> valid with the v flag
[a-z0-9-]* -> Invalid regular expression: /^(?:[a-z0-9-]*)$/v: Invalid character class
```

- [ ] **Step 14: ตรวจ <%- ใน views ด้วยขั้นตรวจเดียวกับ CI**

บรรทัดแรกแสดง `<%-` ทุกตัวใน template ของ task นี้ ซึ่งเป็น `include(` ทั้งหมด ส่วน `bash -e -c` รัน script ตัวเดียวกับขั้นสุดท้ายของ `.github/workflows/ci.yml` ใน Task 7

Run: `grep -rn "<%-" views/admin/post-edit.ejs views/admin/posts.ejs; bash -e -c 'if grep -rn "<%-" views/ | grep -v -e "md.render(" -e "include("; then echo "found <%- outside md.render or include"; exit 1; fi'; echo "guard exit=$?"`
Expected:

```
views/admin/post-edit.ejs:9:<%- include('head', { title: pageTitle, section: 'posts' }) %>
views/admin/post-edit.ejs:102:<%- include('foot') %>
views/admin/posts.ejs:4:<%- include('head', { title: 'บทความ', section: 'posts' }) %>
views/admin/posts.ejs:33:<%- include('foot') %>
guard exit=0
```

- [ ] **Step 15: รัน npm test ทั้งชุด**

Run: `npm test`
Expected: PASS exit code 0 และมี 9 tests

```
> talkalways@1.0.0 test
> node --test test/*.test.js

✔ 01 markdown (37.7454ms)
✔ 02 routing (201.1754ms)
✔ 03 publish per language (294.8996ms)
✔ 04 published at (361.0268ms)
✔ 05 blog hidden (366.2263ms)
✔ 06 delete cascade (383.771ms)
✔ 07 admin guard (240.7804ms)
✔ 08 login cookie (310.8294ms)
✔ 09 editor validation (340.9642ms)
ℹ tests 9
ℹ suites 0
ℹ pass 9
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1044.3426
```

- [ ] **Step 16: สร้างแท็กทดลองใน data/editor-check**

คำสั่งนี้สร้าง DB ทดลองแยกไว้ที่ `data/editor-check` สำหรับการตรวจใน browser ที่ Step 17 `data/site.db` จึงไม่ถูกแตะ โฟลเดอร์นี้อยู่ใต้ `data/` ที่ `.gitignore` กันไว้แล้ว และ Step 18 จะลบทิ้ง

- หน้าจัดการแท็กยังไม่มีจนถึง Task 14 คำสั่งนี้จึง insert แท็กสามตัวด้วย SQL ตรง
- ถ้าต้องรันซ้ำ ให้ทำ Step 18 ก่อน ไม่อย่างนั้นแท็กจะชน `UNIQUE`

Run:

```bash
DATA_DIR=data/editor-check node - <<'EOF'
const { ready, run, close } = require('./src/db');

ready.then(async () => {
  await run(`INSERT INTO tags (slug, name_th, name_en) VALUES
    ('nodejs', 'Node.js', 'Node.js'),
    ('sqlite', 'SQLite', 'SQLite'),
    ('design', 'ดีไซน์', 'Design')`);
  await close();
  console.log('seeded 3 tags into data/editor-check');
});
EOF
```

Expected: `seeded 3 tags into data/editor-check`

- [ ] **Step 17: ตรวจ editor ใน browser**

**Owner:** ทำทุกข้อข้างล่างใน Chrome หรือ Edge บนเครื่องนี้ แล้วบอก executor ว่าผ่านครบหรือข้อไหนไม่ผ่าน executor ต้องหยุดรอคำตอบและห้าม commit ถ้ามีข้อที่ไม่ผ่าน

1. ใน Git Bash ที่ root ของโปรเจกต์ รัน `DATA_DIR=data/editor-check PORT=3001 SITE_URL=http://localhost:3001 npm start` ต้องเห็น `Listening on http://localhost:3001`
2. เปิด `http://localhost:3001/admin/login` แล้ว login ด้วย passphrase จาก Task 8 Step 22 ต้องมาอยู่ที่ `/admin/posts` ซึ่งมีหัวข้อ บทความ, ลิงก์ เขียนบทความใหม่ ที่ดูเป็นปุ่มอยู่ทางขวา และข้อความ ยังไม่มีบทความ
3. คลิก เขียนบทความใหม่ หน้า `/admin/posts/new` ต้องมีหัวข้อ บทความใหม่ พร้อมปุ่ม บันทึก ทางขวา, ช่อง ภาพหน้าปก, checkbox แท็ก design nodejs sqlite, กล่อง ไทย · แบบร่าง ที่เปิดอยู่และมีสถานะ แบบร่าง และกล่อง English · ไม่มีฉบับแปล ที่ปิดอยู่
4. กด F12 ไปแท็บ Network ในกล่อง ไทย พิมพ์หัวข้อ `เริ่มต้นใช้ Docker` เว้นช่อง slug ว่าง พิมพ์เนื้อหาเป็น code block ภาษา `js` สามบรรทัด ติ๊ก nodejs แล้วกด บันทึก ด้านบน request `posts` ต้องได้สถานะ 400 หน้ามีกล่อง ยังไม่ได้บันทึก กรุณาแก้ตามรายการนี้ ที่มีบรรทัด ฉบับไทย: กรุณาใส่ slug ภาษาอังกฤษ (a-z, 0-9, -) ใต้ช่อง slug มีข้อความเดียวกัน และหัวข้อ, เนื้อหา กับติ๊ก nodejs ยังอยู่ครบ
5. พิมพ์ `Docker 101` ในช่อง slug แล้วกด บันทึก browser ต้องขึ้นกล่องเตือนเรื่องรูปแบบที่ช่อง slug และแท็บ Network ต้องไม่มี request ใหม่
6. แก้ slug เป็น `docker-101` เปลี่ยนสถานะเป็น เผยแพร่ แล้วกด บันทึก ช่อง URL ต้องเป็น `/admin/posts/1?saved=1` หน้ามีกล่อง บันทึกแล้ว และใต้ช่อง slug มีข้อความ ฉบับนี้เผยแพร่แล้ว ถ้าแก้ slug ลิงก์เดิมจะใช้ไม่ได้
7. เปิดแท็บใหม่ไปที่ `http://localhost:3001/th/blog/docker-101` ต้องเห็นบทความที่มี code block สี และชิป Node.js แล้วปิดแท็บนั้น
8. กลับมาที่ editor เปิดกล่อง English เปลี่ยนสถานะเป็น แบบร่าง พิมพ์หัวข้อ `Getting started with Docker` โดยเว้น slug ว่าง แล้วกด บันทึก ช่อง slug ของ English ต้องเป็น `getting-started-with-docker` และกล่อง English ยังเปิดอยู่
9. เปลี่ยนสถานะของ English เป็น ไม่มีฉบับนี้ ต้องมีกล่องถาม ลบฉบับภาษานี้เมื่อบันทึก? กด Cancel แล้ว select ต้องกลับเป็น แบบร่าง เปลี่ยนเป็น ไม่มีฉบับนี้ อีกครั้ง กด OK แล้วกด บันทึก กล่อง English ต้องปิดและหัวกล่องเป็น English · ไม่มีฉบับแปล
10. เปิด `/admin/posts` แถว เริ่มต้นใช้ Docker ต้องมี chip เผยแพร่ ในคอลัมน์ ไทย และ chip เส้นประ ไม่มีฉบับแปล ในคอลัมน์ EN
11. กด Ctrl+Shift+M ตั้งความกว้าง 400 ความสูง 900 แล้วเปิด `/admin/posts`, `/admin/posts/new` และ `/admin/posts/1` ทีละหน้า ทั้งธีมสว่างและมืด โดยสลับธีมด้วย Rendering > prefers-color-scheme แบบ Task 6 Step 12 ข้อ 3 เพราะหน้า admin ไม่มีปุ่มธีม ทุกหน้าต้องไม่มี scrollbar แนวนอนของทั้งหน้า ตารางรายการเลื่อนแนวนอนได้ในกรอบของตัวเอง และใน editor ช่อง slug อยู่ใต้ช่องหัวข้อ จากนั้นปิด device toolbar ที่ความกว้างปกติช่องหัวข้อกับช่อง slug ต้องอยู่แถวเดียวกัน แล้วตั้ง Rendering กลับเป็น `No emulation`
12. ที่ `/admin/posts/1` กด ดูตัวอย่าง ในกล่อง ไทย ต้องเปิดแท็บใหม่ที่เป็นหน้า ไม่พบหน้านี้ เพราะ route ของ preview มาใน Task 11 แล้วปิดแท็บนั้น
13. เลื่อนลงล่างสุดแล้วกด ลบบทความ ต้องมีกล่องถาม ลบบทความนี้? กด Cancel หน้าต้องอยู่ที่เดิม กด ลบบทความ อีกครั้งแล้วกด OK ต้องกลับมาที่ `/admin/posts` ที่มีข้อความ ยังไม่มีบทความ และ `http://localhost:3001/th/blog/docker-101` ต้องได้หน้า ไม่พบหน้านี้
14. กลับไปที่ Git Bash แล้วกด Ctrl+C เพื่อหยุด server

ตอนเขียนแผนตรวจข้อ 2 ถึง 11 และข้อ 13 ด้วย Edge แบบ headless ผ่าน DevTools Protocol ที่ความกว้าง 400 และ 1024px กับ DB ที่สร้างด้วยคำสั่งของ Step 16 กล่องถามของ `confirm` ตรวจโดยแทน `window.confirm` ด้วยฟังก์ชันที่ตอบ Cancel หรือ OK ส่วนข้อ 7 ตรวจแค่ว่าได้สถานะ 200 ค่าที่วัดได้มีดังนี้

- ที่ความกว้าง 400 ทุกหน้า `scrollWidth` เท่ากับ `clientWidth` ได้แก่ `/admin/posts` ทั้งตอนว่างและตอนมีหนึ่งแถว, `/admin/posts/new`, หน้าที่ validation ไม่ผ่าน และ `/admin/posts/1?saved=1`
- หน้าที่ validation ไม่ผ่านได้สถานะ 400 กล่องสรุปมีบรรทัด ฉบับไทย: กรุณาใส่ slug ภาษาอังกฤษ (a-z, 0-9, -) และช่องหัวข้อ, เนื้อหา กับติ๊ก nodejs มีค่าเดิมครบ
- ช่อง slug ที่มีค่า `Docker 101` ได้ `validity.patternMismatch` เป็น `true` และ `form.checkValidity()` เป็น `false` ส่วน `docker-101` ผ่าน
- `confirm` ถูกเรียกด้วยข้อความ ลบฉบับภาษานี้เมื่อบันทึก? เมื่อตอบ Cancel select กลับเป็น `draft` เมื่อตอบ OK เป็น `none` และหลังบันทึกกล่อง English ปิดอยู่
- ที่ 400px ช่อง slug อยู่ใต้ช่องหัวข้อที่ตำแหน่ง x เดียวกัน ที่ 1024px ทั้งสองช่องอยู่แถวเดียวกัน
- ฟอร์มลบที่ `confirm` ตอบ Cancel ไม่เปลี่ยนหน้า ส่วน OK พาไป `/admin/posts` และ `/th/blog/docker-101` ได้ 404

- [ ] **Step 18: ลบ DB ทดลอง**

Run: `rm -rf data/editor-check; test -e data/editor-check && echo LEFT || echo REMOVED`
Expected: `REMOVED`

ถ้าได้ `LEFT` แปลว่า server จาก Step 17 ยังไม่หยุด ให้กด Ctrl+C ในหน้าต่างนั้นแล้วรันคำสั่งนี้อีกครั้ง

- [ ] **Step 19: ตรวจว่ามีแค่ไฟล์ของ task นี้ที่เปลี่ยน**

Run: `git status --short`
Expected:

```
 M public/css/admin.css
 M src/routes/admin.js
 M views/admin/posts.ejs
?? src/routes/admin-posts.js
?? src/slug.js
?? test/04-published-at.test.js
?? test/06-delete-cascade.test.js
?? test/09-editor-validation.test.js
?? views/admin/post-edit.ejs
```

ถ้ามีบรรทัดอื่นนอกจากนี้ เช่น `.env`, `data/` หรือ `.claude/` ห้าม add ไฟล์นั้นและให้หยุดถามเจ้าของ

- [ ] **Step 20: Commit**

```bash
git add src/slug.js src/routes/admin-posts.js src/routes/admin.js views/admin/post-edit.ejs views/admin/posts.ejs public/css/admin.css
git add test/04-published-at.test.js test/06-delete-cascade.test.js test/09-editor-validation.test.js
git commit -m "feat: add post editor with per-language status, slug rules, tags and delete"
```

Expected:

```
[main 434f7e3] feat: add post editor with per-language status, slug rules, tags and delete
 9 files changed, 686 insertions(+), 11 deletions(-)
 create mode 100644 src/routes/admin-posts.js
 create mode 100644 src/slug.js
 create mode 100644 test/04-published-at.test.js
 create mode 100644 test/06-delete-cascade.test.js
 create mode 100644 test/09-editor-validation.test.js
 create mode 100644 views/admin/post-edit.ejs
```

Run: `git status --short | wc -l`
Expected: `0`

### Task 11: preview บทความ

**Phase:** 3 · **Gate tests:** 10-preview

**Files:**
- Modify: `src/routes/admin-posts.js` (เพิ่ม `require('../strings')` และ route `POST /preview/:lang` ต่อจาก `POST /`)
- Modify: `views/post.ejs` (เขียนใหม่ทั้งไฟล์ เพิ่ม `<link>` ของ `admin.css` กับแถบ preview ระหว่าง head กับ header เมื่อ `preview` เป็นจริง)
- Test: `test/10-preview.test.js`

**Interfaces:**
- Consumes:
  - `src/routes/admin-posts.js` จาก Task 10: `LANGS`, `readForm(body) -> values`, `all` จาก `src/db.js` และ `POST /` ที่ประกาศก่อน route ที่มี `:id`
  - `views/admin/post-edit.ejs` จาก Task 10: ปุ่ม ดูตัวอย่าง ของแต่ละภาษาที่มี `formaction="/admin/posts/preview/<lang>" formtarget="_blank"` ซึ่งส่งทั้งฟอร์ม
  - `public/css/admin.css` จาก Task 10: class `preview-bar`
  - `views/post.ejs` จาก Task 9: อ่าน `post.cover_image`, `tr.title`, `tr.published_at` (ว่างแล้วไม่แสดงวันที่), `tr.cover_image_alt`, `tr.body_markdown`, `tags[].slug`, `tags[].name`
  - `views/partials/head.ejs` จาก Task 5: `meta.noindex` ใส่ `<meta name="robots" content="noindex">` และ `<html lang>` มาจาก `lang`
  - `src/strings.js` จาก Task 9 และ `test/helpers.js` จาก Task 9: `start()`, `H.req`, `H.login`, `insertPost`, `run`, `get`
- Produces:
  - `POST /admin/posts/preview/:lang` ตอบ 200 และ render `post` ด้วย `{ post: { cover_image }, tr, tags, alternates: [], preview: true, meta: { title, description, noindex: true, type: 'article' } }` หลังตั้ง `res.locals.lang`, `res.locals.other`, `res.locals.t` และ `res.locals.settings` ตาม `:lang` ค่า `:lang` อื่นได้ 404 และ route นี้ไม่เขียน DB
  - route นี้ไม่ตั้ง `res.locals.publicPage` ดังนั้นแถบ consent และ Google Analytics ของ Task 19 จะไม่ขึ้นบนหน้า preview ตามที่ test 17 ตรวจ
  - `views/post.ejs`: เมื่อ `preview` เป็นจริงจะมี `<link rel="stylesheet" href="/css/admin.css?v=<%= v %>">` และ `<p class="preview-bar" lang="th">ตัวอย่าง ยังไม่ได้บันทึก</p>` ต่อจาก `<body>` ก่อน header ของเว็บ หน้า public ส่ง `preview: false` จึงไม่มีทั้งสองอย่าง
  - `POST /admin/projects/preview/:lang` ของ Task 13 ใช้รูปแบบเดียวกันได้ คือตั้ง locals ของภาษา, โหลด settings, แปลงแท็กเป็นชื่อในภาษาของหน้า และแสดงแถบ `preview-bar`
  - จบ task นี้ Phase 3 ครบ `npm test` ผ่าน 10 tests

- คำสั่ง git ของ Step 10 และ 11 ซ้อมใน repo ทิ้งตัวเดียวกับ Task 10 ที่มี commit ของ Task 10 แล้ว เลข commit hash จึงไม่ตรงกัน

- [ ] **Step 1: เขียน test ที่ต้อง fail**

สร้าง `test/10-preview.test.js` สามข้อของ spec ข้อ 3.4 test 10 อยู่ตรงคอมเมนต์ `spec test 10, case 1` ถึง `case 3`

- ข้อ "จำนวน posts ไม่เปลี่ยน" นับ `posts`, `post_translations` และ `post_tags` พร้อมกัน เพราะฟอร์มที่ส่งมีทั้งสองภาษาและแท็ก
- ข้อ 2 ใช้บทความที่ published แล้วจาก `insertPost` ส่งฟอร์มที่เปลี่ยนหัวข้อและเนื้อหาไป preview แล้วตรวจว่าหน้า public ยังเป็นหัวข้อเดิม ไม่มีแถบ preview และแถวใน DB เท่าเดิมทุกคอลัมน์
- ข้อ 3 ส่งฉบับไทยไปในฟอร์มด้วย แล้วตรวจว่าทั้งหน้าเป็นภาษาอังกฤษตามที่ spec ข้อ 2.4 ให้ตั้ง `lang`, `other`, `t` ก่อน render คือ `<html lang="en">`, `og:locale` เป็น `en_US`, ข้อความ UI จาก `strings.en`, ชิปแท็กชื่ออังกฤษ, SEO title ใน `<title>` และไม่มีข้อความของฉบับไทยหลุดมา ส่วนแถบ preview ยังเป็นภาษาไทยเพราะเป็น UI ของ admin
- ตรวจเพิ่มว่า preview อยู่หลัง guard, ปุ่ม ดูตัวอย่าง ของ editor ส่งมาที่ route นี้ในแท็บใหม่, หัวข้อที่มี `<Docker>` ถูก escape, หน้า preview มีแถบ ตัวอย่าง ยังไม่ได้บันทึก พร้อม `admin.css`, ชื่อเว็บจาก settings, ภาพปกกับ alt, `noindex`, ไม่มี canonical และไม่มีวันที่ เพราะฟอร์มไม่มี `published_at` และสุดท้าย `:lang` ที่ไม่ใช่ `th` หรือ `en` ได้ 404 โดยไม่มีแถวใหม่ใน DB

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { start, insertPost, run, get } = require('./helpers');
const strings = require('../src/strings');

test('10 preview', async () => {
  const h = await start();
  try {
    const counts = async () => ({
      posts: (await get('SELECT COUNT(*) AS n FROM posts')).n,
      translations: (await get('SELECT COUNT(*) AS n FROM post_translations')).n,
      postTags: (await get('SELECT COUNT(*) AS n FROM post_tags')).n
    });
    const blank = { title: '', slug: '', excerpt: '', body_markdown: '', cover_image_alt: '', seo_title: '', seo_description: '' };
    const bar = '<p class="preview-bar" lang="th">ตัวอย่าง ยังไม่ได้บันทึก</p>';
    const { lastID: tagId } = await run("INSERT INTO tags (slug, name_th, name_en) VALUES ('containers', 'คอนเทนเนอร์', 'Containers')");
    await run("INSERT INTO settings (key, lang, value) VALUES ('site_name', '*', 'Dev Notes')");
    const newPost = {
      cover_image: '/uploads/cover.png',
      tags: String(tagId),
      th: {
        ...blank,
        status: 'draft',
        title: 'ลองใช้ <Docker> ครั้งแรก',
        excerpt: 'เกริ่นนำของตัวอย่าง',
        body_markdown: '```js\nconst x = 1;\n```\n',
        cover_image_alt: 'ภาพปกภาษาไทย'
      },
      en: { ...blank, status: 'none' }
    };

    // the preview route sits behind the admin guard like everything else under /admin
    let r = await h.req('/admin/posts/preview/th', { method: 'POST', form: newPost });
    assert.equal(r.status, 302);
    assert.equal(r.location, '/admin/login');

    await h.login();

    // the preview buttons of the editor post the whole form to this route in a new tab
    r = await h.req('/admin/posts/new');
    assert.ok(r.text.includes('formaction="/admin/posts/preview/th" formtarget="_blank"'), r.text);
    assert.ok(r.text.includes('formaction="/admin/posts/preview/en" formtarget="_blank"'), r.text);

    // spec test 10, case 1: a Thai post that was never saved, with a js fence
    const before = await counts();
    r = await h.req('/admin/posts/preview/th', { method: 'POST', form: newPost });
    assert.equal(r.status, 200);
    assert.ok(r.text.includes('<html lang="th">'), r.text);
    assert.ok(r.text.includes('<h1>ลองใช้ &lt;Docker&gt; ครั้งแรก</h1>'), r.text);
    assert.ok(r.text.includes('class="hljs-keyword"'), r.text);
    assert.deepEqual(await counts(), before);
    // the same page as the public one, with settings, the cover and its alt, tag chips in the page language and the bar on top
    assert.ok(r.text.includes(bar), r.text);
    assert.ok(r.text.includes('<link rel="stylesheet" href="/css/admin.css?v='), r.text);
    assert.ok(r.text.includes('<title>ลองใช้ &lt;Docker&gt; ครั้งแรก | Dev Notes</title>'), r.text);
    assert.ok(r.text.includes('<img class="post-cover" src="/uploads/cover.png" alt="ภาพปกภาษาไทย">'), r.text);
    assert.ok(r.text.includes('<a class="tag" href="/th/tags/containers">คอนเทนเนอร์</a>'), r.text);
    assert.ok(r.text.includes('<meta name="robots" content="noindex">'), r.text);
    assert.ok(!r.text.includes('rel="canonical"'), r.text);
    // the form carries no published_at, so the preview shows no date
    assert.ok(!r.text.includes('<time'), r.text);

    // spec test 10, case 2: previewing a new title of a published post changes nothing on the public page
    const id = await insertPost({ th: { slug: 'live-post', title: 'ชื่อที่เผยแพร่อยู่', body_markdown: 'เนื้อหาที่เผยแพร่อยู่' } });
    const saved = await get('SELECT * FROM post_translations WHERE post_id = ?', [id]);
    const afterInsert = await counts();
    r = await h.req('/admin/posts/preview/th', {
      method: 'POST',
      form: {
        cover_image: '',
        th: { ...blank, status: 'published', slug: 'live-post', title: 'ชื่อใหม่ที่ยังไม่บันทึก', body_markdown: 'เนื้อหาใหม่' },
        en: { ...blank, status: 'none' }
      }
    });
    assert.equal(r.status, 200);
    assert.ok(r.text.includes('<h1>ชื่อใหม่ที่ยังไม่บันทึก</h1>'), r.text);
    r = await h.req('/th/blog/live-post');
    assert.equal(r.status, 200);
    assert.ok(r.text.includes('<h1>ชื่อที่เผยแพร่อยู่</h1>'), r.text);
    assert.ok(!r.text.includes('ชื่อใหม่ที่ยังไม่บันทึก'), r.text);
    assert.ok(!r.text.includes('preview-bar'), r.text);
    assert.ok(!r.text.includes('/css/admin.css'), r.text);
    assert.deepEqual(await get('SELECT * FROM post_translations WHERE post_id = ?', [id]), saved);
    assert.deepEqual(await counts(), afterInsert);

    // spec test 10, case 3: the English preview is an English page, and only the admin bar stays Thai
    r = await h.req('/admin/posts/preview/en', {
      method: 'POST',
      form: {
        cover_image: '',
        tags: String(tagId),
        th: newPost.th,
        en: { ...blank, status: 'draft', title: 'First look at Docker', body_markdown: 'Hello **world**', seo_title: 'Docker SEO title' }
      }
    });
    assert.equal(r.status, 200);
    assert.ok(r.text.includes('<html lang="en">'), r.text);
    assert.ok(r.text.includes('<h1>First look at Docker</h1>'), r.text);
    assert.ok(r.text.includes('<strong>world</strong>'), r.text);
    assert.ok(r.text.includes('<title>Docker SEO title | Dev Notes</title>'), r.text);
    assert.ok(r.text.includes('<meta property="og:locale" content="en_US">'), r.text);
    assert.ok(r.text.includes(strings.en.backToBlog), r.text);
    assert.ok(!r.text.includes(strings.th.backToBlog), r.text);
    assert.ok(r.text.includes('<a class="tag" href="/en/tags/containers">Containers</a>'), r.text);
    assert.ok(r.text.includes(bar), r.text);
    assert.ok(!r.text.includes('ลองใช้'), r.text);

    // :lang is th or en only
    for (const urlPath of ['/admin/posts/preview/fr', '/admin/posts/preview/TH', '/admin/posts/preview']) {
      r = await h.req(urlPath, { method: 'POST', form: newPost });
      assert.equal(r.status, 404, urlPath);
    }
    assert.deepEqual(await counts(), afterInsert);
  } finally {
    await h.stop();
  }
});
```

- [ ] **Step 2: รัน test ให้เห็นว่า fail**

ปุ่ม ดูตัวอย่าง มีใน editor ตั้งแต่ Task 10 test จึงผ่านขั้น guard กับขั้นที่ตรวจปุ่ม แล้วไป fail ที่ `POST /admin/posts/preview/th` ครั้งแรกหลัง login เพราะยังไม่มี route นี้

Run: `node --test test/10-preview.test.js`
Expected: FAIL exit code 1 และ output

```
✖ 10 preview (182.4175ms)
ℹ tests 1
ℹ suites 0
ℹ pass 0
ℹ fail 1
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 660.0734

✖ failing tests:

test at test\10-preview.test.js:6:1
✖ 10 preview (182.4175ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  
  404 !== 200
  
      at TestContext.<anonymous> (D:\Ikkyusan\Downloads\TalkAlways_MVP\talkalways\test\10-preview.test.js:47:12)
      at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
      at async Test.run (node:internal/test_runner/test:1409:7)
      at async startSubtestAfterBootstrap (node:internal/test_runner/harness:387:3) {
    generatedMessage: true,
    code: 'ERR_ASSERTION',
    actual: 404,
    expected: 200,
    operator: 'strictEqual',
    diff: 'simple'
  }
```

- [ ] **Step 3: เพิ่ม route preview ใน src/routes/admin-posts.js**

แก้ `src/routes/admin-posts.js` สองจุด ส่วนอื่นของไฟล์ไม่เปลี่ยนจาก Task 10

จุดที่ 1: แทนที่บรรทัด require ของ slug ซึ่งตอนนี้คือ

```js
const { resolveSlugs } = require('../slug');
```

ด้วยข้อความนี้

```js
const { resolveSlugs } = require('../slug');
const strings = require('../strings');
```

จุดที่ 2: แทนที่บรรทัดของ `POST /` ซึ่งตอนนี้คือ

```js
router.post('/', (req, res) => save(req, res, null));
```

ด้วยข้อความนี้

```js
router.post('/', (req, res) => save(req, res, null));

// Preview from spec 2.4: the real post page rendered from the form, without writing anything to the DB.
// :lang is th or en only; anything else goes on to the 404 handler.
router.post('/preview/:lang', async (req, res, next) => {
  const { lang } = req.params;
  if (!LANGS.includes(lang)) return next();
  const values = readForm(req.body ?? {});
  const tr = values[lang];
  // the same locals that src/app.js sets for /th and /en, otherwise an English preview gets <html lang="th"> and Thai UI text
  res.locals.lang = lang;
  res.locals.other = lang === 'th' ? 'en' : 'th';
  res.locals.t = strings[lang];
  // settings the way the public router loads them, so the header and <title> show the site name
  const settingRows = await all("SELECT key, value FROM settings WHERE lang IN (?, '*')", [lang]);
  res.locals.settings = Object.fromEntries(settingRows.map(row => [row.key, row.value]));
  // tag chips in the page language, in the same { slug, name } shape and order as GET /blog/:slug
  const tagRows = await all(
    'SELECT slug, name_th, name_en FROM tags WHERE id IN (SELECT value FROM json_each(?)) ORDER BY slug',
    [JSON.stringify(values.tags)]
  );
  res.render('post', {
    post: { cover_image: values.cover_image },
    tr,
    tags: tagRows.map(tag => ({ slug: tag.slug, name: lang === 'th' ? tag.name_th : tag.name_en })),
    alternates: [],
    preview: true,
    // no canonical, hreflang or og:url because a preview has no public URL, and noindex keeps it out of search
    meta: {
      title: tr.seo_title || tr.title,
      description: tr.seo_description || tr.excerpt,
      noindex: true,
      type: 'article'
    }
  });
});
```

- route นี้อยู่ต่อจาก `POST /` จึงประกาศก่อนทุก route ที่มี `:id` ตามที่ Task 10 เว้นที่ไว้ `POST /preview/th` มีสอง segment จึงไม่ชนกับ `POST /:id` อยู่แล้ว ส่วน `POST /admin/posts/preview` ที่ไม่มีภาษาจะไปเข้า `POST /:id` ซึ่ง `parseId('preview')` ได้ `null` แล้วได้ 404
- Express router ไม่แยกตัวพิมพ์เล็กใหญ่ของ path โดย default `/preview/TH` จึงเข้า route นี้ด้วย แต่ `LANGS.includes` แยกตัวพิมพ์ จึงได้ 404 ตาม spec ข้อ 2.4
- ใช้ `readForm` ตัวเดียวกับการบันทึก ค่าที่เห็นใน preview จึงเป็นค่าเดียวกับที่จะถูกบันทึก เช่นหัวข้อที่ trim แล้ว
- ตั้ง `lang`, `other` และ `t` ก่อน render ตาม spec ข้อ 2.4 และโหลด settings ด้วย query `WHERE lang IN (?, '*')` แบบเดียวกับ `loadSettings` ใน `src/routes/public.js` ซึ่งไม่ได้ export ออกมา header กับ `<title>` จึงแสดงชื่อเว็บเหมือนหน้าจริง
- แท็กอ่านด้วย `json_each` แบบเดียวกับ Task 10 แล้วแปลงเป็น `{ slug, name }` ในภาษาของหน้า เรียงตาม slug แบบเดียวกับ `GET /blog/:slug` ของ Task 9
- route นี้อ่าน `settings` กับ `tags` อย่างเดียวและไม่มีคำสั่งเขียน DB จึงกดกับบทความใหม่ได้โดยไม่สร้างแถวซ้ำ และกดกับบทความที่ published แล้วได้โดยไม่ publish ส่วนที่แก้ออกไป ตาม spec ข้อ 2.4
- `tr` จากฟอร์มไม่มี `published_at` หน้า preview จึงไม่แสดงวันที่ ตามเงื่อนไขที่ Task 9 ใส่ไว้ใน `views/post.ejs`
- `meta` ไม่มี `canonical`, `alternates` และ `image` เพราะหน้า preview ไม่มี URL สาธารณะ และมี `noindex: true` ซึ่ง `head.ejs` แปลงเป็น `<meta name="robots" content="noindex">`
- markdown ถูก render ด้วย `md.render` ตัวเดียวกับหน้าจริงผ่าน `views/post.ejs` ผลที่เห็นรวมถึง syntax highlight จึงตรงกัน
- Express 5 ส่ง error จาก async handler ต่อให้ error handler เอง จึงไม่มี try/catch

- [ ] **Step 4: เพิ่มแถบ preview ใน views/post.ejs**

แทนที่เนื้อหาทั้งหมดของ `views/post.ejs` ด้วยข้อความนี้ ส่วนที่เปลี่ยนจาก Task 9 มีแค่ block `<% if (preview) { -%>` สี่บรรทัดที่อยู่ต่อจาก `include('partials/head')`

- `views/partials/head.ejs` เป็นของหน้า public และ task นี้ไม่แก้ `<link rel="stylesheet">` ของ `admin.css` จึงอยู่ใน `<body>` ซึ่ง HTML อนุญาตสำหรับ stylesheet หน้า public ที่ส่ง `preview: false` จึงไม่โหลด `admin.css` เลย
- แถบอยู่ก่อน header ของเว็บ จึงเป็นสิ่งแรกที่เห็นบนหน้า ส่วน skip link ยังเป็นสิ่งแรกที่กด Tab ไปถึง เพราะแถบเป็น `<p>` ที่ focus ไม่ได้
- ข้อความของแถบเป็นภาษาไทยเพราะเป็น UI ของ admin และมี `lang="th"` บนหน้า preview ภาษาอังกฤษ screen reader จึงอ่านด้วยเสียงไทย
- `<%-` ที่เพิ่มไม่มี ส่วน `md.render(` กับ `include(` ยังอยู่บรรทัดเดียวกับ `<%-` ของตัวเอง

```ejs
<%- include('partials/head') %>
<% if (preview) { -%>
<link rel="stylesheet" href="/css/admin.css?v=<%= v %>">
<p class="preview-bar" lang="th">ตัวอย่าง ยังไม่ได้บันทึก</p>
<% } -%>
<%- include('partials/header') %>
<main id="main" class="post">
  <article class="post-article">
    <header class="post-header">
      <h1><%= tr.title %></h1>
<% if (tr.published_at) { -%>
      <p class="post-meta"><time datetime="<%= tr.published_at %>"><%= formatDate(lang, tr.published_at) %></time></p>
<% } -%>
<% if (tags.length) { -%>
      <ul class="tag-list" aria-label="<%= t.postTags %>">
<% for (const tag of tags) { -%>
        <li><a class="tag" href="/<%= lang %>/tags/<%= tag.slug %>"><%= tag.name %></a></li>
<% } -%>
      </ul>
<% } -%>
    </header>
<% if (post.cover_image) { -%>
    <img class="post-cover" src="<%= post.cover_image %>" alt="<%= tr.cover_image_alt %>">
<% } -%>
    <div class="prose">
      <%- md.render(tr.body_markdown) %>
    </div>
  </article>
  <p class="post-back"><a href="/<%= lang %>/blog"><%= t.backToBlog %></a></p>
</main>
<%- include('partials/footer') %>
```

- [ ] **Step 5: รัน test ให้เห็นว่าผ่าน**

Run: `node --test test/10-preview.test.js`
Expected: PASS exit code 0

```
✔ 10 preview (254.052ms)
ℹ tests 1
ℹ suites 0
ℹ pass 1
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 682.9964
```

- [ ] **Step 6: ตรวจ <%- ใน views ด้วยขั้นตรวจเดียวกับ CI**

Run: `grep -n "<%-" views/post.ejs; bash -e -c 'if grep -rn "<%-" views/ | grep -v -e "md.render(" -e "include("; then echo "found <%- outside md.render or include"; exit 1; fi'; echo "guard exit=$?"`
Expected:

```
1:<%- include('partials/head') %>
6:<%- include('partials/header') %>
26:      <%- md.render(tr.body_markdown) %>
31:<%- include('partials/footer') %>
guard exit=0
```

- [ ] **Step 7: รัน npm test ทั้งชุด**

Run: `npm test`
Expected: PASS exit code 0 และมี 10 tests

```
> talkalways@1.0.0 test
> node --test test/*.test.js

✔ 01 markdown (41.9559ms)
✔ 02 routing (228.3267ms)
✔ 03 publish per language (300.7344ms)
✔ 04 published at (417.174ms)
✔ 05 blog hidden (418.8271ms)
✔ 06 delete cascade (488.4943ms)
✔ 07 admin guard (263.8651ms)
✔ 08 login cookie (350.3063ms)
✔ 09 editor validation (392.761ms)
✔ 10 preview (454.1503ms)
ℹ tests 10
ℹ suites 0
ℹ pass 10
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1254.0536
```

- [ ] **Step 8: ตรวจ preview และบทความครบวงจรใน browser**

**Owner:** ทำทุกข้อข้างล่างใน Chrome หรือ Edge บนเครื่องนี้ แล้วบอก executor ว่าผ่านครบหรือข้อไหนไม่ผ่าน executor ต้องหยุดรอคำตอบและห้าม commit ถ้ามีข้อที่ไม่ผ่าน ข้อ 3 ถึง 10 คือการตรวจของ Phase 3 ใน spec ข้อ 3.5

เนื้อหาที่ใช้ในข้อ 3 มีดังนี้

````markdown
ย่อหน้าที่มีคำที่ *เน้น*

```js
// คอมเมนต์ภาษาไทย
const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25];
```
````

1. ใน Git Bash ที่ root ของโปรเจกต์ รัน `DATA_DIR=data/preview-check PORT=3001 SITE_URL=http://localhost:3001 npm start` ต้องเห็น `Listening on http://localhost:3001` DB ทดลองนี้เริ่มจากว่าง `data/site.db` จึงไม่ถูกแตะ
2. เปิด `http://localhost:3001/admin/login` login ด้วย passphrase จาก Task 8 Step 22 แล้วคลิก เขียนบทความใหม่
3. ในกล่อง ไทย พิมพ์หัวข้อ `ลองใช้ Docker ครั้งแรก`, slug `docker-101`, เลือกสถานะ เผยแพร่ และวางเนื้อหาข้างบนในช่อง เนื้อหา (markdown) โดยยังไม่กด บันทึก
4. กด ดูตัวอย่าง ในกล่อง ไทย browser ต้องเปิดแท็บใหม่ที่ `/admin/posts/preview/th` ส่วนแท็บ editor ยังอยู่ที่ `/admin/posts/new` พร้อมข้อความที่พิมพ์ไว้ แท็บ preview มีแถบสีน้ำเงิน ตัวอย่าง ยังไม่ได้บันทึก อยู่บนสุด ตามด้วย header ของเว็บ, หัวข้อ ลองใช้ Docker ครั้งแรก ที่ไม่มีวันที่ใต้หัวข้อ, คำว่า เน้น เป็นตัวหนาไม่เอียง และ code block ที่ `const` เป็นสีม่วงและ comment ไม่เอียง
5. ในแท็บ preview กด F12 แล้วกด Ctrl+Shift+M ตั้งความกว้าง 400 ความสูง 900 หน้าต้องไม่มี scrollbar แนวนอน แถบ preview กว้างเต็มจอ และ code block ชนขอบจอซ้ายขวาและเลื่อนแนวนอนในกรอบของตัวเอง กดปุ่มธีมให้เป็นธีมมืด แถบต้องเป็นพื้นสีฟ้าอ่อนกับตัวอักษรสีเข้มที่อ่านออก กดปุ่มธีมกลับเป็นสว่าง ปิด device toolbar แล้วปิดแท็บ preview
6. เปิด `http://localhost:3001/admin/posts` ในแท็บใหม่ ต้องยังมีข้อความ ยังไม่มีบทความ เพราะ preview ไม่บันทึกอะไรลง DB แล้วปิดแท็บนั้น
7. กลับไปที่แท็บ editor แล้วกด บันทึก ด้านบน ช่อง URL ต้องเป็น `/admin/posts/1?saved=1`
8. เปิด `http://localhost:3001/th/blog/docker-101` หน้าต้องไม่มีแถบ preview และ `const` เป็นสีม่วง กดปุ่มธีมเป็นธีมมืด `const` ต้องเป็นสีม่วงอ่อนที่อ่านออก แล้วกดกลับเป็นสว่าง
9. เปิด `http://localhost:3001/en/blog` การ์ดแรกต้องเป็นหัวข้อภาษาไทย ลองใช้ Docker ครั้งแรก พร้อมกรอบคำว่า Thai
10. กลับไปที่ editor ของบทความ เปิดกล่อง English เลือกสถานะ แบบร่าง พิมพ์หัวข้อ `Docker first look` และเนื้อหา `Hello **world**` แล้วกด บันทึก จากนั้น reload หน้า `/en/blog` การ์ดแรกต้องยังเป็นการ์ดไทยพร้อมคำว่า Thai และทั้งหน้าไม่มีคำว่า Docker first look
11. ใน editor กด ดูตัวอย่าง ในกล่อง English แท็บใหม่ต้องเป็นหน้าภาษาอังกฤษ คือเมนู Blog Projects About, ลิงก์สลับภาษาเขียนว่า ไทย, หัวข้อ Docker first look, คำว่า world เป็นตัวหนา และลิงก์ Back to the blog ส่วนแถบบนสุดยังเป็นภาษาไทย แล้วปิดแท็บนั้น
12. ใน editor แก้หัวข้อในกล่อง ไทย เป็น `ชื่อใหม่ที่ยังไม่บันทึก` แล้วกด ดูตัวอย่าง ในกล่อง ไทย แท็บใหม่ต้องแสดงหัวข้อใหม่ จากนั้นเปิด `http://localhost:3001/th/blog/docker-101` ต้องยังเป็นหัวข้อ ลองใช้ Docker ครั้งแรก แล้วปิดทั้งสองแท็บโดยไม่กด บันทึก
13. กลับไปที่ Git Bash แล้วกด Ctrl+C เพื่อหยุด server

ตอนเขียนแผนตรวจข้อ 3 ถึง 11 ด้วย Edge แบบ headless ผ่าน DevTools Protocol ที่ความกว้าง 400 และ 1024px ธีมมืดจำลองด้วย `prefers-color-scheme` ส่วนข้อ 12 คือข้อ 2 ของ test 10 ค่าที่วัดได้มีดังนี้

- การกดปุ่ม ดูตัวอย่าง จริงเปิดแท็บใหม่ที่ `/admin/posts/preview/th` และแท็บเดิมยังอยู่ที่ `/admin/posts/new`
- หน้า preview ภาษาไทยและภาษาอังกฤษที่ความกว้าง 400 มี `scrollWidth` เท่ากับ `clientWidth` และ code block ของหน้าไทยอยู่ตั้งแต่ 0 ถึง 400px
- element แรกใน `<body>` คือ `<link>` ของ `admin.css` แถบมีพื้น `rgb(31, 95, 168)` กับตัวอักษร `rgb(252, 252, 250)` ในธีมสว่าง และพื้น `rgb(127, 178, 240)` กับตัวอักษร `rgb(18, 19, 21)` ในธีมมืด ซึ่งคือค่า `--accent` กับ `--bg` ใน spec ข้อ 3.2
- หน้า preview ภาษาไทยมี `<meta name="robots" content="noindex">`, `<em>` ได้ `font-style: normal` น้ำหนัก 600 และ `.hljs-keyword` เป็น `rgb(138, 59, 146)`
- หน้า `/th/blog/docker-101` ไม่มีแถบและไม่โหลด `admin.css` สีของ `.hljs-keyword` คือ `rgb(138, 59, 146)` ในธีมสว่างและ `rgb(213, 160, 232)` ในธีมมืด
- `/en/blog` แสดงการ์ดที่มี `lang="th"` และ badge `Thai` ทั้งก่อนและหลังเพิ่มฉบับอังกฤษแบบ draft และไม่มีหัวข้อของ draft
- หน้า preview ภาษาอังกฤษมี `<html lang="en">`, แถบมี `lang="th"`, ลิงก์ Back to the blog และตัวอักษรในเนื้อหาขนาด 16px ของภาษาอังกฤษ

- [ ] **Step 9: ลบ DB ทดลอง**

Run: `rm -rf data/preview-check; test -e data/preview-check && echo LEFT || echo REMOVED`
Expected: `REMOVED`

ถ้าได้ `LEFT` แปลว่า server จาก Step 8 ยังไม่หยุด ให้กด Ctrl+C ในหน้าต่างนั้นแล้วรันคำสั่งนี้อีกครั้ง

- [ ] **Step 10: ตรวจว่ามีแค่ไฟล์ของ task นี้ที่เปลี่ยน**

Run: `git status --short`
Expected:

```
 M src/routes/admin-posts.js
 M views/post.ejs
?? test/10-preview.test.js
```

ถ้ามีบรรทัดอื่นนอกจากนี้ เช่น `.env`, `data/` หรือ `.claude/` ห้าม add ไฟล์นั้นและให้หยุดถามเจ้าของ

- [ ] **Step 11: Commit**

```bash
git add src/routes/admin-posts.js views/post.ejs test/10-preview.test.js
git commit -m "feat: add post preview that renders the public page from the editor form"
```

Expected:

```
[main 5952392] feat: add post preview that renders the public page from the editor form
 3 files changed, 157 insertions(+)
 create mode 100644 test/10-preview.test.js
```

Run: `git status --short | wc -l`
Expected: `0`

## Phase 4: โปรเจกต์ครบวงจรและหน้าแรก

Phase นี้ทำให้โปรเจกต์ใช้งานได้ครบวงจรแบบเดียวกับบทความ ฝั่ง public มีหน้า `/projects` ที่เป็นกริดของโปรเจกต์ทั้งหมด หน้ารายละเอียดโปรเจกต์ และ section โปรเจกต์เด่นบนหน้าแรก ฝั่ง admin มีรายการโปรเจกต์ editor สองภาษา validation การลบ และ preview พอจบ phase นี้ `npm test` จะผ่าน 11 tests (เพิ่ม 12) Task 12 ทำฝั่ง public ก่อน จึงยังไม่มีทางสร้างโปรเจกต์ผ่านหน้าเว็บ test และการตรวจใน browser ของ task นี้ insert ข้อมูลด้วย SQL ตรง ส่วน Task 13 ไม่มี gate test และตรวจด้วยคำสั่งที่ยิง request จริงกับการตรวจใน browser

- ทุกคำสั่งรันใน Git Bash ที่ root ของโปรเจกต์ `/d/Ikkyusan/Downloads/TalkAlways_MVP/talkalways` และ `node -v` ต้องได้ `v24.21.0`
- Expected ทุกบรรทัดมาจากการรันจริงบน Node 24.21.0 ในโฟลเดอร์ทดลองที่สร้างจากโค้ดในแผนนี้ตามลำดับตั้งแต่ Task 4 path ใน output เปลี่ยนเป็น path จริงของโปรเจกต์แล้ว ส่วนตัวเลขเวลา เช่น `(111.5274ms)` และ `duration_ms` จะไม่ตรงกัน
- คำสั่ง git ของ Task 12 และ 13 ซ้อมใน repo ทิ้งได้ที่มีไฟล์ของ Task 4 ถึง 11 commit ไว้แล้ว เลข commit hash จึงไม่ตรงกัน
- ถ้า output จริงต่างจาก Expected ในเรื่องอื่นนอกจาก path, เวลา และ commit hash ให้หยุดและหาสาเหตุก่อนทำ step ถัดไป

### Task 12: หน้าโปรเจกต์สาธารณะและ featured บนหน้าแรก

**Phase:** 4 · **Gate tests:** 12-project-order

**Files:**
- Modify: `test/helpers.js` (เพิ่มฟังก์ชัน `insertProject` ต่อจาก `insertPost` และเพิ่ม `insertProject` ใน `module.exports`)
- Modify: `src/strings.js` (เพิ่ม key 6 ตัวท้าย object ทั้ง `th` และ `en`)
- Modify: `src/routes/public.js` (เพิ่ม `PROJECT_LIST_SQL`, ให้ `GET /` ส่ง `featured` และเพิ่ม `GET /projects` กับ `GET /projects/:slug`)
- Create: `views/partials/project-card.ejs`
- Create: `views/projects.ejs`
- Create: `views/project.ejs`
- Modify: `views/home.ejs` (แทรก section โปรเจกต์เด่นระหว่าง `.intro` กับ `.latest`)
- Modify: `public/css/site.css` (ต่อ section ของกริดโปรเจกต์, การ์ดโปรเจกต์ และหน้าโปรเจกต์ท้ายไฟล์)
- Test: `test/12-project-order.test.js`

**Interfaces:**
- Consumes:
  - `src/db.js` จาก Task 5: `get(sql, params)`, `all(sql, params)`, `run(sql, params)` และตาราง `projects`, `project_translations`, `tags`, `project_tags` ตาม `src/schema.sql`
  - `src/routes/public.js` จาก Task 9: `LIST_SQL`, `PAGE_SIZE`, `pageNumber(req)`, `loadSettings(lang)`, `router.use` ที่ใส่ `res.locals.settings` และลำดับ route `GET /`, `GET /blog`, `GET /blog/:slug`
  - `views/partials/head.ejs` จาก Task 5: อ่าน `meta.title`, `meta.description`, `meta.canonical`, `meta.alternates`, `meta.image`, `meta.type` แล้วต่อ `siteUrl` ข้างหน้า path
  - `views/partials/header.ejs` จาก Task 5: ลิงก์สลับภาษาใช้ href จาก `meta.alternates` ของอีกภาษา ถ้าไม่มีใช้ `meta.canonical` ในอีกภาษาที่ตัด segment สุดท้ายทิ้ง
  - `views/home.ejs` และ `views/partials/post-card.ejs` จาก Task 9: หน้าแรกมี `.intro` ตามด้วย `.latest` และการ์ดของอีกภาษาได้ `lang` ที่ `<article>` กับ badge `t.badgeOtherLang` ใน `.card-meta` ที่ได้ `lang` ของหน้าคืน
  - `public/css/site.css` จาก Task 6 และ 9: token ใน `:root`, `.empty`, `.section-head`, `.card-title`, `.card-title a::after`, `.card-meta`, `.badge`, `.excerpt`, `.post-article`, `.post-header`, `.tag-list`, `.tag`, `.post-cover`, `.post-back` และ `.prose`
  - `public/css/admin.css` จาก Task 10: class `preview-bar`
  - `src/strings.js` จาก Task 9: `navProjects`, `badgeOtherLang`, `postTags` และ `test/helpers.js` จาก Task 9: `start()`, `H.req`, `insertPost`, `run`, `get`, `all`
- Produces:
  - `test/helpers.js`: `module.exports = { start, toForm, insertPost, insertProject, signCookie, run, get, all }`
    - `insertProject({ thumbnail, repo_url, demo_url, featured = 0, sort_order = 0, th, en, tags }) -> Promise<number>` ตรงตามหัวข้อ `test/helpers.js` ใน Interfaces ของ plan คืน `projects.id` ภาษาที่ไม่ส่งมาจะไม่มี row และ `tags` เป็น array ของ `tags.id` ที่ถูก insert ลง `project_tags`
    - Task 14 เพิ่ม `insertTag` เข้า `module.exports` ตัวเดียวกันนี้
  - `src/routes/public.js`: ลำดับในไฟล์คือ `router.use` ของ settings, `GET /`, `GET /blog`, `GET /blog/:slug`, `GET /projects`, `GET /projects/:slug` แล้วจึง `module.exports` route ของ task หลัง (`/tags/:slug` ใน Task 14, `/about` ใน Task 16, `/search` ใน Task 17, `/privacy` ใน Task 19) เพิ่มก่อน `module.exports`
    - `PROJECT_LIST_SQL` รับ params `[minFeatured, lang, lang]` คืน project card row `{ project_id, lang, slug, title, summary, thumbnail }` ด้วยกติกา fallback เดียวกับ `LIST_SQL` เรียง `ORDER BY p.featured DESC, p.sort_order, p.id` หน้าแรกเรียกด้วย `[1, lang, lang]` และ `/projects` เรียกด้วย `[0, lang, lang]` Task 17 เขียน query โปรเจกต์ของหน้า search ด้วยคอลัมน์และลำดับชุดเดียวกันนี้
    - `GET /` render `home` ด้วย `{ featured, posts, meta }` โดย `featured` คือ project card row ของโปรเจกต์ featured ที่ published ทุกตัว
    - `GET /projects` render `projects` ด้วย `{ projects, meta }` โดย `meta` มี `title: t.navProjects`, `canonical: '/<lang>/projects'`, `alternates` ครบสองภาษา และ `type: 'website'`
    - `GET /projects/:slug` render `project` ด้วย `{ project, tr, tags, meta }` โดย `project = { id, thumbnail, repo_url, demo_url }`, `tr` คือทั้ง row ของ `project_translations`, `tags = [{ slug, name }]` ที่ `name` เป็นชื่อในภาษาของหน้า และ `meta` มี `title: tr.title`, `description: tr.summary`, `canonical`, `alternates` ที่มีค่าเฉพาะเมื่อ published ทั้งสองภาษา, `image: project.thumbnail` และ `type: 'website'`
  - `views/partials/project-card.ejs`: เรียกด้วย `<%- include('partials/project-card', { card, level }) %>` โดย `card` คือ project card row และ `level` คือ 2 หรือ 3 การ์ดที่ `card.lang` ไม่ตรงกับ `lang` ของหน้าได้ `lang="<card.lang>"` ที่ `<article class="project-card">` และ badge `t.badgeOtherLang` ลิงก์ชี้ไป `/<card.lang>/projects/<slug>` ไฟล์นี้เป็นชื่อใหม่ที่ไม่มีใน File Structure ของ plan Task 17 ใช้ partial นี้กับผลค้นหาโปรเจกต์ด้วย `level: 3` ได้
  - `views/project.ejs`: อ่าน `project.thumbnail`, `project.repo_url`, `project.demo_url`, `tr.title`, `tr.summary`, `tr.thumbnail_alt`, `tr.body_markdown`, `tags[].name` และ `locals.preview` เมื่อ `locals.preview` เป็นจริงจะมี `<link rel="stylesheet" href="/css/admin.css?v=<%= v %>">` กับ `<p class="preview-bar" lang="th">ตัวอย่าง ยังไม่ได้บันทึก</p>` ต่อจาก `<body>` ก่อน header ของเว็บ Task 13 ส่ง `preview: true` จาก `POST /admin/projects/preview/:lang` โดยไม่ต้องแก้ไฟล์นี้
  - `views/projects.ejs`: อ่าน `projects` และแสดง `t.noProjects` เมื่อว่าง
  - `views/home.ejs`: section เรียงเป็น `.intro`, `.featured`, `.latest` และ `.featured` แสดงเมื่อมีโปรเจกต์ featured ที่ published อย่างน้อยหนึ่งตัว
  - `src/strings.js`: key ใหม่ `featuredProjects`, `allProjects`, `noProjects`, `projectRepo`, `projectDemo`, `backToProjects`
  - `public/css/site.css`: class ใหม่ `projects`, `featured`, `project-grid`, `project-card`, `project-thumb`, `project-summary`, `project-links` ส่วน `project` เป็นแค่ชื่อ hook ที่ยังไม่มี style

- [ ] **Step 1: เพิ่ม insertProject ใน test/helpers.js**

แทนที่เนื้อหาทั้งหมดของ `test/helpers.js` ด้วยข้อความนี้ ส่วนที่เปลี่ยนจาก Task 9 มีสองจุด คือฟังก์ชัน `insertProject` ที่วางต่อจาก `insertPost` และ `module.exports` ที่เพิ่ม `insertProject`

- insert ด้วย SQL ตรงผ่าน `run` ของ `src/db.js` แบบเดียวกับ `insertPost` เพราะ editor ของโปรเจกต์ยังไม่มีจนถึง Task 13
- ภาษาที่ไม่ได้ส่งมาจะไม่มี row ตามหลักการใน spec ส่วนที่ 1
- `featured` กับ `sort_order` มีค่า default เป็น 0 เท่ากับ default ของ schema ส่วน `published_at` ใช้ destructuring default แบบเดียวกับ `insertPost`
- `projects.created_at` กับ `updated_at` ใช้ค่า default ของ schema

```js
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { once } = require('node:events');

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'site-test-'));
process.env.SESSION_SECRET = 'test-secret';
process.env.SITE_URL = 'http://test.local';
process.env.ADMIN_USERNAME = 'admin';
process.env.ADMIN_PASSWORD_HASH = require('bcryptjs').hashSync('pw', 4);
process.env.NODE_ENV = 'test';

const app = require('../src/app');
const { ready, run, get, all, close, DATA_DIR } = require('../src/db');

function toForm(obj) {
  const form = new URLSearchParams();
  const add = (key, value) => {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) {
      for (const item of value) add(key, item);
    } else if (typeof value === 'object') {
      for (const [k, v] of Object.entries(value)) add(key + '[' + k + ']', v);
    } else {
      form.append(key, String(value));
    }
  };
  for (const [key, value] of Object.entries(obj)) add(key, value);
  return form;
}

// Same format as cookie-parser: 's:' + value + '.' + base64 HMAC-SHA256 without trailing '='.
function signCookie(value, secret = 'test-secret') {
  const signature = crypto.createHmac('sha256', secret).update(value).digest('base64').replace(/=+$/, '');
  return 's:' + value + '.' + signature;
}

// Inserts a post straight into the DB. th and en are optional; a language that is left out has no row.
// published_at defaults to now for a published translation and to null for a draft.
async function insertPost({ cover_image = null, th, en, tags = [] } = {}) {
  const now = new Date().toISOString();
  const { lastID: id } = await run('INSERT INTO posts (cover_image) VALUES (?)', [cover_image]);
  for (const [lang, tr] of [['th', th], ['en', en]]) {
    if (!tr) continue;
    const {
      status = 'published',
      slug,
      title,
      excerpt = '',
      body_markdown = '',
      cover_image_alt = '',
      seo_title = '',
      seo_description = '',
      published_at = status === 'published' ? now : null
    } = tr;
    await run(
      `INSERT INTO post_translations
         (post_id, lang, status, slug, title, excerpt, body_markdown, cover_image_alt,
          seo_title, seo_description, published_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, lang, status, slug, title, excerpt, body_markdown, cover_image_alt, seo_title, seo_description, published_at, now]
    );
  }
  for (const tagId of tags) {
    await run('INSERT INTO post_tags (post_id, tag_id) VALUES (?, ?)', [id, tagId]);
  }
  return id;
}

// Inserts a project straight into the DB, the same way as insertPost. th and en are optional; a language that is
// left out has no row. featured is 0 or 1, and published_at defaults to now for a published translation.
async function insertProject({ thumbnail = null, repo_url = null, demo_url = null, featured = 0, sort_order = 0, th, en, tags = [] } = {}) {
  const now = new Date().toISOString();
  const { lastID: id } = await run(
    'INSERT INTO projects (thumbnail, repo_url, demo_url, featured, sort_order) VALUES (?, ?, ?, ?, ?)',
    [thumbnail, repo_url, demo_url, featured, sort_order]
  );
  for (const [lang, tr] of [['th', th], ['en', en]]) {
    if (!tr) continue;
    const {
      status = 'published',
      slug,
      title,
      summary = '',
      body_markdown = '',
      thumbnail_alt = '',
      published_at = status === 'published' ? now : null
    } = tr;
    await run(
      `INSERT INTO project_translations
         (project_id, lang, status, slug, title, summary, body_markdown, thumbnail_alt, published_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, lang, status, slug, title, summary, body_markdown, thumbnail_alt, published_at, now]
    );
  }
  for (const tagId of tags) {
    await run('INSERT INTO project_tags (project_id, tag_id) VALUES (?, ?)', [id, tagId]);
  }
  return id;
}

function updateJar(jar, setCookie) {
  for (const line of setCookie) {
    const [pair, ...attrs] = line.split(';');
    const eq = pair.indexOf('=');
    const name = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();
    let expired = value === '';
    for (const attr of attrs) {
      const [key, val = ''] = attr.trim().split('=');
      if (key.toLowerCase() === 'max-age' && Number(val) <= 0) expired = true;
      if (key.toLowerCase() === 'expires' && Date.parse(val) <= Date.now()) expired = true;
    }
    if (expired) jar.delete(name);
    else jar.set(name, value);
  }
}

async function start() {
  await ready;
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = 'http://127.0.0.1:' + server.address().port;
  const jar = new Map();

  async function req(urlPath, opts = {}) {
    const { method = 'GET', form, body, headers = {}, cookie, jar: useJar = true } = opts;
    const cookies = [];
    if (useJar) for (const [name, value] of jar) cookies.push(name + '=' + value);
    if (cookie) cookies.push(cookie);
    const sendHeaders = { ...headers };
    if (cookies.length) sendHeaders.cookie = cookies.join('; ');
    const res = await fetch(base + urlPath, {
      method,
      headers: sendHeaders,
      body: form ? toForm(form) : body,
      redirect: 'manual'
    });
    const setCookie = res.headers.getSetCookie();
    if (useJar) updateJar(jar, setCookie);
    return {
      status: res.status,
      location: res.headers.get('location'),
      headers: res.headers,
      text: await res.text(),
      setCookie
    };
  }

  function login(password = 'pw') {
    return req('/admin/login', { method: 'POST', form: { username: 'admin', password } });
  }

  async function stop() {
    await new Promise((resolve, reject) => server.close(err => (err ? reject(err) : resolve())));
    await close();
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
  }

  return { base, req, login, stop };
}

module.exports = { start, toForm, insertPost, insertProject, signCookie, run, get, all };
```

- [ ] **Step 2: เขียน test ที่ต้อง fail**

สร้าง `test/12-project-order.test.js` ใช้โปรเจกต์ A (featured, sort 2), B (featured, sort 1) และ C (ไม่ featured, sort 0) ตาม spec ข้อ 3.4 test 12 สองข้อของ spec อยู่ต่อจากคอมเมนต์ `spec test 12` และตรวจก่อนจะเพิ่มโปรเจกต์ตัวอื่น ลำดับ B, A, C จึงตรงกับ spec ทุกตัวอักษร

- ลำดับอ่านจาก `href` ตัวแรกของทุก `<article class="project-card"` ในหน้า ซึ่งคือลิงก์ของชื่อโปรเจกต์ ส่วนการ์ดบทความบนหน้าแรกเป็น `<article class="card"` จึงไม่ถูกนับ
- ข้อ "หน้า `/th` ไม่มี C" ตรวจทั้งลำดับของการ์ดและว่าชื่อ `โปรเจกต์ C` ไม่อยู่ในหน้าเลย

นอกจากสองข้อของ spec test นี้ตรวจเพิ่มดังนี้

- ก่อนมีโปรเจกต์ `/th/projects` ได้ 200 พร้อมข้อความ `noProjects` และหน้าแรกไม่มีหัวข้อโปรเจกต์เด่น
- หน้าแรกมีหัวข้อ `featuredProjects` และลิงก์ `allProjects` ไป `/th/projects`
- `sort_order` ชนะลำดับการ insert, `p.id` ตัดสินเมื่อ `featured` กับ `sort_order` เท่ากัน และโปรเจกต์ draft ไม่ขึ้นทั้งหน้ารายการและหน้าแรกแม้จะ featured ตามกติกา public query ของ spec ข้อ 2.1
- โปรเจกต์ที่มีแค่ฉบับอังกฤษขึ้นบน `/th/projects` เป็นการ์ด `lang="en"` พร้อม badge และบน `/en/projects` การ์ดไทยได้ `lang="th"` พร้อม badge ในลำดับเดียวกัน ตามกติกาการ์ดของอีกภาษาใน spec ข้อ 2.2 ที่ใช้กับหน้า projects ด้วย
- thumbnail ในรายการมี `alt=""` และ `loading="lazy"` ตาม spec ข้อ 3.3 หน้ารายการมี canonical, hreflang ของอีกภาษา และลิงก์สลับภาษาไป `/en/projects`
- หน้ารายละเอียดมี summary, ลิงก์ repo โดยไม่มีลิงก์ demo เมื่อ `demo_url` ว่าง, ชิปแท็กที่เป็นข้อความไม่ใช่ลิงก์, alt จากฉบับของภาษานั้น, syntax highlight, canonical และ `og:image` ที่เป็น URL เต็ม ตาม spec ข้อ 2.2 และ 2.4
- ช่วงที่ฉบับอังกฤษยังเป็น draft หน้าไทยไม่มี `rel="alternate"` ลิงก์สลับภาษาไป `/en/projects` และ `/en/projects/project-b` ได้ 404 ตามตารางลิงก์สลับภาษาใน spec ข้อ 2.2 หลังฉบับอังกฤษ published หน้าทั้งสองภาษามี hreflang ชี้หากันและลิงก์สลับภาษาไป `/en/projects/project-b`
- โปรเจกต์ A มีลิงก์ demo แต่ไม่มีลิงก์ repo

````js
const test = require('node:test');
const assert = require('node:assert/strict');
const { start, insertProject, run } = require('./helpers');
const strings = require('../src/strings');

test('12 project order', async () => {
  const h = await start();
  try {
    const cards = html => html.match(/<article class="project-card"[^]*?<\/article>/g) || [];
    const hrefs = html => cards(html).map(c => c.match(/href="([^"]*)"/)[1]);

    // before any project: /projects says so, and the home page has no featured section
    let r = await h.req('/th/projects');
    assert.equal(r.status, 200);
    assert.ok(r.text.includes(strings.th.noProjects), r.text);
    r = await h.req('/th');
    assert.equal(r.status, 200);
    assert.ok(!r.text.includes(strings.th.featuredProjects), r.text);

    // spec test 12: A (featured, sort 2), B (featured, sort 1), C (not featured, sort 0)
    const { lastID: tagId } = await run(
      "INSERT INTO tags (slug, name_th, name_en) VALUES ('containers', 'คอนเทนเนอร์', 'Containers')"
    );
    await insertProject({ featured: 1, sort_order: 2, demo_url: 'https://a.example.com', th: { slug: 'project-a', title: 'โปรเจกต์ A' } });
    const b = await insertProject({
      featured: 1,
      sort_order: 1,
      thumbnail: '/uploads/b.png',
      repo_url: 'https://github.com/example/b',
      tags: [tagId],
      th: {
        slug: 'project-b',
        title: 'โปรเจกต์ B',
        summary: 'สรุปของโปรเจกต์ B',
        thumbnail_alt: 'ภาพหน้าจอโปรเจกต์ B',
        body_markdown: '```js\nconst b = 1;\n```\n'
      },
      en: { status: 'draft', slug: 'project-b', title: 'EN DRAFT B', thumbnail_alt: 'Project B screenshot' }
    });
    await insertProject({ featured: 0, sort_order: 0, th: { slug: 'project-c', title: 'โปรเจกต์ C' } });

    r = await h.req('/th/projects');
    assert.equal(r.status, 200);
    assert.deepEqual(hrefs(r.text), ['/th/projects/project-b', '/th/projects/project-a', '/th/projects/project-c']);

    r = await h.req('/th');
    assert.deepEqual(hrefs(r.text), ['/th/projects/project-b', '/th/projects/project-a']);
    assert.ok(!r.text.includes('โปรเจกต์ C'), r.text);
    assert.ok(r.text.includes('<h2>' + strings.th.featuredProjects + '</h2>'), r.text);
    assert.ok(r.text.includes('href="/th/projects">' + strings.th.allProjects + '</a>'), r.text);

    // sort_order beats insertion order, id breaks a tie, a draft never shows even when featured,
    // and a project with only an English translation is an English card with a badge on the Thai page
    await insertProject({ th: { slug: 'project-d', title: 'โปรเจกต์ D' } });
    await insertProject({ sort_order: -1, en: { slug: 'english-only', title: 'English only project' } });
    await insertProject({ featured: 1, th: { status: 'draft', slug: 'secret-project', title: 'โปรเจกต์ลับ' } });
    const order = ['/th/projects/project-b', '/th/projects/project-a', '/en/projects/english-only', '/th/projects/project-c', '/th/projects/project-d'];

    r = await h.req('/th/projects');
    assert.deepEqual(hrefs(r.text), order);
    assert.ok(!r.text.includes('โปรเจกต์ลับ'), r.text);
    let card = cards(r.text).find(c => c.includes('English only project'));
    assert.ok(card.startsWith('<article class="project-card" lang="en">'), card);
    assert.ok(card.includes(strings.th.badgeOtherLang), card);
    card = cards(r.text).find(c => c.includes('โปรเจกต์ B'));
    assert.ok(card.startsWith('<article class="project-card">'), card);
    assert.ok(card.includes('<img class="project-thumb" src="/uploads/b.png" alt="" loading="lazy">'), card);
    assert.ok(card.includes('สรุปของโปรเจกต์ B'), card);
    assert.ok(r.text.includes('<link rel="canonical" href="http://test.local/th/projects">'), r.text);
    assert.ok(r.text.includes('<link rel="alternate" hreflang="en" href="http://test.local/en/projects">'), r.text);
    assert.ok(r.text.includes('class="lang-switch" href="/en/projects" lang="en" hreflang="en"'), r.text);
    assert.equal((await h.req('/th/projects/secret-project')).status, 404);

    r = await h.req('/th');
    assert.deepEqual(hrefs(r.text), ['/th/projects/project-b', '/th/projects/project-a']);

    // /en/projects keeps the same order, and Thai projects are Thai cards with a badge
    r = await h.req('/en/projects');
    assert.equal(r.status, 200);
    assert.deepEqual(hrefs(r.text), order);
    card = cards(r.text).find(c => c.includes('โปรเจกต์ B'));
    assert.ok(card.startsWith('<article class="project-card" lang="th">'), card);
    assert.ok(card.includes(strings.en.badgeOtherLang), card);
    assert.ok(!r.text.includes('EN DRAFT B'), r.text);

    // the project page: summary, a repo link without a demo link, text-only tag chips and the thumbnail alt of this language
    r = await h.req('/th/projects/project-b');
    assert.equal(r.status, 200);
    assert.ok(r.text.includes('<h1>โปรเจกต์ B</h1>'), r.text);
    assert.ok(r.text.includes('<p class="project-summary">สรุปของโปรเจกต์ B</p>'), r.text);
    assert.ok(r.text.includes('<a href="https://github.com/example/b">' + strings.th.projectRepo + '</a>'), r.text);
    assert.ok(!r.text.includes(strings.th.projectDemo), r.text);
    assert.ok(r.text.includes('<span class="tag">คอนเทนเนอร์</span>'), r.text);
    assert.ok(!r.text.includes('/tags/containers'), r.text);
    assert.ok(r.text.includes('<img class="post-cover" src="/uploads/b.png" alt="ภาพหน้าจอโปรเจกต์ B">'), r.text);
    assert.ok(r.text.includes('class="hljs-keyword"'), r.text);
    assert.ok(r.text.includes('<link rel="canonical" href="http://test.local/th/projects/project-b">'), r.text);
    assert.ok(r.text.includes('<meta property="og:image" content="http://test.local/uploads/b.png">'), r.text);
    // English is still a draft: no hreflang, and the switch link goes to the English project list
    assert.ok(!r.text.includes('rel="alternate"'), r.text);
    assert.ok(r.text.includes('class="lang-switch" href="/en/projects" lang="en" hreflang="en"'), r.text);
    assert.ok(r.text.includes('href="/th/projects">' + strings.th.backToProjects + '</a>'), r.text);
    assert.ok(!r.text.includes('preview-bar'), r.text);
    assert.equal((await h.req('/en/projects/project-b')).status, 404);

    // project A has a demo link and no repo link
    r = await h.req('/th/projects/project-a');
    assert.ok(r.text.includes('<a href="https://a.example.com">' + strings.th.projectDemo + '</a>'), r.text);
    assert.ok(!r.text.includes(strings.th.projectRepo), r.text);

    // once English is published, the two project pages point at each other
    await run(
      "UPDATE project_translations SET status = 'published', title = 'Project B', published_at = ? WHERE project_id = ? AND lang = 'en'",
      ['2026-09-13T08:00:00.000Z', b]
    );
    r = await h.req('/en/projects/project-b');
    assert.equal(r.status, 200);
    assert.ok(r.text.includes('<html lang="en">'), r.text);
    assert.ok(r.text.includes('<img class="post-cover" src="/uploads/b.png" alt="Project B screenshot">'), r.text);
    assert.ok(r.text.includes('<span class="tag">Containers</span>'), r.text);
    assert.ok(r.text.includes('<link rel="alternate" hreflang="th" href="http://test.local/th/projects/project-b">'), r.text);
    r = await h.req('/th/projects/project-b');
    assert.ok(r.text.includes('<link rel="alternate" hreflang="en" href="http://test.local/en/projects/project-b">'), r.text);
    assert.ok(r.text.includes('class="lang-switch" href="/en/projects/project-b" lang="en" hreflang="en"'), r.text);
  } finally {
    await h.stop();
  }
});
````

- [ ] **Step 3: รัน test ให้เห็นว่า fail**

`insertProject` จาก Step 1 ทำงานแล้ว แต่ยังไม่มี route `/projects` request แรกจึงตกไปที่ 404 handler

Run: `node --test test/12-project-order.test.js`
Expected: FAIL exit code 1 และ output

```
✖ 12 project order (111.5274ms)
ℹ tests 1
ℹ suites 0
ℹ pass 0
ℹ fail 1
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 531.0629

✖ failing tests:

test at test\12-project-order.test.js:6:1
✖ 12 project order (111.5274ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  
  404 !== 200
  
      at TestContext.<anonymous> (D:\Ikkyusan\Downloads\TalkAlways_MVP\talkalways\test\12-project-order.test.js:14:12)
      at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
      at async Test.run (node:internal/test_runner/test:1409:7)
      at async startSubtestAfterBootstrap (node:internal/test_runner/harness:387:3) {
    generatedMessage: true,
    code: 'ERR_ASSERTION',
    actual: 404,
    expected: 200,
    operator: 'strictEqual',
    diff: 'simple'
  }
```

- [ ] **Step 4: เพิ่มข้อความของหน้าโปรเจกต์ใน src/strings.js**

แทนที่เนื้อหาทั้งหมดของ `src/strings.js` ด้วยข้อความนี้ key 25 ตัวแรกไม่เปลี่ยนจาก Task 9 และ key ใหม่ 6 ตัวต่อท้ายทั้งสองภาษา

- `projectRepo` กับ `projectDemo` เป็นข้อความของลิงก์ repo และ demo บนหน้าโปรเจกต์ คำว่า ซอร์สโค้ด ไม่ผูกกับ GitHub เพราะ `repo_url` จะเป็น host ไหนก็ได้
- badge ของการ์ดอีกภาษาใช้ `badgeOtherLang` ตัวเดิม และ `aria-label` ของรายการชิปแท็กใช้ `postTags` ตัวเดิมที่เป็นคำว่า แท็ก และ `Tags` จึงไม่เพิ่ม key ที่ค่าซ้ำกัน
- test 02 ตรวจว่า `th` กับ `en` มี key ชุดเดียวกัน

```js
module.exports = {
  th: {
    skipToContent: 'ข้ามไปที่เนื้อหา',
    navMain: 'เมนูหลัก',
    navBlog: 'บทความ',
    navProjects: 'โปรเจกต์',
    navAbout: 'เกี่ยวกับ',
    switchLang: 'English',
    themeToggle: 'สลับธีมสว่างหรือมืด',
    errorNotFoundTitle: 'ไม่พบหน้านี้',
    errorNotFoundBody: 'ลิงก์อาจพิมพ์ผิด หรือหน้านี้ถูกลบไปแล้ว',
    errorBadRequestTitle: 'ลิงก์ไม่ถูกต้อง',
    errorBadRequestBody: 'ลิงก์นี้อาจขาดหายระหว่างการแชร์ ลองเปิดจากหน้ารวมบทความแทน',
    errorServerTitle: 'เกิดข้อผิดพลาด',
    errorServerBody: 'ระบบขัดข้องชั่วคราว ลองใหม่อีกครั้งในอีกสักครู่',
    errorBackToBlog: 'ไปหน้ารวมบทความ',
    errorBackHome: 'กลับหน้าแรก',
    latestPosts: 'บทความล่าสุด',
    allPosts: 'ดูบทความทั้งหมด',
    noPosts: 'ยังไม่มีบทความ',
    badgeOtherLang: 'ภาษาอังกฤษ',
    postTags: 'แท็ก',
    backToBlog: 'กลับไปหน้ารวมบทความ',
    pagination: 'การแบ่งหน้า',
    pageLabel: 'หน้า',
    pageNewer: 'บทความใหม่กว่า',
    pageOlder: 'บทความเก่ากว่า',
    featuredProjects: 'โปรเจกต์เด่น',
    allProjects: 'ดูโปรเจกต์ทั้งหมด',
    noProjects: 'ยังไม่มีโปรเจกต์',
    projectRepo: 'ซอร์สโค้ด',
    projectDemo: 'ดูเดโม',
    backToProjects: 'กลับไปหน้ารวมโปรเจกต์'
  },
  en: {
    skipToContent: 'Skip to content',
    navMain: 'Main',
    navBlog: 'Blog',
    navProjects: 'Projects',
    navAbout: 'About',
    switchLang: 'ไทย',
    themeToggle: 'Toggle light or dark theme',
    errorNotFoundTitle: 'Page not found',
    errorNotFoundBody: 'The link may be mistyped, or the page has been removed.',
    errorBadRequestTitle: 'Invalid link',
    errorBadRequestBody: 'This link may have been cut off when it was shared. Try opening it from the blog index instead.',
    errorServerTitle: 'Something went wrong',
    errorServerBody: 'The site hit a temporary problem. Please try again in a moment.',
    errorBackToBlog: 'Go to the blog',
    errorBackHome: 'Back to home',
    latestPosts: 'Latest posts',
    allPosts: 'All posts',
    noPosts: 'No posts yet.',
    badgeOtherLang: 'Thai',
    postTags: 'Tags',
    backToBlog: 'Back to the blog',
    pagination: 'Pagination',
    pageLabel: 'Page',
    pageNewer: 'Newer posts',
    pageOlder: 'Older posts',
    featuredProjects: 'Featured projects',
    allProjects: 'All projects',
    noProjects: 'No projects yet.',
    projectRepo: 'Source code',
    projectDemo: 'Live demo',
    backToProjects: 'Back to projects'
  }
};
```

- [ ] **Step 5: เขียน src/routes/public.js ใหม่ทั้งไฟล์**

แทนที่เนื้อหาทั้งหมดของ `src/routes/public.js` ด้วยข้อความนี้ `LIST_SQL`, `loadSettings`, `pageNumber`, `router.use`, `GET /blog` และ `GET /blog/:slug` ไม่เปลี่ยนจาก Task 9

- `PROJECT_LIST_SQL` คือ fallback query ของ spec ข้อ 2.1 ที่ใช้ตาราง `project_translations` กับ `projects` และเรียงด้วย `ORDER BY p.featured DESC, p.sort_order, p.id` ตามที่ spec เขียนไว้ โปรเจกต์ที่มีฉบับ published อย่างน้อยหนึ่งภาษาจึงได้การ์ดใบเดียวทั้งบนหน้า `/th` และ `/en`
- parameter แรกคือค่า `featured` ต่ำสุดที่รับ หน้าแรกส่ง 1 จึงได้เฉพาะโปรเจกต์ featured ส่วน `/projects` ส่ง 0 จึงได้ทุกตัว สองหน้าจึงใช้ query เดียวกันและเรียงเหมือนกันเสมอ
- ไม่มี `LIMIT` เพราะ spec ข้อ 2.1 ให้ `/projects` แสดงทั้งหมดโดยไม่แบ่งหน้า และ spec ไม่ได้จำกัดจำนวนโปรเจกต์ featured บนหน้าแรก เจ้าของคุมจำนวนเองด้วย checkbox ใน editor ของ Task 13
- card row ไม่มี `repo_url` กับ `demo_url` เพราะทั้งการ์ดเป็นลิงก์เดียวด้วย `::after` ของชื่อโปรเจกต์ ลิงก์อื่นในการ์ดจะถูกชั้นนั้นบังจนกดไม่ได้ ลิงก์ทั้งสองจึงอยู่บนหน้ารายละเอียด
- `GET /projects/:slug` ทำงานแบบเดียวกับ `GET /blog/:slug` คือหา translation ด้วย `lang`, `slug` และ `status = 'published'` ถ้าไม่เจอเรียก `next()` ซึ่งได้ 404 หา sibling ด้วย query รูปเดียวกับ spec ข้อ 2.2 และใส่ `alternates` ก็ต่อเมื่อทั้งสองภาษา published
- `meta.title` กับ `meta.description` มาจาก `tr.title` กับ `tr.summary` เพราะตาราง `project_translations` ไม่มีช่อง SEO ตาม spec ข้อ 2.4 `meta.type` เป็น `website` เพราะหน้าโปรเจกต์ไม่ใช่บทความ และ `image` เป็น path ของ thumbnail ที่ `head.ejs` ต่อ `SITE_URL` ให้
- หน้าโปรเจกต์ไม่แสดงวันที่ เพราะลำดับมาจาก `featured` กับ `sort_order` และรายการของหน้าโปรเจกต์ใน spec ข้อ 3.3 ไม่มีวันที่
- header คำนวณลิงก์สลับภาษาเองจาก `meta` หน้า `/th/projects/<slug>` ที่ฉบับอังกฤษยังไม่ published จึงได้ `/en/projects` ตามตารางใน spec ข้อ 2.2
- Express 5 ส่ง error จาก async handler ต่อให้ error handler เอง จึงไม่มี try/catch

```js
const express = require('express');
const { get, all } = require('../db');

const router = express.Router();

const PAGE_SIZE = 10;

// Fallback list query from spec 2.1. Each post appears once: in the page language when that
// translation is published, otherwise as the published translation in the other language.
// post_id breaks ties, so two posts with the same published_at never swap places between pages.
const LIST_SQL = `
  SELECT t.post_id, t.lang, t.slug, t.title, t.excerpt, t.published_at, p.cover_image
  FROM post_translations t
  JOIN posts p ON p.id = t.post_id
  WHERE t.status = 'published'
    AND (t.lang = ? OR NOT EXISTS (
          SELECT 1 FROM post_translations x
          WHERE x.post_id = t.post_id AND x.lang = ? AND x.status = 'published'))
  ORDER BY t.published_at DESC, t.post_id DESC
  LIMIT ? OFFSET ?`;

// Projects use the same fallback as LIST_SQL and the order from spec 2.1: featured first, then sort_order, then id.
// The first parameter is the lowest featured value to include: 1 on the home page keeps only featured projects,
// 0 on /projects keeps them all. There is no LIMIT because /projects has no pagination.
const PROJECT_LIST_SQL = `
  SELECT t.project_id, t.lang, t.slug, t.title, t.summary, p.thumbnail
  FROM project_translations t
  JOIN projects p ON p.id = t.project_id
  WHERE t.status = 'published'
    AND p.featured >= ?
    AND (t.lang = ? OR NOT EXISTS (
          SELECT 1 FROM project_translations x
          WHERE x.project_id = t.project_id AND x.lang = ? AND x.status = 'published'))
  ORDER BY p.featured DESC, p.sort_order, p.id`;

async function loadSettings(lang) {
  const rows = await all("SELECT key, value FROM settings WHERE lang IN (?, '*')", [lang]);
  const settings = {};
  for (const row of rows) settings[row.key] = row.value;
  return settings;
}

// ?page=N from spec 2.1. Anything but a whole number from 1 up gives null, and the route answers 404.
// isSafeInteger, not isInteger: 1e300 is an integer to JavaScript, but SQLite rejects it as OFFSET.
function pageNumber(req) {
  const page = Number(req.query.page || 1);
  return Number.isSafeInteger(page) && page >= 1 ? page : null;
}

router.use(async (req, res, next) => {
  res.locals.settings = await loadSettings(res.locals.lang);
  next();
});

router.get('/', async (req, res) => {
  const { lang, settings } = res.locals;
  const featured = await all(PROJECT_LIST_SQL, [1, lang, lang]);
  const posts = await all(LIST_SQL, [lang, lang, 5, 0]);
  res.render('home', {
    featured,
    posts,
    meta: {
      description: settings.tagline,
      canonical: '/' + lang,
      alternates: [
        { lang: 'th', href: '/th' },
        { lang: 'en', href: '/en' }
      ],
      type: 'website'
    }
  });
});

router.get('/blog', async (req, res, next) => {
  const { lang, t } = res.locals;
  const page = pageNumber(req);
  if (!page) return next();
  const rows = await all(LIST_SQL, [lang, lang, PAGE_SIZE + 1, (page - 1) * PAGE_SIZE]);
  if (page > 1 && rows.length === 0) return next();
  const query = page > 1 ? '?page=' + page : '';
  res.render('blog', {
    posts: rows.slice(0, PAGE_SIZE),
    page,
    hasNext: rows.length > PAGE_SIZE,
    tag: null,
    meta: {
      title: page > 1 ? t.navBlog + ' · ' + t.pageLabel + ' ' + page : t.navBlog,
      canonical: '/' + lang + '/blog' + query,
      alternates: [
        { lang: 'th', href: '/th/blog' + query },
        { lang: 'en', href: '/en/blog' + query }
      ],
      type: 'website'
    }
  });
});

router.get('/blog/:slug', async (req, res, next) => {
  const { lang } = res.locals;
  const tr = await get(
    "SELECT * FROM post_translations WHERE lang = ? AND slug = ? AND status = 'published'",
    [lang, req.params.slug]
  );
  if (!tr) return next();
  const post = await get('SELECT id, cover_image FROM posts WHERE id = ?', [tr.post_id]);
  const siblings = await all(
    "SELECT lang, slug FROM post_translations WHERE post_id = ? AND status = 'published' ORDER BY lang DESC",
    [tr.post_id]
  );
  const tagRows = await all(
    `SELECT tg.slug, tg.name_th, tg.name_en
     FROM post_tags pt JOIN tags tg ON tg.id = pt.tag_id
     WHERE pt.post_id = ? ORDER BY tg.slug`,
    [tr.post_id]
  );
  const tags = tagRows.map(tag => ({ slug: tag.slug, name: lang === 'th' ? tag.name_th : tag.name_en }));
  // hreflang only when both languages are published (spec 2.2)
  const alternates = siblings.length === 2
    ? siblings.map(s => ({ lang: s.lang, href: '/' + s.lang + '/blog/' + s.slug }))
    : [];
  res.render('post', {
    post,
    tr,
    tags,
    alternates,
    preview: false,
    meta: {
      title: tr.seo_title || tr.title,
      description: tr.seo_description || tr.excerpt,
      canonical: '/' + lang + '/blog/' + tr.slug,
      alternates,
      image: post.cover_image,
      type: 'article'
    }
  });
});

router.get('/projects', async (req, res) => {
  const { lang, t } = res.locals;
  const projects = await all(PROJECT_LIST_SQL, [0, lang, lang]);
  res.render('projects', {
    projects,
    meta: {
      title: t.navProjects,
      canonical: '/' + lang + '/projects',
      alternates: [
        { lang: 'th', href: '/th/projects' },
        { lang: 'en', href: '/en/projects' }
      ],
      type: 'website'
    }
  });
});

router.get('/projects/:slug', async (req, res, next) => {
  const { lang } = res.locals;
  const tr = await get(
    "SELECT * FROM project_translations WHERE lang = ? AND slug = ? AND status = 'published'",
    [lang, req.params.slug]
  );
  if (!tr) return next();
  const project = await get('SELECT id, thumbnail, repo_url, demo_url FROM projects WHERE id = ?', [tr.project_id]);
  const siblings = await all(
    "SELECT lang, slug FROM project_translations WHERE project_id = ? AND status = 'published' ORDER BY lang DESC",
    [tr.project_id]
  );
  const tagRows = await all(
    `SELECT tg.slug, tg.name_th, tg.name_en
     FROM project_tags pt JOIN tags tg ON tg.id = pt.tag_id
     WHERE pt.project_id = ? ORDER BY tg.slug`,
    [tr.project_id]
  );
  const tags = tagRows.map(tag => ({ slug: tag.slug, name: lang === 'th' ? tag.name_th : tag.name_en }));
  // hreflang only when both languages are published, the same rule as posts (spec 2.2)
  const alternates = siblings.length === 2
    ? siblings.map(s => ({ lang: s.lang, href: '/' + s.lang + '/projects/' + s.slug }))
    : [];
  res.render('project', {
    project,
    tr,
    tags,
    meta: {
      title: tr.title,
      description: tr.summary,
      canonical: '/' + lang + '/projects/' + tr.slug,
      alternates,
      image: project.thumbnail,
      type: 'website'
    }
  });
});

module.exports = router;
```

- [ ] **Step 6: เขียน views/partials/project-card.ejs**

สร้าง `views/partials/project-card.ejs` การ์ดนี้ใช้ในหน้าแรกกับหน้า `/projects` และ Task 17 ใช้กับผลค้นหาโปรเจกต์ได้

- File Structure ของ plan ไม่มีไฟล์นี้ แต่การ์ดโปรเจกต์ถูกใช้มากกว่าหนึ่งหน้า จึงแยกเป็น partial ด้วยเหตุผลเดียวกับ `post-card.ejs` ใน spec ข้อ 2.5 แทนการเขียน markup ชุดเดียวกันซ้ำในหลาย template
- กติกาของการ์ดอีกภาษาเหมือน `post-card.ejs` คือ `lang` ของการ์ดอยู่ที่ `<article>` ตาม spec ข้อ 2.2 และ badge อยู่ใน `.card-meta` ที่ได้ `lang` ของหน้าคืน screen reader จึงอ่านคำว่า Thai ด้วยเสียงอังกฤษ
- ระดับ heading มาจาก `level` หน้า `/projects` ส่ง 2 เพราะอยู่ใต้ `h1` หน้าแรกส่ง 3 เพราะอยู่ใต้ `h2` ของ section
- thumbnail มี `alt=""` และ `loading="lazy"` ตาม spec ข้อ 3.3 และอยู่หัวการ์ดทุกขนาดจอ เพราะกริดโปรเจกต์ไม่ใช่รายการคั่นเส้นแบบ blog
- ลิงก์ชี้ไป `/<ภาษาของการ์ด>/projects/<slug>` และทั้งการ์ดคลิกได้ด้วย `.card-title a::after` ของ Task 9
- ชื่อตัวแปร `foreign` กับ `heading` ตรงกับ `post-card.ejs` และไม่ซ้ำกับ locals ที่ template อื่นส่งมา เพราะ EJS รัน template ใน `with (locals)`

```ejs
<%
const foreign = card.lang !== lang;
const heading = 'h' + (locals.level || 2);
-%>
<article class="project-card"<% if (foreign) { %> lang="<%= card.lang %>"<% } %>>
<% if (card.thumbnail) { -%>
  <img class="project-thumb" src="<%= card.thumbnail %>" alt="" loading="lazy">
<% } -%>
  <<%= heading %> class="card-title"><a href="/<%= card.lang %>/projects/<%= card.slug %>"><%= card.title %></a></<%= heading %>>
<% if (foreign) { -%>
  <p class="card-meta" lang="<%= lang %>"><span class="badge"><%= t.badgeOtherLang %></span></p>
<% } -%>
<% if (card.summary) { -%>
  <p class="excerpt"><%= card.summary %></p>
<% } -%>
</article>
```

- [ ] **Step 7: เขียน views/projects.ejs**

สร้าง `views/projects.ejs` หน้านี้แสดงโปรเจกต์ทั้งหมดในกริดเดียวโดยไม่แบ่งหน้าตาม spec ข้อ 2.1 และแสดง `noProjects` เมื่อยังไม่มีโปรเจกต์ published

```ejs
<%- include('partials/head') %>
<%- include('partials/header') %>
<main id="main" class="projects">
  <h1><%= t.navProjects %></h1>
<% if (projects.length === 0) { -%>
  <p class="empty"><%= t.noProjects %></p>
<% } else { -%>
  <div class="project-grid">
<% for (const card of projects) { -%>
    <%- include('partials/project-card', { card, level: 2 }) %>
<% } -%>
  </div>
<% } -%>
</main>
<%- include('partials/footer') %>
```

- [ ] **Step 8: เขียน views/project.ejs**

สร้าง `views/project.ejs` เนื้อหาตามรายการของหน้าโปรเจกต์ใน spec ข้อ 3.3 คือภาพ thumbnail พร้อม alt, ชื่อ, summary, ลิงก์ repo และ demo ถ้ามี, ชิปแท็กแบบข้อความ และ body จาก markdown

- ลิงก์ repo และ demo แสดงเฉพาะตัวที่มีค่า ตาม spec ข้อ 2.4 ที่ว่าถ้า `demo_url` ว่างหน้าจริงจะไม่แสดงลิงก์ demo
- ชิปแท็กเป็น `<span class="tag">` ที่ไม่มีลิงก์ ตาม spec ข้อ 2.4 และภาคผนวก ก ข้อ 45 เพราะหน้าแท็กแสดงเฉพาะบทความ `.tag` ของ Task 9 ใส่ hover เฉพาะ `a.tag` ชิปนี้จึงไม่ดูเหมือนกดได้
- alt ของภาพมาจาก `tr.thumbnail_alt` ของภาษาที่แสดงอยู่ตาม spec ข้อ 2.1
- โครงใช้ class ของหน้าบทความ (`post-article`, `post-header`, `post-cover`, `post-back`) จึงได้ความกว้าง `--measure` และระยะห่างชุดเดียวกับหน้าบทความโดยไม่ต้องเขียน CSS ซ้ำ
- block `<% if (locals.preview) { -%>` อยู่ในไฟล์นี้ตั้งแต่ task นี้ เพราะ File Structure ของ plan ให้ `views/project.ejs` เป็นของ Task 12 อย่างเดียว route public ไม่ส่ง `preview` จึงไม่มีแถบและไม่โหลด `admin.css` ส่วน preview ของ Task 13 ส่ง `preview: true` การอ่านผ่าน `locals.preview` ตรงกับกติกาใน Interfaces ของ plan ที่ให้ template อ่านค่าที่อาจไม่มีผ่าน `locals`
- `<%-` มีแค่ `include(` กับ `md.render(` ที่อยู่บรรทัดเดียวกัน

```ejs
<%- include('partials/head') %>
<% if (locals.preview) { -%>
<link rel="stylesheet" href="/css/admin.css?v=<%= v %>">
<p class="preview-bar" lang="th">ตัวอย่าง ยังไม่ได้บันทึก</p>
<% } -%>
<%- include('partials/header') %>
<main id="main" class="project">
  <article class="post-article">
    <header class="post-header">
      <h1><%= tr.title %></h1>
<% if (tr.summary) { -%>
      <p class="project-summary"><%= tr.summary %></p>
<% } -%>
<% if (project.repo_url || project.demo_url) { -%>
      <p class="project-links">
<% if (project.repo_url) { -%>
        <a href="<%= project.repo_url %>"><%= t.projectRepo %></a>
<% } -%>
<% if (project.demo_url) { -%>
        <a href="<%= project.demo_url %>"><%= t.projectDemo %></a>
<% } -%>
      </p>
<% } -%>
<% if (tags.length) { -%>
      <ul class="tag-list" aria-label="<%= t.postTags %>">
<% for (const tag of tags) { -%>
        <li><span class="tag"><%= tag.name %></span></li>
<% } -%>
      </ul>
<% } -%>
    </header>
<% if (project.thumbnail) { -%>
    <img class="post-cover" src="<%= project.thumbnail %>" alt="<%= tr.thumbnail_alt %>">
<% } -%>
    <div class="prose">
      <%- md.render(tr.body_markdown) %>
    </div>
  </article>
  <p class="post-back"><a href="/<%= lang %>/projects"><%= t.backToProjects %></a></p>
</main>
<%- include('partials/footer') %>
```

- [ ] **Step 9: เพิ่มโปรเจกต์เด่นใน views/home.ejs**

แทนที่เนื้อหาทั้งหมดของ `views/home.ejs` ด้วยข้อความนี้ section `.intro` และ `.latest` ไม่เปลี่ยนจาก Task 9 ส่วนที่เพิ่มคือ section `.featured` ที่อยู่ระหว่างสองอันนั้น ตามลำดับของหน้าแรกใน spec ข้อ 2.1 คือ tagline, featured projects แล้วค่อยบทความล่าสุด

- section โปรเจกต์เด่นแสดงเมื่อมีโปรเจกต์ featured ที่ published อย่างน้อยหนึ่งตัว เว็บที่เพิ่งเริ่มจึงไม่มีหัวข้อว่าง
- การ์ดใช้ `level: 3` เพราะอยู่ใต้ `h2` ของ section และหัวของ section ใช้ `.section-head` ของ Task 9 ซ้ำ

```ejs
<%- include('partials/head') %>
<%- include('partials/header') %>
<main id="main" class="home">
  <section class="intro">
    <h1><%= settings.site_name || 'Portfolio' %></h1>
<% if (settings.tagline) { -%>
    <p class="tagline"><%= settings.tagline %></p>
<% } -%>
  </section>
<% if (featured.length) { -%>
  <section class="featured">
    <div class="section-head">
      <h2><%= t.featuredProjects %></h2>
      <a href="/<%= lang %>/projects"><%= t.allProjects %></a>
    </div>
    <div class="project-grid">
<% for (const card of featured) { -%>
      <%- include('partials/project-card', { card, level: 3 }) %>
<% } -%>
    </div>
  </section>
<% } -%>
<% if (posts.length) { -%>
  <section class="latest">
    <div class="section-head">
      <h2><%= t.latestPosts %></h2>
      <a href="/<%= lang %>/blog"><%= t.allPosts %></a>
    </div>
    <div class="post-list">
<% for (const card of posts) { -%>
      <%- include('partials/post-card', { card, level: 3 }) %>
<% } -%>
    </div>
  </section>
<% } -%>
</main>
<%- include('partials/footer') %>
```

- [ ] **Step 10: ต่อ CSS ของโปรเจกต์ท้าย public/css/site.css**

แทนที่สามบรรทัดสุดท้ายของ `public/css/site.css` ซึ่งตอนนี้คือ

```css
@media (min-width: 40rem) {
  .card-thumb { display: block; flex: none; width: 8rem; aspect-ratio: 4 / 3; object-fit: cover; border-radius: var(--r-md); }
}
```

ด้วยข้อความนี้ ส่วนต้นของไฟล์ไม่เปลี่ยน

- กริดใช้ `repeat(auto-fill, minmax(17rem, 1fr))` ตาม spec ข้อ 3.3 จึงไม่ต้องมี breakpoint ของตัวเอง จอ 400px ได้หนึ่งคอลัมน์ และจอ 1024px ได้สามคอลัมน์
- `.project-card` ประกาศ `font-size: var(--fs-base)` และ `line-height: var(--lh-body)` ซ้ำ เพราะการ์ดอาจมี `lang="th"` บนหน้า `/en` และ spec ข้อ 3.3 ให้ประกาศซ้ำบน element ที่มี `lang` ของตัวเอง token จึงถูกคำนวณใหม่ที่การ์ด
- `.card-title a::after` ของ Task 9 ใช้ `position: absolute; inset: 0` การ์ดโปรเจกต์จึงต้องเป็น `position: relative` ทั้งการ์ดถึงคลิกได้โดยมีลิงก์เดียวใน accessibility tree
- `.project-card > *` ตัด margin ของลูกทุกตัวแล้วใช้ `gap` ของ flex แทน `.excerpt` จึงยังตัดเหลือ 3 บรรทัดด้วย `-webkit-line-clamp` และ `line-height: var(--lh-body)` ของ Task 9 แต่ไม่มีระยะซ้อนสองชั้น
- `.featured .section-head` เอา `max-width` ออก เพราะกริดบนหน้าแรกกว้างเต็ม `--page` ลิงก์ ดูโปรเจกต์ทั้งหมด จึงชิดขอบขวาของกริด
- thumbnail ใช้ `aspect-ratio: 16 / 9` กับ `object-fit: cover` รูปทุกขนาดจึงสูงเท่ากันในแถวเดียวกัน
- ไม่มี token ใหม่, ไม่มี breakpoint ใหม่ และไม่มี `letter-spacing` หรือ `text-transform` ตามกติกาของ Task 6

```css
@media (min-width: 40rem) {
  .card-thumb { display: block; flex: none; width: 8rem; aspect-ratio: 4 / 3; object-fit: cover; border-radius: var(--r-md); }
}

/* Projects (Task 12): the grid on the home page and /projects, and the project page */
.projects > h1 { margin: 0 0 var(--sp-6); }
.featured .section-head { max-width: none; }
.project-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(17rem, 1fr)); gap: var(--sp-6); }
/* a card can carry lang="th" on an /en page, so it declares font-size and line-height again for :lang(th) */
.project-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  padding: var(--sp-4);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  font-size: var(--fs-base);
  line-height: var(--lh-body);
}
.project-card > * { margin: 0; }
.project-card:hover { border-color: var(--border-strong); }
.project-card:hover .card-title a { text-decoration: underline; }
.project-thumb { display: block; width: 100%; aspect-ratio: 16 / 9; object-fit: cover; border-radius: var(--r-sm); }
.project-summary { margin: var(--sp-3) 0 0; color: var(--text-muted); font-size: var(--fs-h3); }
.project-links { display: flex; flex-wrap: wrap; gap: var(--sp-2) var(--sp-6); margin: var(--sp-4) 0 0; font-weight: 600; }
```

- [ ] **Step 11: รัน test ให้เห็นว่าผ่าน**

Run: `node --test test/12-project-order.test.js`
Expected: PASS exit code 0

```
✔ 12 project order (240.5551ms)
ℹ tests 1
ℹ suites 0
ℹ pass 1
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 609.2473
```

- [ ] **Step 12: ตรวจ token และ breakpoint ของ site.css**

คำสั่งแรกคือคำสั่งตรวจ token ของ Task 6 Step 7 ตัวเดิมทุกตัวอักษร คำสั่งที่สองพิมพ์ media query ทุกตัวในไฟล์ ซึ่งยังเป็นสามตัวเดิมของ Task 6 และ 9 เพราะกริดโปรเจกต์ไม่มี breakpoint ของตัวเอง

Run:

```bash
node -e 'const css=require("fs").readFileSync("public/css/site.css","utf8");const root=css.match(/^:root [{]([^}]*)[}]/)[1];const defined=new Set(root.match(/--[a-z0-9-]+(?=:)/g));const used=[...new Set(css.match(/var[(]--[a-z0-9-]+/g).map(s=>s.slice(4)))];const assigned=[...new Set(css.match(/--[a-z0-9-]+(?=:)/g))];console.log("file starts with :root { "+css.startsWith(":root {"));console.log(":root { blocks: "+css.match(/:root [{]/g).length);console.log("defined in :root: "+defined.size+", used with var(): "+used.length);console.log("used but not defined: "+(used.filter(n=>!defined.has(n)).join(" ")||"none"));console.log("assigned but not defined: "+(assigned.filter(n=>!defined.has(n)).join(" ")||"none"));console.log("var() with fallback: "+((css.match(/var[(][^)]*,/g)||[]).join(" ")||"none"))' && grep -o '@media [(][^)]*[)]' public/css/site.css
```

Expected:

```
file starts with :root { true
:root { blocks: 1
defined in :root: 35, used with var(): 35
used but not defined: none
assigned but not defined: none
var() with fallback: none
@media (min-width: 40rem)
@media (min-width: 64rem)
@media (min-width: 40rem)
```

- [ ] **Step 13: ตรวจ <%- ใน views ด้วยขั้นตรวจเดียวกับ CI**

บรรทัดแรกแสดง `<%-` ทุกตัวใน template ของ task นี้ ซึ่งเป็น `include(` ทั้งหมดยกเว้น `md.render(` หนึ่งตัวใน `project.ejs` ส่วน `bash -e -c` รัน script ตัวเดียวกับขั้นสุดท้ายของ `.github/workflows/ci.yml` ใน Task 7

Run: `grep -rn "<%-" views/projects.ejs views/project.ejs views/home.ejs views/partials/project-card.ejs; bash -e -c 'if grep -rn "<%-" views/ | grep -v -e "md.render(" -e "include("; then echo "found <%- outside md.render or include"; exit 1; fi'; echo "guard exit=$?"`
Expected:

```
views/projects.ejs:1:<%- include('partials/head') %>
views/projects.ejs:2:<%- include('partials/header') %>
views/projects.ejs:10:    <%- include('partials/project-card', { card, level: 2 }) %>
views/projects.ejs:15:<%- include('partials/footer') %>
views/project.ejs:1:<%- include('partials/head') %>
views/project.ejs:6:<%- include('partials/header') %>
views/project.ejs:36:      <%- md.render(tr.body_markdown) %>
views/project.ejs:41:<%- include('partials/footer') %>
views/home.ejs:1:<%- include('partials/head') %>
views/home.ejs:2:<%- include('partials/header') %>
views/home.ejs:18:      <%- include('partials/project-card', { card, level: 3 }) %>
views/home.ejs:31:      <%- include('partials/post-card', { card, level: 3 }) %>
views/home.ejs:37:<%- include('partials/footer') %>
guard exit=0
```

- [ ] **Step 14: รัน npm test ทั้งชุด**

Run: `npm test`
Expected: PASS exit code 0 และมี 11 tests

```
> talkalways@1.0.0 test
> node --test test/*.test.js

✔ 01 markdown (39.7666ms)
✔ 02 routing (280.3645ms)
✔ 03 publish per language (372.5746ms)
✔ 04 published at (472.5739ms)
✔ 05 blog hidden (475.0952ms)
✔ 06 delete cascade (510.4543ms)
✔ 07 admin guard (282.5519ms)
✔ 08 login cookie (402.669ms)
✔ 09 editor validation (424.7819ms)
✔ 10 preview (435.3573ms)
✔ 12 project order (456.2358ms)
ℹ tests 11
ℹ suites 0
ℹ pass 11
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1266.1511
```

- [ ] **Step 15: สร้างโปรเจกต์ทดลองใน data/project-check**

คำสั่งนี้สร้าง DB ทดลองแยกไว้ที่ `data/project-check` สำหรับการตรวจใน browser ที่ Step 16 `data/site.db` จึงไม่ถูกแตะ โฟลเดอร์นี้อยู่ใต้ `data/` ที่ `.gitignore` กันไว้แล้ว และ Step 17 จะลบทิ้ง

- โปรเจกต์ `portfolio` เป็น featured ลำดับ 1 มีทั้งฉบับไทยและอังกฤษที่ published มีภาพ, ลิงก์ repo กับ demo, แท็กสองตัว, summary ไทยยาวที่ขึ้นต้นด้วย ปั๊ก ที่ ญี่ปุ่น และ body ที่มี `<em>` ภาษาไทยกับ code block บรรทัดยาว
- โปรเจกต์ `talkalways` เป็น featured ลำดับ 2 มีแค่ฉบับไทยและไม่มีภาพ
- โปรเจกต์ `sqlite-backup` ไม่ featured มีแค่ฉบับอังกฤษ จึงเป็นการ์ดพร้อม badge บนหน้า `/th/projects`
- โปรเจกต์ `thai-slug-lab` ไม่ featured มีฉบับไทย published กับฉบับอังกฤษ draft
- โปรเจกต์ `secret-project` เป็น featured แต่มีแค่ฉบับไทยแบบ draft จึงต้องไม่ขึ้นที่ไหนเลย
- บทความ published หนึ่งตัวทำให้หน้าแรกมี section บทความล่าสุดต่อจากโปรเจกต์เด่น
- ภาพใช้ `/favicon.svg` เพราะ route `/uploads` ยังไม่มีจนถึง Task 15
- ถ้าต้องรันซ้ำ ให้ทำ Step 17 ก่อน ไม่อย่างนั้นแท็กจะชน `UNIQUE`

Run:

````bash
DATA_DIR=data/project-check node - <<'EOF'
const { ready, run, close } = require('./src/db');

async function addProject({ thumbnail = null, repo = null, demo = null, featured = 0, sort = 0, tags = [] }, rows) {
  const now = new Date().toISOString();
  const { lastID } = await run(
    'INSERT INTO projects (thumbnail, repo_url, demo_url, featured, sort_order) VALUES (?, ?, ?, ?, ?)',
    [thumbnail, repo, demo, featured, sort]
  );
  for (const [lang, status, slug, title, summary, body] of rows) {
    await run(
      `INSERT INTO project_translations
         (project_id, lang, status, slug, title, summary, body_markdown, thumbnail_alt, published_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [lastID, lang, status, slug, title, summary, body, lang === 'th' ? 'ไอคอนสี่เหลี่ยมสีน้ำเงิน' : 'Blue square icon', status === 'published' ? now : null, now]
    );
  }
  for (const tagId of tags) await run('INSERT INTO project_tags (project_id, tag_id) VALUES (?, ?)', [lastID, tagId]);
}

const body = [
  'แอปนี้เก็บข้อมูลใน SQLite ไฟล์เดียว และ *ไม่มี* build step',
  '',
  '```js',
  '// คอมเมนต์ภาษาไทยต้องไม่เอียง',
  "const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25];",
  '```'
].join('\n');

ready.then(async () => {
  const { lastID: nodeTag } = await run("INSERT INTO tags (slug, name_th, name_en) VALUES ('nodejs', 'โหนดเจเอส', 'Node.js')");
  const { lastID: sqliteTag } = await run("INSERT INTO tags (slug, name_th, name_en) VALUES ('sqlite', 'เอสคิวไลต์', 'SQLite')");
  await addProject({ thumbnail: '/favicon.svg', repo: 'https://github.com/example/portfolio', demo: 'https://example.com', featured: 1, sort: 1, tags: [nodeTag, sqliteTag] }, [
    ['th', 'published', 'portfolio', 'เว็บพอร์ตโฟลิโอสองภาษา',
      'ปั๊ก ที่ ญี่ปุ่น อยู่ต้นบรรทัดแรกเพื่อดูว่าวรรณยุกต์ไม่โดนตัด เว็บนี้ render ทุกหน้าจากฝั่ง server ด้วย Express และ EJS และสรุปนี้ยาวพอที่จะถูกตัดเหลือสามบรรทัดบนการ์ด ส่วนที่เกินต้องหายไปพร้อมจุดไข่ปลา',
      body],
    ['en', 'published', 'portfolio', 'Bilingual portfolio site', 'Server-rendered Express and EJS site with a small admin.', 'The app keeps its data in one SQLite file.']
  ]);
  await addProject({ repo: 'https://github.com/example/talkalways', featured: 1, sort: 2 }, [
    ['th', 'published', 'talkalways', 'TalkAlways แชตรุ่นแรก', 'แอปแชตรุ่นแรกที่ย้ายไปเก็บใน archive แล้ว', 'เนื้อหาของโปรเจกต์แชต']
  ]);
  await addProject({ thumbnail: '/favicon.svg', sort: 0 }, [
    ['en', 'published', 'sqlite-backup', 'SQLite backup script', 'Nightly VACUUM INTO and an off-site copy.', 'English only body.']
  ]);
  await addProject({ sort: 1 }, [
    ['th', 'published', 'thai-slug-lab', 'ทดลอง slug ภาษาไทย', 'บันทึกการทดลองว่าทำไม slug ต้องเป็น ASCII', 'เนื้อหาการทดลอง'],
    ['en', 'draft', 'thai-slug-lab', 'Thai slug lab draft', 'Draft summary', 'Draft body']
  ]);
  await addProject({ featured: 1, sort: 0 }, [
    ['th', 'draft', 'secret-project', 'โปรเจกต์ที่ยังเป็นแบบร่าง', 'ต้องไม่ขึ้นบนหน้าเว็บ', 'ร่าง']
  ]);
  const now = new Date().toISOString();
  const { lastID: postId } = await run('INSERT INTO posts (cover_image) VALUES (NULL)');
  await run(
    `INSERT INTO post_translations (post_id, lang, status, slug, title, excerpt, published_at, updated_at)
     VALUES (?, 'th', 'published', 'hello', 'บทความแรก', 'บทความทดลองสำหรับดูหน้าแรก', ?, ?)`,
    [postId, now, now]
  );
  await close();
  console.log('seeded 5 projects and 1 post into data/project-check');
});
EOF
````

Expected: `seeded 5 projects and 1 post into data/project-check`

- [ ] **Step 16: ตรวจหน้าโปรเจกต์ใน browser**

**Owner:** ทำทุกข้อข้างล่างใน Chrome หรือ Edge บนเครื่องนี้ แล้วบอก executor ว่าผ่านครบหรือข้อไหนไม่ผ่าน executor ต้องหยุดรอคำตอบและห้าม commit ถ้ามีข้อที่ไม่ผ่าน

1. ใน Git Bash ที่ root ของโปรเจกต์ รัน `DATA_DIR=data/project-check PORT=3001 SITE_URL=http://localhost:3001 npm start` ต้องเห็น `Listening on http://localhost:3001`
2. เปิด `http://localhost:3001/th` ที่ความกว้างปกติของหน้าต่าง ใต้ชื่อเว็บต้องมีหัวข้อ โปรเจกต์เด่น พร้อมลิงก์ ดูโปรเจกต์ทั้งหมด ทางขวา ตามด้วยการ์ดสองใบเรียงจากซ้ายคือ เว็บพอร์ตโฟลิโอสองภาษา ที่มีรูปสี่เหลี่ยมสีน้ำเงิน และ TalkAlways แชตรุ่นแรก จากนั้นจึงเป็นหัวข้อ บทความล่าสุด และทั้งหน้าไม่มีคำว่า โปรเจกต์ที่ยังเป็นแบบร่าง
3. คลิก ดูโปรเจกต์ทั้งหมด หน้า `/th/projects` ต้องมีหัวข้อ โปรเจกต์ และการ์ด 4 ใบในกริดสามคอลัมน์ เรียงเป็น เว็บพอร์ตโฟลิโอสองภาษา, TalkAlways แชตรุ่นแรก, SQLite backup script ที่มีกรอบคำว่า ภาษาอังกฤษ และ ทดลอง slug ภาษาไทย ซึ่งขึ้นแถวที่สอง summary ของการ์ดแรกเหลือ 3 บรรทัดพร้อมจุดไข่ปลา
4. คลิกที่ข้อความ summary ของการ์ดแรกโดยไม่คลิกที่ชื่อ ต้องไปที่ `/th/projects/portfolio`
5. หน้าโปรเจกต์ต้องมีชื่อ, summary ตัวใหญ่สีเทา, ลิงก์ ซอร์สโค้ด กับ ดูเดโม, ชิป โหนดเจเอส และ เอสคิวไลต์ ที่เอาเมาส์ชี้แล้วไม่เปลี่ยนเป็นรูปมือ, ภาพ, คำว่า ไม่มี เป็นตัวหนาไม่เอียง และ code block ที่ `const` เป็นสีม่วง เอาเมาส์ชี้ลิงก์ English ใน header แถบสถานะของ browser ต้องแสดง `localhost:3001/en/projects/portfolio` เพราะฉบับอังกฤษ published แล้ว
6. เปิด `http://localhost:3001/th/projects/thai-slug-lab` เอาเมาส์ชี้ลิงก์ English แถบสถานะต้องแสดง `localhost:3001/en/projects` เพราะฉบับอังกฤษยังเป็น draft และ `http://localhost:3001/en/projects/thai-slug-lab` ต้องได้หน้า Page not found
7. เปิด `http://localhost:3001/en/projects` การ์ด TalkAlways แชตรุ่นแรก และ ทดลอง slug ภาษาไทย ต้องมีกรอบคำว่า Thai และทั้งหน้าไม่มีคำว่า Thai slug lab draft
8. กด F12 แล้วกด Ctrl+Shift+M ตั้งความกว้าง 400 ความสูง 900 แล้วเปิด `/th`, `/th/projects`, `/en/projects` และ `/th/projects/portfolio` ทีละหน้า ทั้งธีมสว่างและมืดโดยสลับด้วยปุ่มธีม ทุกหน้าต้องไม่มี scrollbar แนวนอน การ์ดโปรเจกต์เรียงคอลัมน์เดียวกว้างเต็มจอ พื้นการ์ดในธีมมืดเข้มกว่าเส้นขอบและอ่านตัวอักษรออก วรรณยุกต์ของคำว่า ปั๊ก กับ ญี่ปุ่น ในบรรทัดแรกของ summary ต้องไม่ถูกตัด และบนหน้าโปรเจกต์ code block ต้องชนขอบจอซ้ายขวาและเลื่อนแนวนอนได้ในกรอบของตัวเอง แล้วปิด device toolbar
9. กลับไปที่ Git Bash แล้วกด Ctrl+C เพื่อหยุด server

ตอนเขียนแผนตรวจข้อ 2 ถึง 8 ด้วย Edge แบบ headless ผ่าน DevTools Protocol กับ DB ที่สร้างด้วยคำสั่งของ Step 15 ที่ความกว้าง 400 และ 1024px ทั้งธีมสว่างและมืด ความกว้าง 400 จำลองเป็นมือถือ (`mobile: true` ของ `Emulation.setDeviceMetricsOverride`) ซึ่ง scrollbar ไม่กินความกว้างของหน้า ส่วน 1024px เป็นโหมด desktop ที่ scrollbar แนวตั้งกว้าง 15px ถ้าเปิดหน้าต่าง desktop กว้าง 400px ตรงๆ ค่าที่ขึ้นกับความกว้างของหน้าที่เลื่อนแนวตั้งได้จะน้อยลง 15px เช่นกริดเป็น `353px` และ code block อยู่ตั้งแต่ 0 ถึง 385px ส่วนที่ต้องใช้ตาคนคือความสวยงามของหน้าและการคลิกจริง ค่าที่วัดได้มีดังนี้

- ทุกหน้า `scrollWidth` เท่ากับ `clientWidth` จึงไม่มีการเลื่อนแนวนอน
- กริดเป็น `368px` คอลัมน์เดียวที่ 400px และ `304px 304px 304px` ที่ 1024px บนหน้า `/th/projects` ส่วนหน้าแรกได้ `299px 299px 299px` เพราะมี scrollbar แนวตั้ง
- ลำดับ section ของหน้าแรกคือ `intro`, `featured`, `latest`
- summary ไทยของการ์ดแรกมี `line-height` 34.2px สูง 103px ซึ่งคือ 3 บรรทัด และ `scrollHeight` 171px ที่ 400px จึงถูกตัดจริง
- `document.elementFromPoint` ที่กลาง summary ของการ์ดแรกคืนลิงก์ `/th/projects/portfolio`
- การ์ดไทยบนหน้า `/en/projects` มี `font-size` 18px และ `line-height` 34.2px และ badge อยู่ใน element ที่มี `lang="en"` ส่วนการ์ดอังกฤษบนหน้า `/th/projects` ได้ 18px และ 34.2px เท่ากับข้อความไทยรอบข้าง เพราะ spec ข้อ 3.3 มีแค่กติกา `:lang(th)` การ์ดบทความของ Task 9 ก็เป็นแบบเดียวกัน
- พื้นการ์ดคือ `rgb(255, 255, 255)` ในธีมสว่างและ `rgb(26, 28, 31)` ในธีมมืด ซึ่งคือค่า `--surface` ใน spec ข้อ 3.2
- หน้า `/th/projects/portfolio` ที่ 400px มี code block ตั้งแต่ 0 ถึง 400px ที่เลื่อนในกรอบได้, `<em>` ภาษาไทยได้ `font-style: normal` น้ำหนัก 600, ลิงก์ ซอร์สโค้ด กับ ดูเดโม ชี้ไป URL ใน DB และชิปแท็กทั้งสองเป็น `SPAN`

- [ ] **Step 17: ลบโปรเจกต์ทดลอง**

Run: `rm -rf data/project-check; test -e data/project-check && echo LEFT || echo REMOVED`
Expected: `REMOVED`

ถ้าได้ `LEFT` แปลว่า server จาก Step 16 ยังไม่หยุด ให้กด Ctrl+C ในหน้าต่างนั้นแล้วรันคำสั่งนี้อีกครั้ง

- [ ] **Step 18: ตรวจว่ามีแค่ไฟล์ของ task นี้ที่เปลี่ยน**

Run: `git status --short`
Expected:

```
 M public/css/site.css
 M src/routes/public.js
 M src/strings.js
 M test/helpers.js
 M views/home.ejs
?? test/12-project-order.test.js
?? views/partials/project-card.ejs
?? views/project.ejs
?? views/projects.ejs
```

ถ้ามีบรรทัดอื่นนอกจากนี้ เช่น `.env`, `data/` หรือ `.claude/` ห้าม add ไฟล์นั้นและให้หยุดถามเจ้าของ

- [ ] **Step 19: Commit**

```bash
git add src/strings.js src/routes/public.js views/partials/project-card.ejs views/projects.ejs views/project.ejs views/home.ejs public/css/site.css
git add test/helpers.js test/12-project-order.test.js
git commit -m "feat: add public project pages and featured projects on the home page"
```

Expected:

```
[main 1a776f6] feat: add public project pages and featured projects on the home page
 9 files changed, 355 insertions(+), 3 deletions(-)
 create mode 100644 test/12-project-order.test.js
 create mode 100644 views/partials/project-card.ejs
 create mode 100644 views/project.ejs
 create mode 100644 views/projects.ejs
```

Run: `git status --short | wc -l`
Expected: `0`

### Task 13: editor โปรเจกต์ใน admin

**Phase:** 4 · **Gate tests:** ไม่มี (ตรวจด้วยมือ)

**Files:**
- Create: `src/routes/admin-projects.js`
- Create: `views/admin/projects.ejs`
- Create: `views/admin/project-edit.ejs`
- Modify: `src/routes/admin.js` (เพิ่ม `router.use('/projects', require('./admin-projects'))` ต่อจากบรรทัดของ `/posts`)
- Test: ไม่มีไฟล์ test ใหม่ ตรวจ route ด้วยคำสั่งที่ยิง request จริงใน Step 5 และ 6 และตรวจใน browser ที่ Step 10

**Interfaces:**
- Consumes:
  - `src/db.js` จาก Task 5: `run(sql, params)`, `get(sql, params)`, `all(sql, params)`, `transaction(fn)` ที่ต่อคิวให้ทำงานทีละตัวและ `ROLLBACK` เมื่อ `fn` throw และตาราง `projects`, `project_translations`, `tags`, `project_tags` ที่ตารางลูกมี `ON DELETE CASCADE`
  - `src/slug.js` จาก Task 10: `resolveSlugs(input)` ที่รับ `{ th: { status, slug, title }, en: { status, slug, title } }` ใช้กับค่าของฟอร์มโปรเจกต์ได้ตรงๆ
  - `src/routes/admin.js` จาก Task 8 และ 10: `express.urlencoded({ extended: true, limit: '1mb' })`, `router.use(requireAdmin)` และบรรทัด `router.use('/posts', require('./admin-posts'))` ที่อยู่ก่อน `module.exports`
  - ข้อตกลงของ editor จาก Task 10 และรูปแบบ preview จาก Task 11 ใน `src/routes/admin-posts.js`: validation ที่ไม่ใช้ DB ทำก่อนเปิด transaction, เช็ก slug ซ้ำใน transaction เดียวกับการเขียน, ภาษาที่เป็น `none` ถูก DELETE, แท็กถูก insert ผ่าน `json_each`, validation ที่ไม่ผ่านได้ 400 พร้อมฟอร์มเดิม, `:id` ที่ใช้ไม่ได้ได้ 404 และ preview ที่ตั้ง `lang`, `other`, `t`, `settings` ก่อน render
  - `views/admin/head.ejs` กับ `views/admin/foot.ejs` จาก Task 8 ที่เรียกด้วย `<%- include('head', { title, section: 'projects' }) %>` ซึ่งเมนู โปรเจกต์ ชี้ไป `/admin/projects` อยู่แล้ว และ `app.locals.formatDate(lang, iso)`
  - `public/css/admin.css` จาก Task 8 และ 10: class `page-head`, `button-link`, `admin-empty`, `table-scroll`, `admin-table`, `admin-date`, `chip`, `chip-published`, `chip-draft`, `chip-none`, `admin-form`, `editor`, `editor-body`, `form-saved`, `form-error`, `field-hint`, `field-error`, `tag-options`, `translation`, `translation-fields`, `field-pair`, `editor-delete` และ `preview-bar`
  - `views/project.ejs` จาก Task 12: render ด้วย `{ project, tr, tags, meta }` และแสดงแถบ preview เมื่อ `locals.preview` เป็นจริง
  - `src/strings.js` จาก Task 12 และ `test/helpers.js` จาก Task 12: `start()`, `H.req`, `H.login`, `insertProject`, `signCookie`, `run`, `get`, `all`
- Produces:
  - `src/routes/admin-projects.js`: `module.exports = router` ที่ mount ไว้ที่ `/admin/projects` หลัง `requireAdmin` ลำดับ route คือ `GET /`, `GET /new`, `POST /`, `POST /preview/:lang`, `GET /:id`, `POST /:id`, `POST /:id/delete` ครบตาม admin route table ของ spec ข้อ 2.4 ชื่อภายในไฟล์มีดังนี้
    - `readForm(body) -> values` โดย `values = { thumbnail, repo_url, demo_url, featured, sort_order, tags, th, en }`, `featured` เป็น boolean, `sort_order` เป็นข้อความตามที่พิมพ์, `tags` เป็น array ของ id ที่เป็นจำนวนเต็มบวกและไม่ซ้ำ และแต่ละภาษาคือ `{ status, title, slug, summary, body_markdown, thumbnail_alt }`
    - `validate(values, slugs)` ตรวจกติกาชุดเดียวกับบทความ บวก `repo_url` กับ `demo_url` ที่ต้องว่างหรือขึ้นต้นด้วย `http://` หรือ `https://` และ `sort_order` ที่ต้องเป็นจำนวนเต็ม (ช่องว่างนับเป็น 0) key ของ error คือ `'form'`, `'repo_url'`, `'demo_url'`, `'sort_order'` หรือ `'<lang>.<field>'`
    - `POST /admin/projects/preview/:lang` ตอบ 200 และ render `project` ด้วย `{ project: { thumbnail, repo_url, demo_url }, tr, tags, preview: true, meta: { title, description, noindex: true, type: 'website' } }` ลิงก์ที่ไม่ผ่านการตรวจถูกส่งเป็น `''` ค่า `:lang` อื่นได้ 404 route นี้ไม่เขียน DB และไม่ตั้ง `res.locals.publicPage` ดังนั้นแถบ consent และ Google Analytics ของ Task 19 จะไม่ขึ้นบนหน้า preview ของโปรเจกต์ด้วย
  - `views/admin/projects.ejs`: `render('admin/projects', { projects })` แต่ละแถวคือ `{ id, featured, sort_order, updated_at, title, th, en }` เรียงแบบเดียวกับหน้า `/projects` มีคอลัมน์ หัวข้อ, ไทย, EN, หน้าแรก, ลำดับ, แก้ไขล่าสุด
  - `views/admin/project-edit.ejs`: `render('admin/project-edit', { id, values, errors, tags, stored, saved })` รูปแบบเดียวกับ `views/admin/post-edit.ejs` Task 15 เพิ่มปุ่มอัปโหลดข้างช่อง ภาพ thumbnail และ `<script src="/js/admin.js?v=<%= v %>" defer></script>` ในไฟล์นี้ ช่องที่ `admin.js` ต้องใส่ url คือ `input[name="thumbnail"]` และ textarea เนื้อหาของแต่ละภาษาคือ `textarea.editor-body`
  - `src/routes/admin.js`: ท้ายไฟล์เรียงเป็น `router.use('/posts', require('./admin-posts'))`, `router.use('/projects', require('./admin-projects'))` แล้วจึง `module.exports` route ของ `/tags`, `/upload` และ `/settings` ใน Task 14, 15, 16 เพิ่มต่อจากบรรทัดของ `/projects` และก่อน `module.exports`
  - task นี้ไม่มี CSS ใหม่ `public/css/admin.css` จึงยังเป็นฉบับของ Task 10 และจบ task นี้ Phase 4 ครบ `npm test` ยังผ่าน 11 tests

- ข้อความ UI ของหน้า admin เป็นภาษาไทยอย่างเดียวตาม Global Constraints task นี้จึงไม่เพิ่ม key ใน `src/strings.js`
- Task Index ของ plan ให้ task นี้ตรวจด้วยมือ และ launch gate ต้องมี 17 ไฟล์ test พอดี การตรวจ route จึงเป็นคำสั่งใช้ครั้งเดียวที่เปิด app ผ่าน `start()` ของ `test/helpers.js` ซึ่งใช้ `DATA_DIR` ชั่วคราวและลบทิ้งตอนจบ ไม่ใช่ไฟล์ test ใหม่
- คำสั่ง git ของ Step 12 และ 13 ซ้อมใน repo ทิ้งตัวเดียวกับ Task 12 ที่มี commit ของ Task 12 แล้ว เลข commit hash จึงไม่ตรงกัน

- [ ] **Step 1: เขียน src/routes/admin-projects.js**

สร้าง `src/routes/admin-projects.js`

- ไฟล์นี้ทำตามข้อตกลงของ editor บทความใน Task 10 และรูปแบบ preview ของ Task 11 โดยเขียนแยกไฟล์และยอมให้โค้ดซ้ำกันบางส่วน ตาม spec ข้อ 2.5 ที่ไม่ทำ generic helper สำหรับ entity ที่มีหลายภาษา
- field ของแต่ละภาษาคือ status, title, slug, summary, `thumbnail_alt` และ `body_markdown` ส่วนที่ใช้ร่วมกันคือ thumbnail, `repo_url`, `demo_url`, `featured`, `sort_order` และแท็ก ตาม Project editor ใน spec ข้อ 2.4 และไม่มี SEO fields เพราะใน schema ไม่มี
- `readForm` แปลงทั้ง `req.body` และแถวจาก DB ให้เป็น `values` รูปเดียวกัน checkbox ส่ง `'1'` เฉพาะตอนติ๊ก และแถวจาก DB มี integer `1` จึงเทียบด้วย `String(body.featured) === '1'` ส่วน `sort_order` เก็บเป็นข้อความตามที่พิมพ์ ค่าที่ไม่ผ่าน validation จึงแสดงกลับในฟอร์มตามเดิม
- `sortOrder` นับช่องว่างเป็น 0 และรับเฉพาะจำนวนเต็มที่ไม่เกิน `Number.MAX_SAFE_INTEGER` เพราะ spec ข้อ 2.4 ให้เปลี่ยนลำดับด้วยการแก้ตัวเลขโดยไม่มี reorder route
- validation ที่เพิ่มจากบทความคือ `repo_url` กับ `demo_url` ต้องว่างหรือขึ้นต้นด้วย `http://` หรือ `https://` spec ไม่ได้เขียนข้อนี้ไว้ แต่สองค่านี้ไปอยู่ใน `href` ของหน้า public ซึ่ง `<%= %>` escape แค่เครื่องหมายของ HTML ลิงก์ `javascript:` จึงยังทำงานกับผู้อ่านที่กดได้ ช่องในฟอร์มเป็น `type="url"` ก็จริง แต่ browser ถือว่า `javascript:alert(1)` เป็น URL ที่ถูกต้อง การตรวจฝั่ง server จึงจำเป็น Step 5 พิสูจน์เรื่องนี้
- การเช็ก slug ซ้ำใช้ตาราง `project_translations` ใน transaction เดียวกับการเขียน `UNIQUE (lang, slug)` ของโปรเจกต์แยกจากของบทความ บทความกับโปรเจกต์จึงใช้ slug เดียวกันได้
- `UPSERT_SQL` คือ upsert ของ spec ข้อ 2.4 ที่เปลี่ยนเป็นคอลัมน์ของ `project_translations` `published_at` ของโปรเจกต์จึงถูกตั้งครั้งแรกที่ publish และไม่ถูก reset แบบเดียวกับบทความ
- `GET /` เรียงด้วย `featured DESC, sort_order, id` แบบเดียวกับหน้า `/projects` รายการใน admin จึงเรียงตามที่ผู้อ่านจะเห็น ต่างจากรายการบทความที่เรียงตามวันแก้ไขล่าสุด เพราะตัวเลขในคอลัมน์ ลำดับ ต้องอ่านเทียบกับตำแหน่งจริงได้
- `GET /new` ประกาศก่อน `GET /:id` และโปรเจกต์ใหม่เริ่มที่ `th=draft`, `en=none`, ไม่ปักหมุด และ `sort_order` 0
- `POST /preview/:lang` ประกาศต่อจาก `POST /` จึงมาก่อนทุก route ที่มี `:id` ทำงานแบบ preview ของบทความ คือตั้ง `lang`, `other`, `t`, โหลด settings, แปลงแท็กเป็น `{ slug, name }` แล้ว render `views/project.ejs` ด้วย `preview: true` ลิงก์ repo หรือ demo ที่ไม่ผ่านการตรวจถูกตัดออก เพราะแท็บ preview เปิดอยู่ใต้ origin เดียวกับหน้า admin
- การลบใช้ `DELETE FROM projects` คำสั่งเดียว translation และ `project_tags` หายไปเองด้วย `ON DELETE CASCADE`
- Express 5 ส่ง error จาก async handler ต่อให้ error handler เอง จึงไม่มี try/catch

```js
const express = require('express');
const { run, get, all, transaction } = require('../db');
const { resolveSlugs } = require('../slug');
const strings = require('../strings');

const router = express.Router();

const LANGS = ['th', 'en'];
const STATUSES = ['none', 'draft', 'published'];
const FIELDS = ['title', 'slug', 'summary', 'body_markdown', 'thumbnail_alt'];
// repo_url and demo_url become href on the public page, where <%= %> escapes HTML but lets a javascript: link through
const URL_PATTERN = /^https?:\/\/\S+$/i;

// The upsert of spec 2.4 with the columns of project_translations. published_at is set the first time a language
// is published and is never reset, not by a later save and not by going back to draft.
const UPSERT_SQL = `
  INSERT INTO project_translations
    (project_id, lang, status, slug, title, summary, body_markdown, thumbnail_alt, published_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(project_id, lang) DO UPDATE SET
    status = excluded.status, slug = excluded.slug, title = excluded.title,
    summary = excluded.summary, body_markdown = excluded.body_markdown,
    thumbnail_alt = excluded.thumbnail_alt, updated_at = excluded.updated_at,
    published_at = CASE WHEN excluded.status = 'published'
                        THEN COALESCE(project_translations.published_at, excluded.published_at)
                        ELSE project_translations.published_at END`;

// :id must be a positive integer (spec 2.4). null makes the route answer 404.
function parseId(value) {
  return /^[1-9][0-9]*$/.test(value) && Number.isSafeInteger(Number(value)) ? Number(value) : null;
}

const text = value => (typeof value === 'string' ? value : '');

// sort_order as typed: an empty box counts as 0, and anything that is not a whole number gives null.
function sortOrder(value) {
  if (value === '') return 0;
  return /^-?[0-9]+$/.test(value) && Number.isSafeInteger(Number(value)) ? Number(value) : null;
}

// Turns a request body, or a DB row shaped like one, into the values that the editor shows and the save writes.
// Only strings are kept, so a field sent twice (an array) counts as empty instead of reaching SQL.
function readForm(body) {
  const values = {
    thumbnail: text(body.thumbnail).trim(),
    repo_url: text(body.repo_url).trim(),
    demo_url: text(body.demo_url).trim(),
    // the checkbox sends '1' only when it is ticked, and a DB row has the integer 1
    featured: String(body.featured) === '1',
    // kept as text, so a value that fails validation is shown again exactly as typed
    sort_order: typeof body.sort_order === 'number' ? String(body.sort_order) : text(body.sort_order).trim(),
    // one ticked checkbox arrives as the string '12'; [].concat keeps it whole instead of looping over '1' and '2'
    tags: [...new Set([].concat(body.tags || []).map(Number))].filter(n => Number.isSafeInteger(n) && n > 0)
  };
  for (const lang of LANGS) {
    const src = body[lang] && typeof body[lang] === 'object' ? body[lang] : {};
    const tr = { status: STATUSES.includes(src.status) ? src.status : 'none' };
    for (const field of FIELDS) {
      tr[field] = field === 'body_markdown' ? text(src[field]) : text(src[field]).trim();
    }
    values[lang] = tr;
  }
  return values;
}

// Checks that need no DB. Keys are 'form', a shared field name or '<lang>.<field>', so the editor can show a message
// next to its field.
function validate(values, slugs) {
  const errors = {};
  const active = LANGS.filter(lang => values[lang].status !== 'none');
  if (active.length === 0) errors.form = 'ต้องมีอย่างน้อยหนึ่งภาษาที่สถานะไม่ใช่ ไม่มีฉบับนี้';
  if (values.repo_url && !URL_PATTERN.test(values.repo_url)) errors.repo_url = 'ลิงก์ repo ต้องขึ้นต้นด้วย https:// หรือ http://';
  if (values.demo_url && !URL_PATTERN.test(values.demo_url)) errors.demo_url = 'ลิงก์ demo ต้องขึ้นต้นด้วย https:// หรือ http://';
  if (sortOrder(values.sort_order) === null) errors.sort_order = 'ลำดับต้องเป็นจำนวนเต็ม เช่น 0, 1 หรือ -1';
  for (const lang of active) {
    if (!values[lang].title) errors[lang + '.title'] = 'กรุณาใส่หัวข้อ';
    if (!slugs[lang]) errors[lang + '.slug'] = 'กรุณาใส่ slug ภาษาอังกฤษ (a-z, 0-9, -)';
  }
  return errors;
}

// Runs inside one transaction, so no other save can take a slug between the duplicate check and the writes.
async function write(id, values, slugs) {
  const errors = {};
  for (const lang of LANGS) {
    if (values[lang].status === 'none') continue;
    const clash = await get(
      'SELECT 1 FROM project_translations WHERE lang = ? AND slug = ? AND project_id <> ?',
      [lang, slugs[lang], id || 0]
    );
    if (clash) errors[lang + '.slug'] = 'slug นี้ถูกใช้แล้วในโปรเจกต์อื่นของภาษานี้';
  }
  if (Object.keys(errors).length) return { errors };

  const now = new Date().toISOString();
  const shared = [
    values.thumbnail || null,
    values.repo_url || null,
    values.demo_url || null,
    values.featured ? 1 : 0,
    sortOrder(values.sort_order)
  ];
  let projectId = id;
  if (projectId) {
    await run(
      'UPDATE projects SET thumbnail = ?, repo_url = ?, demo_url = ?, featured = ?, sort_order = ?, updated_at = ? WHERE id = ?',
      [...shared, now, projectId]
    );
  } else {
    projectId = (await run(
      'INSERT INTO projects (thumbnail, repo_url, demo_url, featured, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [...shared, now, now]
    )).lastID;
  }
  for (const lang of LANGS) {
    const tr = values[lang];
    if (tr.status === 'none') {
      // none means no row (spec 2.4)
      await run('DELETE FROM project_translations WHERE project_id = ? AND lang = ?', [projectId, lang]);
      continue;
    }
    await run(UPSERT_SQL, [
      projectId, lang, tr.status, slugs[lang], tr.title, tr.summary, tr.body_markdown, tr.thumbnail_alt,
      tr.status === 'published' ? now : null, now
    ]);
  }
  await run('DELETE FROM project_tags WHERE project_id = ?', [projectId]);
  // a tag id that no longer exists is skipped instead of failing the foreign key
  await run(
    'INSERT INTO project_tags (project_id, tag_id) SELECT ?, id FROM tags WHERE id IN (SELECT value FROM json_each(?))',
    [projectId, JSON.stringify(values.tags)]
  );
  return { id: projectId };
}

async function renderEditor(res, id, values, errors, saved) {
  const tags = await all('SELECT id, slug FROM tags ORDER BY slug');
  // statuses of the rows in the DB: the confirm before deleting a translation and the slug warning depend on them
  const stored = { th: null, en: null };
  if (id) {
    for (const row of await all('SELECT lang, status FROM project_translations WHERE project_id = ?', [id])) {
      stored[row.lang] = row.status;
    }
  }
  res.render('admin/project-edit', { id, values, errors, tags, stored, saved });
}

async function save(req, res, id) {
  const values = readForm(req.body ?? {});
  const slugs = resolveSlugs(values);
  const errors = validate(values, slugs);
  const result = Object.keys(errors).length ? { errors } : await transaction(() => write(id, values, slugs));
  if (result.errors) {
    // spec 2.4: show the form again with what was typed, never a redirect and never a 500
    res.status(400);
    return renderEditor(res, id, values, result.errors, false);
  }
  res.redirect(303, '/admin/projects/' + result.id + '?saved=1');
}

// Same order as the public /projects page (spec 2.1), so the list shows the order that readers will see.
router.get('/', async (req, res) => {
  const projects = await all(`
    SELECT p.id, p.featured, p.sort_order, p.updated_at,
      (SELECT title FROM project_translations WHERE project_id = p.id ORDER BY lang = 'th' DESC LIMIT 1) AS title,
      (SELECT status FROM project_translations WHERE project_id = p.id AND lang = 'th') AS th,
      (SELECT status FROM project_translations WHERE project_id = p.id AND lang = 'en') AS en
    FROM projects p ORDER BY p.featured DESC, p.sort_order, p.id`);
  res.render('admin/projects', { projects });
});

// declared before /:id (spec 2.4); a new project starts as th=draft, en=none, not featured and sort_order 0
router.get('/new', async (req, res) => {
  await renderEditor(res, null, readForm({ sort_order: '0', th: { status: 'draft' } }), {}, false);
});

router.post('/', (req, res) => save(req, res, null));

// Preview in the pattern of POST /admin/posts/preview/:lang: the real project page rendered from the form,
// without writing anything to the DB. :lang is th or en only; anything else goes on to the 404 handler.
router.post('/preview/:lang', async (req, res, next) => {
  const { lang } = req.params;
  if (!LANGS.includes(lang)) return next();
  const values = readForm(req.body ?? {});
  const tr = values[lang];
  // the same locals that src/app.js sets for /th and /en
  res.locals.lang = lang;
  res.locals.other = lang === 'th' ? 'en' : 'th';
  res.locals.t = strings[lang];
  const settingRows = await all("SELECT key, value FROM settings WHERE lang IN (?, '*')", [lang]);
  res.locals.settings = Object.fromEntries(settingRows.map(row => [row.key, row.value]));
  const tagRows = await all(
    'SELECT slug, name_th, name_en FROM tags WHERE id IN (SELECT value FROM json_each(?)) ORDER BY slug',
    [JSON.stringify(values.tags)]
  );
  // a link that would fail validation is left out, so the preview never renders a javascript: href
  const link = url => (URL_PATTERN.test(url) ? url : '');
  res.render('project', {
    project: { thumbnail: values.thumbnail, repo_url: link(values.repo_url), demo_url: link(values.demo_url) },
    tr,
    tags: tagRows.map(tag => ({ slug: tag.slug, name: lang === 'th' ? tag.name_th : tag.name_en })),
    preview: true,
    // no canonical, hreflang or og:url because a preview has no public URL, and noindex keeps it out of search
    meta: {
      title: tr.title,
      description: tr.summary,
      noindex: true,
      type: 'website'
    }
  });
});

router.get('/:id', async (req, res, next) => {
  const id = parseId(req.params.id);
  const project = id && (await get('SELECT * FROM projects WHERE id = ?', [id]));
  if (!project) return next();
  const body = {
    thumbnail: project.thumbnail || '',
    repo_url: project.repo_url || '',
    demo_url: project.demo_url || '',
    featured: project.featured,
    sort_order: project.sort_order
  };
  for (const row of await all('SELECT * FROM project_translations WHERE project_id = ?', [id])) body[row.lang] = row;
  body.tags = (await all('SELECT tag_id FROM project_tags WHERE project_id = ?', [id])).map(row => row.tag_id);
  await renderEditor(res, id, readForm(body), {}, req.query.saved === '1');
});

router.post('/:id', async (req, res, next) => {
  const id = parseId(req.params.id);
  if (!id || !(await get('SELECT id FROM projects WHERE id = ?', [id]))) return next();
  await save(req, res, id);
});

router.post('/:id/delete', async (req, res, next) => {
  const id = parseId(req.params.id);
  if (!id) return next();
  // project_translations and project_tags go by ON DELETE CASCADE, which needs PRAGMA foreign_keys = ON from src/db.js
  const { changes } = await run('DELETE FROM projects WHERE id = ?', [id]);
  if (changes === 0) return next();
  res.redirect(303, '/admin/projects');
});

module.exports = router;
```

- [ ] **Step 2: ต่อ admin-projects เข้า src/routes/admin.js**

ใน `src/routes/admin.js` แทนที่สามบรรทัดท้ายไฟล์ ซึ่งตอนนี้คือ

```js
router.use('/posts', require('./admin-posts'));

module.exports = router;
```

ด้วยข้อความนี้

```js
router.use('/posts', require('./admin-posts'));
router.use('/projects', require('./admin-projects'));

module.exports = router;
```

- ส่วนต้นของไฟล์ไม่เปลี่ยน บรรทัดใหม่อยู่หลัง `router.use(requireAdmin)` ทุก route ของโปรเจกต์รวมถึง preview จึงถูกบังคับ login ซึ่ง Step 5 และ 6 ตรวจ
- route ของ task หลังใน `src/routes/admin.js` เพิ่มต่อจากบรรทัดของ `/projects` และก่อน `module.exports`

- [ ] **Step 3: เขียน views/admin/projects.ejs**

สร้าง `views/admin/projects.ejs` โครงเดียวกับ `views/admin/posts.ejs` ของ Task 10

- คอลัมน์ หัวข้อ, ไทย, EN และ แก้ไขล่าสุด กับคำบน chip เหมือนรายการบทความตาม spec ข้อ 2.4 และเพิ่มคอลัมน์ หน้าแรก ที่เขียนว่า ปักหมุด เมื่อ `featured` เป็น 1 กับคอลัมน์ ลำดับ ที่แสดงค่า `sort_order`
- แถวเรียงตามลำดับของหน้า `/projects` จาก route เจ้าของจึงเห็นผลของตัวเลขลำดับได้ทันที
- ลิงก์ เพิ่มโปรเจกต์ใหม่ อยู่ใน `.page-head` และหัวข้อทุกแถวเป็นลิงก์ไป editor โปรเจกต์ที่ไม่มี translation เลยเกิดได้แค่จากการ insert ด้วย SQL ตรง แถวนั้นจะแสดง `(ไม่มีหัวข้อ)`
- `.admin-table` มี `min-width: 36rem` จาก Task 8 ตารางหกคอลัมน์จึงเลื่อนในกรอบ `.table-scroll` บนจอแคบ

```ejs
<%
const chipLabels = { published: 'เผยแพร่', draft: 'แบบร่าง' };
-%>
<%- include('head', { title: 'โปรเจกต์', section: 'projects' }) %>
<main id="main">
  <div class="page-head">
    <h1>โปรเจกต์</h1>
    <a class="button-link" href="/admin/projects/new">เพิ่มโปรเจกต์ใหม่</a>
  </div>
<% if (projects.length === 0) { -%>
  <p class="admin-empty">ยังไม่มีโปรเจกต์</p>
<% } else { -%>
  <div class="table-scroll">
    <table class="admin-table">
      <thead>
        <tr><th scope="col">หัวข้อ</th><th scope="col">ไทย</th><th scope="col">EN</th><th scope="col">หน้าแรก</th><th scope="col">ลำดับ</th><th scope="col">แก้ไขล่าสุด</th></tr>
      </thead>
      <tbody>
<% for (const project of projects) { -%>
        <tr>
          <td><a href="/admin/projects/<%= project.id %>"><%= project.title || '(ไม่มีหัวข้อ)' %></a></td>
<% for (const status of [project.th, project.en]) { -%>
          <td><span class="chip chip-<%= status || 'none' %>"><%= chipLabels[status] || 'ไม่มีฉบับแปล' %></span></td>
<% } -%>
          <td><%= project.featured ? 'ปักหมุด' : '' %></td>
          <td><%= project.sort_order %></td>
          <td class="admin-date"><%= formatDate('th', project.updated_at) %></td>
        </tr>
<% } -%>
      </tbody>
    </table>
  </div>
<% } -%>
</main>
<%- include('foot') %>
```

- [ ] **Step 4: เขียน views/admin/project-edit.ejs**

สร้าง `views/admin/project-edit.ejs` layout ตาม Project editor ใน spec ข้อ 2.4 คือส่วนที่ใช้ร่วมกันอยู่ด้านบน และแต่ละภาษาเป็น `<details lang>` หนึ่งก้อน ส่วนที่เหมือน `views/admin/post-edit.ejs` ของ Task 10 มีเหตุผลเดียวกัน คือ select สถานะสามค่าที่ confirm ก่อนลบฉบับที่มี row, `pattern="[a-z0-9\-]*"` ที่ escape `-` เพราะ browser compile ด้วย flag `v`, คำเตือนเรื่องลิงก์เดิมเมื่อฉบับใน DB published, textarea ของเนื้อหาที่ขึ้นบรรทัดใหม่หลังแท็กเปิด, ปุ่ม บันทึก ตัวแรกอยู่ก่อนปุ่ม ดูตัวอย่าง, error สรุปบนสุดกับข้อความใต้ช่อง และฟอร์มลบที่แยกจากฟอร์มหลัก

- ช่องลิงก์ repo กับ demo อยู่ใน `.field-pair` จึงอยู่แถวเดียวกันตั้งแต่ 40rem เป็น `type="url"` ที่ให้คีย์บอร์ดมือถือแบบ URL และให้ browser เตือนเมื่อพิมพ์ไม่มี `https://` ใต้ช่อง demo บอกว่าเว้นว่างแล้วหน้าจริงจะไม่แสดงลิงก์ demo ตาม spec ข้อ 2.4
- ช่องลำดับเป็น `type="number"` กับ `step="1"` browser จึงเตือนก่อน submit เมื่อพิมพ์ทศนิยม และคำอธิบายใต้ช่องบอกว่าเลขน้อยขึ้นก่อนและโปรเจกต์ที่ปักหมุดขึ้นก่อนเสมอ
- checkbox ปักหมุดอยู่ใน `<fieldset class="tag-options">` ที่มี legend หน้าแรก เพราะ `.admin-form label` ของ Task 8 เป็น grid ที่จะแยก checkbox กับข้อความเป็นสองบรรทัด ส่วน `.admin-form .tag-options label` ของ Task 10 วางไว้บรรทัดเดียวกันแล้ว `admin.css` จึงไม่ต้องเพิ่ม rule
- ปุ่ม ดูตัวอย่าง ของแต่ละภาษาคือ `formaction="/admin/projects/preview/<lang>" formtarget="_blank"` ซึ่งส่งทั้งฟอร์มไปที่ route ของ Step 1
- ปุ่มลบมี `onsubmit="return confirm('ลบโปรเจกต์นี้?')"` แบบเดียวกับกติกาปุ่มลบใน spec ข้อ 2.4
- ทุกค่าใช้ `<%= %>` ส่วน `<%-` มีแค่ `include`

```ejs
<%
const pageTitle = id ? 'แก้ไขโปรเจกต์' : 'โปรเจกต์ใหม่';
const langNames = { th: 'ไทย', en: 'English' };
const errorPrefix = { th: 'ฉบับไทย: ', en: 'ฉบับอังกฤษ: ' };
const statusLabels = { none: 'ไม่มีฉบับแปล', draft: 'แบบร่าง', published: 'เผยแพร่' };
const statusOptions = [['none', 'ไม่มีฉบับนี้'], ['draft', 'แบบร่าง'], ['published', 'เผยแพร่']];
const errorList = Object.entries(errors).map(([key, message]) => (errorPrefix[key.split('.')[0]] || '') + message);
-%>
<%- include('head', { title: pageTitle, section: 'projects' }) %>
<main id="main" class="editor">
  <form class="admin-form" method="post" action="<%= id ? '/admin/projects/' + id : '/admin/projects' %>">
    <div class="page-head">
      <h1><%= pageTitle %></h1>
      <button type="submit">บันทึก</button>
    </div>
<% if (saved) { -%>
    <p class="form-saved" role="status">บันทึกแล้ว</p>
<% } -%>
<% if (errorList.length) { -%>
    <div class="form-error" role="alert">
      <p>ยังไม่ได้บันทึก กรุณาแก้ตามรายการนี้</p>
      <ul>
<% for (const message of errorList) { -%>
        <li><%= message %></li>
<% } -%>
      </ul>
    </div>
<% } -%>
    <label>ภาพ thumbnail
      <input name="thumbnail" value="<%= values.thumbnail %>" placeholder="/uploads/" spellcheck="false">
    </label>
    <div class="field-pair">
      <label>ลิงก์ repo
        <input type="url" name="repo_url" value="<%= values.repo_url %>" placeholder="https://github.com/" spellcheck="false">
<% if (errors.repo_url) { -%>
        <span class="field-error"><%= errors.repo_url %></span>
<% } -%>
      </label>
      <label>ลิงก์ demo
        <input type="url" name="demo_url" value="<%= values.demo_url %>" placeholder="https://" spellcheck="false">
<% if (errors.demo_url) { -%>
        <span class="field-error"><%= errors.demo_url %></span>
<% } -%>
        <span class="field-hint">ถ้าเว้นว่าง หน้าโปรเจกต์จะไม่แสดงลิงก์ demo</span>
      </label>
    </div>
    <div class="field-pair">
      <label>ลำดับ
        <input type="number" name="sort_order" value="<%= values.sort_order %>" step="1">
<% if (errors.sort_order) { -%>
        <span class="field-error"><%= errors.sort_order %></span>
<% } -%>
        <span class="field-hint">เลขน้อยขึ้นก่อน และโปรเจกต์ที่ปักหมุดขึ้นก่อนโปรเจกต์ที่ไม่ได้ปักหมุดเสมอ</span>
      </label>
      <fieldset class="tag-options">
        <legend>หน้าแรก</legend>
        <label><input type="checkbox" name="featured" value="1"<% if (values.featured) { %> checked<% } %>> ปักหมุดเป็นโปรเจกต์เด่น</label>
      </fieldset>
    </div>
    <fieldset class="tag-options">
      <legend>แท็ก</legend>
<% if (tags.length === 0) { -%>
      <p class="field-hint">ยังไม่มีแท็ก</p>
<% } -%>
<% for (const tag of tags) { -%>
      <label><input type="checkbox" name="tags" value="<%= tag.id %>"<% if (values.tags.includes(tag.id)) { %> checked<% } %>> <%= tag.slug %></label>
<% } -%>
    </fieldset>
<% for (const lang of ['th', 'en']) {
     const tr = values[lang];
-%>
    <details class="translation" lang="<%= lang %>"<% if (lang === 'th' || tr.status !== 'none') { %> open<% } %>>
      <summary><%= langNames[lang] %> · <span lang="th"><%= statusLabels[tr.status] %></span></summary>
      <div class="translation-fields">
        <label><span lang="th">สถานะ</span>
          <select name="<%= lang %>[status]" lang="th"<% if (stored[lang]) { %> data-prev="<%= tr.status %>" onchange="if (this.value === 'none') { if (!confirm('ลบฉบับภาษานี้เมื่อบันทึก?')) this.value = this.dataset.prev } this.dataset.prev = this.value"<% } %>>
<% for (const [value, label] of statusOptions) { -%>
            <option value="<%= value %>"<% if (tr.status === value) { %> selected<% } %>><%= label %></option>
<% } -%>
          </select>
        </label>
        <div class="field-pair">
          <label><span lang="th">หัวข้อ</span>
            <input name="<%= lang %>[title]" value="<%= tr.title %>">
<% if (errors[lang + '.title']) { -%>
            <span class="field-error" lang="th"><%= errors[lang + '.title'] %></span>
<% } -%>
          </label>
          <label>slug
            <input name="<%= lang %>[slug]" value="<%= tr.slug %>" pattern="[a-z0-9\-]*" autocapitalize="none" spellcheck="false">
<% if (errors[lang + '.slug']) { -%>
            <span class="field-error" lang="th"><%= errors[lang + '.slug'] %></span>
<% } -%>
            <span class="field-hint" lang="th">ใช้ได้เฉพาะ a-z, 0-9 และ - ถ้าเว้นว่าง ระบบใช้หัวข้อที่ไม่มีภาษาไทย หรือ slug ของอีกภาษา</span>
<% if (stored[lang] === 'published') { -%>
            <span class="field-hint" lang="th">ฉบับนี้เผยแพร่แล้ว ถ้าแก้ slug ลิงก์เดิมจะใช้ไม่ได้</span>
<% } -%>
          </label>
        </div>
        <label><span lang="th">สรุป</span>
          <textarea name="<%= lang %>[summary]" rows="3"><%= tr.summary %></textarea>
        </label>
        <label><span lang="th">alt ภาพ thumbnail</span>
          <input name="<%= lang %>[thumbnail_alt]" value="<%= tr.thumbnail_alt %>">
        </label>
        <label><span lang="th">เนื้อหา (markdown)</span>
          <textarea class="editor-body" name="<%= lang %>[body_markdown]" rows="18">
<%= tr.body_markdown %></textarea>
        </label>
        <button type="submit" formaction="/admin/projects/preview/<%= lang %>" formtarget="_blank" lang="th">ดูตัวอย่าง</button>
      </div>
    </details>
<% } -%>
    <button type="submit">บันทึก</button>
  </form>
<% if (id) { -%>
  <form class="editor-delete" method="post" action="/admin/projects/<%= id %>/delete" onsubmit="return confirm('ลบโปรเจกต์นี้?')">
    <button type="submit">ลบโปรเจกต์</button>
  </form>
<% } -%>
</main>
<%- include('foot') %>
```

- [ ] **Step 5: ตรวจรายการ, editor, validation และการบันทึกด้วย request จริง**

คำสั่งนี้เปิด app ผ่าน `start()` ของ `test/helpers.js` ซึ่งใช้ `DATA_DIR` ชั่วคราวและลบทิ้งตอนจบ แล้วพิมพ์ผลของแต่ละขั้นเป็นบรรทัด ทุกค่า `true` และ `false` ในผลลัพธ์ต้องตรงกับ Expected

- guard ทำงานกับทั้ง `GET` และ `POST` ของ `/admin/projects` และไม่มีแถวถูกสร้าง
- หน้ารายการที่ยังว่างมีเมนู โปรเจกต์ ที่เป็นหน้าปัจจุบัน ลิงก์ เพิ่มโปรเจกต์ใหม่ และข้อความ ยังไม่มีโปรเจกต์
- editor ว่างเริ่มที่ฉบับไทยเป็น draft และเปิดอยู่ ฉบับอังกฤษเป็น none และปิดอยู่ ลำดับ 0 ไม่ปักหมุด ไม่มี `onchange` เพราะยังไม่มี row และมีปุ่ม ดูตัวอย่าง ของทั้งสองภาษา
- ฟอร์มที่ผิดสี่อย่างพร้อมกัน ได้แก่หัวข้อไทยที่ไม่มี slug, ลิงก์ repo `javascript:alert(1)`, ลิงก์ demo ที่ไม่มี `https://` และลำดับ `1.5` ต้องได้ 400 พร้อมข้อความทั้งสี่ข้อ ไม่มีแถวถูกสร้าง และทุกค่าที่พิมพ์ยังอยู่โดยถูก escape แท็ก id 1 กับ 12 พิสูจน์ว่าแท็กที่ติ๊กตัวเดียวยังเป็น 12
- ฟอร์มเดิมที่แก้แล้วบันทึกได้ ฉบับอังกฤษได้ slug จากหัวข้อ `Portfolio site` ตาม spec ข้อ 2.3 และ `demo_url` ที่ว่างถูกเก็บเป็น `null`
- editor หลังบันทึกมีข้อความ บันทึกแล้ว เปิดฉบับอังกฤษเพราะมี row, confirm ก่อนลบฉบับภาษาทั้งสองภาษา, คำเตือนเรื่องลิงก์เดิมเฉพาะฉบับไทยที่ published และฟอร์มลบที่มี confirm
- แถวในรายการแสดงโดยไม่รวมคอลัมน์วันที่ เพราะวันที่คือวันที่รันคำสั่ง

Run:

````bash
node - <<'EOF'
const { start, run, get, all } = require('./test/helpers');

start().then(async h => {
  const count = async table => (await get('SELECT COUNT(*) AS n FROM ' + table)).n;
  const sections = html => html.split('<details').slice(1);
  const errorsOf = html => html.match(/<div class="form-error" role="alert">[^]*?<\/div>/)[0].match(/<li>[^<]*<\/li>/g).map(li => li.slice(4, -5));
  const blank = { title: '', slug: '', summary: '', body_markdown: '', thumbnail_alt: '' };
  await run("INSERT INTO tags (id, slug, name_th, name_en) VALUES (1, 'one', 'หนึ่ง', 'One'), (12, 'twelve', 'สิบสอง', 'Twelve')");

  let r = await h.req('/admin/projects');
  console.log('anonymous GET /admin/projects -> ' + r.status + ' ' + r.location);
  r = await h.req('/admin/projects', { method: 'POST', form: { th: { ...blank, status: 'published', title: 'x', slug: 'x' }, en: { status: 'none' } } });
  console.log('anonymous POST /admin/projects -> ' + r.status + ' ' + r.location + ', projects=' + (await count('projects')));

  await h.login();
  r = await h.req('/admin/projects');
  console.log('GET /admin/projects -> ' + r.status
    + ', current menu: ' + r.text.includes('<a href="/admin/projects" aria-current="page">')
    + ', new link: ' + r.text.includes('<a class="button-link" href="/admin/projects/new">')
    + ', empty: ' + r.text.includes('ยังไม่มีโปรเจกต์'));

  r = await h.req('/admin/projects/new');
  let [th, en] = sections(r.text);
  console.log('GET /admin/projects/new -> ' + r.status
    + ', th draft open: ' + (th.startsWith(' class="translation" lang="th" open>') && th.includes('<option value="draft" selected>'))
    + ', en none closed: ' + (en.startsWith(' class="translation" lang="en">') && en.includes('<option value="none" selected>'))
    + ', sort_order 0: ' + r.text.includes('name="sort_order" value="0"')
    + ', featured unticked: ' + r.text.includes('name="featured" value="1">')
    + ', no confirm: ' + !r.text.includes('onchange=')
    + ', preview buttons: ' + (r.text.includes('formaction="/admin/projects/preview/th" formtarget="_blank"') && r.text.includes('formaction="/admin/projects/preview/en" formtarget="_blank"')));

  // a Thai title without a slug, links without http(s), a sort_order that is not a whole number
  const invalid = {
    thumbnail: '/uploads/p.png',
    repo_url: 'javascript:alert(1)',
    demo_url: 'example.com',
    featured: '1',
    sort_order: '1.5',
    tags: '12',
    th: { ...blank, status: 'published', title: 'เว็บพอร์ตโฟลิโอ', summary: 'สรุปที่พิมพ์ไว้', body_markdown: 'const tag = "<b>x</b>";' },
    en: { ...blank, status: 'none' }
  };
  r = await h.req('/admin/projects', { method: 'POST', form: invalid });
  console.log('POST invalid form -> ' + r.status + ', projects=' + (await count('projects')));
  for (const message of errorsOf(r.text)) console.log('  error: ' + message);
  console.log('  kept: title ' + r.text.includes('value="เว็บพอร์ตโฟลิโอ"')
    + ', summary ' + r.text.includes('>สรุปที่พิมพ์ไว้</textarea>')
    + ', body escaped ' + (r.text.includes('const tag = &#34;&lt;b&gt;x&lt;/b&gt;&#34;;') && !r.text.includes('<b>x</b>'))
    + ', repo ' + r.text.includes('value="javascript:alert(1)"')
    + ', sort_order ' + r.text.includes('name="sort_order" value="1.5"')
    + ', featured ' + r.text.includes('name="featured" value="1" checked')
    + ', tag 12 only ' + (r.text.includes('name="tags" value="12" checked') && !r.text.includes('name="tags" value="1" checked')));

  // the same form fixed: a typed th slug, an https repo link, an empty demo link, and en draft with a slug from its title
  const valid = {
    ...invalid,
    repo_url: 'https://github.com/example/portfolio',
    demo_url: '',
    sort_order: '2',
    th: { ...invalid.th, slug: 'portfolio', thumbnail_alt: 'ภาพหน้าจอเว็บ' },
    en: { ...blank, status: 'draft', title: 'Portfolio site' }
  };
  r = await h.req('/admin/projects', { method: 'POST', form: valid });
  console.log('POST valid form -> ' + r.status + ' ' + r.location);
  const id = Number(r.location.match(/\/(\d+)\?saved=1$/)[1]);
  console.log('  projects: ' + JSON.stringify(await get('SELECT thumbnail, repo_url, demo_url, featured, sort_order FROM projects WHERE id = ?', [id])));
  console.log('  translations: ' + (await all('SELECT lang, status, slug FROM project_translations WHERE project_id = ? ORDER BY lang DESC', [id])).map(t => t.lang + ' ' + t.status + ' ' + t.slug).join(', '));
  console.log('  project_tags: ' + (await all('SELECT tag_id FROM project_tags WHERE project_id = ?', [id])).map(t => t.tag_id).join(' '));

  r = await h.req(r.location);
  [th, en] = sections(r.text);
  console.log('GET /admin/projects/' + id + '?saved=1 -> ' + r.status
    + ', saved: ' + r.text.includes('บันทึกแล้ว')
    + ', en open: ' + en.startsWith(' class="translation" lang="en" open>')
    + ', confirm th/en: ' + th.includes("confirm('ลบฉบับภาษานี้เมื่อบันทึก?')") + '/' + en.includes("confirm('ลบฉบับภาษานี้เมื่อบันทึก?')")
    + ', slug warning th/en: ' + th.includes('ลิงก์เดิมจะใช้ไม่ได้') + '/' + en.includes('ลิงก์เดิมจะใช้ไม่ได้')
    + ', featured: ' + r.text.includes('name="featured" value="1" checked')
    + ', sort_order 2: ' + r.text.includes('name="sort_order" value="2"')
    + ', delete confirm: ' + r.text.includes('onsubmit="return confirm(\'ลบโปรเจกต์นี้?\')"'));

  r = await h.req('/admin/projects');
  const cells = [...r.text.match(/<tbody>[^]*?<\/tbody>/)[0].matchAll(/<td[^>]*>([^]*?)<\/td>/g)].map(m => m[1].replace(/<[^>]+>/g, ''));
  console.log('list row without the date: ' + cells.slice(0, 5).join(' | '));
  await h.stop();
});
EOF
````

Expected:

```
anonymous GET /admin/projects -> 302 /admin/login
anonymous POST /admin/projects -> 302 /admin/login, projects=0
GET /admin/projects -> 200, current menu: true, new link: true, empty: true
GET /admin/projects/new -> 200, th draft open: true, en none closed: true, sort_order 0: true, featured unticked: true, no confirm: true, preview buttons: true
POST invalid form -> 400, projects=0
  error: ลิงก์ repo ต้องขึ้นต้นด้วย https:// หรือ http://
  error: ลิงก์ demo ต้องขึ้นต้นด้วย https:// หรือ http://
  error: ลำดับต้องเป็นจำนวนเต็ม เช่น 0, 1 หรือ -1
  error: ฉบับไทย: กรุณาใส่ slug ภาษาอังกฤษ (a-z, 0-9, -)
  kept: title true, summary true, body escaped true, repo true, sort_order true, featured true, tag 12 only true
POST valid form -> 303 /admin/projects/1?saved=1
  projects: {"thumbnail":"/uploads/p.png","repo_url":"https://github.com/example/portfolio","demo_url":null,"featured":1,"sort_order":2}
  translations: th published portfolio, en draft portfolio-site
  project_tags: 12
GET /admin/projects/1?saved=1 -> 200, saved: true, en open: true, confirm th/en: true/true, slug warning th/en: true/false, featured: true, sort_order 2: true, delete confirm: true
list row without the date: เว็บพอร์ตโฟลิโอ | เผยแพร่ | แบบร่าง | ปักหมุด | 2
```

- [ ] **Step 6: ตรวจลำดับโปรเจกต์, published_at, preview และการลบด้วย request จริง**

คำสั่งนี้ใช้ `start()` กับ `DATA_DIR` ชั่วคราวใหม่อีกชุด สร้างโปรเจกต์ A, B และ C ผ่าน editor แล้วตรวจผลบนหน้า public

- ครั้งแรก B (ปักหมุด, ลำดับ 1) ขึ้นก่อน A (ปักหมุด, ลำดับ 2) และ C (ไม่ปักหมุด, ลำดับ -5) อยู่ท้ายสุดของ `/th/projects` และไม่อยู่บนหน้าแรก นี่คือการตรวจของ Phase 4 ใน spec ข้อ 3.5 ที่ว่าโปรเจกต์ featured อยู่ลำดับแรกทั้งบน `/th/projects` และ `/th`
- แก้ลำดับของ A เป็น 0 ใน editor แล้ว A ขึ้นก่อน B ทั้งสองหน้าและในรายการของ admin ส่วน `published_at` ของ A ที่ย้ายไปเป็นวันในอดีตก่อนบันทึกต้องคงค่าเดิม
- เอาติ๊กปักหมุดของ B ออกพร้อมลำดับ -10 แล้ว B ต้องอยู่หลัง A ที่ยังปักหมุดแม้เลขลำดับจะน้อยกว่า และหายไปจากหน้าแรก
- preview ภาษาไทยได้หน้าจริงที่มีแถบ, `admin.css`, `noindex`, ไม่มี canonical, ลิงก์ repo และไม่มีลิงก์ `javascript:` ที่พิมพ์ในช่อง demo ส่วน preview ภาษาอังกฤษเป็นหน้าภาษาอังกฤษทั้งหน้า และหลัง preview หน้า public กับแถวใน DB ไม่เปลี่ยน
- `:lang` ที่ไม่ใช่ `th` หรือ `en` และ path ที่ไม่มีภาษาได้ 404
- slug ไทยที่ซ้ำกับโปรเจกต์อื่นได้ 400 พร้อมข้อความ และไม่มีแถวใหม่
- การลบเอา translation กับ `project_tags` ไปด้วยแต่แท็กยังอยู่ และทุก route ที่มี `:id` ของโปรเจกต์ที่ลบแล้วหรือ `:id` ที่ไม่ใช่จำนวนเต็มบวกได้ 404 โดยไม่สร้างแถวใหม่

Run:

````bash
node - <<'EOF'
const { start, run, get } = require('./test/helpers');

start().then(async h => {
  const count = async (sql, params = []) => (await get(sql, params)).n;
  const hrefs = html => (html.match(/<article class="project-card"[^]*?<\/article>/g) || []).map(c => c.match(/href="([^"]*)"/)[1]);
  const orders = async () => {
    console.log('  /th/projects: ' + hrefs((await h.req('/th/projects')).text).join(' '));
    console.log('  /th featured: ' + hrefs((await h.req('/th')).text).join(' '));
  };
  const blank = { title: '', slug: '', summary: '', body_markdown: '', thumbnail_alt: '' };
  const { lastID: tagId } = await run("INSERT INTO tags (slug, name_th, name_en) VALUES ('containers', 'คอนเทนเนอร์', 'Containers')");
  const form = (th, shared = {}) => ({
    thumbnail: '', repo_url: '', demo_url: '', sort_order: '0', tags: String(tagId), ...shared,
    th: { ...blank, status: 'published', ...th },
    en: { ...blank, status: 'none' }
  });
  await h.login();

  const ids = {};
  for (const [key, th, shared] of [
    ['a', { title: 'โปรเจกต์ A', slug: 'project-a' }, { featured: '1', sort_order: '2' }],
    ['b', { title: 'โปรเจกต์ B', slug: 'project-b' }, { featured: '1', sort_order: '1' }],
    ['c', { title: 'โปรเจกต์ C', slug: 'project-c' }, { sort_order: '-5' }]
  ]) {
    const r = await h.req('/admin/projects', { method: 'POST', form: form(th, shared) });
    ids[key] = Number(r.location.match(/\/(\d+)\?saved=1$/)[1]);
  }
  console.log('created A, B, C through the editor: ' + JSON.stringify(ids));
  await orders();

  // move A to sort_order 0 in the editor; its first publish date is moved into the past to show that a save keeps it
  await run('UPDATE project_translations SET published_at = ? WHERE project_id = ?', ['2026-01-02T03:04:05.678Z', ids.a]);
  let r = await h.req('/admin/projects/' + ids.a, { method: 'POST', form: form({ title: 'โปรเจกต์ A', slug: 'project-a' }, { featured: '1', sort_order: '0' }) });
  console.log('POST /admin/projects/' + ids.a + ' with sort_order 0 -> ' + r.status + ' ' + r.location);
  await orders();
  console.log('  published_at of A: ' + (await get("SELECT published_at FROM project_translations WHERE project_id = ? AND lang = 'th'", [ids.a])).published_at);
  r = await h.req('/admin/projects');
  console.log('  admin list: ' + [...r.text.matchAll(/<td><a href="\/admin\/projects\/\d+">([^<]*)<\/a><\/td>/g)].map(m => m[1]).join(' | '));

  // unticking featured puts B after every featured project, however low its sort_order
  r = await h.req('/admin/projects/' + ids.b, { method: 'POST', form: form({ title: 'โปรเจกต์ B', slug: 'project-b' }, { sort_order: '-10' }) });
  console.log('POST /admin/projects/' + ids.b + ' without featured, sort_order -10 -> ' + r.status);
  await orders();

  // preview: the form is rendered as the project page, and nothing in the DB changes
  const saved = await get("SELECT * FROM project_translations WHERE project_id = ? AND lang = 'th'", [ids.a]);
  const rows = await count('SELECT COUNT(*) AS n FROM project_translations');
  const previewForm = {
    ...form(
      { title: 'ชื่อใหม่ที่ยังไม่บันทึก', slug: 'project-a', summary: 'สรุปใหม่', body_markdown: '```js\nconst x = 1;\n```\n' },
      { featured: '1', repo_url: 'https://github.com/example/a', demo_url: 'javascript:alert(1)' }
    ),
    en: { ...blank, status: 'draft', title: 'Project A in English', summary: 'English summary' }
  };
  r = await h.req('/admin/projects/preview/th', { method: 'POST', form: previewForm });
  console.log('POST /admin/projects/preview/th -> ' + r.status
    + ', html th: ' + r.text.includes('<html lang="th">')
    + ', bar: ' + r.text.includes('<p class="preview-bar" lang="th">ตัวอย่าง ยังไม่ได้บันทึก</p>')
    + ', admin.css: ' + r.text.includes('<link rel="stylesheet" href="/css/admin.css?v=')
    + ', noindex: ' + r.text.includes('<meta name="robots" content="noindex">')
    + ', canonical: ' + r.text.includes('rel="canonical"')
    + ', h1: ' + r.text.includes('<h1>ชื่อใหม่ที่ยังไม่บันทึก</h1>')
    + ', hljs: ' + r.text.includes('class="hljs-keyword"')
    + ', repo link: ' + r.text.includes('<a href="https://github.com/example/a">ซอร์สโค้ด</a>')
    + ', javascript: link: ' + r.text.includes('javascript:')
    + ', tag: ' + r.text.includes('<span class="tag">คอนเทนเนอร์</span>'));
  r = await h.req('/admin/projects/preview/en', { method: 'POST', form: previewForm });
  console.log('POST /admin/projects/preview/en -> ' + r.status
    + ', html en: ' + r.text.includes('<html lang="en">')
    + ', h1: ' + r.text.includes('<h1>Project A in English</h1>')
    + ', back link: ' + r.text.includes('>Back to projects</a>')
    + ', tag: ' + r.text.includes('<span class="tag">Containers</span>')
    + ', Thai title: ' + r.text.includes('ชื่อใหม่ที่ยังไม่บันทึก'));
  const publicPage = await h.req('/th/projects/project-a');
  console.log('  after preview: public h1 ' + publicPage.text.includes('<h1>โปรเจกต์ A</h1>')
    + ', no bar ' + !publicPage.text.includes('preview-bar')
    + ', row unchanged ' + (JSON.stringify(await get("SELECT * FROM project_translations WHERE project_id = ? AND lang = 'th'", [ids.a])) === JSON.stringify(saved))
    + ', row count unchanged ' + ((await count('SELECT COUNT(*) AS n FROM project_translations')) === rows));
  for (const urlPath of ['/admin/projects/preview/fr', '/admin/projects/preview/TH', '/admin/projects/preview']) {
    r = await h.req(urlPath, { method: 'POST', form: previewForm });
    console.log('POST ' + urlPath + ' -> ' + r.status);
  }

  // a th slug that another project already uses is a 400 with a message
  r = await h.req('/admin/projects', { method: 'POST', form: form({ title: 'ชื่อซ้ำ', slug: 'project-b' }) });
  console.log('POST with the th slug of B -> ' + r.status
    + ', message: ' + r.text.includes('slug นี้ถูกใช้แล้วในโปรเจกต์อื่นของภาษานี้')
    + ', projects=' + (await count('SELECT COUNT(*) AS n FROM projects')));

  // delete: translations and tag links go by ON DELETE CASCADE, and the tag itself stays
  r = await h.req('/admin/projects/' + ids.a + '/delete', { method: 'POST' });
  console.log('POST /admin/projects/' + ids.a + '/delete -> ' + r.status + ' ' + r.location
    + ', translations=' + (await count('SELECT COUNT(*) AS n FROM project_translations WHERE project_id = ?', [ids.a]))
    + ', project_tags=' + (await count('SELECT COUNT(*) AS n FROM project_tags WHERE project_id = ?', [ids.a]))
    + ', tags=' + (await count('SELECT COUNT(*) AS n FROM tags'))
    + ', /th/projects/project-a ' + (await h.req('/th/projects/project-a')).status);
  const statuses = [];
  for (const [method, urlPath] of [
    ['POST', '/admin/projects/' + ids.a + '/delete'],
    ['GET', '/admin/projects/' + ids.a],
    ['POST', '/admin/projects/' + ids.a],
    ['GET', '/admin/projects/abc'],
    ['GET', '/admin/projects/0'],
    ['POST', '/admin/projects/007']
  ]) {
    r = await h.req(urlPath, method === 'POST' ? { method, form: form({ title: 'ไม่ควรถูกสร้าง', slug: 'should-not-exist' }) } : { method });
    statuses.push(method + ' ' + urlPath + ' ' + r.status);
  }
  console.log(statuses.join(', '));
  console.log('projects=' + (await count('SELECT COUNT(*) AS n FROM projects')));
  await h.stop();
});
EOF
````

Expected:

```
created A, B, C through the editor: {"a":1,"b":2,"c":3}
  /th/projects: /th/projects/project-b /th/projects/project-a /th/projects/project-c
  /th featured: /th/projects/project-b /th/projects/project-a
POST /admin/projects/1 with sort_order 0 -> 303 /admin/projects/1?saved=1
  /th/projects: /th/projects/project-a /th/projects/project-b /th/projects/project-c
  /th featured: /th/projects/project-a /th/projects/project-b
  published_at of A: 2026-01-02T03:04:05.678Z
  admin list: โปรเจกต์ A | โปรเจกต์ B | โปรเจกต์ C
POST /admin/projects/2 without featured, sort_order -10 -> 303
  /th/projects: /th/projects/project-a /th/projects/project-b /th/projects/project-c
  /th featured: /th/projects/project-a
POST /admin/projects/preview/th -> 200, html th: true, bar: true, admin.css: true, noindex: true, canonical: false, h1: true, hljs: true, repo link: true, javascript: link: false, tag: true
POST /admin/projects/preview/en -> 200, html en: true, h1: true, back link: true, tag: true, Thai title: false
  after preview: public h1 true, no bar true, row unchanged true, row count unchanged true
POST /admin/projects/preview/fr -> 404
POST /admin/projects/preview/TH -> 404
POST /admin/projects/preview -> 404
POST with the th slug of B -> 400, message: true, projects=3
POST /admin/projects/1/delete -> 303 /admin/projects, translations=0, project_tags=0, tags=1, /th/projects/project-a 404
POST /admin/projects/1/delete 404, GET /admin/projects/1 404, POST /admin/projects/1 404, GET /admin/projects/abc 404, GET /admin/projects/0 404, POST /admin/projects/007 404
projects=2
```

- บรรทัด `POST /admin/projects/2 without featured` ยังเรียง B ก่อน C เพราะทั้งคู่ไม่ปักหมุด และลำดับ -10 ของ B น้อยกว่า -5 ของ C
- `POST /admin/projects/preview` ที่ไม่มีภาษาไปเข้า `POST /:id` ซึ่ง `parseId('preview')` ได้ `null` จึงได้ 404 ส่วน `/preview/TH` เข้า route ของ preview เพราะ Express ไม่แยกตัวพิมพ์ของ path แต่ `LANGS.includes` แยก จึงได้ 404

- [ ] **Step 7: ตรวจ <%- ใน views ด้วยขั้นตรวจเดียวกับ CI**

บรรทัดแรกแสดง `<%-` ทุกตัวใน template ของ task นี้ ซึ่งเป็น `include(` ทั้งหมด ส่วน `bash -e -c` รัน script ตัวเดียวกับขั้นสุดท้ายของ `.github/workflows/ci.yml` ใน Task 7

Run: `grep -rn "<%-" views/admin/projects.ejs views/admin/project-edit.ejs; bash -e -c 'if grep -rn "<%-" views/ | grep -v -e "md.render(" -e "include("; then echo "found <%- outside md.render or include"; exit 1; fi'; echo "guard exit=$?"`
Expected:

```
views/admin/projects.ejs:4:<%- include('head', { title: 'โปรเจกต์', section: 'projects' }) %>
views/admin/projects.ejs:35:<%- include('foot') %>
views/admin/project-edit.ejs:9:<%- include('head', { title: pageTitle, section: 'projects' }) %>
views/admin/project-edit.ejs:122:<%- include('foot') %>
guard exit=0
```

- [ ] **Step 8: รัน npm test ทั้งชุด**

task นี้ไม่มี test ใหม่ คำสั่งนี้พิสูจน์ว่าการ mount router ของโปรเจกต์ไม่กระทบ guard, login และ route ของบทความ

Run: `npm test`
Expected: PASS exit code 0 และยังมี 11 tests

```
> talkalways@1.0.0 test
> node --test test/*.test.js

✔ 01 markdown (33.8333ms)
✔ 02 routing (284.5796ms)
✔ 03 publish per language (357.6886ms)
✔ 04 published at (447.3749ms)
✔ 05 blog hidden (478.0757ms)
✔ 06 delete cascade (523.7731ms)
✔ 07 admin guard (315.3674ms)
✔ 08 login cookie (389.1833ms)
✔ 09 editor validation (441.3982ms)
✔ 10 preview (409.4748ms)
✔ 12 project order (447.4316ms)
ℹ tests 11
ℹ suites 0
ℹ pass 11
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1303.3693
```

- [ ] **Step 9: สร้างแท็กและบทความทดลองใน data/project-editor-check**

คำสั่งนี้สร้าง DB ทดลองแยกไว้ที่ `data/project-editor-check` สำหรับการตรวจใน browser ที่ Step 10 `data/site.db` จึงไม่ถูกแตะ โฟลเดอร์นี้อยู่ใต้ `data/` ที่ `.gitignore` กันไว้แล้ว และ Step 11 จะลบทิ้ง

- หน้าจัดการแท็กยังไม่มีจนถึง Task 14 คำสั่งนี้จึง insert แท็กสองตัวด้วย SQL ตรง
- บทความ published หนึ่งตัวทำให้เห็นว่า section โปรเจกต์เด่นอยู่ก่อน section บทความล่าสุดบนหน้าแรก
- ถ้าต้องรันซ้ำ ให้ทำ Step 11 ก่อน ไม่อย่างนั้นแท็กจะชน `UNIQUE`

Run:

```bash
DATA_DIR=data/project-editor-check node - <<'EOF'
const { ready, run, close } = require('./src/db');

ready.then(async () => {
  await run(`INSERT INTO tags (slug, name_th, name_en) VALUES
    ('nodejs', 'โหนดเจเอส', 'Node.js'),
    ('sqlite', 'เอสคิวไลต์', 'SQLite')`);
  const now = new Date().toISOString();
  const { lastID: postId } = await run('INSERT INTO posts (cover_image) VALUES (NULL)');
  await run(
    `INSERT INTO post_translations (post_id, lang, status, slug, title, excerpt, published_at, updated_at)
     VALUES (?, 'th', 'published', 'hello', 'บทความแรก', 'บทความทดลองสำหรับดูหน้าแรก', ?, ?)`,
    [postId, now, now]
  );
  await close();
  console.log('seeded 2 tags and 1 post into data/project-editor-check');
});
EOF
```

Expected: `seeded 2 tags and 1 post into data/project-editor-check`

- [ ] **Step 10: ตรวจ editor โปรเจกต์ใน browser**

**Owner:** ทำทุกข้อข้างล่างใน Chrome หรือ Edge บนเครื่องนี้ แล้วบอก executor ว่าผ่านครบหรือข้อไหนไม่ผ่าน executor ต้องหยุดรอคำตอบและห้าม commit ถ้ามีข้อที่ไม่ผ่าน ข้อ 8 ถึง 11 คือการตรวจของ Phase 4 ใน spec ข้อ 3.5

1. ใน Git Bash ที่ root ของโปรเจกต์ รัน `DATA_DIR=data/project-editor-check PORT=3001 SITE_URL=http://localhost:3001 npm start` ต้องเห็น `Listening on http://localhost:3001`
2. เปิด `http://localhost:3001/admin/login` login ด้วย passphrase จาก Task 8 Step 22 แล้วคลิกเมนู โปรเจกต์ หน้า `/admin/projects` ต้องมีเมนู โปรเจกต์ เป็นตัวหนา, หัวข้อ โปรเจกต์, ลิงก์ เพิ่มโปรเจกต์ใหม่ ที่ดูเป็นปุ่มอยู่ทางขวา และข้อความ ยังไม่มีโปรเจกต์
3. คลิก เพิ่มโปรเจกต์ใหม่ หน้า `/admin/projects/new` ต้องมีหัวข้อ โปรเจกต์ใหม่ พร้อมปุ่ม บันทึก ทางขวา, ช่อง ภาพ thumbnail, ช่อง ลิงก์ repo กับ ลิงก์ demo อยู่แถวเดียวกัน, ช่อง ลำดับ ที่มีเลข 0 อยู่แถวเดียวกับ checkbox ปักหมุดเป็นโปรเจกต์เด่น ที่ยังไม่ติ๊ก, checkbox แท็ก nodejs sqlite, กล่อง ไทย · แบบร่าง ที่เปิดอยู่ และกล่อง English · ไม่มีฉบับแปล ที่ปิดอยู่
4. กด F12 ไปแท็บ Network ในกล่อง ไทย พิมพ์หัวข้อ `เว็บพอร์ตโฟลิโอ` เว้นช่อง slug ว่าง พิมพ์ `github.com/example/portfolio` ในช่อง ลิงก์ repo แล้วกด บันทึก ด้านบน browser ต้องขึ้นกล่องเตือนที่ช่อง ลิงก์ repo และแท็บ Network ต้องไม่มี request ใหม่
5. แก้ช่อง ลิงก์ repo เป็น `https://github.com/example/portfolio` แล้วกด บันทึก request `projects` ต้องได้สถานะ 400 หน้ามีกล่อง ยังไม่ได้บันทึก กรุณาแก้ตามรายการนี้ ที่มีบรรทัด ฉบับไทย: กรุณาใส่ slug ภาษาอังกฤษ (a-z, 0-9, -) และหัวข้อกับลิงก์ repo ยังอยู่ครบ
6. พิมพ์ `portfolio` ในช่อง slug เปลี่ยนสถานะเป็น เผยแพร่ แก้ลำดับเป็น `2` ติ๊ก ปักหมุดเป็นโปรเจกต์เด่น กับแท็ก nodejs แล้วกด บันทึก ช่อง URL ต้องเป็น `/admin/projects/1?saved=1` หน้ามีกล่อง บันทึกแล้ว และใต้ช่อง slug ของกล่อง ไทย มีข้อความ ฉบับนี้เผยแพร่แล้ว ถ้าแก้ slug ลิงก์เดิมจะใช้ไม่ได้
7. แก้หัวข้อในกล่อง ไทย เป็น `ชื่อใหม่ที่ยังไม่บันทึก` แล้วกด ดูตัวอย่าง ในกล่อง ไทย browser ต้องเปิดแท็บใหม่ที่ `/admin/projects/preview/th` ซึ่งมีแถบสีน้ำเงิน ตัวอย่าง ยังไม่ได้บันทึก อยู่บนสุด ตามด้วย header ของเว็บ หัวข้อ ชื่อใหม่ที่ยังไม่บันทึก ลิงก์ ซอร์สโค้ด และชิป โหนดเจเอส ปิดแท็บนั้น แล้วแก้หัวข้อในกล่อง ไทย กลับเป็น `เว็บพอร์ตโฟลิโอ` โดยยังไม่กด บันทึก
8. คลิกเมนู โปรเจกต์ แล้วคลิก เพิ่มโปรเจกต์ใหม่ สร้างโปรเจกต์ที่สองโดยพิมพ์หัวข้อ `โปรเจกต์ที่สอง`, slug `second`, สถานะ เผยแพร่, ลำดับ `1` และติ๊ก ปักหมุดเป็นโปรเจกต์เด่น แล้วกด บันทึก ช่อง URL ต้องเป็น `/admin/projects/2?saved=1` จากนั้นเปิด `/admin/projects` แถวแรกต้องเป็น โปรเจกต์ที่สอง ตามด้วย เว็บพอร์ตโฟลิโอ ทั้งสองแถวมีคำว่า ปักหมุด ในคอลัมน์ หน้าแรก และมีเลข 1 กับ 2 ในคอลัมน์ ลำดับ
9. เปิด `http://localhost:3001/th/projects` การ์ดต้องเรียงเป็น โปรเจกต์ที่สอง แล้วจึง เว็บพอร์ตโฟลิโอ จากนั้นเปิด `http://localhost:3001/th` section โปรเจกต์เด่น ต้องมีสองการ์ดนี้ในลำดับเดียวกัน และอยู่ก่อน section บทความล่าสุด
10. เปิด `http://localhost:3001/admin/projects/1` แก้ลำดับเป็น `0` แล้วกด บันทึก จากนั้น reload หน้า `/th/projects` และ `/th` การ์ด เว็บพอร์ตโฟลิโอ ต้องขึ้นก่อน โปรเจกต์ที่สอง ทั้งสองหน้า
11. สร้างโปรเจกต์ที่สามที่มีหัวข้อ `โปรเจกต์ธรรมดา`, slug `plain`, สถานะ เผยแพร่, ลำดับ `-5` และไม่ติ๊กปักหมุด แล้วกด บันทึก หน้า `/th/projects` ต้องมี โปรเจกต์ธรรมดา เป็นการ์ดสุดท้ายแม้เลขลำดับจะน้อยที่สุด และหน้า `/th` ต้องไม่มีโปรเจกต์นี้
12. เปิด `http://localhost:3001/admin/projects/1` เปิดกล่อง English เลือกสถานะ แบบร่าง พิมพ์หัวข้อ `Portfolio site` โดยเว้น slug ว่าง แล้วกด บันทึก ช่อง slug ของ English ต้องเป็น `portfolio-site` และกล่อง English ยังเปิดอยู่ จากนั้นเปลี่ยนสถานะของ English เป็น ไม่มีฉบับนี้ ต้องมีกล่องถาม ลบฉบับภาษานี้เมื่อบันทึก? กด Cancel แล้ว select ต้องกลับเป็น แบบร่าง
13. กด Ctrl+Shift+M ตั้งความกว้าง 400 ความสูง 900 แล้วเปิด `/admin/projects`, `/admin/projects/new` และ `/admin/projects/1` ทีละหน้า ทั้งธีมสว่างและมืด โดยสลับธีมด้วย Rendering > prefers-color-scheme แบบ Task 6 Step 12 ข้อ 3 เพราะหน้า admin ไม่มีปุ่มธีม ทุกหน้าต้องไม่มี scrollbar แนวนอนของทั้งหน้า ตารางรายการเลื่อนแนวนอนได้ในกรอบของตัวเอง และใน editor ช่อง ลิงก์ demo อยู่ใต้ช่อง ลิงก์ repo และ checkbox ปักหมุดเป็นโปรเจกต์เด่น อยู่ใต้ช่อง ลำดับ โดยติ๊กกับข้อความยังอยู่บรรทัดเดียวกัน จากนั้นปิด device toolbar แล้วตั้ง Rendering กลับเป็น `No emulation`
14. เปิด `http://localhost:3001/admin/projects/3` เลื่อนลงล่างสุดแล้วกด ลบโปรเจกต์ ต้องมีกล่องถาม ลบโปรเจกต์นี้? กด Cancel หน้าต้องอยู่ที่เดิม กด ลบโปรเจกต์ อีกครั้งแล้วกด OK ต้องกลับมาที่ `/admin/projects` ที่ไม่มีแถว โปรเจกต์ธรรมดา แล้ว และ `http://localhost:3001/th/projects/plain` ต้องได้หน้า ไม่พบหน้านี้
15. กลับไปที่ Git Bash แล้วกด Ctrl+C เพื่อหยุด server

ตอนเขียนแผนตรวจลำดับของข้อ 8 ถึง 11 และ preview ของข้อ 7 ด้วยคำสั่งของ Step 5 และ 6 แล้ว ส่วนหน้าตาของข้อ 3, 12, 13 และ 14 ตรวจด้วย Edge แบบ headless ผ่าน DevTools Protocol ที่ความกว้าง 400 และ 1024px กับ DB ของ Step 9 ที่เพิ่มโปรเจกต์หนึ่งตัวผ่าน `POST /admin/projects` (ฉบับไทย published และฉบับอังกฤษ draft) โดยตอบกล่อง `confirm` ผ่าน `Page.handleJavaScriptDialog` ความกว้าง 400 จำลองเป็นมือถือ (`mobile: true` ของ `Emulation.setDeviceMetricsOverride`) ซึ่ง scrollbar ไม่กินความกว้างของหน้า ส่วน 1024px เป็นโหมด desktop ที่ scrollbar แนวตั้งกว้าง 15px ค่าที่วัดได้มีดังนี้

- ที่ความกว้าง 400 หน้า `/admin/projects`, `/admin/projects/new` และ `/admin/projects/1` มี `scrollWidth` เท่ากับ `clientWidth` และตารางกว้าง 576px เลื่อนในกรอบ 368px
- `.field-pair` เป็นคอลัมน์เดียว `368px` ที่ 400px และ `464.5px 464.5px` ที่ 1024px ช่อง ลิงก์ repo กับ ลิงก์ demo อยู่ที่ตำแหน่งแนวตั้งเดียวกันที่ 1024px และช่อง demo อยู่ต่ำกว่า 106px ที่ 400px
- label ของ checkbox ปักหมุดเป็น `display: flex` สูง 34px โดยมี checkbox อยู่ในบรรทัดเดียวกับข้อความ
- ช่อง ลิงก์ repo ที่มีค่า `github.com/x` ได้ `validity.typeMismatch` เป็น `true` ส่วน `https://github.com/x` ผ่าน และช่อง ลำดับ ที่มีค่า `1.5` ได้ `validity.stepMismatch` เป็น `true` ส่วน `-3` ผ่าน
- editor ใหม่มีกล่อง ไทย เปิดและ English ปิด ส่วน editor ของโปรเจกต์ที่มีฉบับอังกฤษเปิดทั้งสองกล่อง
- `confirm` ถูกเรียกด้วยข้อความ ลบฉบับภาษานี้เมื่อบันทึก? และเมื่อตอบ Cancel select กลับเป็น `draft` ส่วนฟอร์มลบเรียก `confirm` ด้วยข้อความ ลบโปรเจกต์นี้? และเมื่อตอบ Cancel หน้ายังอยู่ที่ `/admin/projects/1`

- [ ] **Step 11: ลบ DB ทดลอง**

Run: `rm -rf data/project-editor-check; test -e data/project-editor-check && echo LEFT || echo REMOVED`
Expected: `REMOVED`

ถ้าได้ `LEFT` แปลว่า server จาก Step 10 ยังไม่หยุด ให้กด Ctrl+C ในหน้าต่างนั้นแล้วรันคำสั่งนี้อีกครั้ง

- [ ] **Step 12: ตรวจว่ามีแค่ไฟล์ของ task นี้ที่เปลี่ยน**

Run: `git status --short`
Expected:

```
 M src/routes/admin.js
?? src/routes/admin-projects.js
?? views/admin/project-edit.ejs
?? views/admin/projects.ejs
```

ถ้ามีบรรทัดอื่นนอกจากนี้ เช่น `.env`, `data/` หรือ `.claude/` ห้าม add ไฟล์นั้นและให้หยุดถามเจ้าของ

- [ ] **Step 13: Commit**

```bash
git add src/routes/admin-projects.js src/routes/admin.js views/admin/projects.ejs views/admin/project-edit.ejs
git commit -m "feat: add project editor with featured flag, sort order, preview and delete"
```

Expected:

```
[main 356f2d0] feat: add project editor with featured flag, sort order, preview and delete
 4 files changed, 402 insertions(+)
 create mode 100644 src/routes/admin-projects.js
 create mode 100644 views/admin/project-edit.ejs
 create mode 100644 views/admin/projects.ejs
```

Run: `git status --short | wc -l`
Expected: `0`

## Phase 5: แท็ก, upload และ About

Phase นี้ทำให้เจ้าของดูแลเนื้อหาได้ครบจากหน้า admin คือหน้าจัดการแท็กกับหน้าแท็กสาธารณะ (Task 14), การอัปโหลดรูปพร้อม `public/js/admin.js` (Task 15) และหน้า settings, หน้า About กับปุ่มออกจากระบบทุกเครื่อง (Task 16) พอจบ phase นี้ `npm test` จะผ่าน 14 tests (เพิ่ม 11, 13 และ 14)

- ทุกคำสั่งรันใน Git Bash ที่ root ของโปรเจกต์ `/d/Ikkyusan/Downloads/TalkAlways_MVP/talkalways` และ `node -v` ต้องได้ `v24.21.0`
- Expected ทุกบรรทัดของ Task 14 และ 15 มาจากการรันจริงบน Node 24.21.0 ในโฟลเดอร์ทดลองที่สร้างจากโค้ดในแผนนี้ตามลำดับตั้งแต่ Task 4 path ใน output เปลี่ยนเป็น path จริงของโปรเจกต์แล้ว ส่วนตัวเลขเวลา เช่น `(137.3461ms)` และ `duration_ms` จะไม่ตรงกัน
- คำสั่ง git ของ Task 14 และ 15 ซ้อมใน repo ทิ้งได้ที่มีไฟล์ของ Task 4 ถึง 13 commit ไว้แล้ว เลข commit hash จึงไม่ตรงกัน
- ถ้า output จริงต่างจาก Expected ในเรื่องอื่นนอกจาก path, เวลา และ commit hash ให้หยุดและหาสาเหตุก่อนทำ step ถัดไป

### Task 14: จัดการแท็กและหน้าแท็ก

**Phase:** 5 · **Gate tests:** 13-tag-page

**Files:**
- Modify: `test/helpers.js` (เพิ่มฟังก์ชัน `insertTag` ต่อจาก `insertProject` และเพิ่ม `insertTag` ใน `module.exports`)
- Modify: `src/strings.js` (เพิ่ม key `tagTitle` ท้าย object ทั้ง `th` และ `en`)
- Modify: `src/routes/public.js` (เพิ่ม `TAG_LIST_SQL` ต่อจาก `PROJECT_LIST_SQL` และเพิ่ม route `GET /tags/:slug` ก่อน `module.exports`)
- Modify: `views/blog.ejs` (เปลี่ยนสองบรรทัด คือ `const base` กับ `<h1>`)
- Modify: `src/routes/admin.js` (เพิ่ม `transaction` กับ `toSlug` ในส่วน require และเพิ่ม `parseId`, `text`, `renderTags`, `saveTag` กับ route ของ `/tags` ต่อจากบรรทัดของ `/projects`)
- Create: `views/admin/tags.ejs`
- Test: `test/13-tag-page.test.js`

**Interfaces:**
- Consumes:
  - `src/db.js` จาก Task 5: `run(sql, params)`, `get(sql, params)`, `all(sql, params)`, `transaction(fn)` ที่ต่อคิวให้ทำงานทีละตัวและ `ROLLBACK` เมื่อ `fn` throw และตาราง `tags (id, slug UNIQUE, name_th, name_en)`, `post_tags`, `project_tags` ที่อ้าง `tags(id)` ด้วย `ON DELETE CASCADE`
  - `src/slug.js` จาก Task 10: `toSlug(s) -> string`
  - `src/routes/public.js` จาก Task 9 และ 12: `LIST_SQL` ที่รับ `[lang, lang, limit, offset]`, `PAGE_SIZE`, `pageNumber(req) -> number | null`, `router.use` ที่ใส่ `res.locals.settings` และกติกาที่ route ใหม่เพิ่มก่อน `module.exports`
  - `views/blog.ejs` จาก Task 9: render ด้วย `{ posts, page, hasNext, tag, meta }` ที่ยังไม่อ่าน `tag` และมีบรรทัด `const base = '/' + lang + '/blog';` กับ `<h1><%= t.navBlog %></h1>`
  - `views/partials/header.ejs` จาก Task 5: ลิงก์สลับภาษาใช้ href ของอีกภาษาจาก `meta.alternates` โดยตัด query ทิ้ง
  - `views/post.ejs` จาก Task 9: ชิปแท็กลิงก์ไป `/<lang>/tags/<slug>` ซึ่งได้ 404 จนถึง task นี้
  - `src/routes/admin.js` จาก Task 8 และ 13: `express.urlencoded({ extended: true, limit: '1mb' })`, `router.use(requireAdmin)` และท้ายไฟล์ที่เป็น `router.use('/posts', require('./admin-posts'))`, `router.use('/projects', require('./admin-projects'))` แล้วจึง `module.exports`
  - `views/admin/head.ejs` จาก Task 8 ที่เรียกด้วย `<%- include('head', { title, section: 'tags' }) %>` และมีเมนู แท็ก ไป `/admin/tags` อยู่แล้ว กับ class `page-head`, `form-saved`, `form-error`, `admin-form`, `field-pair`, `field-hint`, `admin-empty`, `table-scroll`, `admin-table` ใน `public/css/admin.css` จาก Task 8 และ 10
  - `test/helpers.js` จาก Task 12: `start()`, `H.req`, `H.login`, `insertPost`, `insertProject`, `run`, `get`, `all`
- Produces:
  - `test/helpers.js`: `module.exports = { start, toForm, insertPost, insertProject, insertTag, signCookie, run, get, all }` ครบตามหัวข้อ `test/helpers.js` ใน Interfaces ของ plan
    - `insertTag({ slug, name_th, name_en }) -> Promise<number>` คืน `tags.id` ที่ส่งเข้า `tags` ของ `insertPost` กับ `insertProject` ได้ ถ้าไม่ส่งชื่อ ชื่อทั้งสองภาษาจะเท่ากับ slug
  - `src/strings.js`: key ใหม่ `tagTitle` คือ `บทความที่ติดแท็ก` และ `Posts tagged`
  - `src/routes/public.js`: ลำดับ route คือ `GET /`, `GET /blog`, `GET /blog/:slug`, `GET /projects`, `GET /projects/:slug`, `GET /tags/:slug` แล้วจึง `module.exports` route ของ Task 16, 17 และ 19 เพิ่มก่อน `module.exports`
    - `TAG_LIST_SQL` คือ `LIST_SQL` ที่มี `JOIN post_tags pt ON pt.post_id = t.post_id AND pt.tag_id = ?` ต่อจาก join ของ `posts` รับ params `[tagId, lang, lang, limit, offset]` และคืน card row รูปเดียวกับ `LIST_SQL`
    - `GET /tags/:slug` render `blog` ด้วย `{ posts, page, hasNext, tag, meta }` โดย `tag = { slug, name }` ที่ `name` เป็นชื่อในภาษาของหน้า และ `meta` มี `title` เป็น `t.tagTitle + ' ' + tag.name` (หน้า N ที่มากกว่า 1 ต่อท้ายด้วย ` · หน้า N`), `canonical` เป็น `/<lang>/tags/<slug>` ที่มี `?page=N` เมื่อ N มากกว่า 1, `alternates` ครบสองภาษา และ `type: 'website'`
  - `views/blog.ejs`: เมื่อ `tag` ไม่ใช่ `null` หัวข้อเป็น `<t.tagTitle> <tag.name>` และลิงก์ pagination ใช้ `/<lang>/tags/<slug>` เป็นฐาน
  - `src/routes/admin.js`: route `GET /tags`, `POST /tags`, `POST /tags/:id`, `POST /tags/:id/delete` ครบตาม admin route table ของ spec ข้อ 2.4 ท้ายไฟล์เรียงเป็น `/posts`, `/projects`, ฟังก์ชันและ route ของแท็ก แล้วจึง `module.exports`
    - `POST /admin/tags` กับ `POST /admin/tags/:id` ที่บันทึกได้ตอบ 303 ไป `/admin/tags?saved=1` ส่วนที่ไม่ผ่าน validation ตอบ 400 และ render หน้าเดิมพร้อมค่าที่พิมพ์ `POST /admin/tags/:id/delete` ตอบ 303 ไป `/admin/tags`
    - `parseId(value) -> number | null` และ `text(value) -> string` เป็นชื่อภายในไฟล์ที่ route ของ Task 15 และ 16 ในไฟล์นี้ใช้ซ้ำได้ Task 15 เพิ่ม `POST /upload` ต่อจาก route ลบแท็ก และ Task 16 เพิ่ม route ของ `/settings` ต่อจากนั้น ทั้งคู่อยู่ก่อน `module.exports`
  - `views/admin/tags.ejs`: `render('admin/tags', { tags, edit, errors, saved })` โดย `tags` คือ `[{ id, slug, name_th, name_en, posts, projects }]` ที่ `posts` กับ `projects` คือจำนวนบทความและโปรเจกต์ที่ติดแท็กนั้นรวม draft, `edit` คือ `{ id, slug, name_th, name_en }` ของฟอร์มที่ไม่ผ่าน validation โดย `id` เป็น `null` เมื่อเป็นฟอร์มเพิ่มแท็ก หรือเป็น `null` ทั้งก้อนเมื่อไม่มี error, `errors` มี key `name_th`, `name_en`, `slug` และ `saved` เป็น boolean
  - task นี้ไม่มี CSS ใหม่ หน้าแท็กสาธารณะใช้ `views/blog.ejs` กับ CSS ของ Task 9 ส่วนหน้า admin ใช้ class ของ Task 8 และ 10

- ข้อความ UI ของหน้า admin เป็นภาษาไทยอย่างเดียวตาม Global Constraints ส่วน key ใหม่ใน `src/strings.js` มีแค่ `tagTitle` ของหน้าแท็กสาธารณะ

- [ ] **Step 1: เพิ่ม insertTag ใน test/helpers.js**

แก้ `test/helpers.js` สองจุด ส่วนอื่นของไฟล์ไม่เปลี่ยนจาก Task 12

- insert ด้วย SQL ตรงผ่าน `run` แบบเดียวกับ `insertPost` และ `insertProject` แล้วคืน id ที่ test ส่งต่อให้ `tags` ของสองฟังก์ชันนั้น
- ชื่อทั้งสองภาษามีค่า default เป็น slug เพราะคอลัมน์ `name_th` กับ `name_en` เป็น `NOT NULL`

จุดที่ 1: แทนที่ท้ายฟังก์ชัน `insertProject` ซึ่งตอนนี้คือ

```js
  for (const tagId of tags) {
    await run('INSERT INTO project_tags (project_id, tag_id) VALUES (?, ?)', [id, tagId]);
  }
  return id;
}
```

ด้วยข้อความนี้

```js
  for (const tagId of tags) {
    await run('INSERT INTO project_tags (project_id, tag_id) VALUES (?, ?)', [id, tagId]);
  }
  return id;
}

// Inserts a tag straight into the DB and returns its id, which insertPost and insertProject take in tags.
// Both names default to the slug, so a test that does not care about names can pass the slug alone.
async function insertTag({ slug, name_th = slug, name_en = slug } = {}) {
  const { lastID } = await run('INSERT INTO tags (slug, name_th, name_en) VALUES (?, ?, ?)', [slug, name_th, name_en]);
  return lastID;
}
```

จุดที่ 2: แทนที่บรรทัดสุดท้ายของไฟล์ ซึ่งตอนนี้คือ

```js
module.exports = { start, toForm, insertPost, insertProject, signCookie, run, get, all };
```

ด้วยข้อความนี้

```js
module.exports = { start, toForm, insertPost, insertProject, insertTag, signCookie, run, get, all };
```

- [ ] **Step 2: เขียน test ที่ต้อง fail**

สร้าง `test/13-tag-page.test.js` สองข้อของ spec ข้อ 3.4 test 13 อยู่ตรงคอมเมนต์ `spec test 13, case 1` และ `case 2` และตรวจก่อนจะเพิ่มบทความหรือโปรเจกต์ตัวอื่น

- ข้อ "มีแค่ตัวที่ published" อ่าน `href` ของทุกการ์ดในหน้า ต้องได้แค่ `/th/blog/published-post` และหน้าไม่มีทั้งชื่อเรื่องและ slug ของ draft
- ส่วนหน้าแท็กสาธารณะตรวจเพิ่มว่า บทความของแท็กอื่นกับโปรเจกต์ที่ติดแท็กเดียวกันไม่ขึ้น เพราะหน้าแท็กแสดงเฉพาะโพสต์ตาม spec ข้อ 2.1, หัวข้อกับ `<title>` ใช้ชื่อแท็กในภาษาของหน้า, canonical, hreflang ของอีกภาษา และลิงก์สลับภาษาไป `/en/tags/docker` ตาม spec ข้อ 2.2, หน้า `/en` แสดงบทความไทยเป็นการ์ดไทยพร้อม badge, แท็กที่ยังไม่มีบทความ published ได้รายการว่างไม่ใช่ 404, ชิปแท็กในหน้าบทความพาไปหน้าที่มีอยู่จริง, pagination ของหน้าแท็กทำงานแบบเดียวกับ `/blog` รวมถึงลิงก์กลับหน้า 1 ที่ไม่มี `?page=1` และลิงก์สลับภาษาที่ไม่พก `page` และ slug ที่ percent-encode พังได้ 400
- ส่วนหน้า admin ตรวจว่า guard คุม `/admin/tags`, แต่ละแถวเป็นฟอร์มของตัวเองที่ช่องกรอกสามช่องชี้มาด้วย `form=`, ฟอร์มลบมี `confirm`, slug ที่เว้นว่างได้จาก `toSlug(name_en)` ตาม spec ข้อ 2.3, บังคับกรอกทั้งสองชื่อตาม spec ข้อ 2.4, slug ที่พิมพ์เป็นภาษาไทยจนเหลือค่าว่างได้ error, ข้อความที่พิมพ์ยังอยู่และถูก escape, field ที่ถูกส่งซ้ำไม่กลายเป็น 500, slug ซ้ำได้ 400 พร้อมข้อความ, แก้ slug แล้วหน้าแท็กย้ายไป slug ใหม่, การบันทึกแถวเดิมด้วย slug ของตัวเองไม่นับว่าซ้ำ, ลบแท็กแล้ว `post_tags` กับ `project_tags` หายไปเองด้วย `ON DELETE CASCADE` ตาม spec ข้อ 2.4 แต่บทความกับโปรเจกต์ยังอยู่ และ `:id` ที่ไม่ใช่จำนวนเต็มบวกหรือหาไม่เจอได้ 404 ทุก route

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { start, insertTag, insertPost, insertProject, get } = require('./helpers');
const strings = require('../src/strings');

test('13 tag page', async () => {
  const h = await start();
  try {
    const cards = html => html.match(/<article class="card"[^]*?<\/article>/g) || [];
    const hrefs = html => cards(html).map(c => c.match(/href="([^"]*)"/)[1]);
    const count = async (sql, params = []) => (await get(sql, params)).n;

    const docker = await insertTag({ slug: 'docker', name_th: 'ด็อกเกอร์', name_en: 'Docker' });
    const sqlite = await insertTag({ slug: 'sqlite', name_th: 'เอสคิวไลต์', name_en: 'SQLite' });
    await insertTag({ slug: 'unused', name_th: 'แท็กที่ยังไม่มีบทความ', name_en: 'Unused' });

    // spec test 13, case 1: a slug that is not a tag
    let r = await h.req('/th/tags/no-such-tag');
    assert.equal(r.status, 404);

    // spec test 13, case 2: a tag on one published post and one draft lists only the published post
    await insertPost({ tags: [docker], th: { slug: 'published-post', title: 'บทความที่เผยแพร่แล้ว', published_at: '2026-09-01T00:00:00.000Z' } });
    await insertPost({ tags: [docker], th: { status: 'draft', slug: 'draft-post', title: 'บทความที่ยังเป็นแบบร่าง' } });
    r = await h.req('/th/tags/docker');
    assert.equal(r.status, 200);
    assert.deepEqual(hrefs(r.text), ['/th/blog/published-post']);
    assert.ok(!r.text.includes('บทความที่ยังเป็นแบบร่าง'), r.text);
    assert.ok(!r.text.includes('draft-post'), r.text);

    // a post of another tag and a project with this tag stay off the page, because the tag page lists posts only
    await insertPost({ tags: [sqlite], th: { slug: 'other-tag', title: 'บทความของแท็กอื่น' } });
    await insertProject({ tags: [docker], th: { slug: 'docker-project', title: 'โปรเจกต์ที่ติดแท็กนี้' } });
    r = await h.req('/th/tags/docker');
    assert.deepEqual(hrefs(r.text), ['/th/blog/published-post']);
    assert.ok(!r.text.includes('โปรเจกต์ที่ติดแท็กนี้'), r.text);
    // heading, title, canonical, hreflang of both languages and the switch link, like the other list pages
    assert.ok(r.text.includes('<h1>' + strings.th.tagTitle + ' ด็อกเกอร์</h1>'), r.text);
    assert.ok(r.text.includes('<title>' + strings.th.tagTitle + ' ด็อกเกอร์ | Portfolio</title>'), r.text);
    assert.ok(r.text.includes('<link rel="canonical" href="http://test.local/th/tags/docker">'), r.text);
    assert.ok(r.text.includes('<link rel="alternate" hreflang="en" href="http://test.local/en/tags/docker">'), r.text);
    assert.ok(r.text.includes('class="lang-switch" href="/en/tags/docker" lang="en" hreflang="en"'), r.text);

    // /en uses the English tag name and shows the Thai-only post as a Thai card with a badge
    r = await h.req('/en/tags/docker');
    assert.equal(r.status, 200);
    assert.ok(r.text.includes('<h1>' + strings.en.tagTitle + ' Docker</h1>'), r.text);
    const card = cards(r.text)[0];
    assert.ok(card.startsWith('<article class="card" lang="th">'), card);
    assert.ok(card.includes(strings.en.badgeOtherLang), card);

    // a tag that exists but has no published post is an empty list, not a 404
    r = await h.req('/th/tags/unused');
    assert.equal(r.status, 200);
    assert.ok(r.text.includes('<p class="empty">' + strings.th.noPosts + '</p>'), r.text);

    // the tag chips on the post page now lead to a page
    r = await h.req('/th/blog/published-post');
    assert.ok(r.text.includes('<a class="tag" href="/th/tags/docker">ด็อกเกอร์</a>'), r.text);

    // pagination works like /blog: 10 per page, page 1 without ?page, and a page that is not there is a 404
    for (let i = 1; i <= 10; i++) {
      const day = String(i).padStart(2, '0');
      await insertPost({ tags: [docker], th: { slug: 'page-' + i, title: 'ลำดับ ' + i, published_at: '2026-08-' + day + 'T00:00:00.000Z' } });
    }
    r = await h.req('/th/tags/docker');
    assert.equal(hrefs(r.text).length, 10);
    assert.ok(r.text.includes('<a class="pagination-older" href="/th/tags/docker?page=2">'), r.text);
    r = await h.req('/th/tags/docker?page=2');
    assert.equal(r.status, 200);
    assert.deepEqual(hrefs(r.text), ['/th/blog/page-1']);
    assert.ok(r.text.includes('<a class="pagination-newer" href="/th/tags/docker">'), r.text);
    assert.ok(r.text.includes('<link rel="canonical" href="http://test.local/th/tags/docker?page=2">'), r.text);
    assert.ok(r.text.includes('class="lang-switch" href="/en/tags/docker" lang="en" hreflang="en"'), r.text);
    for (const query of ['?page=3', '?page=abc', '?page=0']) {
      assert.equal((await h.req('/th/tags/docker' + query)).status, 404, query);
    }
    assert.equal((await h.req('/th/tags/%E0%')).status, 400);

    // admin: the tags page and its mutations sit behind the guard
    const countTags = () => count('SELECT COUNT(*) AS n FROM tags');
    r = await h.req('/admin/tags');
    assert.equal(r.status, 302);
    assert.equal(r.location, '/admin/login');
    r = await h.req('/admin/tags', { method: 'POST', form: { slug: 'x', name_th: 'x', name_en: 'x' } });
    assert.equal(r.status, 302);
    assert.equal(await countTags(), 3);

    await h.login();
    r = await h.req('/admin/tags');
    assert.equal(r.status, 200);
    assert.ok(r.text.includes('<a href="/admin/tags" aria-current="page">แท็ก</a>'), r.text);
    assert.ok(r.text.includes('<form class="admin-form" method="post" action="/admin/tags">'), r.text);
    // each row is a form of its own: the three inputs point at it with form=, and delete asks first
    const rowForm = 'tag-' + docker;
    assert.ok(r.text.includes('<form id="' + rowForm + '" method="post" action="/admin/tags/' + docker + '">'), r.text);
    assert.equal((r.text.match(new RegExp('form="' + rowForm + '"', 'g')) || []).length, 3, r.text);
    assert.ok(r.text.includes('<input form="' + rowForm + '" name="name_th" value="ด็อกเกอร์"'), r.text);
    const dockerRow = r.text.split('<tr>').find(chunk => chunk.includes('form="' + rowForm + '"'));
    assert.ok(dockerRow.includes('<td>12</td>') && dockerRow.includes('<td>1</td>'), dockerRow);
    assert.ok(r.text.includes('<form method="post" action="/admin/tags/' + docker + '/delete" onsubmit="return confirm(\'ลบแท็กนี้?\')">'), r.text);

    // create: an empty slug comes from name_en (spec 2.3)
    r = await h.req('/admin/tags', { method: 'POST', form: { slug: '', name_th: 'โหนดเจเอส', name_en: 'Node.js' } });
    assert.equal(r.status, 303);
    assert.equal(r.location, '/admin/tags?saved=1');
    assert.deepEqual(
      await get("SELECT slug, name_th, name_en FROM tags WHERE name_en = 'Node.js'"),
      { slug: 'node-js', name_th: 'โหนดเจเอส', name_en: 'Node.js' }
    );
    r = await h.req(r.location);
    assert.ok(r.text.includes('<p class="form-saved" role="status">บันทึกแล้ว</p>'), r.text);
    // the new tag is a choice in the post editor
    r = await h.req('/admin/posts/new');
    assert.ok(r.text.includes('> node-js</label>'), r.text);

    // both names are required, a typed slug that strips to nothing is an error, and what was typed stays, escaped
    r = await h.req('/admin/tags', { method: 'POST', form: { slug: 'ภาษาไทย', name_th: '', name_en: '<b>Design</b>' } });
    assert.equal(r.status, 400);
    assert.ok(r.text.includes('<li>แท็กใหม่: กรุณาใส่ชื่อภาษาไทย</li>'), r.text);
    assert.ok(r.text.includes('<li>แท็กใหม่: กรุณาใส่ slug ภาษาอังกฤษ (a-z, 0-9, -)</li>'), r.text);
    assert.ok(r.text.includes('<input name="name_en" value="&lt;b&gt;Design&lt;/b&gt;"'), r.text);
    assert.ok(r.text.includes('<input name="slug" value="ภาษาไทย"'), r.text);
    assert.ok(!r.text.includes('<b>Design</b>'), r.text);
    r = await h.req('/admin/tags', { method: 'POST', form: { slug: 'design', name_th: 'ดีไซน์', name_en: '' } });
    assert.equal(r.status, 400);
    assert.ok(r.text.includes('<li>แท็กใหม่: กรุณาใส่ชื่อภาษาอังกฤษ</li>'), r.text);
    // a field sent twice arrives as an array, which counts as empty and never becomes a 500
    r = await h.req('/admin/tags', { method: 'POST', form: { slug: 'twice', name_th: ['a', 'b'], name_en: 'Twice' } });
    assert.equal(r.status, 400);
    assert.equal(await countTags(), 4);

    // a slug that another tag uses is a 400 with a message, not a 500; toSlug runs first, so Docker is docker
    r = await h.req('/admin/tags', { method: 'POST', form: { slug: 'Docker', name_th: 'ซ้ำ', name_en: 'Duplicate' } });
    assert.equal(r.status, 400);
    assert.ok(r.text.includes('<li>แท็กใหม่: slug นี้ถูกใช้แล้วในแท็กอื่น</li>'), r.text);
    assert.equal(await countTags(), 4);

    // update: new names and a new slug, and the tag page moves to the new slug
    r = await h.req('/admin/tags/' + docker, { method: 'POST', form: { slug: 'containers', name_th: 'คอนเทนเนอร์', name_en: 'Containers' } });
    assert.equal(r.status, 303);
    assert.equal(r.location, '/admin/tags?saved=1');
    assert.deepEqual(
      await get('SELECT slug, name_th, name_en FROM tags WHERE id = ?', [docker]),
      { slug: 'containers', name_th: 'คอนเทนเนอร์', name_en: 'Containers' }
    );
    assert.equal((await h.req('/th/tags/docker')).status, 404);
    r = await h.req('/en/tags/containers');
    assert.equal(r.status, 200);
    assert.ok(r.text.includes('<h1>' + strings.en.tagTitle + ' Containers</h1>'), r.text);

    // saving a tag with its own slug is not a clash; the slug of another tag is, and the row keeps what was typed
    r = await h.req('/admin/tags/' + docker, { method: 'POST', form: { slug: 'containers', name_th: 'คอนเทนเนอร์', name_en: 'Containers' } });
    assert.equal(r.status, 303);
    r = await h.req('/admin/tags/' + docker, { method: 'POST', form: { slug: 'sqlite', name_th: 'ชื่อที่พิมพ์ไว้', name_en: 'Containers' } });
    assert.equal(r.status, 400);
    assert.ok(r.text.includes('<li>แท็ก containers: slug นี้ถูกใช้แล้วในแท็กอื่น</li>'), r.text);
    assert.ok(r.text.includes('<input form="' + rowForm + '" name="name_th" value="ชื่อที่พิมพ์ไว้"'), r.text);
    assert.equal((await get('SELECT slug FROM tags WHERE id = ?', [docker])).slug, 'containers');

    // delete: post_tags and project_tags go by ON DELETE CASCADE, and the posts and the project stay
    const posts = await count('SELECT COUNT(*) AS n FROM posts');
    assert.equal(await count('SELECT COUNT(*) AS n FROM post_tags WHERE tag_id = ?', [docker]), 12);
    assert.equal(await count('SELECT COUNT(*) AS n FROM project_tags WHERE tag_id = ?', [docker]), 1);
    r = await h.req('/admin/tags/' + docker + '/delete', { method: 'POST' });
    assert.equal(r.status, 303);
    assert.equal(r.location, '/admin/tags');
    assert.equal(await get('SELECT id FROM tags WHERE id = ?', [docker]), undefined);
    assert.equal(await count('SELECT COUNT(*) AS n FROM post_tags WHERE tag_id = ?', [docker]), 0);
    assert.equal(await count('SELECT COUNT(*) AS n FROM project_tags WHERE tag_id = ?', [docker]), 0);
    assert.equal(await count('SELECT COUNT(*) AS n FROM posts'), posts);
    assert.equal(await count('SELECT COUNT(*) AS n FROM projects'), 1);
    assert.equal((await h.req('/th/tags/containers')).status, 404);
    r = await h.req('/th/blog/published-post');
    assert.equal(r.status, 200);
    assert.ok(!r.text.includes('class="tag-list"'), r.text);

    // :id must be a positive integer of a tag that exists, otherwise every :id route is a 404
    const form = { slug: 'should-not-exist', name_th: 'ไม่ควรถูกสร้าง', name_en: 'Should not exist' };
    for (const [method, urlPath] of [
      ['POST', '/admin/tags/' + docker],
      ['POST', '/admin/tags/' + docker + '/delete'],
      ['POST', '/admin/tags/abc'],
      ['POST', '/admin/tags/0/delete'],
      ['POST', '/admin/tags/007'],
      ['GET', '/admin/tags/' + sqlite]
    ]) {
      r = await h.req(urlPath, method === 'POST' ? { method, form } : { method });
      assert.equal(r.status, 404, method + ' ' + urlPath);
    }
    assert.equal(await countTags(), 3);
  } finally {
    await h.stop();
  }
});
```

- [ ] **Step 3: รัน test ให้เห็นว่า fail**

`insertTag` จาก Step 1 ทำงานแล้ว test จึงผ่านบรรทัด insert มาได้ ข้อแรกของ spec ผ่านอยู่แล้วเพราะ path ที่ไม่มี route ได้ 404 และ test ไป fail ที่ `/th/tags/docker` เพราะยังไม่มี route หน้าแท็ก

Run: `node --test test/13-tag-page.test.js`
Expected: FAIL exit code 1 และ output

```
✖ 13 tag page (137.3461ms)
ℹ tests 1
ℹ suites 0
ℹ pass 0
ℹ fail 1
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 660.5801

✖ failing tests:

test at test\13-tag-page.test.js:6:1
✖ 13 tag page (137.3461ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  
  404 !== 200
  
      at TestContext.<anonymous> (D:\Ikkyusan\Downloads\TalkAlways_MVP\talkalways\test\13-tag-page.test.js:25:12)
      at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
      at async Test.run (node:internal/test_runner/test:1409:7)
      at async startSubtestAfterBootstrap (node:internal/test_runner/harness:387:3) {
    generatedMessage: true,
    code: 'ERR_ASSERTION',
    actual: 404,
    expected: 200,
    operator: 'strictEqual',
    diff: 'simple'
  }
```

- [ ] **Step 4: เพิ่มข้อความของหน้าแท็กใน src/strings.js**

แก้ `src/strings.js` สองจุด key 31 ตัวเดิมไม่เปลี่ยนจาก Task 12 และ key ใหม่ `tagTitle` ต่อท้ายทั้งสองภาษา test 02 ตรวจว่า `th` กับ `en` มี key ชุดเดียวกัน

- `tagTitle` ใช้ทั้งใน `<h1>` และ `<title>` ของหน้าแท็ก คู่กับชื่อแท็กในภาษาของหน้า เช่น บทความที่ติดแท็ก ด็อกเกอร์ และ `Posts tagged Docker` ผู้อ่านที่เปิดลิงก์หน้าแท็กจากที่อื่นจึงรู้ว่าหน้านี้คือรายการบทความ ไม่ใช่หน้าอธิบายแท็ก

จุดที่ 1: แทนที่ key สุดท้ายของ `th` ซึ่งตอนนี้คือ

```js
    backToProjects: 'กลับไปหน้ารวมโปรเจกต์'
  },
```

ด้วยข้อความนี้

```js
    backToProjects: 'กลับไปหน้ารวมโปรเจกต์',
    tagTitle: 'บทความที่ติดแท็ก'
  },
```

จุดที่ 2: แทนที่ key สุดท้ายของ `en` ซึ่งตอนนี้คือ

```js
    backToProjects: 'Back to projects'
  }
```

ด้วยข้อความนี้

```js
    backToProjects: 'Back to projects',
    tagTitle: 'Posts tagged'
  }
```

- [ ] **Step 5: เพิ่มหน้าแท็กใน src/routes/public.js**

แก้ `src/routes/public.js` สองจุด ส่วนอื่นของไฟล์ไม่เปลี่ยนจาก Task 12

- `TAG_LIST_SQL` คือ `LIST_SQL` ที่เพิ่มแค่ `JOIN post_tags` ตาม spec ข้อ 2.1 กติกา fallback ของการ์ดอีกภาษาและลำดับ `t.published_at DESC, t.post_id DESC` จึงเหมือนหน้า `/blog` ทุกอย่าง และไม่มีโปรเจกต์เพราะหน้าแท็กแสดงเฉพาะโพสต์
- route หาแท็กจาก slug ก่อน ถ้าไม่เจอเรียก `next()` ซึ่งได้ 404 ถ้าเจอแต่ยังไม่มีบทความ published จะ render รายการว่าง ตาม spec ข้อ 2.1 หลังจากนั้นจึงตรวจ `?page` ด้วย `pageNumber` ตัวเดียวกับ `/blog`
- หน้าแท็กเป็นหน้า list จึงใส่ hreflang ทั้งสองภาษาตาม spec ข้อ 2.2 และ `?page=N` ของสองภาษาเป็นหน้าคู่กันเพราะ fallback query ให้บทความชุดเดียวกันทั้งสองภาษา header ตัด query ออกจากลิงก์สลับภาษาเอง หน้า `/th/tags/sqlite?page=2` จึงได้ลิงก์ `/en/tags/sqlite` ตามตารางใน spec ข้อ 2.2
- canonical สร้างจาก `lang` กับ slug ที่ได้จาก DB ไม่ได้มาจาก `req.originalUrl` และหน้า N ที่มากกว่า 1 มี canonical ชี้ตัวเอง ตาม spec ข้อ 2.2
- `tag` ถูกแปลงเป็น `{ slug, name }` ในภาษาของหน้าตั้งแต่ใน route แบบเดียวกับชิปแท็กของ `GET /blog/:slug` template จึงไม่ต้องรู้จัก `name_th` กับ `name_en`
- Express 5 ส่ง error จาก async handler ต่อให้ error handler เอง จึงไม่มี try/catch

จุดที่ 1: แทนที่ท้าย `PROJECT_LIST_SQL` ซึ่งตอนนี้คือ

```js
  ORDER BY p.featured DESC, p.sort_order, p.id`;

async function loadSettings(lang) {
```

ด้วยข้อความนี้

```js
  ORDER BY p.featured DESC, p.sort_order, p.id`;

// The tag page lists posts only (spec 2.1). This is LIST_SQL with one more join that keeps the posts of one tag,
// so the fallback and the order are the same as /blog. Parameters: [tagId, lang, lang, limit, offset].
const TAG_LIST_SQL = `
  SELECT t.post_id, t.lang, t.slug, t.title, t.excerpt, t.published_at, p.cover_image
  FROM post_translations t
  JOIN posts p ON p.id = t.post_id
  JOIN post_tags pt ON pt.post_id = t.post_id AND pt.tag_id = ?
  WHERE t.status = 'published'
    AND (t.lang = ? OR NOT EXISTS (
          SELECT 1 FROM post_translations x
          WHERE x.post_id = t.post_id AND x.lang = ? AND x.status = 'published'))
  ORDER BY t.published_at DESC, t.post_id DESC
  LIMIT ? OFFSET ?`;

async function loadSettings(lang) {
```

จุดที่ 2: แทนที่ท้ายไฟล์ ซึ่งตอนนี้คือ

```js
      image: project.thumbnail,
      type: 'website'
    }
  });
});

module.exports = router;
```

ด้วยข้อความนี้

```js
      image: project.thumbnail,
      type: 'website'
    }
  });
});

// Posts with one tag (spec 2.1). The tag is looked up first: an unknown slug is a 404, and a tag without a
// published post is an empty list. Pagination, canonical and hreflang follow GET /blog.
router.get('/tags/:slug', async (req, res, next) => {
  const { lang, t } = res.locals;
  const row = await get('SELECT id, slug, name_th, name_en FROM tags WHERE slug = ?', [req.params.slug]);
  if (!row) return next();
  const page = pageNumber(req);
  if (!page) return next();
  const rows = await all(TAG_LIST_SQL, [row.id, lang, lang, PAGE_SIZE + 1, (page - 1) * PAGE_SIZE]);
  if (page > 1 && rows.length === 0) return next();
  const tag = { slug: row.slug, name: lang === 'th' ? row.name_th : row.name_en };
  const title = t.tagTitle + ' ' + tag.name;
  const query = page > 1 ? '?page=' + page : '';
  res.render('blog', {
    posts: rows.slice(0, PAGE_SIZE),
    page,
    hasNext: rows.length > PAGE_SIZE,
    tag,
    meta: {
      title: page > 1 ? title + ' · ' + t.pageLabel + ' ' + page : title,
      canonical: '/' + lang + '/tags/' + tag.slug + query,
      alternates: [
        { lang: 'th', href: '/th/tags/' + tag.slug + query },
        { lang: 'en', href: '/en/tags/' + tag.slug + query }
      ],
      type: 'website'
    }
  });
});

module.exports = router;
```

- [ ] **Step 6: ให้ views/blog.ejs ใช้แท็ก**

แก้ `views/blog.ejs` สองบรรทัดตามที่ Task 9 เว้นไว้ ส่วนอื่นของไฟล์ไม่เปลี่ยน หน้า `/blog` ส่ง `tag: null` จึงยังได้หัวข้อ บทความ และลิงก์ pagination ไป `/<lang>/blog` เหมือนเดิม

จุดที่ 1: แทนที่บรรทัดที่ 2 ซึ่งตอนนี้คือ

```ejs
const base = '/' + lang + '/blog';
```

ด้วยข้อความนี้

```ejs
const base = tag ? '/' + lang + '/tags/' + tag.slug : '/' + lang + '/blog';
```

จุดที่ 2: แทนที่บรรทัดที่ 7 ซึ่งตอนนี้คือ

```ejs
  <h1><%= t.navBlog %></h1>
```

ด้วยข้อความนี้

```ejs
  <h1><%= tag ? t.tagTitle + ' ' + tag.name : t.navBlog %></h1>
```

- [ ] **Step 7: เพิ่ม route ของแท็กใน src/routes/admin.js**

แก้ `src/routes/admin.js` สองจุด ส่วนอื่นของไฟล์ไม่เปลี่ยนจาก Task 13

- route ทั้งสี่อยู่หลัง `router.use(requireAdmin)` จึงถูกบังคับ login ซึ่ง test 07 และ 13 ตรวจ
- ชื่อทั้งสองภาษาต้องมีค่าตาม spec ข้อ 2.4 และ slug คือ `toSlug(slug || name_en)` ตาม spec ข้อ 2.3 slug ที่พิมพ์มาจึงชนะชื่อภาษาอังกฤษเสมอ ถ้าพิมพ์เป็นภาษาไทยจนเหลือค่าว่างจะได้ error แทนที่จะแอบใช้ชื่อภาษาอังกฤษ
- `text` เก็บแค่ค่าที่เป็น string ค่าที่ถูกส่งซ้ำจนเป็น array จึงนับเป็นค่าว่างแทนการไปถึง SQL แบบเดียวกับ `readForm` ของ Task 10
- การเช็ก slug ซ้ำอยู่ใน transaction เดียวกับการ insert หรือ update ตามข้อตกลงของ editor ใน Task 10 `transaction` ต่อคิวไว้ จึงไม่มีการบันทึกอื่นแทรกระหว่างเช็กกับเขียน และ `UNIQUE` ของ `tags.slug` จึงไม่กลายเป็น 500
- validation ที่ไม่ผ่านตอบ 400 และ render หน้าเดิมพร้อมค่าที่พิมพ์ผ่าน `edit` ห้าม redirect เพื่อไม่ให้ข้อความที่พิมพ์หาย แบบเดียวกับ editor
- `parseId` เหมือนของ `src/routes/admin-posts.js` คือรับเฉพาะจำนวนเต็มบวกที่ไม่มี 0 นำหน้า ตามกติกา `:id` ของ spec ข้อ 2.4 ไฟล์นี้มีสำเนาของตัวเองเพราะ spec ข้อ 2.5 ไม่ทำ helper ร่วม
- admin route table ของ spec ไม่มี `GET /admin/tags/:id` เพราะทุกแถวแก้ได้ในหน้าเดียว path นั้นจึงได้ 404
- การลบใช้ `DELETE FROM tags` คำสั่งเดียว แถวใน `post_tags` และ `project_tags` ที่อ้างถึงหายไปเองด้วย `ON DELETE CASCADE` ส่วนบทความและโปรเจกต์ยังอยู่
- `renderTags` นับบทความและโปรเจกต์ของแต่ละแท็กรวม draft เจ้าของจึงเห็นว่าแท็กถูกใช้อยู่แค่ไหนก่อนกดลบ และเรียงตาม slug แบบเดียวกับ checkbox แท็กใน editor
- Express 5 ส่ง error จาก async handler ต่อให้ error handler เอง จึงไม่มี try/catch

จุดที่ 1: แทนที่บรรทัด require ของ DB ซึ่งตอนนี้คือ

```js
const { run, get, all } = require('../db');
```

ด้วยข้อความนี้

```js
const { run, get, all, transaction } = require('../db');
const { toSlug } = require('../slug');
```

จุดที่ 2: แทนที่ท้ายไฟล์ ซึ่งตอนนี้คือ

```js
router.use('/posts', require('./admin-posts'));
router.use('/projects', require('./admin-projects'));

module.exports = router;
```

ด้วยข้อความนี้

```js
router.use('/posts', require('./admin-posts'));
router.use('/projects', require('./admin-projects'));

// :id must be a positive integer (spec 2.4). null makes the route answer 404.
function parseId(value) {
  return /^[1-9][0-9]*$/.test(value) && Number.isSafeInteger(Number(value)) ? Number(value) : null;
}

const text = value => (typeof value === 'string' ? value : '');

// Tags (spec 2.4): one page with an add form and a form for every row. edit is the form that failed validation,
// { id, slug, name_th, name_en } with id null for the add form, so that form shows what was typed.
async function renderTags(res, edit, errors, saved) {
  const tags = await all(`
    SELECT tg.id, tg.slug, tg.name_th, tg.name_en,
      (SELECT COUNT(*) FROM post_tags WHERE tag_id = tg.id) AS posts,
      (SELECT COUNT(*) FROM project_tags WHERE tag_id = tg.id) AS projects
    FROM tags tg ORDER BY tg.slug`);
  res.render('admin/tags', { tags, edit, errors, saved });
}

// Both names are required, and the slug is toSlug(slug || name_en) (spec 2.3).
async function saveTag(req, res, id) {
  const body = req.body ?? {};
  // only strings are kept, so a field sent twice (an array) counts as empty instead of reaching SQL
  const values = { slug: text(body.slug).trim(), name_th: text(body.name_th).trim(), name_en: text(body.name_en).trim() };
  const slug = toSlug(values.slug || values.name_en);
  const errors = {};
  if (!values.name_th) errors.name_th = 'กรุณาใส่ชื่อภาษาไทย';
  if (!values.name_en) errors.name_en = 'กรุณาใส่ชื่อภาษาอังกฤษ';
  if (!slug) errors.slug = 'กรุณาใส่ slug ภาษาอังกฤษ (a-z, 0-9, -)';
  if (Object.keys(errors).length === 0) {
    // the duplicate check and the write share one transaction, the same as the post editor
    const written = await transaction(async () => {
      if (await get('SELECT 1 FROM tags WHERE slug = ? AND id <> ?', [slug, id || 0])) return false;
      if (id) {
        await run('UPDATE tags SET slug = ?, name_th = ?, name_en = ? WHERE id = ?', [slug, values.name_th, values.name_en, id]);
      } else {
        await run('INSERT INTO tags (slug, name_th, name_en) VALUES (?, ?, ?)', [slug, values.name_th, values.name_en]);
      }
      return true;
    });
    if (written) return res.redirect(303, '/admin/tags?saved=1');
    errors.slug = 'slug นี้ถูกใช้แล้วในแท็กอื่น';
  }
  // the page again with what was typed, never a redirect and never a 500
  res.status(400);
  await renderTags(res, { id, ...values }, errors, false);
}

router.get('/tags', async (req, res) => {
  await renderTags(res, null, {}, req.query.saved === '1');
});

router.post('/tags', (req, res) => saveTag(req, res, null));

router.post('/tags/:id', async (req, res, next) => {
  const id = parseId(req.params.id);
  if (!id || !(await get('SELECT id FROM tags WHERE id = ?', [id]))) return next();
  await saveTag(req, res, id);
});

router.post('/tags/:id/delete', async (req, res, next) => {
  const id = parseId(req.params.id);
  if (!id) return next();
  // post_tags and project_tags go by ON DELETE CASCADE, which needs PRAGMA foreign_keys = ON from src/db.js
  const { changes } = await run('DELETE FROM tags WHERE id = ?', [id]);
  if (changes === 0) return next();
  res.redirect(303, '/admin/tags');
});

module.exports = router;
```

- [ ] **Step 8: เขียน views/admin/tags.ejs**

สร้าง `views/admin/tags.ejs` ทุกอย่างอยู่ในหน้าเดียวตาม spec ข้อ 2.4 คือฟอร์มเพิ่มแท็กด้านบน และตารางแท็กที่แต่ละแถวมีช่อง `name_th`, `name_en`, `slug`, ปุ่มบันทึก และปุ่มลบ

- ฟอร์มครอบ `<tr>` ไม่ได้ ช่องกรอกของแต่ละแถวจึงผูกกับ `<form id="tag-<id>">` ในช่องปุ่มบันทึกด้วย attribute `form` การกดบันทึกส่งเฉพาะสามช่องของแถวนั้น ส่วนปุ่มลบเป็นฟอร์มแยกที่มี `onsubmit="return confirm('ลบแท็กนี้?')"` แบบเดียวกับปุ่มลบใน spec ข้อ 2.4
- หัวตารางไม่นับเป็น label ของช่องกรอก ช่องในแถวจึงมี `aria-label` ที่บอกทั้งชื่อช่องและ slug ของแท็ก ส่วนช่องในฟอร์มเพิ่มแท็กใช้ `<label>` ปกติ
- ช่องชื่อทั้งสองมี `required` และช่อง slug มี `pattern="[a-z0-9\-]*"` ที่ escape `-` ไว้ด้วยเหตุผลเดียวกับ Task 10 browser จึงเตือนก่อน submit ส่วน server ยังตรวจซ้ำเสมอ
- เมื่อ validation ไม่ผ่าน กล่องสรุปบนสุดบอกว่าเป็นฟอร์มไหน เช่น `แท็กใหม่:` หรือ `แท็ก docker:` และฟอร์มนั้นแสดงค่าที่พิมพ์ไว้แทนค่าใน DB
- คอลัมน์ บทความ กับ โปรเจกต์ เป็นตัวเลขล้วน ตอนเขียนแผนลองคอลัมน์เดียวที่เขียนว่า บทความ 3 · โปรเจกต์ 1 แล้วข้อความขึ้นสองบรรทัดที่ 1024px จนแถวสูง 85px พอแยกเป็นตัวเลขสองคอลัมน์ แถวสูง 69px ทั้งที่ 400px และ 1024px
- ไม่มี CSS ใหม่ ตารางใช้ `.admin-table` ที่มี `min-width: 36rem` อยู่ใน `.table-scroll` บนจอแคบตารางจึงเลื่อนในกรอบของตัวเอง
- ทุกค่าใช้ `<%= %>` ส่วน `<%-` มีแค่ `include`

```ejs
<%
const errorList = Object.values(errors);
const editedTag = edit && edit.id ? tags.find(row => row.id === edit.id) : null;
const errorPrefix = editedTag ? 'แท็ก ' + editedTag.slug + ': ' : 'แท็กใหม่: ';
const addValues = edit && !edit.id ? edit : { slug: '', name_th: '', name_en: '' };
-%>
<%- include('head', { title: 'แท็ก', section: 'tags' }) %>
<main id="main">
  <div class="page-head">
    <h1>แท็ก</h1>
  </div>
<% if (saved) { -%>
  <p class="form-saved" role="status">บันทึกแล้ว</p>
<% } -%>
<% if (errorList.length) { -%>
  <div class="form-error" role="alert">
    <p>ยังไม่ได้บันทึก กรุณาแก้ตามรายการนี้</p>
    <ul>
<% for (const message of errorList) { -%>
      <li><%= errorPrefix + message %></li>
<% } -%>
    </ul>
  </div>
<% } -%>
  <h2>เพิ่มแท็ก</h2>
  <form class="admin-form" method="post" action="/admin/tags">
    <div class="field-pair">
      <label>ชื่อภาษาไทย
        <input name="name_th" value="<%= addValues.name_th %>" required>
      </label>
      <label>ชื่อภาษาอังกฤษ
        <input name="name_en" value="<%= addValues.name_en %>" lang="en" required>
      </label>
    </div>
    <label>slug
      <input name="slug" value="<%= addValues.slug %>" pattern="[a-z0-9\-]*" autocapitalize="none" spellcheck="false">
      <span class="field-hint">ใช้ได้เฉพาะ a-z, 0-9 และ - ถ้าเว้นว่าง ระบบสร้างจากชื่อภาษาอังกฤษ</span>
    </label>
    <button type="submit">เพิ่มแท็ก</button>
  </form>
  <h2>แท็กทั้งหมด</h2>
<% if (tags.length === 0) { -%>
  <p class="admin-empty">ยังไม่มีแท็ก</p>
<% } else { -%>
  <p class="field-hint">แก้ในแถวแล้วกด บันทึก ของแถวนั้น ถ้าแก้ slug ลิงก์เดิมของหน้าแท็กจะใช้ไม่ได้ ส่วนการลบแท็กไม่ลบบทความหรือโปรเจกต์ แค่เอาแท็กนี้ออก</p>
  <div class="table-scroll">
    <table class="admin-table">
      <thead>
        <tr><th scope="col">ชื่อภาษาไทย</th><th scope="col">ชื่อภาษาอังกฤษ</th><th scope="col">slug</th><th scope="col">บทความ</th><th scope="col">โปรเจกต์</th><th scope="col" colspan="2">จัดการ</th></tr>
      </thead>
      <tbody>
<% for (const tag of tags) {
     const row = edit && edit.id === tag.id ? edit : tag;
     const formId = 'tag-' + tag.id;
-%>
        <tr>
          <td><input form="<%= formId %>" name="name_th" value="<%= row.name_th %>" size="14" aria-label="ชื่อภาษาไทยของแท็ก <%= tag.slug %>" required></td>
          <td><input form="<%= formId %>" name="name_en" value="<%= row.name_en %>" size="14" lang="en" aria-label="ชื่อภาษาอังกฤษของแท็ก <%= tag.slug %>" required></td>
          <td><input form="<%= formId %>" name="slug" value="<%= row.slug %>" size="12" pattern="[a-z0-9\-]*" autocapitalize="none" spellcheck="false" aria-label="slug ของแท็ก <%= tag.slug %>"></td>
          <td><%= tag.posts %></td>
          <td><%= tag.projects %></td>
          <td><form id="<%= formId %>" method="post" action="/admin/tags/<%= tag.id %>"><button type="submit">บันทึก</button></form></td>
          <td><form method="post" action="/admin/tags/<%= tag.id %>/delete" onsubmit="return confirm('ลบแท็กนี้?')"><button type="submit">ลบ</button></form></td>
        </tr>
<% } -%>
      </tbody>
    </table>
  </div>
<% } -%>
</main>
<%- include('foot') %>
```

- [ ] **Step 9: รัน test ให้เห็นว่าผ่าน**

Run: `node --test test/13-tag-page.test.js`
Expected: PASS exit code 0

```
✔ 13 tag page (397.9431ms)
ℹ tests 1
ℹ suites 0
ℹ pass 1
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 761.305
```

- [ ] **Step 10: ตรวจ <%- ใน views ด้วยขั้นตรวจเดียวกับ CI**

บรรทัดแรกแสดง `<%-` ทุกตัวใน template ของ task นี้ ซึ่งเป็น `include(` ทั้งหมด ส่วน `bash -e -c` รัน script ตัวเดียวกับขั้นสุดท้ายของ `.github/workflows/ci.yml` ใน Task 7

Run: `grep -rn "<%-" views/admin/tags.ejs views/blog.ejs; bash -e -c 'if grep -rn "<%-" views/ | grep -v -e "md.render(" -e "include("; then echo "found <%- outside md.render or include"; exit 1; fi'; echo "guard exit=$?"`
Expected:

```
views/admin/tags.ejs:7:<%- include('head', { title: 'แท็ก', section: 'tags' }) %>
views/admin/tags.ejs:71:<%- include('foot') %>
views/blog.ejs:4:<%- include('partials/head') %>
views/blog.ejs:5:<%- include('partials/header') %>
views/blog.ejs:13:    <%- include('partials/post-card', { card, level: 2 }) %>
views/blog.ejs:28:<%- include('partials/footer') %>
guard exit=0
```

- [ ] **Step 11: รัน npm test ทั้งชุด**

Run: `npm test`
Expected: PASS exit code 0 และมี 12 tests

```
> talkalways@1.0.0 test
> node --test test/*.test.js

✔ 01 markdown (35.0363ms)
✔ 02 routing (272.0784ms)
✔ 03 publish per language (467.7926ms)
✔ 04 published at (496.9347ms)
✔ 05 blog hidden (542.0808ms)
✔ 06 delete cascade (523.9113ms)
✔ 07 admin guard (328.5068ms)
✔ 08 login cookie (409.0192ms)
✔ 09 editor validation (479.7168ms)
✔ 10 preview (432.7554ms)
✔ 12 project order (474.4282ms)
✔ 13 tag page (473.5826ms)
ℹ tests 12
ℹ suites 0
ℹ pass 12
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1531.7707
```

- [ ] **Step 12: สร้างแท็กและบทความทดลองใน data/tag-check**

คำสั่งนี้สร้าง DB ทดลองแยกไว้ที่ `data/tag-check` สำหรับการตรวจใน browser ที่ Step 13 `data/site.db` จึงไม่ถูกแตะ โฟลเดอร์นี้อยู่ใต้ `data/` ที่ `.gitignore` กันไว้แล้ว และ Step 14 จะลบทิ้ง

- แท็ก `docker` ติดกับบทความไทย published ที่มี excerpt ยาวซึ่งขึ้นต้นด้วย ปั๊ก ที่ ญี่ปุ่น, บทความไทยแบบ draft, บทความอังกฤษ published ที่ติดแท็ก `sqlite` ด้วย, บันทึกสั้น published อีก 10 ตัว และโปรเจกต์หนึ่งตัว หน้า `/th/tags/docker` จึงมีบทความ published 12 ตัวที่แบ่งเป็นสองหน้า
- ถ้าต้องรันซ้ำ ให้ทำ Step 14 ก่อน ไม่อย่างนั้นแท็กจะชน `UNIQUE`

Run:

```bash
DATA_DIR=data/tag-check node - <<'EOF'
const { ready, run, close } = require('./src/db');

async function addPost(tagIds, lang, status, slug, title, excerpt, publishedAt) {
  const now = new Date().toISOString();
  const { lastID } = await run('INSERT INTO posts (cover_image) VALUES (NULL)');
  await run(
    `INSERT INTO post_translations (post_id, lang, status, slug, title, excerpt, published_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [lastID, lang, status, slug, title, excerpt, publishedAt, now]
  );
  for (const tagId of tagIds) await run('INSERT INTO post_tags (post_id, tag_id) VALUES (?, ?)', [lastID, tagId]);
}

ready.then(async () => {
  const { lastID: docker } = await run("INSERT INTO tags (slug, name_th, name_en) VALUES ('docker', 'ด็อกเกอร์', 'Docker')");
  const { lastID: sqlite } = await run("INSERT INTO tags (slug, name_th, name_en) VALUES ('sqlite', 'เอสคิวไลต์', 'SQLite')");
  await addPost([docker], 'th', 'published', 'docker-101', 'เริ่มต้นใช้ Docker กับแอป Node',
    'ปั๊ก ที่ ญี่ปุ่น อยู่ต้นบรรทัดแรกเพื่อดูว่าวรรณยุกต์ไม่โดนตัด บทความนี้ยาวพอที่จะถูกตัดเหลือสามบรรทัดบนการ์ดของหน้าแท็ก ส่วนที่เกินต้องหายไปพร้อมจุดไข่ปลาท้ายบรรทัดที่สาม',
    '2026-09-12T20:30:00.000Z');
  await addPost([docker], 'th', 'draft', 'docker-draft', 'ร่างบทความ Docker ที่ยังไม่เผยแพร่', '', null);
  await addPost([docker, sqlite], 'en', 'published', 'sqlite-wal', 'SQLite WAL in practice', 'Why the app turns on WAL mode.', '2026-09-10T03:00:00.000Z');
  for (let i = 1; i <= 10; i++) {
    const day = String(i).padStart(2, '0');
    await addPost([docker], 'th', 'published', 'docker-note-' + i, 'บันทึก Docker ตอนที่ ' + i, 'สรุปสั้นของตอนที่ ' + i, '2026-08-' + day + 'T02:00:00.000Z');
  }
  const now = new Date().toISOString();
  const { lastID: projectId } = await run('INSERT INTO projects (featured) VALUES (0)');
  await run(
    `INSERT INTO project_translations (project_id, lang, status, slug, title, published_at, updated_at)
     VALUES (?, 'th', 'published', 'docker-lab', 'ห้องทดลอง Docker', ?, ?)`,
    [projectId, now, now]
  );
  await run('INSERT INTO project_tags (project_id, tag_id) VALUES (?, ?)', [projectId, docker]);
  await close();
  console.log('seeded 2 tags, 13 posts and 1 project into data/tag-check');
});
EOF
```

Expected: `seeded 2 tags, 13 posts and 1 project into data/tag-check`

- [ ] **Step 13: ตรวจหน้าแท็กใน browser**

**Owner:** ทำทุกข้อข้างล่างใน Chrome หรือ Edge บนเครื่องนี้ แล้วบอก executor ว่าผ่านครบหรือข้อไหนไม่ผ่าน executor ต้องหยุดรอคำตอบและห้าม commit ถ้ามีข้อที่ไม่ผ่าน ข้อ 2 คือการตรวจของ Phase 5 ใน spec ข้อ 3.5 ที่ว่า `/th/tags/<slug>` ต้องมีเฉพาะโพสต์ที่ published

1. ใน Git Bash ที่ root ของโปรเจกต์ รัน `DATA_DIR=data/tag-check PORT=3001 SITE_URL=http://localhost:3001 npm start` ต้องเห็น `Listening on http://localhost:3001`
2. เปิด `http://localhost:3001/th/blog/docker-101` แล้วคลิกชิป ด็อกเกอร์ ช่อง URL ต้องเป็น `/th/tags/docker` หน้ามีหัวข้อ บทความที่ติดแท็ก ด็อกเกอร์ และการ์ด 10 ใบ ใบแรกคือ เริ่มต้นใช้ Docker กับแอป Node ใบที่สองคือ SQLite WAL in practice ที่มีกรอบคำว่า ภาษาอังกฤษ ทั้งหน้าไม่มีคำว่า ร่างบทความ Docker ที่ยังไม่เผยแพร่ และ ห้องทดลอง Docker และท้ายรายการมีลิงก์ บทความเก่ากว่า
3. คลิก บทความเก่ากว่า ช่อง URL ต้องเป็น `/th/tags/docker?page=2` หน้ามีการ์ด บันทึก Docker ตอนที่ 2 และ ตอนที่ 1 กับลิงก์ บทความใหม่กว่า เอาเมาส์ชี้ลิงก์ บทความใหม่กว่า แถบสถานะของ browser ต้องแสดง `localhost:3001/th/tags/docker` และเอาเมาส์ชี้ลิงก์ English ใน header แถบสถานะต้องแสดง `localhost:3001/en/tags/docker`
4. เปิด `http://localhost:3001/en/tags/docker` หน้าต้องมีหัวข้อ Posts tagged Docker และการ์ดแรกเป็นชื่อภาษาไทยพร้อมกรอบคำว่า Thai
5. เปิด `http://localhost:3001/th/tags/nope` ต้องได้หน้า ไม่พบหน้านี้
6. เปิด `http://localhost:3001/admin/login` login ด้วย passphrase จาก Task 8 Step 22 แล้วคลิกเมนู แท็ก หน้า `/admin/tags` ต้องมีเมนู แท็ก เป็นตัวหนา หัวข้อ แท็ก ส่วน เพิ่มแท็ก ที่มีช่อง ชื่อภาษาไทย กับ ชื่อภาษาอังกฤษ อยู่แถวเดียวกันและช่อง slug อยู่ด้านล่าง และตารางที่มีสองแถวคือ docker ที่คอลัมน์ บทความ เป็น 13 และ โปรเจกต์ เป็น 1 กับ sqlite ที่เป็น 1 และ 0
7. กด F12 ไปแท็บ Network แล้วกด เพิ่มแท็ก โดยไม่กรอกอะไร browser ต้องขึ้นกล่องเตือนที่ช่อง ชื่อภาษาไทย และแท็บ Network ต้องไม่มี request ใหม่
8. กรอก ชื่อภาษาไทย `โหนดเจเอส` และ ชื่อภาษาอังกฤษ `Node.js` โดยเว้นช่อง slug ว่าง แล้วกด เพิ่มแท็ก ช่อง URL ต้องเป็น `/admin/tags?saved=1` หน้ามีกล่อง บันทึกแล้ว และตารางมีแถวใหม่ที่ช่อง slug เป็น `node-js` อยู่ระหว่าง docker กับ sqlite
9. ในแถว docker แก้ช่อง slug เป็น `Docker Tips` แล้วกด บันทึก ของแถวนั้น browser ต้องขึ้นกล่องเตือนเรื่องรูปแบบที่ช่อง slug ของแถวนั้นและไม่มี request ใหม่ แก้เป็น `containers` แล้วกด บันทึก อีกครั้ง หน้าต้องมีกล่อง บันทึกแล้ว และแถวนั้นมี slug `containers` จากนั้นเปิด `http://localhost:3001/th/tags/docker` ในแท็บใหม่ต้องได้หน้า ไม่พบหน้านี้ และ `http://localhost:3001/th/tags/containers` ต้องมีหัวข้อ บทความที่ติดแท็ก ด็อกเกอร์ แล้วปิดแท็บนั้น
10. ในแถว sqlite กด ลบ ต้องมีกล่องถาม ลบแท็กนี้? กด Cancel แถวต้องยังอยู่ กด ลบ อีกครั้งแล้วกด OK ช่อง URL ต้องเป็น `/admin/tags` และไม่มีแถว sqlite แล้ว จากนั้นเปิด `http://localhost:3001/en/blog/sqlite-wal` ชิปแท็กต้องเหลือแค่ Docker ที่ลิงก์ไป `/en/tags/containers`
11. กด Ctrl+Shift+M ตั้งความกว้าง 400 ความสูง 900 แล้วเปิด `/admin/tags` ทั้งธีมสว่างและมืด โดยสลับธีมด้วย Rendering > prefers-color-scheme แบบ Task 6 Step 12 ข้อ 3 เพราะหน้า admin ไม่มีปุ่มธีม หน้าต้องไม่มี scrollbar แนวนอนของทั้งหน้า ช่องของฟอร์มเพิ่มแท็กเรียงเป็นคอลัมน์เดียว และตารางเลื่อนแนวนอนได้ในกรอบของตัวเอง จากนั้นตั้ง Rendering กลับเป็น `No emulation` แล้วเปิด `http://localhost:3001/th/tags/containers` ทั้งธีมสว่างและมืดโดยสลับด้วยปุ่มธีม หน้าต้องไม่มี scrollbar แนวนอน excerpt ของการ์ด เริ่มต้นใช้ Docker กับแอป Node เหลือ 3 บรรทัดพร้อมจุดไข่ปลา และวรรณยุกต์ของคำว่า ปั๊ก กับ ญี่ปุ่น ในบรรทัดแรกต้องไม่ถูกตัด แล้วปิด device toolbar
12. กลับไปที่ Git Bash แล้วกด Ctrl+C เพื่อหยุด server

ตอนเขียนแผนตรวจลำดับของข้อ 2 ถึง 6 ด้วยการยิง request จริงกับ DB ของ Step 12 ได้การ์ด 10 ใบที่ขึ้นต้นด้วย `/th/blog/docker-101` กับ `/en/blog/sqlite-wal`, หน้า 2 เป็น `/th/blog/docker-note-2` กับ `/th/blog/docker-note-1`, หัวข้อ `Posts tagged Docker` บนหน้า `/en` และแถวของตาราง admin เป็น docker 13/1 กับ sqlite 1/0 ส่วนหน้าตาและการกดจริงของข้อ 7 ถึง 11 ตรวจด้วย Edge แบบ headless ผ่าน DevTools Protocol ที่ความกว้าง 400 และ 1024px กับข้อมูลทดลองชุดที่คล้ายกัน ความกว้าง 400 จำลองเป็นมือถือ (`mobile: true`) ส่วน 1024px เป็นโหมด desktop ที่ scrollbar แนวตั้งกว้าง 15px ค่าที่วัดได้มีดังนี้

- หน้า `/admin/tags` มี `scrollWidth` เท่ากับ `clientWidth` ทั้งสองความกว้าง (400 และ 1009) ตารางกว้าง 884px เลื่อนในกรอบ 368px ที่ 400px และกว้างเต็ม 945px ที่ 1024px แถวสูง 69px ทั้งสองความกว้าง และ `.field-pair` ของฟอร์มเพิ่มแท็กเป็น `368px` ที่ 400px กับ `464.5px 464.5px` ที่ 1024px
- `new FormData(document.getElementById('tag-1'))` ของแถวแรกมี `name_th`, `name_en` และ `slug` จาก attribute `form` และ `checkValidity()` ของฟอร์มแถวเป็น `false` เมื่อช่อง slug เป็น `Bad Slug`
- การแก้ชื่อในแถวแล้วคลิกปุ่ม บันทึก จริงพาไป `/admin/tags?saved=1` ที่มีกล่อง บันทึกแล้ว และค่าใน DB เปลี่ยน
- ปุ่ม ลบ เรียก `confirm` ด้วยข้อความ ลบแท็กนี้? เมื่อตอบ Cancel แท็กยังอยู่ และเมื่อตอบ OK แท็กถูกลบและหน้าอยู่ที่ `/admin/tags`
- หน้า `/th/tags/docker` มี `scrollWidth` เท่ากับ `clientWidth` ที่ 400px

- [ ] **Step 14: ลบ DB ทดลอง**

Run: `rm -rf data/tag-check; test -e data/tag-check && echo LEFT || echo REMOVED`
Expected: `REMOVED`

ถ้าได้ `LEFT` แปลว่า server จาก Step 13 ยังไม่หยุด ให้กด Ctrl+C ในหน้าต่างนั้นแล้วรันคำสั่งนี้อีกครั้ง

- [ ] **Step 15: ตรวจว่ามีแค่ไฟล์ของ task นี้ที่เปลี่ยน**

Run: `git status --short`
Expected:

```
 M src/routes/admin.js
 M src/routes/public.js
 M src/strings.js
 M test/helpers.js
 M views/blog.ejs
?? test/13-tag-page.test.js
?? views/admin/tags.ejs
```

ถ้ามีบรรทัดอื่นนอกจากนี้ เช่น `.env`, `data/` หรือ `.claude/` ห้าม add ไฟล์นั้นและให้หยุดถามเจ้าของ

- [ ] **Step 16: Commit**

```bash
git add src/strings.js src/routes/public.js src/routes/admin.js views/blog.ejs views/admin/tags.ejs
git add test/helpers.js test/13-tag-page.test.js
git commit -m "feat: add tag management in admin and public tag pages"
```

Expected:

```
[main b7698d6] feat: add tag management in admin and public tag pages
 7 files changed, 393 insertions(+), 6 deletions(-)
 create mode 100644 test/13-tag-page.test.js
 create mode 100644 views/admin/tags.ejs
```

Run: `git status --short | wc -l`
Expected: `0`

### Task 15: อัปโหลดรูปและ admin.js

**Phase:** 5 · **Gate tests:** 11-upload

**Files:**
- Modify: `src/app.js` (เพิ่ม require ของ `UPLOAD_DIR` และ static ของ `/uploads` ต่อจาก static ของ `public/`)
- Modify: `src/routes/admin.js` (เพิ่ม require ของ `node:fs`, `node:path`, `node:crypto`, `multer` กับ `UPLOAD_DIR` และเพิ่ม `receive`, `sniff` กับ route `POST /upload` ต่อจาก route ลบแท็ก)
- Create: `public/js/admin.js`
- Modify: `views/admin/post-edit.ejs` (ช่องอัปโหลดข้างช่อง ภาพหน้าปก, ช่องแทรกรูปใต้ช่องเนื้อหาของแต่ละภาษา และ script ของ `admin.js` ต่อจาก `</main>`)
- Modify: `views/admin/project-edit.ejs` (ช่องอัปโหลดข้างช่อง ภาพ thumbnail, ช่องแทรกรูปใต้ช่องเนื้อหาของแต่ละภาษา และ script ของ `admin.js` ต่อจาก `</main>`)
- Test: `test/11-upload.test.js`

**Interfaces:**
- Consumes:
  - `src/db.js` จาก Task 5: `UPLOAD_DIR` ที่มีอยู่แล้วตั้งแต่ require เพราะ `src/db.js` สร้างด้วย `fs.mkdirSync(UPLOAD_DIR, { recursive: true })`
  - `src/app.js` จาก Task 8: บรรทัด `app.use(express.static(path.join(__dirname, '..', 'public'), { index: false, maxAge: '30d' }));` ที่ static ของ `/uploads` ต้องอยู่ต่อจากนั้น และ 404 handler ท้ายไฟล์
  - `src/routes/admin.js` จาก Task 14: `express.urlencoded(...)` ที่ไม่แตะ body แบบ multipart, `router.use(requireAdmin)` และ route `POST /tags/:id/delete` ที่อยู่ก่อน `module.exports`
  - dependency `multer ^2.3.0` จาก Task 4
  - `views/admin/post-edit.ejs` จาก Task 10 และ `views/admin/project-edit.ejs` จาก Task 13: ช่อง `input[name="cover_image"]` กับ `input[name="thumbnail"]`, `textarea.editor-body` ที่ชื่อ `<lang>[body_markdown]`, `<main id="main" class="editor">` ที่ทำให้ช่องกรอกกว้างเต็มคอลัมน์ และ class `field-pair` กับ `field-hint` ใน `public/css/admin.css`
  - กติกาจาก Task 6 ที่ classic script ทุกไฟล์ห่อโค้ดทั้งหมดด้วย block `{ }`
  - `test/helpers.js` จาก Task 14: `start()`, `H.req(path, { method, body, form })` ที่ส่ง `body` ให้ `fetch` ตรงๆ และ `H.login()`
- Produces:
  - `POST /admin/upload`: รับไฟล์เดียวใน field `image` แบบ multipart ตอบ `200 { url: '/uploads/<hex 32 ตัว>.<jpg|png|gif|webp>' }` หรือ `400 { error }` เป็น JSON เสมอ ข้อความ error มีสามแบบ คือ `รองรับเฉพาะ JPEG / PNG / GIF / WebP`, `ไฟล์ใหญ่เกิน 5 MB` และ `กรุณาเลือกรูป 1 ไฟล์` ส่วนคนที่ยังไม่ login ได้ 302 ไป `/admin/login` แบบเดียวกับทุก route หลัง guard
  - `GET /uploads/<name>`: ไฟล์จาก `UPLOAD_DIR` พร้อม `X-Content-Type-Options: nosniff` และ `Cache-Control: public, max-age=31536000, immutable` ไฟล์ที่ไม่มีได้หน้า 404 ของเว็บ ลำดับ middleware ของ `src/app.js` จึงตรงกับข้อ 1 ถึง 9 ในหัวข้อ Interfaces ของ plan แล้ว เหลือแค่ cookie `lang` ใน `GET /` ที่ Task 18 เพิ่ม
  - `src/routes/admin.js`: ท้ายไฟล์เรียงเป็นฟังก์ชันและ route ของแท็ก, `receive`, `sniff`, `POST /upload` แล้วจึง `module.exports` Task 16 เพิ่ม route ของ `/settings` ต่อจาก `POST /upload`
  - `public/js/admin.js`: ทำงานกับทุก `<input type="file" data-upload-target="<ชื่อ field>">` ในฟอร์มของหน้า เมื่อเลือกไฟล์จะส่ง `FormData` ที่มี field `image` ไป `/admin/upload` ถ้า field เป้าหมายเป็น `<input>` จะใส่ url เป็นค่า ถ้าเป็น `<textarea>` จะแทรก `![](url)` ตรง cursor และวาง cursor ไว้ใน `[]` ถ้าไม่สำเร็จจะ `alert` ข้อความ error ของ server หรือข้อความทั่วไป หน้าไหนที่อยากมีปุ่มอัปโหลดแค่ใส่ input แบบนี้กับ script ของไฟล์นี้
  - `views/admin/post-edit.ejs` กับ `views/admin/project-edit.ejs`: มีช่องเลือกไฟล์ที่ไม่มี `name` หน้าละสามช่อง คือ `data-upload-target="cover_image"` (หรือ `thumbnail`), `th[body_markdown]` และ `en[body_markdown]` และมี `<script src="/js/admin.js?v=<%= v %>" defer></script>` ต่อจาก `</main>` หน้ารายการของ admin ไม่โหลด `admin.js`
  - task นี้ไม่มี CSS ใหม่

- [ ] **Step 1: เขียน test ที่ต้อง fail**

สร้าง `test/11-upload.test.js` ห้าข้อของ spec ข้อ 3.4 test 11 อยู่ตรงคอมเมนต์ `spec test 11, case 1` ถึง `case 5`

- test require `./helpers` ก่อน `../src/db` เพราะ `helpers.js` ตั้ง `DATA_DIR` เป็นโฟลเดอร์ชั่วคราวก่อน `src/db.js` ถูกโหลด `UPLOAD_DIR` ที่ได้จึงเป็นโฟลเดอร์ของ test
- `upload()` ส่ง `FormData` ที่มี `Blob` ใน field `image` แบบเดียวกับ `public/js/admin.js` และ `fetch` ใส่ `Content-Type: multipart/form-data` พร้อม boundary ให้เอง
- `json()` ตรวจว่า `Content-Type` เป็น JSON ทุกคำตอบ รวมถึงคำตอบที่เป็น error เพราะ `admin.js` อ่านด้วย `res.json()` ข้อ "body เป็น JSON ไม่ใช่หน้า HTML" ของ spec จึงถูกตรวจทุกครั้ง
- ข้อ 5 ใช้ไฟล์ 6 MB ที่ขึ้นต้นด้วย PNG signature ขนาดไฟล์จึงเป็นเหตุผลเดียวที่ถูกปฏิเสธ
- ตรวจเพิ่มว่า คนที่ยังไม่ login ได้ 302 และไม่มีไฟล์ถูกเขียน, ไฟล์ที่ได้มี `Content-Type: image/png` และ `Cache-Control` แบบ immutable, JPEG, GIF และ WebP ได้นามสกุลตาม bytes แม้ browser จะส่งชื่อ `photo.png` มา, ชื่อไฟล์เดิมที่มี `../` ไม่ถูกใช้, ชื่อ field ผิด, ฟอร์มที่ไม่มีไฟล์, สองไฟล์ และ body ที่ไม่ใช่ multipart ได้ JSON 400 โดยไม่มีไฟล์ถูกเขียน, `/uploads/` ไม่แสดงรายการไฟล์ และทั้ง editor บทความกับโปรเจกต์โหลด `admin.js` และมีช่องเลือกไฟล์สามช่องที่ไม่มี `name`

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
// helpers first: it points DATA_DIR at a temp folder before src/db.js is loaded
const { start } = require('./helpers');
const { UPLOAD_DIR } = require('../src/db');

test('11 upload', async () => {
  const h = await start();
  try {
    const files = () => fs.readdirSync(UPLOAD_DIR).sort();
    // one file in a multipart form, the way public/js/admin.js sends it
    const upload = (bytes, { name = 'x.png', type = 'image/png', field = 'image' } = {}) => {
      const body = new FormData();
      body.append(field, new Blob([bytes], { type }), name);
      return h.req('/admin/upload', { method: 'POST', body });
    };
    // every answer of the upload route is JSON, including the errors, because admin.js reads it with res.json()
    const json = r => {
      assert.match(r.headers.get('content-type'), /^application\/json/, r.text);
      return JSON.parse(r.text);
    };
    const NOT_AN_IMAGE = { error: 'รองรับเฉพาะ JPEG / PNG / GIF / WebP' };
    const NO_FILE = { error: 'กรุณาเลือกรูป 1 ไฟล์' };
    // the first bytes of real files: the PNG signature, a JPEG start with its APP0 marker, GIF89a and a RIFF WebP header
    const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');
    const JPEG = Buffer.from('ffd8ffe000104a464946000101', 'hex');
    const GIF = Buffer.from('474946383961010001000000', 'hex');
    const WEBP = Buffer.from('52494646240000005745425056503820', 'hex');

    // the route sits behind the admin guard, and an anonymous request writes nothing
    let r = await upload(PNG);
    assert.equal(r.status, 302);
    assert.equal(r.location, '/admin/login');
    assert.deepEqual(files(), []);

    await h.login();

    // spec test 11, case 1: the bytes of a PNG signature
    r = await upload(PNG);
    assert.equal(r.status, 200);
    const { url } = json(r);
    assert.match(url, /^\/uploads\/[0-9a-f]{32}\.png$/);

    // spec test 11, case 2: the file is in DATA_DIR/uploads, and GET url sends nosniff
    assert.deepEqual(files(), [path.basename(url)]);
    assert.deepEqual(fs.readFileSync(path.join(UPLOAD_DIR, path.basename(url))), PNG);
    r = await h.req(url);
    assert.equal(r.status, 200);
    assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(r.headers.get('content-type'), 'image/png');
    assert.equal(r.headers.get('cache-control'), 'public, max-age=31536000, immutable');

    // spec test 11, case 3: HTML named x.png and declared as image/png
    const count = files().length;
    r = await upload(Buffer.from('<html><body>not an image</body></html>'), { name: 'x.png', type: 'image/png' });
    assert.equal(r.status, 400);
    assert.deepEqual(json(r), NOT_AN_IMAGE);
    assert.equal(files().length, count);

    // spec test 11, case 4: SVG
    r = await upload(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'), { name: 'logo.svg', type: 'image/svg+xml' });
    assert.equal(r.status, 400);
    assert.deepEqual(json(r), NOT_AN_IMAGE);

    // spec test 11, case 5: 6 MB that starts like a real PNG, so the size is the only reason to refuse it
    r = await upload(Buffer.concat([PNG, Buffer.alloc(6 * 1024 * 1024)]));
    assert.equal(r.status, 400);
    assert.deepEqual(json(r), { error: 'ไฟล์ใหญ่เกิน 5 MB' });
    assert.ok(!r.text.includes('<html'), r.text);
    assert.equal(files().length, count);

    // the extension comes from the bytes, never from the name or the type that the browser sent
    for (const [bytes, ext] of [[JPEG, '.jpg'], [GIF, '.gif'], [WEBP, '.webp']]) {
      r = await upload(bytes, { name: 'photo.png', type: 'image/png' });
      assert.equal(r.status, 200, ext);
      assert.match(json(r).url, new RegExp('^/uploads/[0-9a-f]{32}\\' + ext + '$'));
    }
    // the original name is never used, so a path in it goes nowhere
    r = await upload(PNG, { name: '../../site.png' });
    assert.equal(r.status, 200);
    assert.match(json(r).url, /^\/uploads\/[0-9a-f]{32}\.png$/);
    assert.equal(files().length, count + 4);

    // a wrong field name, a form without a file, two files and a body that is not multipart are JSON 400s too
    const before = files().length;
    r = await upload(PNG, { field: 'file' });
    assert.equal(r.status, 400);
    assert.deepEqual(json(r), NO_FILE);
    const noFile = new FormData();
    noFile.append('note', 'no file here');
    r = await h.req('/admin/upload', { method: 'POST', body: noFile });
    assert.equal(r.status, 400);
    assert.deepEqual(json(r), NO_FILE);
    const twoFiles = new FormData();
    twoFiles.append('image', new Blob([PNG], { type: 'image/png' }), 'a.png');
    twoFiles.append('image', new Blob([PNG], { type: 'image/png' }), 'b.png');
    r = await h.req('/admin/upload', { method: 'POST', body: twoFiles });
    assert.equal(r.status, 400);
    assert.deepEqual(json(r), NO_FILE);
    r = await h.req('/admin/upload', { method: 'POST', form: { image: 'not a file' } });
    assert.equal(r.status, 400);
    assert.deepEqual(json(r), NO_FILE);
    assert.equal(files().length, before);

    // /uploads serves files only: no directory listing, and a missing file is the normal 404 page
    assert.equal((await h.req('/uploads/')).status, 404);
    assert.equal((await h.req('/uploads/' + '0'.repeat(32) + '.png')).status, 404);

    // both editors load admin.js and have file inputs without a name: one for the image field and one per body
    r = await h.req('/js/admin.js');
    assert.equal(r.status, 200);
    for (const [urlPath, field] of [['/admin/posts/new', 'cover_image'], ['/admin/projects/new', 'thumbnail']]) {
      r = await h.req(urlPath);
      assert.ok(r.text.includes('<script src="/js/admin.js?v='), urlPath);
      const pickers = r.text.match(/<input type="file"[^>]*>/g) || [];
      assert.deepEqual(pickers.map(p => (p.match(/data-upload-target="([^"]*)"/) || [])[1]), [field, 'th[body_markdown]', 'en[body_markdown]'], urlPath);
      assert.ok(pickers.every(p => !p.includes(' name=')), urlPath);
    }
  } finally {
    await h.stop();
  }
});
```

- [ ] **Step 2: รัน test ให้เห็นว่า fail**

guard ของ Task 8 คุมทุก path ใต้ `/admin` อยู่แล้ว ข้อแรกที่ส่งแบบไม่ login จึงผ่าน และ test ไป fail ที่การอัปโหลดครั้งแรกหลัง login เพราะยังไม่มี route `POST /admin/upload` request จึงตกไปที่ 404 handler

Run: `node --test test/11-upload.test.js`
Expected: FAIL exit code 1 และ output

```
✖ 11 upload (171.125ms)
ℹ tests 1
ℹ suites 0
ℹ pass 0
ℹ fail 1
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 576.5093

✖ failing tests:

test at test\11-upload.test.js:9:1
✖ 11 upload (171.125ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  
  404 !== 200
  
      at TestContext.<anonymous> (D:\Ikkyusan\Downloads\TalkAlways_MVP\talkalways\test\11-upload.test.js:42:12)
      at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
      at async Test.run (node:internal/test_runner/test:1409:7)
      at async startSubtestAfterBootstrap (node:internal/test_runner/harness:387:3) {
    generatedMessage: true,
    code: 'ERR_ASSERTION',
    actual: 404,
    expected: 200,
    operator: 'strictEqual',
    diff: 'simple'
  }
```

- [ ] **Step 3: เพิ่ม static ของ /uploads ใน src/app.js**

แก้ `src/app.js` สองจุด ส่วนอื่นของไฟล์ไม่เปลี่ยนจาก Task 8

- static ของ `/uploads` อยู่ต่อจาก static ของ `public/` ตามลำดับข้อ 5 ในหัวข้อ Interfaces ของ plan และตาม spec ข้อ 2.1 ที่ใช้ `{ index: false, maxAge: '365d', immutable: true }` พร้อม `X-Content-Type-Options: nosniff`
- `setHeaders` ถูกเรียกเฉพาะตอนส่งไฟล์จริง ไฟล์ที่ไม่มีจึงตกไปที่ 404 handler ของเว็บตามปกติ
- ชื่อไฟล์สุ่มและไม่เคยถูกเขียนทับ จึง cache ได้หนึ่งปีแบบ immutable ส่วน nosniff ทำให้ browser เชื่อนามสกุลที่ server เลือกจาก bytes ของไฟล์ ไม่เดาชนิดเอง
- `index: false` ทำให้ `/uploads/` ไม่แสดงอะไร และ serve-static ปฏิเสธ path ที่มี `..` แล้วส่งต่อไปที่ 404 handler Step 13 พิสูจน์ทั้งสองแบบกับ server จริง
- `require('./db')` ในไฟล์นี้ได้ module ตัวเดียวกับที่ routes ใช้ จึงไม่มีการเปิด DB ซ้ำ

จุดที่ 1: แทนที่บรรทัด require ของ strings ซึ่งตอนนี้คือ

```js
const strings = require('./strings');
const publicRouter = require('./routes/public');
```

ด้วยข้อความนี้

```js
const strings = require('./strings');
const { UPLOAD_DIR } = require('./db');
const publicRouter = require('./routes/public');
```

จุดที่ 2: แทนที่บรรทัด static ของ `public/` ซึ่งตอนนี้คือ

```js
app.use(express.static(path.join(__dirname, '..', 'public'), { index: false, maxAge: '30d' }));
```

ด้วยข้อความนี้

```js
app.use(express.static(path.join(__dirname, '..', 'public'), { index: false, maxAge: '30d' }));

// Uploaded images (spec 2.1). A name is random and never reused, so the file can be cached for a year as immutable,
// and nosniff stops a browser from reading a file as any type other than the one its extension gives.
app.use('/uploads', express.static(UPLOAD_DIR, {
  index: false,
  maxAge: '365d',
  immutable: true,
  setHeaders: res => res.set('X-Content-Type-Options', 'nosniff')
}));
```

- [ ] **Step 4: เพิ่ม route POST /upload ใน src/routes/admin.js**

แก้ `src/routes/admin.js` สองจุด ส่วนอื่นของไฟล์ไม่เปลี่ยนจาก Task 14

- `receive` ใช้ค่าจาก spec ข้อ 2.4 คือ `fileSize` 5 MB กับ `files: 1` และไม่ได้ตั้ง `storage` multer จึงเก็บไฟล์ไว้ใน memory ไฟล์ที่ยังไม่ผ่านการตรวจจึงไม่ถูกเขียนลง disk
- route เรียก `receive(req, res, callback)` เองตาม spec ข้อ 2.4 โดยห่อด้วย `Promise` ถ้า `err` มีค่าหรือไม่มี `req.file` จะตอบ 400 เป็น JSON ทันที การรอผลใน async handler ทำให้ error ที่เกิดหลังจากนั้น เช่นตอนเขียนไฟล์ ยังไปถึง error handler ของ Express 5 ถ้าเขียนโค้ดต่อไว้ใน callback ของ multer เอง error จะหลุดเป็น unhandled rejection
- ข้อความ `ไฟล์ใหญ่เกิน 5 MB` ใช้กับ `LIMIT_FILE_SIZE` ส่วนกรณีอื่นทั้งหมด ได้แก่ชื่อ field ผิด (`LIMIT_UNEXPECTED_FILE`), สองไฟล์ (`LIMIT_FILE_COUNT`), ฟอร์มที่ไม่มีไฟล์ และ body ที่ไม่ใช่ multipart ได้ `กรุณาเลือกรูป 1 ไฟล์`
- `sniff` ดู bytes 12 ตัวแรกตาม spec คือ JPEG ขึ้นต้นด้วย `FF D8 FF`, PNG คือ signature 8 bytes, GIF คือ `GIF87a` หรือ `GIF89a` และ WebP คือ `RIFF` ตามด้วยขนาด 4 bytes แล้วจึง `WEBP` SVG กับ HTML ที่เปลี่ยนนามสกุลเป็น .png จึงไม่ผ่าน และไม่มี `fileFilter` เพราะมันเห็นแค่ MIME ที่ client ประกาศ
- ชื่อไฟล์คือ `crypto.randomBytes(16)` แบบ hex ต่อด้วยนามสกุลจาก `sniff` `originalname` ไม่ถูกใช้เลย path traversal จึงเกิดไม่ได้
- เขียนไฟล์ด้วย `fs.promises.writeFile` แทน `writeFileSync` ในตัวอย่างของ spec เพื่อไม่ให้ไฟล์ 5 MB บล็อก event loop และใช้ `flag: 'wx'` ที่ fail แทนการเขียนทับถ้าชื่อซ้ำ ซึ่งแทบเป็นไปไม่ได้กับ 128 bit
- route อยู่หลัง `router.use(requireAdmin)` คนที่ยังไม่ login จึงได้ 302 และ `express.urlencoded` ข้าม body แบบ multipart multer จึงอ่าน stream ของ request ได้เต็ม
- ไฟล์กำพร้าที่ไม่มีบทความอ้างถึงแล้วเก็บไว้เฉยๆ ตาม spec ไม่มีโค้ดตามลบ

จุดที่ 1: แทนที่ส่วน require ต้นไฟล์ ซึ่งตอนนี้คือ

```js
const express = require('express');
const bcrypt = require('bcryptjs');
const { run, get, all, transaction } = require('../db');
const { toSlug } = require('../slug');
```

ด้วยข้อความนี้

```js
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const { run, get, all, transaction, UPLOAD_DIR } = require('../db');
const { toSlug } = require('../slug');
```

จุดที่ 2: แทนที่ท้ายไฟล์ ซึ่งตอนนี้คือ

```js
  if (changes === 0) return next();
  res.redirect(303, '/admin/tags');
});

module.exports = router;
```

ด้วยข้อความนี้

```js
  if (changes === 0) return next();
  res.redirect(303, '/admin/tags');
});

// Image upload (spec 2.4). Memory storage keeps a file that has not passed the checks below off the disk.
const receive = multer({ limits: { fileSize: 5 * 1024 * 1024, files: 1 } }).single('image');

// The type comes from the first 12 bytes, never from the file name or the MIME type that the browser declared.
function sniff(buffer) {
  const hex = buffer.subarray(0, 12).toString('hex');
  if (hex.startsWith('ffd8ff')) return '.jpg';
  if (hex.startsWith('89504e470d0a1a0a')) return '.png';
  if (hex.startsWith('474946383761') || hex.startsWith('474946383961')) return '.gif';
  if (hex.startsWith('52494646') && hex.slice(16, 24) === '57454250') return '.webp';
  return null;
}

router.post('/upload', async (req, res) => {
  // multer is called by hand instead of as middleware, so a file over 5 MB, a wrong field name or a form
  // without a file becomes a JSON 400 that admin.js can read, not the HTML error page
  const err = await new Promise(resolve => receive(req, res, resolve));
  if (err || !req.file) {
    const error = err && err.code === 'LIMIT_FILE_SIZE' ? 'ไฟล์ใหญ่เกิน 5 MB' : 'กรุณาเลือกรูป 1 ไฟล์';
    return res.status(400).json({ error });
  }
  const ext = sniff(req.file.buffer);
  if (!ext) return res.status(400).json({ error: 'รองรับเฉพาะ JPEG / PNG / GIF / WebP' });
  // the server makes the whole name, so originalname never reaches the file system
  const name = crypto.randomBytes(16).toString('hex') + ext;
  await fs.promises.writeFile(path.join(UPLOAD_DIR, name), req.file.buffer, { flag: 'wx' });
  res.json({ url: '/uploads/' + name });
});

module.exports = router;
```

- [ ] **Step 5: เขียน public/js/admin.js**

สร้าง `public/js/admin.js` ไฟล์นี้ทำงานตาม spec ข้อ 2.4 คือส่ง FormData ไป `/admin/upload` แล้วเอา url ไปใส่ช่องภาพ หรือแทรก `![](url)` ตรง cursor โดยวาง cursor ไว้ในวงเล็บ `[]` ให้พิมพ์ alt ต่อได้ทันที

- โค้ดทั้งไฟล์อยู่ใน block `{ }` ตามกติกาของ Task 6 เพราะ classic script ในหน้าเดียวกันใช้ global lexical scope ร่วมกัน
- ช่องเลือกไฟล์บอก field เป้าหมายด้วย `data-upload-target` แล้ว script หา field นั้นด้วย `form.elements.namedItem` ซึ่งใช้กับชื่ออย่าง `th[body_markdown]` ได้ตรงๆ ไฟล์เดียวจึงใช้ได้ทั้ง editor บทความและโปรเจกต์โดยไม่ต้องรู้ชื่อ field ล่วงหน้า
- ช่องเลือกไฟล์ไม่มี `name` จึงไม่ถูกส่งไปพร้อมฟอร์มหลักตาม spec ระหว่างอัปโหลดช่องถูก `disabled` และหลังจบถูกล้างค่า การเลือกไฟล์เดิมซ้ำจึงยังเกิด `change`
- `setRangeText` แทนที่ข้อความที่เลือกอยู่หรือแทรกตรง cursor แล้ว `setSelectionRange(start + 2, start + 2)` วาง cursor ระหว่าง `[` กับ `]` และ `focus()` พา focus กลับไปที่ช่องเนื้อหา
- ถ้า server ตอบ JSON ที่มี `error` จะ `alert` ข้อความนั้น ถ้าคำตอบไม่ใช่ JSON ซึ่งเกิดเมื่อ session หมดแล้ว `fetch` ตาม redirect ไปหน้า login จะได้ข้อความที่บอกให้เข้าสู่ระบบใหม่ และถ้าต่อ server ไม่ได้จะได้ข้อความทั่วไป ผู้ใช้มีคนเดียว `alert` จึงพอ
- ไฟล์ยาวราว 30 บรรทัดรวมคอมเมนต์ spec ประมาณไว้ราว 20 บรรทัด ส่วนที่เพิ่มคือการปิดช่องระหว่างอัปโหลดและข้อความของแต่ละกรณี

```js
{
  // Each <input type="file" data-upload-target="<field name>"> in an editor sends the chosen image to /admin/upload.
  // The URL becomes the value of an <input>, or goes into a <textarea> as ![](url) at the cursor, with the cursor
  // left inside [] so the alt text can be typed next. The file input has no name, so the main form never sends it.
  for (const picker of document.querySelectorAll('input[type="file"][data-upload-target]')) {
    picker.addEventListener('change', async () => {
      if (!picker.files.length) return;
      const target = picker.form.elements.namedItem(picker.dataset.uploadTarget);
      const body = new FormData();
      body.append('image', picker.files[0]);
      picker.disabled = true;
      try {
        const res = await fetch('/admin/upload', { method: 'POST', body });
        // a session that has ended is redirected to the HTML login page, so it ends up in the message below
        const data = await res.json().catch(() => ({}));
        if (!data.url) return alert(data.error || 'อัปโหลดไม่สำเร็จ ถ้าออกจากระบบไปแล้ว ให้เข้าสู่ระบบในแท็บใหม่แล้วลองอีกครั้ง');
        if (target.tagName === 'TEXTAREA') {
          const start = target.selectionStart;
          target.setRangeText('![](' + data.url + ')', start, target.selectionEnd);
          target.focus();
          target.setSelectionRange(start + 2, start + 2);
        } else {
          target.value = data.url;
        }
      } catch {
        alert('อัปโหลดไม่สำเร็จ ลองใหม่อีกครั้ง');
      } finally {
        picker.disabled = false;
        picker.value = '';
      }
    });
  }
}
```

- [ ] **Step 6: เพิ่มช่องอัปโหลดใน views/admin/post-edit.ejs**

แก้ `views/admin/post-edit.ejs` สามจุด ส่วนอื่นของไฟล์ไม่เปลี่ยนจาก Task 10

- ช่องอัปโหลดภาพหน้าปกอยู่ใน `.field-pair` ข้างช่อง URL ตาม layout ใน spec ข้อ 2.4 ที่เป็น `ภาพหน้าปก [/uploads/...] [อัปโหลด]` ตั้งแต่ 40rem ทั้งสองช่องอยู่แถวเดียวกัน บนจอเล็กช่องอัปโหลดอยู่ใต้ช่อง URL
- แต่ละภาษามีช่อง แทรกรูปในเนื้อหา ใต้ช่องเนื้อหาของตัวเอง จึงอยู่ใน `<details>` ของภาษานั้นและแทรกรูปลงช่องเนื้อหาที่ถูกต้องเสมอ label มี `<span lang="th">` แบบเดียวกับ label อื่นในส่วนภาษาอังกฤษ
- `accept` ให้หน้าต่างเลือกไฟล์แสดงแค่สี่ชนิด แต่ server ยังตรวจ bytes เสมอ ส่วนช่อง URL ยังพิมพ์หรือวางเองได้เหมือนเดิม
- ถ้ายังไม่เคยคลิกในช่องเนื้อหา `selectionStart` ของ textarea เป็น 0 รูปจึงถูกแทรกที่ต้นช่อง คำอธิบายใต้ช่องจึงบอกว่าเป็นตำแหน่ง cursor ล่าสุด ตอนเขียนแผนวัดใน Edge แล้วว่าค่าเป็น 0 ตอนเปิดหน้า
- script ของ `admin.js` อยู่ต่อจาก `</main>` ใน editor ไม่อยู่ใน `views/admin/foot.ejs` ตามที่ Task 8 กำหนด หน้ารายการจึงไม่โหลด JavaScript ที่ไม่ได้ใช้ และต่อ `?v=` ตามกติกา cache busting ของ spec ข้อ 3.1
- `<%-` ที่มีอยู่ไม่เปลี่ยน และไม่มีตัวใหม่

จุดที่ 1: แทนที่ช่อง ภาพหน้าปก ซึ่งตอนนี้คือ

```ejs
    <label>ภาพหน้าปก
      <input name="cover_image" value="<%= values.cover_image %>" placeholder="/uploads/" spellcheck="false">
    </label>
```

ด้วยข้อความนี้

```ejs
    <div class="field-pair">
      <label>ภาพหน้าปก
        <input name="cover_image" value="<%= values.cover_image %>" placeholder="/uploads/" spellcheck="false">
      </label>
      <label>อัปโหลดภาพหน้าปก
        <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" data-upload-target="cover_image">
        <span class="field-hint">JPEG, PNG, GIF หรือ WebP ไม่เกิน 5 MB แล้ว URL ของรูปจะถูกใส่ในช่องภาพหน้าปกให้</span>
      </label>
    </div>
```

จุดที่ 2: แทนที่ช่องเนื้อหาของแต่ละภาษา ซึ่งตอนนี้คือ

```ejs
        <label><span lang="th">เนื้อหา (markdown)</span>
          <textarea class="editor-body" name="<%= lang %>[body_markdown]" rows="18">
<%= tr.body_markdown %></textarea>
        </label>
```

ด้วยข้อความนี้

```ejs
        <label><span lang="th">เนื้อหา (markdown)</span>
          <textarea class="editor-body" name="<%= lang %>[body_markdown]" rows="18">
<%= tr.body_markdown %></textarea>
        </label>
        <label><span lang="th">แทรกรูปในเนื้อหา</span>
          <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" data-upload-target="<%= lang %>[body_markdown]">
          <span class="field-hint" lang="th">รูปถูกแทรกเป็น ![](url) ตรงตำแหน่ง cursor ล่าสุดในช่องเนื้อหา แล้วพิมพ์ alt ในวงเล็บเหลี่ยมต่อได้ทันที</span>
        </label>
```

จุดที่ 3: แทนที่สองบรรทัดสุดท้ายของไฟล์ ซึ่งตอนนี้คือ

```ejs
</main>
<%- include('foot') %>
```

ด้วยข้อความนี้

```ejs
</main>
<script src="/js/admin.js?v=<%= v %>" defer></script>
<%- include('foot') %>
```

- [ ] **Step 7: เพิ่มช่องอัปโหลดใน views/admin/project-edit.ejs**

แก้ `views/admin/project-edit.ejs` สามจุดแบบเดียวกับ Step 6 ส่วนอื่นของไฟล์ไม่เปลี่ยนจาก Task 13 ต่างกันแค่จุดที่ 1 ที่ช่องเป้าหมายคือ `thumbnail` ตามที่ Task 13 กำหนดไว้

จุดที่ 1: แทนที่ช่อง ภาพ thumbnail ซึ่งตอนนี้คือ

```ejs
    <label>ภาพ thumbnail
      <input name="thumbnail" value="<%= values.thumbnail %>" placeholder="/uploads/" spellcheck="false">
    </label>
```

ด้วยข้อความนี้

```ejs
    <div class="field-pair">
      <label>ภาพ thumbnail
        <input name="thumbnail" value="<%= values.thumbnail %>" placeholder="/uploads/" spellcheck="false">
      </label>
      <label>อัปโหลดภาพ thumbnail
        <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" data-upload-target="thumbnail">
        <span class="field-hint">JPEG, PNG, GIF หรือ WebP ไม่เกิน 5 MB แล้ว URL ของรูปจะถูกใส่ในช่องภาพ thumbnail ให้</span>
      </label>
    </div>
```

จุดที่ 2: แทนที่ช่องเนื้อหาของแต่ละภาษา ซึ่งตอนนี้คือ

```ejs
        <label><span lang="th">เนื้อหา (markdown)</span>
          <textarea class="editor-body" name="<%= lang %>[body_markdown]" rows="18">
<%= tr.body_markdown %></textarea>
        </label>
```

ด้วยข้อความนี้

```ejs
        <label><span lang="th">เนื้อหา (markdown)</span>
          <textarea class="editor-body" name="<%= lang %>[body_markdown]" rows="18">
<%= tr.body_markdown %></textarea>
        </label>
        <label><span lang="th">แทรกรูปในเนื้อหา</span>
          <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" data-upload-target="<%= lang %>[body_markdown]">
          <span class="field-hint" lang="th">รูปถูกแทรกเป็น ![](url) ตรงตำแหน่ง cursor ล่าสุดในช่องเนื้อหา แล้วพิมพ์ alt ในวงเล็บเหลี่ยมต่อได้ทันที</span>
        </label>
```

จุดที่ 3: แทนที่สองบรรทัดสุดท้ายของไฟล์ ซึ่งตอนนี้คือ

```ejs
</main>
<%- include('foot') %>
```

ด้วยข้อความนี้

```ejs
</main>
<script src="/js/admin.js?v=<%= v %>" defer></script>
<%- include('foot') %>
```

- [ ] **Step 8: รัน test ให้เห็นว่าผ่าน**

Run: `node --test test/11-upload.test.js`
Expected: PASS exit code 0 ตัวเลข `duration_ms` สูงกว่า test อื่นเพราะมีไฟล์ 6 MB

```
✔ 11 upload (312.5275ms)
ℹ tests 1
ℹ suites 0
ℹ pass 1
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2668.3593
```

- [ ] **Step 9: ตรวจ logic ของ admin.js ด้วย DOM จำลอง**

test 11 ตรวจแค่ว่า editor โหลด `admin.js` คำสั่งนี้รัน `admin.js` ใน `node:vm` กับ `document`, `FormData`, `fetch` และ `alert` ปลอม แล้วเลือกไฟล์หนึ่งครั้งในแต่ละกรณี แต่ละบรรทัดแสดง request ที่ส่งและสถานะของช่องตอนส่ง, สิ่งที่ `alert`, ค่าของช่องเป้าหมายหลังจบ และค่ากับสถานะของช่องเลือกไฟล์หลังจบ

- `body cursor` วาง cursor ไว้หลัง `ก่อน` กับขึ้นบรรทัดใหม่ ซึ่งคือตำแหน่ง 5 รูปจึงถูกแทรกต้นบรรทัดที่สองและ cursor ไปอยู่ที่ 7 คือใน `[]`
- `body select` เลือกข้อความ `XYZ` ไว้ ข้อความนั้นจึงถูกแทนด้วยรูป
- `login page` จำลองคำตอบที่เป็นหน้า HTML ซึ่ง `res.json()` อ่านไม่ได้ และ `offline` จำลอง `fetch` ที่ต่อไม่ได้
- `no file` คือ `change` ที่ไม่มีไฟล์ script จึงไม่ส่งอะไรและไม่แตะช่อง

Run:

```bash
node - <<'EOF'
const vm = require('node:vm');
const src = require('node:fs').readFileSync('public/js/admin.js', 'utf8');

// One editor form with an image <input> and a body <textarea>, and a fake fetch that answers like POST /admin/upload.
async function pick(target, answer, { files = [{ name: 'photo.png' }], body = '', start = 0, end = start } = {}) {
  const log = [];
  let onChange;
  const input = { tagName: 'INPUT', value: '' };
  const area = {
    tagName: 'TEXTAREA', value: body, selectionStart: start, selectionEnd: end, focused: false,
    setRangeText(text, from, to) { this.value = this.value.slice(0, from) + text + this.value.slice(to); },
    focus() { this.focused = true; },
    setSelectionRange(from, to) { this.selectionStart = from; this.selectionEnd = to; }
  };
  const picker = {
    files, disabled: false, value: 'C:\\fakepath\\photo.png', dataset: { uploadTarget: target },
    form: { elements: { namedItem: name => ({ cover_image: input, 'th[body_markdown]': area })[name] } },
    addEventListener: (type, fn) => { if (type === 'change') onChange = fn; }
  };
  const context = {
    document: { querySelectorAll: sel => (sel === 'input[type="file"][data-upload-target]' ? [picker] : []) },
    FormData: class { constructor() { this.fields = []; } append(key, file) { this.fields.push(key + '=' + file.name); } },
    fetch: async (url, opts) => {
      log.push('fetch ' + opts.method + ' ' + url + ' ' + opts.body.fields.join(' ') + ' disabled=' + picker.disabled);
      if (answer === 'offline') throw new TypeError('Failed to fetch');
      return { json: async () => { if (answer === 'html') throw new SyntaxError('Unexpected token <'); return answer; } };
    },
    alert: message => log.push('alert ' + message)
  };
  vm.runInNewContext(src, context);
  await onChange();
  if (target === 'cover_image') log.push('input=' + input.value);
  else log.push('textarea=' + JSON.stringify(area.value) + ' cursor=' + area.selectionStart + '-' + area.selectionEnd + ' focused=' + area.focused);
  log.push('picker value=' + JSON.stringify(picker.value) + ' disabled=' + picker.disabled);
  return log.join(' | ');
}

const ok = { url: '/uploads/0123456789abcdef0123456789abcdef.png' };
(async () => {
  console.log('cover:        ' + await pick('cover_image', ok));
  console.log('body cursor:  ' + await pick('th[body_markdown]', ok, { body: 'ก่อน\nหลัง', start: 5 }));
  console.log('body select:  ' + await pick('th[body_markdown]', ok, { body: 'abcXYZdef', start: 3, end: 6 }));
  console.log('rejected:     ' + await pick('cover_image', { error: 'รองรับเฉพาะ JPEG / PNG / GIF / WebP' }));
  console.log('login page:   ' + await pick('cover_image', 'html'));
  console.log('offline:      ' + await pick('cover_image', 'offline'));
  console.log('no file:      ' + await pick('cover_image', ok, { files: [] }));
})();
EOF
```

Expected:

```
cover:        fetch POST /admin/upload image=photo.png disabled=true | input=/uploads/0123456789abcdef0123456789abcdef.png | picker value="" disabled=false
body cursor:  fetch POST /admin/upload image=photo.png disabled=true | textarea="ก่อน\n![](/uploads/0123456789abcdef0123456789abcdef.png)หลัง" cursor=7-7 focused=true | picker value="" disabled=false
body select:  fetch POST /admin/upload image=photo.png disabled=true | textarea="abc![](/uploads/0123456789abcdef0123456789abcdef.png)def" cursor=5-5 focused=true | picker value="" disabled=false
rejected:     fetch POST /admin/upload image=photo.png disabled=true | alert รองรับเฉพาะ JPEG / PNG / GIF / WebP | input= | picker value="" disabled=false
login page:   fetch POST /admin/upload image=photo.png disabled=true | alert อัปโหลดไม่สำเร็จ ถ้าออกจากระบบไปแล้ว ให้เข้าสู่ระบบในแท็บใหม่แล้วลองอีกครั้ง | input= | picker value="" disabled=false
offline:      fetch POST /admin/upload image=photo.png disabled=true | alert อัปโหลดไม่สำเร็จ ลองใหม่อีกครั้ง | input= | picker value="" disabled=false
no file:      input= | picker value="C:\\fakepath\\photo.png" disabled=false
```

- [ ] **Step 10: ตรวจ <%- ใน views ด้วยขั้นตรวจเดียวกับ CI**

บรรทัดแรกแสดง `<%-` ทุกตัวใน editor ทั้งสองไฟล์ ซึ่งยังเป็น `include(` สองตัวต่อไฟล์ ส่วน `bash -e -c` รัน script ตัวเดียวกับขั้นสุดท้ายของ `.github/workflows/ci.yml` ใน Task 7

Run: `grep -n "<%-" views/admin/post-edit.ejs views/admin/project-edit.ejs; bash -e -c 'if grep -rn "<%-" views/ | grep -v -e "md.render(" -e "include("; then echo "found <%- outside md.render or include"; exit 1; fi'; echo "guard exit=$?"`
Expected:

```
views/admin/post-edit.ejs:9:<%- include('head', { title: pageTitle, section: 'posts' }) %>
views/admin/post-edit.ejs:113:<%- include('foot') %>
views/admin/project-edit.ejs:9:<%- include('head', { title: pageTitle, section: 'projects' }) %>
views/admin/project-edit.ejs:133:<%- include('foot') %>
guard exit=0
```

- [ ] **Step 11: รัน npm test ทั้งชุด**

Run: `npm test`
Expected: PASS exit code 0 และมี 13 tests

```
> talkalways@1.0.0 test
> node --test test/*.test.js

✔ 01 markdown (48.5105ms)
✔ 02 routing (263.24ms)
✔ 03 publish per language (580.9958ms)
✔ 04 published at (627.1908ms)
✔ 05 blog hidden (491.0968ms)
✔ 06 delete cascade (563.8097ms)
✔ 07 admin guard (317.8839ms)
✔ 08 login cookie (515.7259ms)
✔ 09 editor validation (530.8136ms)
✔ 10 preview (545.5921ms)
✔ 11 upload (478.4171ms)
✔ 12 project order (399.7441ms)
✔ 13 tag page (333.0224ms)
ℹ tests 13
ℹ suites 0
ℹ pass 13
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2070.7818
```

- [ ] **Step 12: สร้างรูป PNG ตัวอย่างใน data/upload-check**

คำสั่งนี้สร้างรูป PNG ขนาด 480x270 ที่เป็นสีไล่จากน้ำเงินไปเขียวอมฟ้าไว้ที่ `data/upload-check/sample.png` สำหรับ Step 13 และ 14 จึงไม่ต้องหารูปจากที่อื่น โฟลเดอร์นี้อยู่ใต้ `data/` ที่ `.gitignore` กันไว้แล้ว และ Step 15 จะลบทิ้ง `zlib.crc32` มีใน Node 24 จึงไม่ต้องเขียนตาราง CRC เอง

Run:

```bash
mkdir -p data/upload-check && node - <<'EOF'
const fs = require('node:fs');
const zlib = require('node:zlib');

// A real 480x270 RGB PNG with a blue-to-teal gradient, so the image is easy to see on the page.
const width = 480;
const height = 270;
const raw = Buffer.alloc((width * 3 + 1) * height);
for (let y = 0; y < height; y++) {
  const row = y * (width * 3 + 1);
  for (let x = 0; x < width; x++) {
    const i = row + 1 + x * 3;
    raw[i] = 31;
    raw[i + 1] = 95 + Math.round((x / width) * 100);
    raw[i + 2] = 168;
  }
}
const chunk = (type, data) => {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'latin1');
  data.copy(out, 8);
  out.writeUInt32BE(zlib.crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
};
const header = Buffer.alloc(13);
header.writeUInt32BE(width, 0);
header.writeUInt32BE(height, 4);
header[8] = 8;
header[9] = 2;
const png = Buffer.concat([
  Buffer.from('89504e470d0a1a0a', 'hex'),
  chunk('IHDR', header),
  chunk('IDAT', zlib.deflateSync(raw)),
  chunk('IEND', Buffer.alloc(0))
]);
fs.writeFileSync('data/upload-check/sample.png', png);
console.log('wrote data/upload-check/sample.png (' + png.length + ' bytes)');
EOF
```

Expected: `wrote data/upload-check/sample.png (2344 bytes)`

- [ ] **Step 13: ตรวจ upload กับ server จริงด้วย curl**

คำสั่งนี้เปิด `server.js` ด้วยไฟล์ env ชั่วคราวแบบเดียวกับ Task 8 Step 20 แล้วใช้ curl ส่ง multipart จริงแบบที่ browser ส่ง ซึ่งต่างจาก `fetch` ใน test

- ใช้ port 3001 และ `DATA_DIR=data/upload-curl` ที่ลบทิ้งตอนจบ `data/site.db` จึงไม่ถูกแตะ และ `--env-file` ชี้ไปไฟล์ชั่วคราวจึงไม่อ่าน `.env` ของโปรเจกต์
- รัน `node` ตรงเพื่อให้ `$!` เป็น process ของ server ห้ามใส่ `cd <dir> &&` ไว้หน้าคำสั่งเหตุผลเดียวกับ Task 5 Step 16
- `sed` ซ่อนชื่อไฟล์ที่สุ่มใหม่ทุกครั้ง บรรทัดของ header มาจาก `HEAD` ของ url ที่ได้ และ `cmp` ยืนยันว่าไฟล์ที่เก็บเหมือนไฟล์ที่ส่งทุก byte
- `favicon.svg` ถูกส่งพร้อม `type=image/png` ที่ปลอมไว้ ต้องได้ 400 เพราะ server ดู bytes ไม่ใช่ MIME
- สองบรรทัดของ `site.db` ลองออกนอก `UPLOAD_DIR` ด้วย `..` ตรงๆ (`--path-as-is` ทำให้ curl ไม่ตัด `..` ทิ้งก่อนส่ง) และแบบ percent-encode ทั้งสองแบบต้องได้ 404
- `000` แปลว่า server หยุดแล้ว และ `REMOVED` แปลว่าลบโฟลเดอร์ทดลองแล้ว ถ้าได้ `LEFT` ให้ลบ `data/upload-curl` เอง

Run:

```bash
T=$(mktemp -d)
printf 'PORT=3001\nDATA_DIR=data/upload-curl\nSESSION_SECRET=local-check-secret\nADMIN_USERNAME=admin\nADMIN_PASSWORD_HASH=%s\n' "$(node scripts/hash-password.js 'correct horse battery staple')" > "$T/.env"
node --env-file="$T/.env" server.js &
curl -s -o /dev/null --retry 10 --retry-delay 1 --retry-connrefused -c "$T/jar" --data-urlencode 'username=admin' --data-urlencode 'password=correct horse battery staple' -w 'POST /admin/login -> %{http_code}\n' http://localhost:3001/admin/login
curl -s -b "$T/jar" -F 'image=@data/upload-check/sample.png' -o "$T/upload.json" -w 'POST /admin/upload sample.png -> %{http_code} ' http://localhost:3001/admin/upload
sed 's/[0-9a-f]\{32\}/<32 hex>/' "$T/upload.json"; echo
URL=$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).url)' "$T/upload.json")
curl -sI "http://localhost:3001$URL" | grep -iE '^(HTTP|content-type|content-length|cache-control|x-content-type-options)' | tr -d '\r'
cmp -s data/upload-check/sample.png "data/upload-curl$URL" && echo "stored file is identical to sample.png"
curl -s -b "$T/jar" -F 'image=@public/favicon.svg;type=image/png' -w ' <- POST /admin/upload favicon.svg as image/png -> %{http_code}\n' http://localhost:3001/admin/upload
curl -s -o /dev/null --path-as-is -w 'GET /uploads/../site.db -> %{http_code}\n' http://localhost:3001/uploads/../site.db
curl -s -o /dev/null -w 'GET /uploads/%%2e%%2e/site.db -> %{http_code}\n' http://localhost:3001/uploads/%2e%2e/site.db
echo "files in data/upload-curl/uploads: $(ls data/upload-curl/uploads | wc -l)"
kill $!; wait $! 2>/dev/null
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3001/admin/login
rm -rf "$T" data/upload-curl; test -e data/upload-curl && echo LEFT || echo REMOVED
```

Expected:

```
Listening on http://localhost:3001
POST /admin/login -> 303
POST /admin/upload sample.png -> 200 {"url":"/uploads/<32 hex>.png"}
HTTP/1.1 200 OK
X-Content-Type-Options: nosniff
Cache-Control: public, max-age=31536000, immutable
Content-Type: image/png
Content-Length: 2344
stored file is identical to sample.png
{"error":"รองรับเฉพาะ JPEG / PNG / GIF / WebP"} <- POST /admin/upload favicon.svg as image/png -> 400
GET /uploads/../site.db -> 404
GET /uploads/%2e%2e/site.db -> 404
files in data/upload-curl/uploads: 1
000
REMOVED
```

- [ ] **Step 14: ตรวจการอัปโหลดใน browser**

**Owner:** ทำทุกข้อข้างล่างใน Chrome หรือ Edge บนเครื่องนี้ แล้วบอก executor ว่าผ่านครบหรือข้อไหนไม่ผ่าน executor ต้องหยุดรอคำตอบและห้าม commit ถ้ามีข้อที่ไม่ผ่าน ข้อ 4 ถึง 8 คือการตรวจของ Phase 5 ใน spec ข้อ 3.5 ที่ว่า upload PNG เป็นภาพปก ใส่ alt ภาษาไทย แล้วแทรกรูปใน body รูปต้องแสดงบนหน้าจริง

1. ใน Git Bash ที่ root ของโปรเจกต์ รัน `DATA_DIR=data/upload-check PORT=3001 SITE_URL=http://localhost:3001 npm start` ต้องเห็น `Listening on http://localhost:3001` DB ของโฟลเดอร์นี้เริ่มจากว่าง และในโฟลเดอร์มีแค่ `sample.png` จาก Step 12
2. เปิด `http://localhost:3001/admin/login` login ด้วย passphrase จาก Task 8 Step 22 คลิกเมนู บทความ แล้วคลิก เขียนบทความใหม่ ช่อง ภาพหน้าปก กับช่อง อัปโหลดภาพหน้าปก ต้องอยู่แถวเดียวกัน และในกล่อง ไทย ใต้ช่อง เนื้อหา (markdown) ต้องมีช่อง แทรกรูปในเนื้อหา
3. กด F12 ไปแท็บ Network แล้วกดปุ่มเลือกไฟล์ของ อัปโหลดภาพหน้าปก ในหน้าต่างเลือกไฟล์ เปลี่ยนชนิดไฟล์มุมขวาล่างเป็น All files แล้วเลือก `public/favicon.svg` ของโปรเจกต์ request `upload` ต้องได้สถานะ 400 browser ต้องขึ้นกล่อง รองรับเฉพาะ JPEG / PNG / GIF / WebP กด OK แล้วช่อง ภาพหน้าปก ต้องยังว่าง
4. กดปุ่มเลือกไฟล์ของ อัปโหลดภาพหน้าปก อีกครั้งแล้วเลือก `data/upload-check/sample.png` request `upload` ต้องได้สถานะ 200 และช่อง ภาพหน้าปก ต้องเป็น `/uploads/` ตามด้วยตัวอักษร 32 ตัวและ `.png`
5. ในกล่อง ไทย พิมพ์หัวข้อ `ทดลองอัปโหลดรูป`, slug `upload-test`, เลือกสถานะ เผยแพร่ และพิมพ์ alt ภาพปก `ภาพไล่สีฟ้า` จากนั้นคลิกในช่อง เนื้อหา พิมพ์ `ย่อหน้าแรก` แล้วกด Enter สองครั้ง
6. กดปุ่มเลือกไฟล์ของ แทรกรูปในเนื้อหา แล้วเลือก `data/upload-check/sample.png` บรรทัดที่สามของช่องเนื้อหาต้องเป็น `![](/uploads/<ตัวอักษร 32 ตัว>.png)` และ cursor กะพริบอยู่ระหว่าง `[` กับ `]` พิมพ์ `รูปในเนื้อหา` ต่อทันทีโดยไม่คลิกที่ไหน บรรทัดนั้นต้องกลายเป็น `![รูปในเนื้อหา](/uploads/<ตัวอักษร 32 ตัว>.png)`
7. กด ดูตัวอย่าง ในกล่อง ไทย แท็บใหม่ต้องมีภาพปกสีไล่ฟ้าใต้หัวข้อ และมีรูปเดียวกันในเนื้อหาใต้ ย่อหน้าแรก แล้วปิดแท็บนั้น
8. กด บันทึก ด้านบน ช่อง URL ต้องเป็น `/admin/posts/1?saved=1` จากนั้นเปิด `http://localhost:3001/th/blog/upload-test` ต้องเห็นภาพปกและรูปในเนื้อหา คลิกขวาที่ภาพปกแล้วเลือก Inspect ต้องเห็น `alt="ภาพไล่สีฟ้า"` และรูปในเนื้อหามี `alt="รูปในเนื้อหา"` ในแท็บ Network คลิก request ที่ลงท้ายด้วย `.png` แล้ว Response Headers ต้องมี `x-content-type-options: nosniff` และ `cache-control: public, max-age=31536000, immutable`
9. เปิด `http://localhost:3001/th/blog` ที่ความกว้างปกติ การ์ด ทดลองอัปโหลดรูป ต้องมีรูปสีไล่ฟ้าเล็กๆ ทางขวา
10. เปิด `http://localhost:3001/admin/projects/new` กดปุ่มเลือกไฟล์ของ อัปโหลดภาพ thumbnail แล้วเลือก `data/upload-check/sample.png` ช่อง ภาพ thumbnail ต้องเป็น `/uploads/` ตามด้วยตัวอักษร 32 ตัวและ `.png` แล้วออกจากหน้านี้โดยไม่ต้องบันทึก
11. กด Ctrl+Shift+M ตั้งความกว้าง 400 ความสูง 900 แล้วเปิด `/admin/posts/1` และ `/admin/projects/new` ทั้งธีมสว่างและมืด โดยสลับธีมด้วย Rendering > prefers-color-scheme แบบ Task 6 Step 12 ข้อ 3 ทุกหน้าต้องไม่มี scrollbar แนวนอน และช่องอัปโหลดอยู่ใต้ช่อง URL ของภาพ จากนั้นตั้ง Rendering กลับเป็น `No emulation` เปิด `/th/blog/upload-test` หน้าต้องไม่มี scrollbar แนวนอนและรูปไม่ล้นคอลัมน์ แล้วปิด device toolbar
12. กลับไปที่ Git Bash แล้วกด Ctrl+C เพื่อหยุด server

ตอนเขียนแผนตรวจข้อ 2 ถึง 11 ด้วย Edge แบบ headless ผ่าน DevTools Protocol ที่ความกว้าง 400 และ 1024px โดยใส่ไฟล์ให้ช่องเลือกไฟล์ด้วย `DOM.setFileInputFiles` ซึ่ง browser ยิง `change` ให้จริง กล่อง `alert` ตอบผ่าน `Page.handleJavaScriptDialog` และใช้รูปจาก Step 12 ความกว้าง 400 จำลองเป็นมือถือ (`mobile: true`) ส่วน 1024px เป็นโหมด desktop ที่ scrollbar แนวตั้งกว้าง 15px ค่าที่วัดได้มีดังนี้

- หน้า `/admin/posts/new` และ `/admin/projects/new` มี `scrollWidth` เท่ากับ `clientWidth` ทั้งสองความกว้าง `.field-pair` ของช่องภาพเป็น `368px` ที่ 400px ช่องอัปโหลดจึงอยู่ใต้ช่อง URL และเป็น `464.5px 464.5px` ที่ 1024px ซึ่งสองช่องอยู่แถวเดียวกัน และทั้งสองหน้าโหลด `/js/admin.js`
- `selectionStart` ของช่องเนื้อหาภาษาไทยเป็น 0 ตอนเปิดหน้า
- ช่องอัปโหลดภาพหน้าปกที่ได้ `sample.png` ใส่ `/uploads/<hex 32 ตัว>.png` ในช่อง ภาพหน้าปก และล้างค่าของตัวเอง
- ช่องเนื้อหาที่มี `ย่อหน้าแรก` กับบรรทัดว่างสองบรรทัดและ cursor อยู่ที่ตำแหน่ง 12 ได้ `![](/uploads/<hex 32 ตัว>.png)` ที่ตำแหน่งนั้น cursor ไปอยู่ที่ 14 และ focus อยู่ที่ช่องเนื้อหา
- `favicon.svg` ทำให้เกิดกล่อง `alert` ข้อความ รองรับเฉพาะ JPEG / PNG / GIF / WebP และช่อง ภาพหน้าปก คงค่าเดิม
- หลังบันทึกผ่านปุ่ม บันทึก จริงได้ `/admin/posts/1?saved=1` และหน้า `/th/blog/upload-test` มีภาพปก `alt="ภาพไล่สีฟ้า"` กับรูปในเนื้อหา `alt="รูปในเนื้อหา"` ที่โหลดสำเร็จทั้งคู่ขนาด `480x270`
- ช่องอัปโหลดภาพ thumbnail ใน editor โปรเจกต์ใส่ `/uploads/<hex 32 ตัว>.png` ในช่อง ภาพ thumbnail

- [ ] **Step 15: ลบรูปและ DB ทดลอง**

Run: `rm -rf data/upload-check; test -e data/upload-check && echo LEFT || echo REMOVED`
Expected: `REMOVED`

ถ้าได้ `LEFT` แปลว่า server จาก Step 14 ยังไม่หยุด ให้กด Ctrl+C ในหน้าต่างนั้นแล้วรันคำสั่งนี้อีกครั้ง

- [ ] **Step 16: ตรวจว่ามีแค่ไฟล์ของ task นี้ที่เปลี่ยน**

Run: `git status --short`
Expected:

```
 M src/app.js
 M src/routes/admin.js
 M views/admin/post-edit.ejs
 M views/admin/project-edit.ejs
?? public/js/admin.js
?? test/11-upload.test.js
```

ถ้ามีบรรทัดอื่นนอกจากนี้ เช่น `.env`, `data/` หรือ `.claude/` ห้าม add ไฟล์นั้นและให้หยุดถามเจ้าของ

- [ ] **Step 17: Commit**

```bash
git add src/app.js src/routes/admin.js public/js/admin.js views/admin/post-edit.ejs views/admin/project-edit.ejs
git add test/11-upload.test.js
git commit -m "feat: add image upload with magic byte checks and editor upload buttons"
```

Expected:

```
[main e724d19] feat: add image upload with magic byte checks and editor upload buttons
 6 files changed, 229 insertions(+), 7 deletions(-)
 create mode 100644 public/js/admin.js
 create mode 100644 test/11-upload.test.js
```

Run: `git status --short | wc -l`
Expected: `0`

### Task 16: settings, หน้า About, ปุ่มออกจากระบบทุกเครื่อง

**Phase:** 5 · **Gate tests:** 14-settings-about

**Files:**
- Modify: `src/routes/public.js` (เพิ่ม route `GET /about` ต่อจาก `GET /tags/:slug` และก่อน `module.exports`)
- Modify: `src/routes/admin.js` (เพิ่ม `GLOBAL_SETTING_KEYS`, `LANG_SETTING_KEYS`, `upsertSetting` กับ route ของ `/settings` ต่อจาก route `POST /upload` และก่อน `module.exports`)
- Create: `views/about.ejs`
- Create: `views/admin/settings.ejs`
- Modify: `views/partials/footer.ejs` (เพิ่มลิงก์โซเชียลจาก settings ก่อนบรรทัด ©)
- Modify: `public/css/site.css` (ต่อ class ของหน้า About และลิงก์โซเชียลท้ายไฟล์)
- Test: `test/14-settings-about.test.js`

**Interfaces:**
- Consumes:
  - `src/db.js` จาก Task 5: `run(sql, params)`, `get(sql, params)`, `all(sql, params)`, `transaction(fn)` และตาราง `settings (key, lang, value)` ที่มี `PRIMARY KEY (key, lang)`
  - `src/routes/admin.js` จาก Task 8 และ 15: `router.use(requireAdmin)`, ชื่อภายใน `text(value)` ที่เก็บแค่ค่าที่เป็น string และท้ายไฟล์ที่จบด้วย `router.post('/upload', ...)` แล้วจึง `module.exports`
  - `src/routes/public.js` จาก Task 14: `loadSettings(lang)`, `router.use` ที่ใส่ `res.locals.settings` ด้วย `WHERE lang IN (?, '*')` และท้ายไฟล์ที่จบด้วย `router.get('/tags/:slug', ...)` แล้วจึง `module.exports`
  - `src/strings.js` จาก Task 12: `navAbout`
  - `views/partials/head.ejs` จาก Task 5: อ่าน `meta.title`, `meta.canonical`, `meta.alternates` แล้วต่อ `siteUrl`
  - `views/partials/header.ejs` จาก Task 5: ลิงก์สลับภาษาใช้ href ของอีกภาษาจาก `meta.alternates`
  - `views/partials/footer.ejs` จาก Task 5: ปิด `</body>` และ `</html>` ของทุกหน้าและมีบรรทัด `<p>© ... settings.site_name ...</p>` เดิม
  - `views/home.ejs` จาก Task 12: อ่าน `settings.tagline` อยู่แล้ว จึงเห็นผลของการบันทึก tagline โดยไม่ต้องแก้ไฟล์นี้
  - `views/admin/head.ejs` จาก Task 8: มีเมนู ตั้งค่า ไป `/admin/settings` และ `<%- include('head', { title, section: 'settings' }) %>` อยู่แล้ว ไฟล์นี้เป็นฉบับสุดท้าย ไม่ต้องแก้
  - `public/css/admin.css` จาก Task 8 และ 10: class `page-head`, `admin-form`, `field-pair`, `field-hint`, `form-saved`, `editor-body` ใช้ซ้ำได้ทั้งหมด ไม่มี CSS ของ admin ที่ต้องเพิ่มใน task นี้
  - `test/helpers.js` จาก Task 14: `start()`, `H.req`, `H.login`, `run`, `get`, `all`
- Produces:
  - `src/routes/public.js`: `GET /about` render `about` ด้วย `{ aboutLang, aboutBody, meta }` ตามหัวข้อ locals และ view ใน Interfaces ของ plan `aboutLang` เป็นภาษาที่ `about_body` มีค่าจริง (ภาษาปัจจุบันก่อน ถ้าไม่มีใช้อีกภาษา) และ `aboutBody` เป็น markdown ดิบของภาษานั้น ท้ายไฟล์เรียงเป็น `GET /`, `GET /blog`, `GET /blog/:slug`, `GET /projects`, `GET /projects/:slug`, `GET /tags/:slug`, `GET /about` แล้วจึง `module.exports` route ของ Task 17 และ 19 เพิ่มก่อน `module.exports`
  - `src/routes/admin.js`: `GLOBAL_SETTING_KEYS` คือ `['site_name', 'github_url', 'linkedin_url', 'x_url', 'email']` เก็บที่ `lang = '*'`, `LANG_SETTING_KEYS` คือ `['tagline', 'about_body']` เก็บแยก `th` กับ `en`, `upsertSetting(key, lang, value)` upsert เมื่อ `value` ไม่ว่าง หรือ `DELETE` เมื่อว่าง `GET /admin/settings` render `admin/settings` ด้วย `{ settings, saved }` โดย `settings` เป็น object แบนที่ key คือ `'<key>:<lang>'` เช่น `settings['tagline:th']` `POST /admin/settings` แตะเฉพาะ 7 key ข้างต้นในทุกภาษาที่เกี่ยวข้อง จึงไม่ยุ่งกับ `session_epoch` แล้ว `res.redirect(303, '/admin/settings?saved=1')` เสมอเพราะไม่มี validation ตาม spec ข้อ 2.4 ท้ายไฟล์เรียงเป็น `/posts`, `/projects`, แท็ก, `/upload`, `/settings` แล้วจึง `module.exports`
  - `views/about.ejs`: อ่าน `aboutLang`, `aboutBody`, `settings.github_url`, `settings.linkedin_url`, `settings.x_url`, `settings.email` ตัวแปรภายใน `foreign = aboutLang !== lang` ใส่ `lang="<aboutLang>"` ที่ `<div class="prose">` ก็ต่อเมื่อ `foreign` เป็นจริง ซึ่งเป็นกติกาเดียวกับการ์ดของอีกภาษาใน `partials/post-card.ejs` ลิงก์โซเชียลใช้ `<ul class="social-list">` แสดงเฉพาะค่าที่ไม่ว่างตาม spec ข้อ 2.1
  - `views/admin/settings.ejs`: `render('admin/settings', { settings, saved })` ตัวช่วยภายใน template คือ `val(key, lang)` ที่อ่าน `settings[key + ':' + (lang || '*')] || ''` ท้ายฟอร์มมีปุ่ม ออกจากระบบทุกเครื่อง ที่ POST ไป `/admin/sessions/revoke` ซึ่ง route มีอยู่แล้วตั้งแต่ Task 8
  - `views/partials/footer.ejs`: ต่อจากนี้ทุกหน้าที่ include partial นี้จะมี `<ul class="social-list">` ก่อนบรรทัด © เมื่อมีค่า `github_url`, `linkedin_url`, `x_url` หรือ `email` อย่างน้อยหนึ่งตัว ใช้ `settings` ตัวเดียวกับที่ `partials/header.ejs` ใช้อยู่แล้ว ไฟล์นี้ยังปิด `</body>` และ `</html>` เหมือนเดิม Task 19 จะเพิ่มลิงก์ privacy และ `include('partials/consent')` ก่อน `</body>`
  - `public/css/site.css`: class ใหม่ `about` และ `social-list` ตัวหลังใช้ร่วมกันระหว่าง `views/about.ejs` กับ `views/partials/footer.ejs`

- [ ] **Step 1: เขียน test ที่ต้อง fail**

สร้าง `test/14-settings-about.test.js` ครอบ spec ข้อ 3.4 test 14 ที่คอมเมนต์ `spec test 14` และตรวจเพิ่มดังนี้

- ก่อนบันทึกอะไร `/th/about` มีแค่หัวข้อ ไม่มี `.prose` และไม่มี `.social-list` พร้อม `<title>`, canonical, hreflang และลิงก์สลับภาษาแบบเดียวกับหน้า list อื่น
- หน้า `/admin/settings` ตอนยังว่างมีช่องครบ (`site_name`, `th[tagline]`, `en[about_body]`, `github_url`) และมีฟอร์มปุ่ม ออกจากระบบทุกเครื่อง ที่ชี้ไป `/admin/sessions/revoke`
- field ที่ถูกส่งซ้ำจนเป็น array ไม่กลายเป็น 500 และถูกนับเป็นค่าว่าง เหมือน `saveTag` ของ Task 14
- หลังบันทึกด้วยค่าของ spec test 14 (`th[about_body]` เป็น `**หนา**`, `github_url` ว่าง) ตรวจ DB ตรงๆ ว่า `about_body:en` ไม่มี row, `github_url` ไม่มี row และ `session_epoch` ไม่ถูกแตะ
- `/th/about` มี `<strong>หนา</strong>` และไม่มีคำว่า `github.com` ตาม spec test 14 ตรงตัว
- `/en/about` ตอนที่ `about_body:en` ยังว่าง แสดงฉบับไทยแทนพร้อม `lang="th"` ที่ครอบ body (fallback ตาม spec ข้อ 2.1)
- tagline และลิงก์โซเชียลที่บันทึกไว้ขึ้นบน footer ของหน้าแรกด้วย
- บันทึกอีกครั้งด้วย `en[about_body]` และ `github_url` ที่มีค่า แล้วตรวจว่า `/en/about` เปลี่ยนไปแสดงฉบับอังกฤษของตัวเอง (ไม่มี `lang="th"` แล้ว) และมีลิงก์ GitHub
- ล้าง `github_url` อีกครั้งเพื่อพิสูจน์ว่า `DELETE` ทำงานจริงกับแถวที่เคยมีอยู่ ไม่ใช่แค่กรณีที่ไม่เคยมีแถว
- ปุ่มออกจากระบบทุกเครื่องบนหน้า settings เรียก route เดิมจาก Task 8 จริง แล้ว cookie เดิมใช้ไม่ได้อีก

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { start, get } = require('./helpers');
const strings = require('../src/strings');

test('14 settings and about', async () => {
  const h = await start();
  try {
    // before anything is saved, /about has just a heading: no body, no social links
    let r = await h.req('/th/about');
    assert.equal(r.status, 200);
    assert.ok(r.text.includes('<h1>' + strings.th.navAbout + '</h1>'), r.text);
    assert.ok(!r.text.includes('class="prose"'), r.text);
    assert.ok(!r.text.includes('class="social-list"'), r.text);
    assert.ok(r.text.includes('<title>' + strings.th.navAbout + ' | Portfolio</title>'), r.text);
    assert.ok(r.text.includes('<link rel="canonical" href="http://test.local/th/about">'), r.text);
    assert.ok(r.text.includes('<link rel="alternate" hreflang="en" href="http://test.local/en/about">'), r.text);
    assert.ok(r.text.includes('class="lang-switch" href="/en/about" lang="en" hreflang="en"'), r.text);

    await h.login();

    // the empty settings form: every field blank, plus the revoke-all button
    r = await h.req('/admin/settings');
    assert.equal(r.status, 200);
    assert.ok(r.text.includes('<a href="/admin/settings" aria-current="page">ตั้งค่า</a>'), r.text);
    assert.ok(r.text.includes('<form class="admin-form" method="post" action="/admin/settings">'), r.text);
    assert.ok(r.text.includes('name="site_name" value=""'), r.text);
    assert.ok(r.text.includes('name="th[tagline]" value=""'), r.text);
    assert.ok(r.text.includes('name="en[about_body]"') && /<textarea[^>]*name="en\[about_body\]"[^>]*>\s*<\/textarea>/.test(r.text), r.text);
    assert.ok(r.text.includes('type="url" name="github_url" value=""'), r.text);
    assert.ok(r.text.includes('<form method="post" action="/admin/sessions/revoke">'), r.text);
    assert.ok(r.text.includes('>ออกจากระบบทุกเครื่อง<'), r.text);

    // a field sent twice arrives as an array, which text() turns into an empty string instead of a 500
    r = await h.req('/admin/settings', { method: 'POST', form: { site_name: ['a', 'b'] } });
    assert.equal(r.status, 303);
    assert.equal(r.location, '/admin/settings?saved=1');
    assert.equal(await get("SELECT value FROM settings WHERE key = 'site_name'"), undefined);

    // spec test 14: th[about_body] is bold markdown, github_url stays empty; the rest of the form is filled too
    const form1 = {
      site_name: 'พอร์ตของผม',
      th: { tagline: 'แท็กไลน์ไทย', about_body: '**หนา**' },
      en: { tagline: 'English tagline', about_body: '' },
      github_url: '',
      linkedin_url: 'https://linkedin.com/in/example',
      x_url: 'https://x.com/example',
      email: 'hello@example.com'
    };
    r = await h.req('/admin/settings', { method: 'POST', form: form1 });
    assert.equal(r.status, 303);
    assert.equal(r.location, '/admin/settings?saved=1');
    r = await h.req(r.location);
    assert.ok(r.text.includes('<p class="form-saved" role="status">บันทึกแล้ว</p>'), r.text);
    // session_epoch is not a field in the form, so it is never touched by saving settings
    assert.equal(await get("SELECT value FROM settings WHERE key = 'session_epoch'"), undefined);

    assert.deepEqual(await get("SELECT value FROM settings WHERE key = 'site_name' AND lang = '*'"), { value: 'พอร์ตของผม' });
    assert.deepEqual(await get("SELECT value FROM settings WHERE key = 'tagline' AND lang = 'th'"), { value: 'แท็กไลน์ไทย' });
    assert.deepEqual(await get("SELECT value FROM settings WHERE key = 'about_body' AND lang = 'th'"), { value: '**หนา**' });
    assert.equal(await get("SELECT value FROM settings WHERE key = 'about_body' AND lang = 'en'"), undefined);
    assert.equal(await get("SELECT value FROM settings WHERE key = 'github_url'"), undefined);
    assert.deepEqual(await get("SELECT value FROM settings WHERE key = 'linkedin_url'"), { value: 'https://linkedin.com/in/example' });

    // spec test 14: /th/about has the rendered bold markdown and no GitHub link
    r = await h.req('/th/about');
    assert.equal(r.status, 200);
    assert.ok(r.text.includes('<strong>หนา</strong>'), r.text);
    assert.ok(!r.text.includes('github.com'), r.text);
    assert.ok(r.text.includes('<div class="prose">'), r.text);
    assert.ok(r.text.includes('<title>' + strings.th.navAbout + ' | พอร์ตของผม</title>'), r.text);
    assert.ok(r.text.includes('<li><a href="https://linkedin.com/in/example">LinkedIn</a></li>'), r.text);
    assert.ok(r.text.includes('<li><a href="https://x.com/example">X</a></li>'), r.text);
    assert.ok(r.text.includes('<li><a href="mailto:hello@example.com">hello@example.com</a></li>'), r.text);

    // English about is still empty, so /en/about falls back to the Thai body wrapped with lang="th"
    r = await h.req('/en/about');
    assert.equal(r.status, 200);
    assert.ok(r.text.includes('<html lang="en">'), r.text);
    assert.ok(r.text.includes('<div class="prose" lang="th">'), r.text);
    assert.ok(r.text.includes('<strong>หนา</strong>'), r.text);

    // the tagline and social links also show on the home page footer
    r = await h.req('/th');
    assert.ok(r.text.includes('<p class="tagline">แท็กไลน์ไทย</p>'), r.text);
    assert.ok(r.text.includes('<li><a href="https://linkedin.com/in/example">LinkedIn</a></li>'), r.text);
    assert.ok(!r.text.includes('github.com'), r.text);

    // saving again: fill github_url and en[about_body]; the settings page round-trips the saved values
    r = await h.req('/admin/settings', {
      method: 'POST',
      form: {
        site_name: 'พอร์ตของผม',
        th: { tagline: 'แท็กไลน์ไทย', about_body: '**หนา**' },
        en: { tagline: 'English tagline', about_body: '**Bold**' },
        github_url: 'https://github.com/example',
        linkedin_url: 'https://linkedin.com/in/example',
        x_url: 'https://x.com/example',
        email: 'hello@example.com'
      }
    });
    assert.equal(r.status, 303);
    r = await h.req('/admin/settings');
    assert.ok(r.text.includes('type="url" name="github_url" value="https://github.com/example"'), r.text);
    assert.ok(/<textarea[^>]*name="en\[about_body\]"[^>]*>\*\*Bold\*\*<\/textarea>/.test(r.text), r.text);

    // English about now has its own content, not the Thai fallback
    r = await h.req('/en/about');
    assert.ok(r.text.includes('<div class="prose">'), r.text);
    assert.ok(!r.text.includes('<div class="prose" lang="th">'), r.text);
    assert.ok(r.text.includes('<strong>Bold</strong>'), r.text);
    assert.ok(r.text.includes('<li><a href="https://github.com/example">GitHub</a></li>'), r.text);

    // clearing github_url again deletes the row instead of leaving a stale one behind
    r = await h.req('/admin/settings', {
      method: 'POST',
      form: {
        site_name: 'พอร์ตของผม',
        th: { tagline: 'แท็กไลน์ไทย', about_body: '**หนา**' },
        en: { tagline: 'English tagline', about_body: '**Bold**' },
        github_url: '',
        linkedin_url: 'https://linkedin.com/in/example',
        x_url: 'https://x.com/example',
        email: 'hello@example.com'
      }
    });
    assert.equal(await get("SELECT value FROM settings WHERE key = 'github_url'"), undefined);
    r = await h.req('/th/about');
    assert.ok(!r.text.includes('github.com'), r.text);

    // the revoke-all button on the settings page uses the route from Task 8
    r = await h.req('/admin/sessions/revoke', { method: 'POST' });
    assert.equal(r.status, 303);
    assert.equal(r.location, '/admin/login');
    r = await h.req('/admin/settings');
    assert.equal(r.status, 302);
    assert.equal(r.location, '/admin/login');
  } finally {
    await h.stop();
  }
});
```

- [ ] **Step 2: รัน test ให้เห็นว่า fail**

ตอนนี้ยังไม่มี route `/about` ใต้ `/th` และ `/en` และยังไม่มี route `/admin/settings` request แรกจึงตกไปที่ 404 handler

Run: `node --test test/14-settings-about.test.js`
Expected: FAIL exit code 1 และ output

```
✖ 14 settings and about (109.7296ms)
ℹ tests 1
ℹ suites 0
ℹ pass 0
ℹ fail 1
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 635.4515

✖ failing tests:

test at test\14-settings-about.test.js:6:1
✖ 14 settings and about (109.7296ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  
  404 !== 200
  
      at TestContext.<anonymous> (D:\Ikkyusan\Downloads\TalkAlways_MVP\talkalways\test\14-settings-about.test.js:11:12)
      at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
      at async Test.run (node:internal/test_runner/test:1409:7)
      at async startSubtestAfterBootstrap (node:internal/test_runner/harness:387:3) {
    generatedMessage: true,
    code: 'ERR_ASSERTION',
    actual: 404,
    expected: 200,
    operator: 'strictEqual',
    diff: 'simple'
  }
```

- [ ] **Step 3: เพิ่ม route GET /about ใน src/routes/public.js**

แก้ `src/routes/public.js` จุดเดียว ส่วนอื่นของไฟล์ไม่เปลี่ยนจาก Task 14

- ดึง `about_body` ทั้งสองภาษาตรงๆ ด้วย query เดียว ไม่ใช้ `res.locals.settings` เพราะตัวนั้นมีแค่ภาษาของหน้ากับ key ที่ `lang = '*'` แต่ route นี้ต้องรู้ว่าอีกภาษามีค่าหรือไม่เพื่อ fallback ตาม spec ข้อ 2.1
- `aboutLang` เลือกภาษาปัจจุบันก่อน ถ้าไม่มีค่าจึงใช้อีกภาษา ถ้าไม่มีทั้งคู่ก็ยังเป็นภาษาปัจจุบัน (`aboutBody` จะเป็น `''` และ template ไม่ render `.prose` เลย)
- หน้า About เป็นหน้า list ที่มีครบสองภาษาเสมอ (ต่างจากบทความหรือโปรเจกต์ที่มีสถานะเผยแพร่แยกภาษา) จึงใส่ `alternates` ทั้งสองภาษาได้เลยแบบเดียวกับ `GET /projects` และ `GET /tags/:slug`
- `meta.title` มาจาก `t.navAbout` เพราะหน้านี้ไม่มีช่อง SEO ของตัวเองใน schema
- Express 5 ส่ง error จาก async handler ต่อให้ error handler เอง จึงไม่มี try/catch

แทนที่ท้ายไฟล์ ซึ่งตอนนี้คือ

```js
      type: 'website'
    }
  });
});

module.exports = router;
```

ด้วยข้อความนี้

```js
      type: 'website'
    }
  });
});

// About (spec 2.1): about_body falls back to the other language when the current one is empty, and the
// wrapper gets a lang attribute only then, the same convention as the foreign card in post-card.ejs.
router.get('/about', async (req, res) => {
  const { lang, other, t } = res.locals;
  const rows = await all("SELECT lang, value FROM settings WHERE key = 'about_body' AND lang IN ('th', 'en')");
  const byLang = {};
  for (const row of rows) byLang[row.lang] = row.value;
  const aboutLang = byLang[lang] ? lang : (byLang[other] ? other : lang);
  res.render('about', {
    aboutLang,
    aboutBody: byLang[aboutLang] || '',
    meta: {
      title: t.navAbout,
      canonical: '/' + lang + '/about',
      alternates: [
        { lang: 'th', href: '/th/about' },
        { lang: 'en', href: '/en/about' }
      ],
      type: 'website'
    }
  });
});

module.exports = router;
```

- [ ] **Step 4: เขียน views/about.ejs**

สร้าง `views/about.ejs`

- `foreign` ใช้กติกาเดียวกับ `partials/post-card.ejs` คือใส่ `lang` ที่ element ครอบก็ต่อเมื่อภาษาที่แสดงไม่ตรงกับภาษาของหน้า
- ลิงก์โซเชียลอ่านจาก `settings` ที่ `res.locals.settings` ใส่ไว้แล้วโดย `router.use` ของ Task 9 (คีย์ที่ `lang = '*'` ผ่านมาตรงๆ) ตามที่ spec ข้อ 2.1 กำหนด
- อีเมลใช้ `mailto:` และแสดงที่อยู่อีเมลเป็นข้อความลิงก์ ส่วน GitHub, LinkedIn และ X ไม่ผ่าน `strings.js` เพราะเป็นชื่อเฉพาะ ไม่ใช่คำที่ต้องแปล
- ทุกค่าใช้ `<%= %>` ยกเว้น `md.render(aboutBody)` กับ `include` ตาม Global Constraints

```ejs
<%
const foreign = aboutLang !== lang;
const social = [
  ['github_url', 'GitHub'],
  ['linkedin_url', 'LinkedIn'],
  ['x_url', 'X']
];
const hasSocial = social.some(([key]) => settings[key]) || settings.email;
-%>
<%- include('partials/head') %>
<%- include('partials/header') %>
<main id="main" class="about">
  <h1><%= t.navAbout %></h1>
<% if (aboutBody) { -%>
  <div class="prose"<% if (foreign) { %> lang="<%= aboutLang %>"<% } %>>
    <%- md.render(aboutBody) %>
  </div>
<% } -%>
<% if (hasSocial) { -%>
  <ul class="social-list">
<% for (const [key, label] of social) { -%>
<% if (settings[key]) { -%>
    <li><a href="<%= settings[key] %>"><%= label %></a></li>
<% } -%>
<% } -%>
<% if (settings.email) { -%>
    <li><a href="mailto:<%= settings.email %>"><%= settings.email %></a></li>
<% } -%>
  </ul>
<% } -%>
</main>
<%- include('partials/footer') %>
```

- [ ] **Step 5: ต่อลิงก์โซเชียลใน views/partials/footer.ejs**

แทนที่เนื้อหาทั้งหมดของ `views/partials/footer.ejs` ด้วยข้อความนี้ บรรทัด `<footer>`, `<p>© ...`, `</footer>`, `</body>` และ `</html>` ไม่เปลี่ยนจาก Task 5 มีแค่ `<ul class="social-list">` แทรกก่อนบรรทัด ©

- ใช้กติกาและรายการ social เดียวกับ `views/about.ejs` ทุก page ที่ include partial นี้ (เกือบทุกหน้า public) จึงเห็นลิงก์โซเชียลที่ footer ตาม spec ข้อ 3.3
- หน้า error ที่ `res.locals.settings` ยังเป็น `{}` ค่า default จะไม่มีค่าไหนเป็นจริงเลย `hasSocial` จึงเป็น `false` และไม่มี `<ul>` แสดง

```ejs
<%
const social = [
  ['github_url', 'GitHub'],
  ['linkedin_url', 'LinkedIn'],
  ['x_url', 'X']
];
const hasSocial = social.some(([key]) => settings[key]) || settings.email;
-%>
<footer class="site-footer">
<% if (hasSocial) { -%>
  <ul class="social-list">
<% for (const [key, label] of social) { -%>
<% if (settings[key]) { -%>
    <li><a href="<%= settings[key] %>"><%= label %></a></li>
<% } -%>
<% } -%>
<% if (settings.email) { -%>
    <li><a href="mailto:<%= settings.email %>"><%= settings.email %></a></li>
<% } -%>
  </ul>
<% } -%>
  <p>© <%= new Date().getFullYear() %> <%= settings.site_name || 'Portfolio' %></p>
</footer>
</body>
</html>
```

- [ ] **Step 6: เพิ่ม route ของ settings ใน src/routes/admin.js**

แก้ `src/routes/admin.js` จุดเดียว ส่วนอื่นของไฟล์ไม่เปลี่ยนจาก Task 15

- `GLOBAL_SETTING_KEYS` เก็บที่ `lang = '*'` ส่วน `LANG_SETTING_KEYS` เก็บแยก `th` กับ `en` ตามตาราง key ของ spec ข้อ 2.4 `session_epoch` ไม่อยู่ในทั้งสองรายการ การบันทึก settings จึงไม่แตะ epoch ตามที่ spec กำหนด
- `upsertSetting` คือ upsert-หรือ-ลบตัวเดียวกับที่ `saveTag` ของ Task 14 ใช้กับ `tags.slug` แค่เปลี่ยนตารางเป็น `settings` และเงื่อนไขคือ "มีค่าไหม" แทน "slug ซ้ำไหม"
- `body[lang]` อาจไม่ใช่ object เช่นถ้ามีคนส่ง `th=foo` เฉยๆ `(body[lang] || {})[key]` จึงได้ `undefined` แล้ว `text(undefined)` ได้ `''` ไม่ throw ไม่ต่าง `text` ที่ `saveTag` ใช้กับ field ที่ถูกส่งซ้ำ
- การเขียนทั้งหมดอยู่ใน `transaction` เดียวกัน 7 คีย์จึงถูกหรือไม่ถูกบันทึกพร้อมกันทั้งหมด ไม่มีสถานะครึ่งๆ กลางๆ ถ้า DB ล่มระหว่างเขียน
- ไม่มี validation ตาม spec ข้อ 2.4 ("เป็น input และ textarea ธรรมดา ไม่มี tab และไม่มีสถานะ") จึง `redirect(303, ...)` เสมอโดยไม่มีเส้นทาง 400
- Express 5 ส่ง error จาก async handler ต่อให้ error handler เอง จึงไม่มี try/catch

แทนที่ท้ายไฟล์ ซึ่งตอนนี้คือ

```js
  await fs.promises.writeFile(path.join(UPLOAD_DIR, name), req.file.buffer, { flag: 'wx' });
  res.json({ url: '/uploads/' + name });
});

module.exports = router;
```

ด้วยข้อความนี้

```js
  await fs.promises.writeFile(path.join(UPLOAD_DIR, name), req.file.buffer, { flag: 'wx' });
  res.json({ url: '/uploads/' + name });
});

// Settings (spec 2.4): plain inputs and a textarea, no tabs and no per-field status. An empty field deletes
// that row and a value upserts it. The form always submits this fixed set of keys, so session_epoch (which
// is not one of them) is never touched by saving settings.
const GLOBAL_SETTING_KEYS = ['site_name', 'github_url', 'linkedin_url', 'x_url', 'email'];
const LANG_SETTING_KEYS = ['tagline', 'about_body'];

async function upsertSetting(key, lang, value) {
  if (value) {
    await run(`INSERT INTO settings (key, lang, value) VALUES (?, ?, ?)
               ON CONFLICT(key, lang) DO UPDATE SET value = excluded.value`, [key, lang, value]);
  } else {
    await run('DELETE FROM settings WHERE key = ? AND lang = ?', [key, lang]);
  }
}

router.get('/settings', async (req, res) => {
  const rows = await all('SELECT key, lang, value FROM settings');
  const settings = {};
  for (const row of rows) settings[row.key + ':' + row.lang] = row.value;
  res.render('admin/settings', { settings, saved: req.query.saved === '1' });
});

router.post('/settings', async (req, res) => {
  const body = req.body ?? {};
  await transaction(async () => {
    for (const key of GLOBAL_SETTING_KEYS) await upsertSetting(key, '*', text(body[key]).trim());
    for (const key of LANG_SETTING_KEYS) {
      for (const lang of ['th', 'en']) {
        await upsertSetting(key, lang, text((body[lang] || {})[key]).trim());
      }
    }
  });
  res.redirect(303, '/admin/settings?saved=1');
});

module.exports = router;
```

- [ ] **Step 7: เขียน views/admin/settings.ejs**

สร้าง `views/admin/settings.ejs` ตามหน้าตาในตาราง key ของ spec ข้อ 2.4 คือ ชื่อเว็บ, tagline สองภาษา, About สองภาษา, ลิงก์โซเชียลและอีเมล แล้วต่อด้วยปุ่มออกจากระบบทุกเครื่อง

- `val(key, lang)` อ่านจาก object แบนที่ `GET /admin/settings` ส่งมา ค่าที่ไม่มี row ได้ `''` ฟอร์มจึงว่างแทนที่จะพัง
- ชื่อ field ตรงกับที่ spec ข้อ 2.4 กำหนด ค่าที่แยกภาษาเป็น `th[tagline]` หรือ `en[about_body]` ส่วนค่าที่ไม่ขึ้นกับภาษาใช้ชื่อตรงๆ
- ช่อง About ใช้ `class="editor-body"` ตัวเดียวกับ `body_markdown` ของ post editor เพราะเป็น markdown เหมือนกัน ได้ฟอนต์ mono จาก Task 10 ฟรี
- ปุ่มออกจากระบบทุกเครื่องเป็นฟอร์ม POST แยกจากฟอร์มตั้งค่า ไปที่ `/admin/sessions/revoke` ซึ่งมี route อยู่แล้วตั้งแต่ Task 8 ทั้งการ `clearCookie` และ `sessionEpoch` จึงไม่ต้องเขียนใหม่
- ไม่มี `.field-error` เพราะไม่มี validation ตาม spec ข้อ 2.4
- ทุกค่าใช้ `<%= %>` ส่วน `<%-` มีแค่ `include`

```ejs
<%
const val = (key, lang) => settings[key + ':' + (lang || '*')] || '';
-%>
<%- include('head', { title: 'ตั้งค่า', section: 'settings' }) %>
<main id="main">
  <div class="page-head">
    <h1>ตั้งค่า</h1>
  </div>
<% if (saved) { -%>
  <p class="form-saved" role="status">บันทึกแล้ว</p>
<% } -%>
  <form class="admin-form" method="post" action="/admin/settings">
    <label>ชื่อเว็บ
      <input name="site_name" value="<%= val('site_name') %>">
    </label>
    <div class="field-pair">
      <label>Tagline ภาษาไทย
        <input name="th[tagline]" value="<%= val('tagline', 'th') %>">
      </label>
      <label>Tagline ภาษาอังกฤษ
        <input name="en[tagline]" value="<%= val('tagline', 'en') %>" lang="en">
      </label>
    </div>
    <div class="field-pair">
      <label>About ภาษาไทย (markdown)
        <textarea name="th[about_body]" rows="10" class="editor-body"><%= val('about_body', 'th') %></textarea>
      </label>
      <label>About ภาษาอังกฤษ (markdown)
        <textarea name="en[about_body]" rows="10" class="editor-body" lang="en"><%= val('about_body', 'en') %></textarea>
      </label>
    </div>
    <div class="field-pair">
      <label>GitHub URL
        <input type="url" name="github_url" value="<%= val('github_url') %>">
      </label>
      <label>LinkedIn URL
        <input type="url" name="linkedin_url" value="<%= val('linkedin_url') %>">
      </label>
    </div>
    <div class="field-pair">
      <label>X URL
        <input type="url" name="x_url" value="<%= val('x_url') %>">
      </label>
      <label>อีเมล
        <input type="email" name="email" value="<%= val('email') %>">
      </label>
    </div>
    <p class="field-hint">ช่องไหนเว้นว่าง ระบบจะลบค่านั้นออกตอนบันทึก</p>
    <button type="submit">บันทึก</button>
  </form>
  <h2>ออกจากระบบทุกเครื่อง</h2>
  <p class="field-hint">ใช้เมื่อสงสัยว่ามีคนอื่นได้ cookie ของผู้ดูแลไป ปุ่มนี้ทำให้ cookie เดิมทุกใบใช้ไม่ได้ทันที รวมถึงเครื่องนี้ ต้อง เข้าสู่ระบบ ใหม่</p>
  <form method="post" action="/admin/sessions/revoke">
    <button type="submit">ออกจากระบบทุกเครื่อง</button>
  </form>
</main>
<%- include('foot') %>
```

- [ ] **Step 8: ต่อ CSS ของหน้า About และลิงก์โซเชียลใน public/css/site.css**

แก้ `public/css/site.css` จุดเดียว ต่อท้ายไฟล์หลัง class ของ Task 12 ส่วนอื่นของไฟล์ไม่เปลี่ยน

- `.social-list` ใช้ร่วมกันระหว่าง `views/about.ejs` กับ `views/partials/footer.ejs` ส่วน `.site-footer .social-list` แค่เพิ่ม margin ด้านล่างให้ห่างจากบรรทัด © โดยไม่ประกาศ custom property ใหม่และไม่มี breakpoint อื่นนอกจาก 40rem กับ 64rem ที่มีอยู่แล้วในไฟล์

แทนที่บรรทัดสุดท้ายของไฟล์ ซึ่งตอนนี้คือ

```css
.project-links { display: flex; flex-wrap: wrap; gap: var(--sp-2) var(--sp-6); margin: var(--sp-4) 0 0; font-weight: 600; }
```

ด้วยข้อความนี้

```css
.project-links { display: flex; flex-wrap: wrap; gap: var(--sp-2) var(--sp-6); margin: var(--sp-4) 0 0; font-weight: 600; }

/* About page (Task 16). .social-list is shared with the footer, which reads the same settings keys. */
.about > * { max-width: var(--measure); }
.about h1 { margin: 0 0 var(--sp-6); }
.about .prose { margin-bottom: var(--sp-8); }
.social-list { display: flex; flex-wrap: wrap; gap: var(--sp-2) var(--sp-6); margin: var(--sp-6) 0 0; padding: 0; list-style: none; }
.social-list a { color: var(--text-muted); text-decoration: none; }
.social-list a:hover { color: var(--text); text-decoration: underline; }
.site-footer .social-list { margin: 0 0 var(--sp-3); }
```

- [ ] **Step 9: รัน test ให้เห็นว่าผ่าน**

Run: `node --test test/14-settings-about.test.js`
Expected: PASS exit code 0

```
✔ 14 settings and about (178.7157ms)
ℹ tests 1
ℹ suites 0
ℹ pass 1
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 632.0884
```

- [ ] **Step 10: ตรวจ <%- ใน views ด้วยขั้นตรวจเดียวกับ CI**

บรรทัดแรกแสดง `<%-` ทุกตัวในไฟล์ใหม่ของ task นี้ ซึ่งเป็น `include(` หรือ `md.render(` ทั้งหมด ส่วน `bash -e -c` รัน script ตัวเดียวกับขั้นสุดท้ายของ `.github/workflows/ci.yml` ใน Task 7

Run: `grep -n "<%-" views/about.ejs views/admin/settings.ejs views/partials/footer.ejs; bash -e -c 'if grep -rn "<%-" views/ | grep -v -e "md.render(" -e "include("; then echo "found <%- outside md.render or include"; exit 1; fi'; echo "guard exit=$?"`
Expected:

```
views/about.ejs:10:<%- include('partials/head') %>
views/about.ejs:11:<%- include('partials/header') %>
views/about.ejs:16:    <%- md.render(aboutBody) %>
views/about.ejs:32:<%- include('partials/footer') %>
views/admin/settings.ejs:4:<%- include('head', { title: 'ตั้งค่า', section: 'settings' }) %>
views/admin/settings.ejs:57:<%- include('foot') %>
guard exit=0
```

- [ ] **Step 11: ตรวจว่า site.css ใช้แค่ token ที่ประกาศใน :root**

คำสั่งนี้ตรวจว่าทุกชื่อที่ `site.css` เรียกด้วย `var()` มีอยู่ใน `:root` และไม่มี `var()` ที่มี fallback แบบเดียวกับที่ Task 6 ตรวจไว้ตอนสร้างไฟล์

Run: `node -e 'const fs=require("fs");const site=fs.readFileSync("public/css/site.css","utf8");const defined=new Set(site.match(/^:root [{]([^}]*)[}]/)[1].match(/--[a-z0-9-]+(?=:)/g));const used=[...new Set(site.match(/var[(]--[a-z0-9-]+/g).map(s=>s.slice(4)))];console.log("used with var(): "+used.length);console.log("used but not defined: "+(used.filter(n=>!defined.has(n)).join(" ")||"none"));console.log("var() with fallback: "+((site.match(/var[(][^)]*,/g)||[]).join(" ")||"none"))'`
Expected:

```
used with var(): 35
used but not defined: none
var() with fallback: none
```

- [ ] **Step 12: รัน npm test ทั้งชุด**

Run: `npm test`
Expected: PASS exit code 0 และมี 14 tests

```
> talkalways@1.0.0 test
> node --test test/*.test.js

✔ 01 markdown (39.0218ms)
✔ 02 routing (258.9928ms)
✔ 03 publish per language (579.4392ms)
✔ 04 published at (746.8401ms)
✔ 05 blog hidden (585.7205ms)
✔ 06 delete cascade (579.9682ms)
✔ 07 admin guard (387.2059ms)
✔ 08 login cookie (464.9276ms)
✔ 09 editor validation (584.6934ms)
✔ 10 preview (533.6922ms)
✔ 11 upload (571.6035ms)
✔ 12 project order (379.187ms)
✔ 13 tag page (402.6663ms)
✔ 14 settings and about (261.8213ms)
ℹ tests 14
ℹ suites 0
ℹ pass 14
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2185.3984
```

- [ ] **Step 13: ตรวจหน้า settings และ About ใน browser ด้วยเนื้อหาจริง**

**Owner:** ทำทุกข้อข้างล่างใน Chrome หรือ Edge บนเครื่องนี้ แล้วบอก executor ว่าผ่านครบหรือข้อไหนไม่ผ่าน executor ต้องหยุดรอคำตอบและห้าม commit ถ้ามีข้อที่ไม่ผ่าน หน้านี้คือที่เจ้าของกรอกชื่อเว็บ, tagline, About และลิงก์โซเชียลจริงตามที่ spec ข้อ "สิ่งที่เจ้าของต้องทำหรือเลือก" ระบุไว้ ใช้ `data/site.db` จริงได้เลย ไม่ต้องใช้ DB ชั่วคราวแบบ task ก่อนหน้า เพราะนี่คือเนื้อหาจริงของเว็บ ไม่ใช่ข้อมูลทดลอง

1. ใน Git Bash ที่ root ของโปรเจกต์ รัน `npm start` (ใช้ `.env` จาก Task 8) ต้องเห็น `Listening on http://localhost:3000`
2. เปิด `http://localhost:3000/admin/login` login ด้วย passphrase จาก Task 8 คลิกเมนู ตั้งค่า ช่อง URL ต้องเป็น `/admin/settings` เมนู ตั้งค่า ต้องตัวหนา และหน้าต้องมีช่อง ชื่อเว็บ, Tagline ภาษาไทย, Tagline ภาษาอังกฤษ, About ภาษาไทย, About ภาษาอังกฤษ, GitHub URL, LinkedIn URL, X URL, อีเมล และท้ายหน้ามีหัวข้อ ออกจากระบบทุกเครื่อง
3. กรอกชื่อเว็บ, tagline และ About จริงทั้งสองภาษา (เขียน markdown ได้ เช่น หัวข้อย่อยหรือตัวหนา) และลิงก์โซเชียลที่มีจริง ช่องไหนไม่มีให้เว้นว่างไว้ แล้วกด บันทึก ต้องเห็นกล่อง บันทึกแล้ว
4. เปิด `http://localhost:3000/th/about` และ `http://localhost:3000/en/about` เนื้อหาต้อง render ตรงกับที่กรอกรวมถึงส่วนที่เป็น markdown ลิงก์โซเชียลที่กรอกไว้ต้องคลิกได้และไปหน้าที่ถูกต้อง ส่วนช่องที่เว้นว่างไว้ต้องไม่มีลิงก์
5. กลับไปที่ `http://localhost:3000/th` เลื่อนไปท้ายหน้า footer ต้องมีลิงก์โซเชียลชุดเดียวกับหน้า About และ tagline ต้องขึ้นใต้ชื่อเว็บ
6. กด Ctrl+Shift+M ตั้งความกว้าง 400 แล้วเปิด `/admin/settings` และ `/th/about` ทั้งธีมสว่างและมืด (สลับด้วย Rendering > prefers-color-scheme เพราะหน้า admin ไม่มีปุ่มธีม ส่วนหน้า about สลับด้วยปุ่มธีมได้) หน้าต้องไม่มี scrollbar แนวนอน ฟอร์มตั้งค่าเรียงเป็นคอลัมน์เดียว แล้วปิด device toolbar
7. ที่หน้า `/admin/settings` กดปุ่ม ออกจากระบบทุกเครื่อง ต้องเด้งไป `/admin/login` แล้ว login ใหม่ด้วย passphrase เดิม ต้องเข้า `/admin/posts` ได้ตามปกติ (พิสูจน์ว่า epoch ใหม่ใช้ login รอบใหม่ได้ทันที)
8. กลับไปที่ Git Bash แล้วกด Ctrl+C เพื่อหยุด server

- [ ] **Step 14: ตรวจว่ามีแค่ไฟล์ของ task นี้ที่เปลี่ยน**

Run: `git status --short`
Expected:

```
 M public/css/site.css
 M src/routes/admin.js
 M src/routes/public.js
 M views/partials/footer.ejs
?? test/14-settings-about.test.js
?? views/about.ejs
?? views/admin/settings.ejs
```

ถ้ามีบรรทัดอื่นนอกจากนี้ เช่น `.env`, `data/` หรือ `.claude/` ห้าม add ไฟล์นั้นและให้หยุดถามเจ้าของ

- [ ] **Step 15: Commit**

```bash
git add src/routes/public.js src/routes/admin.js views/partials/footer.ejs views/about.ejs views/admin/settings.ejs public/css/site.css
git add test/14-settings-about.test.js
git commit -m "feat: add settings, About page and sign-out-everywhere button"
```

คำสั่งนี้ซ้อมใน repo ทิ้งที่มีไฟล์ของ Task 4 ถึง 15 commit ไว้แล้ว (เลข commit hash จึงไม่ตรงกับ repo จริง)

Expected:

```
[main 54466fa] feat: add settings, About page and sign-out-everywhere button
 7 files changed, 317 insertions(+)
 create mode 100644 test/14-settings-about.test.js
 create mode 100644 views/about.ejs
 create mode 100644 views/admin/settings.ejs
```

Run: `git status --short | wc -l`
Expected: `0`

## Phase 6: Search, cookie และ privacy

### Task 17: search

**Phase:** 6 · **Gate tests:** 15-search

**Files:**
- Modify: `src/routes/public.js` (เพิ่ม `like`, `SEARCH_POST_SQL`, `SEARCH_PROJECT_SQL` ต่อจาก `TAG_LIST_SQL` และก่อน `loadSettings`, กับ route `GET /search` ต่อจาก `GET /about` และก่อน `module.exports`)
- Modify: `src/strings.js` (เพิ่ม 7 คีย์ท้ายแต่ละภาษา)
- Modify: `views/partials/header.ejs` (เพิ่มลิงก์ ค้นหา ใน nav และแก้ตัวคำนวณ `switchHref` ให้พก `q` บนหน้า search)
- Create: `views/search.ejs`
- Modify: `public/css/site.css` (ต่อ class ของหน้า search ท้ายไฟล์)
- Test: `test/15-search.test.js`

**Interfaces:**
- Consumes:
  - `src/db.js` จาก Task 5: `all(sql, params)` โดย `params` เป็น object ที่ key ขึ้นต้นด้วย `$` ก็ได้ (ยังไม่มี task ไหนใช้รูปแบบนี้มาก่อน)
  - `src/app.js` จาก Task 5 และ 18: `res.locals.lang`, `res.locals.other`, `res.locals.t` ที่ตั้งไว้ก่อนเข้า `publicRouter`
  - `src/routes/public.js` จาก Task 16: `router.use` ที่ใส่ `res.locals.settings`, ชื่อภายใน `PAGE_SIZE`, `LIST_SQL`, `PROJECT_LIST_SQL`, `TAG_LIST_SQL`, `loadSettings(lang)`, `pageNumber(req)` และท้ายไฟล์ที่จบด้วย `router.get('/about', ...)` แล้วจึง `module.exports`
  - `src/strings.js` จาก Task 16: `navBlog`, `navProjects`, `navAbout`, `badgeOtherLang` และโครงสองภาษาที่ต้องมี key ชุดเดียวกันเสมอ
  - `views/partials/head.ejs` จาก Task 5: อ่าน `meta.noindex` แล้วใส่ `<meta name="robots" content="noindex">` และอ่าน `meta.title` โดยไม่พัง แม้ `meta.canonical` และ `meta.alternates` จะไม่ถูกส่งมา (ไฟล์นี้ไม่ต้องแก้)
  - `views/partials/header.ejs` จาก Task 5: ตัวคำนวณ `switchHref` เดิมที่ใช้ `meta.alternates` แล้วค่อย `meta.canonical`
  - `views/partials/post-card.ejs` จาก Task 9 และ `views/partials/project-card.ejs` จาก Task 12: รับ `{ card, level }` การ์ดที่ `card.lang !== lang` ได้ `lang` attribute และ badge เอง จึงใช้กับผลค้นหาข้ามภาษาได้ตรงๆ โดยไม่ต้องเขียนใหม่
  - `test/helpers.js` จาก Task 12: `start()`, `H.req`, `insertPost({ th, en, tags })`, `insertProject({ th, en, tags })`
- Produces:
  - `src/routes/public.js`: `like(q)` escape ตัว `!`, `%`, `_` ตามสูตร `'%' + q.replace(/[!%_]/g, '!$&') + '%'`, `SEARCH_POST_SQL` กับ `SEARCH_PROJECT_SQL` ใช้ named params `$lang` และ `$q`, `GET /search` render `search` ด้วย `{ q, tooShort, projects, posts, meta }` ตามหัวข้อ locals และ view ใน Interfaces ของ plan โดย `meta` มีแค่ `title` และ `noindex: true` ไม่มี `canonical` หรือ `alternates` ท้ายไฟล์เรียงเป็น `GET /`, `GET /blog`, `GET /blog/:slug`, `GET /projects`, `GET /projects/:slug`, `GET /tags/:slug`, `GET /about`, `GET /search` แล้วจึง `module.exports` route ของ Task 19 เพิ่มก่อน `module.exports`
  - `src/strings.js`: คีย์ใหม่ `navSearch`, `searchLabel`, `searchButton`, `searchHint`, `searchProjectsHeading`, `searchPostsHeading`, `searchNoResults`
  - `views/partials/header.ejs`: เมื่อ view ที่ include header ส่ง local ชื่อ `q` มาด้วย (มีแค่ `views/search.ejs`) ลิงก์สลับภาษาจะเป็น `/<other>/search` ต่อด้วย `?q=<...>` ถ้า `q` ไม่ว่าง ตรวจด้วย `locals.q !== undefined` เพื่อไม่ให้หน้าอื่นที่ไม่มีตัวแปรนี้โยน `ReferenceError`
  - `views/search.ejs`: `render('search', { q, tooShort, projects, posts, meta })` ฟอร์มเป็น `role="search"` แบบ GET ไป `/<lang>/search` แสดงข้อความแนะนำเมื่อ `tooShort` แสดงส่วนโปรเจกต์ก่อนแล้วค่อยส่วนบทความเมื่อมีผลลัพธ์ และแสดงข้อความไม่พบผลลัพธ์เมื่อทั้งสองว่าง
  - `public/css/site.css`: class ใหม่ `.search-form`, `.search-row`, `.search-hint`, `.search-empty`, `.search-section` ไม่ประกาศ custom property ใหม่

- [ ] **Step 1: เขียน test ที่ต้อง fail**

สร้าง `test/15-search.test.js` ครอบ spec ข้อ 3.4 test 15 ทั้ง 5 ส่วน (คอมเมนต์ `spec test 15, part N`) และตรวจเพิ่มเรื่องลิงก์ ค้นหา ใน nav กับลิงก์สลับภาษาที่พก `q` ตามที่ contract กำหนดให้ Task 17 แก้

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { start, insertPost, insertProject } = require('./helpers');
const strings = require('../src/strings');

test('15 search', async () => {
  const h = await start();
  try {
    // spec test 15, part 1: a Thai word in the middle of a sentence is found; a draft with the same word is not
    await insertPost({
      th: {
        slug: 'trip-japan',
        title: 'เที่ยวญี่ปุ่น',
        excerpt: 'บันทึกทริปปีนี้',
        body_markdown: 'ปีนี้ไปเที่ยวประเทศญี่ปุ่นมา สนุกมาก'
      }
    });
    await insertPost({
      th: {
        status: 'draft',
        slug: 'trip-japan-draft',
        title: 'ร่างญี่ปุ่นที่ยังไม่เผยแพร่',
        body_markdown: 'ร่างที่พูดถึงญี่ปุ่นเหมือนกัน แต่ยังไม่เผยแพร่'
      }
    });
    let r = await h.req('/th/search?q=' + encodeURIComponent('ญี่ปุ่น'));
    assert.equal(r.status, 200);
    assert.ok(r.text.includes('href="/th/blog/trip-japan"'), r.text);
    assert.ok(!r.text.includes('trip-japan-draft'), r.text);
    assert.ok(!r.text.includes('ร่างญี่ปุ่นที่ยังไม่เผยแพร่'), r.text);
    // the search link is on every public page's nav
    assert.ok(r.text.includes('<a href="/th/search">' + strings.th.navSearch + '</a>'), r.text);
    // the language switch link keeps q (plan contract note for Task 17)
    assert.ok(r.text.includes('class="lang-switch" href="/en/search?q=' + encodeURIComponent('ญี่ปุ่น') + '"'), r.text);

    // spec test 15, part 2: a post published in both languages where the term is only in the Thai body still
    // shows up on /en/search, as an English card (its own published translation), not a Thai-flagged fallback
    await insertPost({
      th: { slug: 'docker-th', title: 'เริ่มต้นกับ Docker', body_markdown: 'บทความนี้พูดถึงคอนเทนเนอร์อย่างละเอียด' },
      en: { slug: 'docker-en', title: 'Getting started with Docker', body_markdown: 'This post is about containers in general.' }
    });
    r = await h.req('/en/search?q=' + encodeURIComponent('คอนเทนเนอร์'));
    assert.equal(r.status, 200);
    assert.ok(r.text.includes('href="/en/blog/docker-en"'), r.text);
    assert.ok(!r.text.includes('href="/th/blog/docker-th"'), r.text);
    assert.ok(!r.text.includes(strings.en.badgeOtherLang), r.text);

    // spec test 15, part 3: q=100% only finds text that literally contains 100%, not "100" followed by anything else
    await insertPost({ th: { slug: 'percent-post', title: 'ผลทดสอบ', body_markdown: 'ทดสอบแล้วได้ผล 100% แน่นอน' } });
    await insertPost({ th: { slug: 'percent-negative', title: 'ราคาสินค้า', body_markdown: 'ราคา 100 บาทถ้วน ไม่มีส่วนลด' } });
    r = await h.req('/th/search?q=' + encodeURIComponent('100%'));
    assert.equal(r.status, 200);
    assert.ok(r.text.includes('href="/th/blog/percent-post"'), r.text);
    assert.ok(!r.text.includes('href="/th/blog/percent-negative"'), r.text);

    // spec test 15, part 4: a published project whose summary has the term shows up under the project results;
    // a draft project with a different term stays out
    await insertProject({ th: { slug: 'infra-project', title: 'Infra Toolkit', summary: 'จัดการ infrastructure ด้วย terraform' } });
    await insertProject({ th: { status: 'draft', slug: 'infra-draft', title: 'Draft Infra', summary: 'ใช้ terraform-draft-only ยังไม่เผยแพร่' } });
    r = await h.req('/th/search?q=terraform');
    assert.equal(r.status, 200);
    assert.ok(r.text.includes('href="/th/projects/infra-project"'), r.text);
    assert.ok(r.text.includes('<h2>' + strings.th.searchProjectsHeading + '</h2>'), r.text);
    r = await h.req('/th/search?q=terraform-draft-only');
    assert.equal(r.status, 200);
    assert.ok(!r.text.includes('infra-draft'), r.text);
    assert.ok(r.text.includes(strings.th.searchNoResults), r.text);

    // spec test 15, part 5: noindex, no canonical or hreflang, and a 500-character q does not error - it is
    // trimmed to 100 characters before it reaches the query or the page
    const longQ = 'x'.repeat(100) + 'y'.repeat(400);
    r = await h.req('/th/search?q=' + longQ);
    assert.equal(r.status, 200);
    assert.ok(r.text.includes('<meta name="robots" content="noindex">'), r.text);
    assert.ok(!r.text.includes('rel="canonical"'), r.text);
    assert.ok(!r.text.includes('rel="alternate"'), r.text);
    const m = r.text.match(/id="q" name="q" maxlength="100" value="([^"]*)"/);
    assert.ok(m, r.text);
    assert.equal(m[1], 'x'.repeat(100));

    // an empty or too-short query shows the hint instead of running any query, and the switch link drops ?q=
    r = await h.req('/en/search');
    assert.equal(r.status, 200);
    assert.ok(r.text.includes(strings.en.searchHint), r.text);
    assert.ok(r.text.includes('class="lang-switch" href="/th/search"'), r.text);
  } finally {
    await h.stop();
  }
});
```

- [ ] **Step 2: รัน test ให้เห็นว่า fail**

ยังไม่มี route `/search` ใต้ `/th` และ `/en` request แรกจึงตกไปที่ 404 handler

Run: `node --test test/15-search.test.js`
Expected: FAIL exit code 1 และ output

```
✖ 15 search (85.875ms)
ℹ tests 1
ℹ suites 0
ℹ pass 0
ℹ fail 1
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 526.7609

✖ failing tests:

test at test\15-search.test.js:6:1
✖ 15 search (85.875ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:

  404 !== 200

      at TestContext.<anonymous> (...\test\15-search.test.js:27:12)
      at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
      at async Test.run (node:internal/test_runner/test:1409:7)
      at async startSubtestAfterBootstrap (node:internal/test_runner/harness:387:3) {
    generatedMessage: true,
    code: 'ERR_ASSERTION',
    actual: 404,
    expected: 200,
    operator: 'strictEqual',
    diff: 'simple'
  }
```

- [ ] **Step 3: เพิ่ม SQL และ route ค้นหาใน src/routes/public.js**

แก้ `src/routes/public.js` สองจุด ส่วนอื่นของไฟล์ไม่เปลี่ยนจาก Task 16

- `like(q)` escape `!`, `%` และ `_` แล้วห่อด้วย `%...%` ตรงกับ spec ข้อ 4.1 ตรงตัว
- `SEARCH_POST_SQL` ใช้ fallback เดียวกับ `LIST_SQL` แต่เงื่อนไข `EXISTS` จับคู่คำค้นกับทุกฉบับที่ published ของโพสต์นั้น ไม่ใช่แค่ฉบับที่กำลังจะแสดง คำที่อยู่แค่ในฉบับไทยจึงยังเจอโพสต์บน `/en/search`
- `SEARCH_PROJECT_SQL` รูปเดียวกัน แต่เรียงตาม `featured`, `sort_order`, `id` เหมือนหน้าโปรเจกต์ ไม่ใช่ตามคำค้นตรงชื่อเรื่องก่อน
- `GET /search`: `q` ถูก trim แล้วตัดไม่เกิน 100 ตัวอักษรก่อนทำอะไรทั้งนั้น ถ้าสั้นกว่า 2 ตัวอักษรจะไม่ query เลย `meta` มีแค่ `title` กับ `noindex: true` ไม่มี `canonical` หรือ `alternates` ตามที่ spec ข้อ 4.1 กำหนด
- Express 5 ส่ง error จาก async handler ต่อให้ error handler เอง จึงไม่มี try/catch

แทนที่ข้อความนี้ (ท้าย `TAG_LIST_SQL` ต่อด้วย `loadSettings`)

```js
  ORDER BY t.published_at DESC, t.post_id DESC
  LIMIT ? OFFSET ?`;

async function loadSettings(lang) {
```

ด้วยข้อความนี้

```js
  ORDER BY t.published_at DESC, t.post_id DESC
  LIMIT ? OFFSET ?`;

// Search (spec 4.1). LIKE instead of FTS5, because FTS5's default tokenizer cannot split Thai text that has
// no spaces between words, and ESCAPE '!' turns a literal '%' or '_' the reader typed into an ordinary
// character instead of a wildcard.
const like = q => '%' + q.replace(/[!%_]/g, '!$&') + '%';

// Same fallback as LIST_SQL, but the EXISTS clause matches the search term against every published
// translation of the post, not just the one being displayed - so a term that exists only in the Thai body
// still finds the post on /en/search, shown as its own English card. Title matches sort first.
const SEARCH_POST_SQL = `
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
  LIMIT 20`;

// Same shape as SEARCH_POST_SQL, matching title, summary and body_markdown, ordered like /projects
// (featured first, then sort_order, then id) instead of by title match.
const SEARCH_PROJECT_SQL = `
  SELECT t.project_id, t.lang, t.slug, t.title, t.summary, p.thumbnail
  FROM project_translations t
  JOIN projects p ON p.id = t.project_id
  WHERE t.status = 'published'
    AND (t.lang = $lang OR NOT EXISTS (
          SELECT 1 FROM project_translations x
          WHERE x.project_id = t.project_id AND x.lang = $lang AND x.status = 'published'))
    AND EXISTS (
          SELECT 1 FROM project_translations m
          WHERE m.project_id = t.project_id AND m.status = 'published'
            AND (m.title LIKE $q ESCAPE '!' OR m.summary LIKE $q ESCAPE '!' OR m.body_markdown LIKE $q ESCAPE '!'))
  ORDER BY p.featured DESC, p.sort_order, p.id
  LIMIT 10`;

async function loadSettings(lang) {
```

แทนที่ท้ายไฟล์ ซึ่งตอนนี้คือ

```js
      type: 'website'
    }
  });
});

module.exports = router;
```

ด้วยข้อความนี้

```js
      type: 'website'
    }
  });
});

// Search (spec 4.1): q is trimmed and cut to 100 characters. Under 2 characters left, the form is shown with a
// hint and no query runs at all - noindex is still set, and there is no canonical or hreflang on this page.
router.get('/search', async (req, res) => {
  const { t } = res.locals;
  const q = String(req.query.q || '').trim().slice(0, 100);
  const tooShort = q.length < 2;
  let projects = [];
  let posts = [];
  if (!tooShort) {
    const params = { $lang: res.locals.lang, $q: like(q) };
    projects = await all(SEARCH_PROJECT_SQL, params);
    posts = await all(SEARCH_POST_SQL, params);
  }
  res.render('search', {
    q,
    tooShort,
    projects,
    posts,
    meta: { title: t.navSearch, noindex: true }
  });
});

module.exports = router;
```

- [ ] **Step 4: เพิ่มคีย์ค้นหาใน src/strings.js**

แก้ `src/strings.js` สองจุด ต่อท้ายรายการคีย์ของแต่ละภาษา ส่วนอื่นของไฟล์ไม่เปลี่ยนจาก Task 16

แทนที่ (ในฝั่ง `th`)

```js
    backToProjects: 'กลับไปหน้ารวมโปรเจกต์',
    tagTitle: 'บทความที่ติดแท็ก'
  },
```

ด้วย

```js
    backToProjects: 'กลับไปหน้ารวมโปรเจกต์',
    tagTitle: 'บทความที่ติดแท็ก',
    navSearch: 'ค้นหา',
    searchLabel: 'คำค้นหา',
    searchButton: 'ค้นหา',
    searchHint: 'พิมพ์อย่างน้อย 2 ตัวอักษรเพื่อค้นหา',
    searchProjectsHeading: 'โปรเจกต์ที่พบ',
    searchPostsHeading: 'บทความที่พบ',
    searchNoResults: 'ไม่พบผลลัพธ์สำหรับ'
  },
```

แทนที่ (ในฝั่ง `en`)

```js
    backToProjects: 'Back to projects',
    tagTitle: 'Posts tagged'
  }
};
```

ด้วย

```js
    backToProjects: 'Back to projects',
    tagTitle: 'Posts tagged',
    navSearch: 'Search',
    searchLabel: 'Search term',
    searchButton: 'Search',
    searchHint: 'Type at least 2 characters to search.',
    searchProjectsHeading: 'Matching projects',
    searchPostsHeading: 'Matching posts',
    searchNoResults: 'No results for'
  }
};
```

- [ ] **Step 5: เพิ่มลิงก์ ค้นหา และแก้ลิงก์สลับภาษาใน views/partials/header.ejs**

แทนที่เนื้อหาทั้งหมดของ `views/partials/header.ejs` ด้วยข้อความนี้ มีแค่ตัวคำนวณ `switchHref` ที่เพิ่ม branch แรกและ `<nav>` ที่เพิ่มลิงก์สุดท้าย ส่วนอื่นไม่เปลี่ยนจาก Task 5

```ejs
<%
const otherAlt = (meta.alternates || []).find(alt => alt.lang === other);
let switchHref = '/' + other;
if (locals.q !== undefined) {
  // Search page (Task 17): meta carries no canonical or alternates on this page (spec 4.1), so without this
  // branch the switch link would fall back to the bare "/other" below and drop the query the reader typed.
  switchHref = '/' + other + '/search' + (locals.q ? '?q=' + encodeURIComponent(locals.q) : '');
} else if (otherAlt) {
  switchHref = otherAlt.href.split('?')[0];
} else if (meta.canonical) {
  switchHref = '/' + other + meta.canonical.split('?')[0].slice(lang.length + 1).replace(/\/[^/]*$/, '');
}
-%>
<a class="skip-link" href="#main"><%= t.skipToContent %></a>
<header class="site-header">
  <a class="site-name" href="/<%= lang %>"><%= settings.site_name || 'Portfolio' %></a>
  <nav class="site-nav" aria-label="<%= t.navMain %>">
    <a href="/<%= lang %>/blog"><%= t.navBlog %></a>
    <a href="/<%= lang %>/projects"><%= t.navProjects %></a>
    <a href="/<%= lang %>/about"><%= t.navAbout %></a>
    <a href="/<%= lang %>/search"><%= t.navSearch %></a>
  </nav>
  <a class="lang-switch" href="<%= switchHref %>" lang="<%= other %>" hreflang="<%= other %>"><%= t.switchLang %></a>
  <button type="button" class="theme-toggle" data-theme-toggle aria-label="<%= t.themeToggle %>">
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/></svg>
  </button>
</header>
```

- [ ] **Step 6: เขียน views/search.ejs**

สร้าง `views/search.ejs`

- ฟอร์มเป็น `role="search"` แบบ GET ตรงตามข้อ 4.1 `maxlength="100"` กันไว้อีกชั้นนอกจาก server
- แสดงข้อความแนะนำเมื่อ `tooShort` แสดงข้อความไม่พบผลลัพธ์เมื่อ query แล้วว่างทั้งคู่ ไม่งั้นแสดงโปรเจกต์ก่อนแล้วค่อยบทความ ตามลำดับใน spec ข้อ 4.1 ("ผลลัพธ์แสดงโปรเจกต์ไม่เกิน 10 รายการ ต่อด้วยบทความไม่เกิน 20 รายการ")
- การ์ดโปรเจกต์และบทความใช้ partial เดิมจาก Task 9 และ 12 ตรงๆ การ์ดข้ามภาษาจึงได้ `lang` attribute และ badge โดยอัตโนมัติ
- `q` แสดงกลับด้วย `<%= %>` เท่านั้นตามข้อ 4.1

```ejs
<%- include('partials/head') %>
<%- include('partials/header') %>
<main id="main" class="search">
  <h1><%= t.navSearch %></h1>
  <form class="search-form" role="search" method="get" action="/<%= lang %>/search">
    <label for="q"><%= t.searchLabel %></label>
    <div class="search-row">
      <input type="search" id="q" name="q" maxlength="100" value="<%= q %>">
      <button type="submit"><%= t.searchButton %></button>
    </div>
  </form>
<% if (tooShort) { -%>
  <p class="search-hint"><%= t.searchHint %></p>
<% } else if (!projects.length && !posts.length) { -%>
  <p class="empty search-empty"><%= t.searchNoResults %> “<%= q %>”</p>
<% } else { -%>
<% if (projects.length) { -%>
  <section class="search-section">
    <h2><%= t.searchProjectsHeading %></h2>
    <div class="project-grid">
<% for (const card of projects) { -%>
      <%- include('partials/project-card', { card, level: 3 }) %>
<% } -%>
    </div>
  </section>
<% } -%>
<% if (posts.length) { -%>
  <section class="search-section">
    <h2><%= t.searchPostsHeading %></h2>
    <div class="post-list">
<% for (const card of posts) { -%>
      <%- include('partials/post-card', { card, level: 3 }) %>
<% } -%>
    </div>
  </section>
<% } -%>
<% } -%>
</main>
<%- include('partials/footer') %>
```

- [ ] **Step 7: ต่อ CSS ของหน้า search ใน public/css/site.css**

แก้ `public/css/site.css` จุดเดียว ต่อท้ายไฟล์หลัง class ของ Task 16 ส่วนอื่นของไฟล์ไม่เปลี่ยน

แทนที่บรรทัดสุดท้ายของไฟล์ ซึ่งตอนนี้คือ

```css
.site-footer .social-list { margin: 0 0 var(--sp-3); }
```

ด้วยข้อความนี้

```css
.site-footer .social-list { margin: 0 0 var(--sp-3); }

/* Search page (Task 17). The queries live in src/routes/public.js as SEARCH_POST_SQL and SEARCH_PROJECT_SQL.
   Matching projects reuse the uncapped .project-grid from the home page's featured section; matching posts
   reuse .post-list, capped to --measure like every other post list. */
.search h1 { max-width: var(--measure); margin: 0 0 var(--sp-6); }
.search-form { max-width: var(--measure); display: flex; flex-direction: column; gap: var(--sp-2); margin-bottom: var(--sp-8); }
.search-form label { font-weight: 600; }
.search-row { display: flex; flex-wrap: wrap; gap: var(--sp-2); }
.search-row input { flex: 1 1 16rem; }
.search-hint, .search-empty { max-width: var(--measure); color: var(--text-muted); }
.search-section + .search-section { margin-top: var(--sp-12); }
.search-section h2 { margin: 0 0 var(--sp-4); }
.search-section .post-list { max-width: var(--measure); }
```

- [ ] **Step 8: รัน test ให้เห็นว่าผ่าน**

Run: `node --test test/15-search.test.js`
Expected: PASS exit code 0

```
✔ 15 search (161.5986ms)
ℹ tests 1
ℹ suites 0
ℹ pass 1
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 758.674
```

- [ ] **Step 9: ตรวจ <%- ใน views ใหม่และ token ของ site.css**

บรรทัดแรกแสดง `<%-` ทุกตัวในไฟล์ใหม่ของ task นี้ ซึ่งเป็น `include(` ทั้งหมด (ไม่มี `md.render` ในหน้า search) ส่วนคำสั่งที่สองตรวจว่าทุก `var()` ใน `site.css` มีอยู่ใน `:root` และไม่มี fallback เหมือนที่ Task 6 ตรวจไว้ตอนสร้างไฟล์

Run: `grep -n "<%-" views/search.ejs views/partials/header.ejs; bash -e -c 'if grep -rn "<%-" views/ | grep -v -e "md.render(" -e "include("; then echo "found <%- outside md.render or include"; exit 1; fi'; echo "guard exit=$?"; node -e 'const fs=require("fs");const site=fs.readFileSync("public/css/site.css","utf8");const defined=new Set(site.match(/^:root [{]([^}]*)[}]/)[1].match(/--[a-z0-9-]+(?=:)/g));const used=[...new Set(site.match(/var[(]--[a-z0-9-]+/g).map(s=>s.slice(4)))];console.log("used with var(): "+used.length);console.log("used but not defined: "+(used.filter(n=>!defined.has(n)).join(" ")||"none"));console.log("var() with fallback: "+((site.match(/var[(][^)]*,/g)||[]).join(" ")||"none"))'`
Expected:

```
views/search.ejs:1:<%- include('partials/head') %>
views/search.ejs:2:<%- include('partials/header') %>
views/search.ejs:22:      <%- include('partials/project-card', { card, level: 3 }) %>
views/search.ejs:32:      <%- include('partials/post-card', { card, level: 3 }) %>
views/search.ejs:39:<%- include('partials/footer') %>
guard exit=0
used with var(): 35
used but not defined: none
var() with fallback: none
```

- [ ] **Step 10: รัน npm test ทั้งชุด**

Run: `npm test`
Expected: PASS exit code 0 และมี 15 tests

```
> talkalways@1.0.0 test
> node --test test/*.test.js

✔ 01 markdown (49.4765ms)
✔ 02 routing (298.1299ms)
✔ 03 publish per language (575.4558ms)
✔ 04 published at (709.218ms)
✔ 05 blog hidden (669.3638ms)
✔ 06 delete cascade (650.6818ms)
✔ 07 admin guard (323.6628ms)
✔ 08 login cookie (520.0598ms)
✔ 09 editor validation (641.8822ms)
✔ 10 preview (584.0352ms)
✔ 11 upload (573.1591ms)
✔ 12 project order (511.1797ms)
✔ 13 tag page (355.3339ms)
✔ 14 settings and about (216.6587ms)
✔ 15 search (165.1425ms)
ℹ tests 15
ℹ suites 0
ℹ pass 15
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2132.3201
```

- [ ] **Step 11: ค้นคำไทยกลางประโยคของโพสต์จริงในเว็บ**

**Owner:** ทำทุกข้อข้างล่างใน Chrome หรือ Edge บนเครื่องนี้ แล้วบอก executor ว่าผ่านครบหรือข้อไหนไม่ผ่าน executor ต้องหยุดรอคำตอบและห้าม commit ถ้ามีข้อที่ไม่ผ่าน ข้อนี้คือ manual checklist ของ spec Phase 6 ("ค้นคำไทยที่อยู่กลางประโยคของโพสต์จริงแล้วเจอ") ใช้ `data/site.db` จริงได้เลย ต้องมีบทความที่เผยแพร่แล้วอย่างน้อยหนึ่งบทความจาก Task ก่อนหน้า

1. ใน Git Bash ที่ root ของโปรเจกต์ รัน `npm start` ต้องเห็น `Listening on http://localhost:3000`
2. เปิด `http://localhost:3000/th` เมนูบนสุดต้องมีลิงก์ ค้นหา ต่อจาก เกี่ยวกับ คลิกลิงก์นั้นต้องไปที่ `http://localhost:3000/th/search`
3. พิมพ์คำไทยหนึ่งคำที่อยู่กลางประโยคในเนื้อหาบทความจริง (ไม่ใช่คำแรกของหัวข้อ) แล้วกด ค้นหา บทความนั้นต้องปรากฏในผลลัพธ์
4. คลิกลิงก์ English ที่หัวหน้า ต้องไปที่ `http://localhost:3000/en/search?q=` ต่อด้วยคำที่พิมพ์ไว้ (คำค้นต้องติดไปด้วย ไม่หาย)
5. ลบคำค้นออกจนเหลือ 1 ตัวอักษรแล้วกด ค้นหา ต้องเห็นข้อความแนะนำแทนผลลัพธ์ ไม่มีการค้นเกิดขึ้น
6. กด Ctrl+Shift+M ตั้งความกว้าง 400 ทั้งธีมสว่างและมืด หน้า search ต้องไม่มี scrollbar แนวนอน ฟอร์มและผลลัพธ์เรียงเป็นคอลัมน์เดียว แล้วปิด device toolbar
7. กลับไปที่ Git Bash แล้วกด Ctrl+C เพื่อหยุด server

- [ ] **Step 12: ตรวจว่ามีแค่ไฟล์ของ task นี้ที่เปลี่ยน**

Run: `git status --short`
Expected:

```
 M public/css/site.css
 M src/routes/public.js
 M src/strings.js
 M views/partials/header.ejs
?? test/15-search.test.js
?? views/search.ejs
```

ถ้ามีบรรทัดอื่นนอกจากนี้ เช่น `.env`, `data/` หรือ `.claude/` ห้าม add ไฟล์นั้นและให้หยุดถามเจ้าของ

- [ ] **Step 13: Commit**

```bash
git add src/routes/public.js src/strings.js views/partials/header.ejs views/search.ejs public/css/site.css
git add test/15-search.test.js
git commit -m "feat: add site search across posts and projects"
```

คำสั่งนี้ซ้อมใน repo ทิ้งที่มีไฟล์ของ Task 4 ถึง 16 commit ไว้แล้ว (เลข commit hash จึงไม่ตรงกับ repo จริง)

Expected:

```
[main b6bdf23] feat: add site search across posts and projects
 6 files changed, 228 insertions(+), 3 deletions(-)
 create mode 100644 test/15-search.test.js
 create mode 100644 views/search.ejs
```

Run: `git status --short | wc -l`
Expected: `0`

### Task 18: cookie จำภาษา

**Phase:** 6 · **Gate tests:** 16-lang-cookie

**Files:**
- Modify: `src/app.js` (แก้ `GET /` ให้อ่าน cookie `lang` ก่อน Accept-Language และแก้ per-lang middleware ให้ตั้ง cookie `lang`)
- Test: `test/16-lang-cookie.test.js`

**Interfaces:**
- Consumes:
  - `src/app.js` จาก Task 5: `app.use(cookieParser(process.env.SESSION_SECRET))` ที่ mount ไว้ก่อน `GET /` และก่อน loop `for (const lang of ['th', 'en'])` ที่ mount `publicRouter`, `req.cookies` ที่ cookie-parser เติมให้
- Produces:
  - `src/app.js`: `GET /` อ่าน `req.cookies.lang` ก่อน แล้วค่อย fallback ไป `req.acceptsLanguages('th', 'en')` แล้วค่อย `'th'` ตามลำดับ spec ข้อ 2.2 และตั้ง `Vary: Accept-Language, Cookie` เสมอ per-lang middleware ตั้ง cookie `lang` ด้วย `{ maxAge: 365 * 864e5, sameSite: 'lax', httpOnly: true, secure: process.env.NODE_ENV === 'production', path: '/' }` เฉพาะตอนค่าเดิมไม่ตรงกับหน้าปัจจุบันตามสูตรในข้อ 4.2 ของ spec ตรงตัว ชื่อ middleware และตำแหน่งใน `src/app.js` ไม่เปลี่ยนจาก Task 5 จึงไม่กระทบ task อื่นที่ mount ต่อจากมัน

- [ ] **Step 1: เขียน test ที่ต้อง fail**

สร้าง `test/16-lang-cookie.test.js` ครอบ spec ข้อ 3.4 test 16 ทั้ง 3 ส่วน (คอมเมนต์ `spec test 16, part N`) และเพิ่มเคสค่า cookie ที่ไม่รู้จักถูกเมิน ตามข้อ 2.2 ("ค่า cookie ที่ไม่ใช่ th หรือ en ถูกเมิน")

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { start } = require('./helpers');

test('16 lang cookie', async () => {
  const h = await start();
  try {
    // spec test 16, part 1: GET /en/blog with no cookie sets a lang=en cookie, HttpOnly
    let r = await h.req('/en/blog');
    assert.equal(r.status, 200);
    const langSet = r.setCookie.find(line => line.startsWith('lang=en'));
    assert.ok(langSet, r.setCookie.join(' | '));
    assert.match(langSet, /HttpOnly/i);
    assert.match(langSet, /SameSite=Lax/i);
    assert.match(langSet, /Path=\//);
    assert.ok(!/Secure/i.test(langSet), langSet); // NODE_ENV is 'test' here, not 'production'

    // spec test 16, part 2: the client jar now carries Cookie: lang=en from the response above.
    // Accept-Language says th, but the cookie wins (spec 2.2), and Vary carries both headers
    r = await h.req('/', { headers: { 'Accept-Language': 'th' } });
    assert.equal(r.status, 302);
    assert.equal(r.location, '/en');
    assert.match(r.headers.get('vary'), /Accept-Language/);
    assert.match(r.headers.get('vary'), /Cookie/);

    // spec test 16, part 3: the cookie already matches the page language, so nothing is re-sent
    r = await h.req('/en/blog');
    assert.equal(r.status, 200);
    assert.ok(!r.setCookie.some(line => line.startsWith('lang=')), r.setCookie.join(' | '));

    // visiting the other language re-sets the cookie to that language
    r = await h.req('/th/blog');
    assert.equal(r.status, 200);
    const langSetTh = r.setCookie.find(line => line.startsWith('lang=th'));
    assert.ok(langSetTh, r.setCookie.join(' | '));

    // an unrecognised cookie value is ignored and Accept-Language decides instead (spec 2.2)
    r = await h.req('/', { jar: false, cookie: 'lang=fr', headers: { 'Accept-Language': 'en-US,en;q=0.9' } });
    assert.equal(r.status, 302);
    assert.equal(r.location, '/en');
  } finally {
    await h.stop();
  }
});
```

- [ ] **Step 2: รัน test ให้เห็นว่า fail**

`GET /` ยังไม่อ่าน cookie และ per-lang middleware ยังไม่ตั้ง cookie เลย

Run: `node --test test/16-lang-cookie.test.js`
Expected: FAIL exit code 1 และ output

```
✖ 16 lang cookie (92.954ms)
ℹ tests 1
ℹ suites 0
ℹ pass 0
ℹ fail 1
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 531.0069

✖ failing tests:

test at test\16-lang-cookie.test.js:5:1
✖ 16 lang cookie (92.954ms)
  AssertionError [ERR_ASSERTION]
      at TestContext.<anonymous> (...\test\16-lang-cookie.test.js:12:12)
      at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
      at async Test.run (node:internal/test_runner/test:1409:7)
      at async startSubtestAfterBootstrap (node:internal/test_runner/harness:387:3) {
    generatedMessage: false,
    code: 'ERR_ASSERTION',
    actual: undefined,
    expected: true,
    operator: '==',
    diff: 'simple'
  }
```

- [ ] **Step 3: แก้ GET / และ per-lang middleware ใน src/app.js**

แก้ `src/app.js` สองจุด ส่วนอื่นของไฟล์ไม่เปลี่ยนจาก Task 16

- `GET /` อ่าน `req.cookies.lang` ก่อน ถ้าเป็น `'th'` หรือ `'en'` ใช้ค่านั้น ไม่งั้นค่อย fallback ไป `Accept-Language` แล้วค่อย `'th'` ตรงตามโค้ดในข้อ 2.2 ของ spec `Vary` เพิ่ม `Cookie` เพราะผลลัพธ์ของ route นี้ขึ้นกับ cookie ด้วยแล้ว ไม่ใช่แค่ header `Accept-Language`
- per-lang middleware ตั้ง cookie เฉพาะตอน `req.cookies.lang !== lang` เท่านั้น request ส่วนใหญ่จึงไม่มี `Set-Cookie` เลย ตรงตามข้อ 4.2 ของ spec ("ตั้ง cookie เฉพาะตอนที่ค่าเดิมไม่ตรงกับหน้าปัจจุบัน")
- ตำแหน่งของทั้งสองจุดใน middleware chain ไม่เปลี่ยน `cookieParser` ยัง mount อยู่ก่อนทั้งคู่เหมือน Task 5 จึงมี `req.cookies` ให้ใช้ได้ทันที

แทนที่ข้อความนี้

```js
app.get('/', (req, res) => {
  res.set('Vary', 'Accept-Language');
  res.redirect(302, '/' + (req.acceptsLanguages('th', 'en') || 'th'));
});
```

ด้วยข้อความนี้

```js
app.get('/', (req, res) => {
  res.set('Vary', 'Accept-Language, Cookie');
  const pref = ['th', 'en'].includes(req.cookies.lang) ? req.cookies.lang : null;
  res.redirect(302, '/' + (pref || req.acceptsLanguages('th', 'en') || 'th'));
});
```

แทนที่ข้อความนี้

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

ด้วยข้อความนี้

```js
for (const lang of ['th', 'en']) {
  app.use('/' + lang, (req, res, next) => {
    res.locals.lang = lang;
    res.locals.other = lang === 'th' ? 'en' : 'th';
    res.locals.t = strings[lang];
    // Remembers the language last read (spec 4.2), used by GET / above. Only (re)written when the value would
    // actually change, so most responses carry no Set-Cookie at all.
    if (req.cookies.lang !== lang) {
      res.cookie('lang', lang, {
        maxAge: 365 * 864e5,
        sameSite: 'lax',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/'
      });
    }
    next();
  }, publicRouter);
}
```

- [ ] **Step 4: รัน test ให้เห็นว่าผ่าน**

Run: `node --test test/16-lang-cookie.test.js`
Expected: PASS exit code 0

```
✔ 16 lang cookie (152.6909ms)
ℹ tests 1
ℹ suites 0
ℹ pass 1
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 686.801
```

- [ ] **Step 5: รัน npm test ทั้งชุด**

Run: `npm test`
Expected: PASS exit code 0 และมี 16 tests

```
> talkalways@1.0.0 test
> node --test test/*.test.js

✔ 01 markdown (40.4993ms)
✔ 02 routing (275.5353ms)
✔ 03 publish per language (561.1559ms)
✔ 04 published at (726.4951ms)
✔ 05 blog hidden (614.2891ms)
✔ 06 delete cascade (655.9424ms)
✔ 07 admin guard (343.1339ms)
✔ 08 login cookie (507.8145ms)
✔ 09 editor validation (609.2845ms)
✔ 10 preview (614.8719ms)
✔ 11 upload (674.506ms)
✔ 12 project order (476.0703ms)
✔ 13 tag page (394.7221ms)
✔ 14 settings and about (272.1677ms)
✔ 15 search (186.8184ms)
✔ 16 lang cookie (163.2765ms)
ℹ tests 16
ℹ suites 0
ℹ pass 16
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2286.5278
```

- [ ] **Step 6: ตรวจ cookie ภาษาในเบราว์เซอร์จริง**

**Owner:** ทำทุกข้อข้างล่างใน Chrome หรือ Edge บนเครื่องนี้ แล้วบอก executor ว่าผ่านครบหรือข้อไหนไม่ผ่าน executor ต้องหยุดรอคำตอบและห้าม commit ถ้ามีข้อที่ไม่ผ่าน

1. ใน Git Bash ที่ root ของโปรเจกต์ รัน `npm start` ต้องเห็น `Listening on http://localhost:3000`
2. เปิดโหมด Incognito แล้วไปที่ `http://localhost:3000/` (พิมพ์ path เปล่าตรงๆ) เปิด DevTools แท็บ Application > Cookies ต้องเห็น cookie ชื่อ `lang` ค่า `th` (หรือ `en` ถ้าตั้งภาษา browser เป็นอังกฤษ) มี HttpOnly และ SameSite=Lax แต่ไม่มี Secure เพราะยังไม่ได้รันบน https
3. คลิกลิงก์ English ที่หัวหน้า คุกกี้ `lang` ต้องเปลี่ยนเป็น `en`
4. ปิดแท็บแล้วเปิดแท็บใหม่ (cookie ยังอยู่เพราะเป็น Incognito เดียวกัน) ไปที่ `http://localhost:3000/` เฉยๆ อีกครั้ง ต้องเด้งไป `/en` ทันทีโดยไม่ถามอะไร (พิสูจน์ว่า cookie ชนะ Accept-Language ของเบราว์เซอร์)
5. ปิด Incognito ทั้งหมดแล้วปิดใหม่ (คุกกี้ Incognito หายเอง) เปิด `http://localhost:3000/` ปกติอีกครั้งต้องกลับไปเลือกตาม Accept-Language ของเบราว์เซอร์ตามเดิม
6. กลับไปที่ Git Bash แล้วกด Ctrl+C เพื่อหยุด server

- [ ] **Step 7: ตรวจว่ามีแค่ไฟล์ของ task นี้ที่เปลี่ยน**

Run: `git status --short`
Expected:

```
 M src/app.js
?? test/16-lang-cookie.test.js
```

ถ้ามีบรรทัดอื่นนอกจากนี้ เช่น `.env`, `data/` หรือ `.claude/` ห้าม add ไฟล์นั้นและให้หยุดถามเจ้าของ

- [ ] **Step 8: Commit**

```bash
git add src/app.js
git add test/16-lang-cookie.test.js
git commit -m "feat: remember the reader's language in a cookie"
```

คำสั่งนี้ซ้อมใน repo ทิ้งที่มีไฟล์ของ Task 4 ถึง 17 commit ไว้แล้ว (เลข commit hash จึงไม่ตรงกับ repo จริง)

Expected:

```
[main 43d6000] feat: remember the reader's language in a cookie
 2 files changed, 58 insertions(+), 2 deletions(-)
 create mode 100644 test/16-lang-cookie.test.js
```

Run: `git status --short | wc -l`
Expected: `0`

### Task 19: แถบ consent, Google Analytics, หน้า privacy

**Phase:** 6 · **Gate tests:** 17-consent-privacy

**Files:**
- Modify: `src/routes/public.js` (เพิ่ม `res.locals.publicPage`, `res.locals.consent`, `res.locals.gaId` ใน `router.use` ที่โหลด settings และเพิ่ม route `GET /privacy` ต่อจาก `GET /search` และก่อน `module.exports`)
- Modify: `src/strings.js` (เพิ่มคีย์ของหน้า privacy และแถบ consent ท้ายแต่ละภาษา)
- Modify: `views/partials/head.ejs` (เพิ่ม `<script>` ของ `consent.js` ต่อจาก `theme.js`)
- Modify: `views/partials/footer.ejs` (เพิ่มลิงก์ privacy ในบรรทัด © และ include `partials/consent.ejs` ก่อน `</body>`)
- Create: `views/partials/consent.ejs`
- Create: `views/privacy.ejs`
- Create: `public/js/consent.js`
- Modify: `public/css/site.css` (ต่อ class ของแถบ consent และหน้า privacy ท้ายไฟล์)
- Modify: `src/routes/admin.js` (เพิ่ม `'privacy_body'` ใน `LANG_SETTING_KEYS`)
- Modify: `views/admin/settings.ejs` (เพิ่มช่อง `th[privacy_body]` และ `en[privacy_body]`)
- Modify: `.env.example` (เพิ่ม `GA_MEASUREMENT_ID`)
- Test: `test/17-consent-privacy.test.js`

**Interfaces:**
- Consumes:
  - `src/routes/public.js` จาก Task 17: `router.use(async (req, res, next) => { res.locals.settings = await loadSettings(res.locals.lang); ... })` ที่ mount ก่อนทุก route ของภาษา, `get`, `all` จาก `src/db.js`, ท้ายไฟล์ที่จบด้วย `router.get('/search', ...)` แล้วจึง `module.exports`
  - `src/app.js` จาก Task 18: `req.cookies` ที่ `cookieParser(process.env.SESSION_SECRET)` เติมให้ และ `res.locals.lang`, `res.locals.other`, `res.locals.t` ที่ per-lang middleware ตั้งไว้ก่อนเข้า `publicRouter` (ไฟล์นี้ไม่ต้องแก้ ดูหัวข้อ deviations)
  - `src/markdown.js` จาก Task 4: `app.locals.md` มี `md.render(src)` ใช้ render `about_body` และตอนนี้ `privacy_body` ด้วยวิธีเดียวกัน
  - `views/partials/head.ejs` จาก Task 5: อ่าน `meta.*` ผ่าน `locals.x` และมี `<script src="/js/theme.js?v=<%= v %>" defer>` เป็นบรรทัดสุดท้ายก่อน `</head>`
  - `views/partials/footer.ejs` จาก Task 16: โครง `social` array, `hasSocial`, บรรทัด `<p>© ...</p>` และ `</footer></body></html>` ท้ายไฟล์
  - `views/about.ejs` จาก Task 16: รูปแบบ `<div class="prose"><%- md.render(aboutBody) %></div>` ที่ `views/privacy.ejs` ใช้ซ้ำกับ `privacyBody`
  - `src/routes/admin.js` จาก Task 16: `GLOBAL_SETTING_KEYS`, `LANG_SETTING_KEYS`, `upsertSetting(key, lang, value)`, route `GET /settings` ที่โหลดทุกแถวเป็น `settings[key + ':' + lang]` และ `POST /settings` ที่วนตาม `LANG_SETTING_KEYS`
  - `views/admin/settings.ejs` จาก Task 16: ตัวช่วย `val(key, lang)` และโครง `.field-pair` ของ `about_body`
  - `views/admin/post-edit` และ route preview จาก Task 11: `POST /admin/posts/preview/:lang` render `views/post.ejs` โดยไม่ตั้ง `res.locals.publicPage` เลย (พิสูจน์ว่า preview ไม่มีแถบ consent และไม่โหลด GA)
  - `public/js/theme.js` จาก Task 6: รูปแบบห่อ `{ }` ทั้งไฟล์ที่ `public/js/consent.js` ต้องทำตาม
  - `test/helpers.js` จาก Task 15: `start()`, `H.req`, `H.login()`, `run` ที่ส่งต่อมาจาก `src/db.js`
- Produces:
  - `src/routes/public.js`: `res.locals.publicPage = true`, `res.locals.consent = req.cookies.consent`, `res.locals.gaId = process.env.GA_MEASUREMENT_ID || ''` ตั้งให้ทุก route ใต้ `/th` และ `/en` เท่านั้น ตรงตามข้อ 4.2 ของ spec, `GET /privacy` render `privacy` ด้วย `{ privacyBody, meta }` ท้ายไฟล์เรียงเป็น `..., GET /search, GET /privacy` แล้วจึง `module.exports`
  - `src/strings.js`: คีย์ใหม่ `navPrivacy`, `privacyCookieHeading`, `privacyContactLabel`, `privacyResetButton`, `cookieColName`, `cookieColSetBy`, `cookieColLifetime`, `cookieColPurpose`, `cookieColCategory`, `cookieLifetime30d`, `cookieLifetime1y`, `cookieLifetime180d`, `cookieLifetime2y`, `cookieLifetimeNone`, `cookiePurposeAdmin`, `cookiePurposeLang`, `cookiePurposeConsent`, `cookiePurposeGa`, `cookiePurposeTheme`, `cookieCategoryNecessary`, `cookieCategoryFunctional`, `cookieCategoryAnalytics`, `consentAriaLabel`, `consentTextAnalytics`, `consentTextEssential`, `consentPrivacyLink`, `consentAccept`, `consentReject`, `consentAcknowledge`
  - `views/partials/consent.ejs`: render แถบก็ต่อเมื่อ `locals.publicPage` เป็นจริงและ `locals.consent` ไม่ใช่ `'granted'` หรือ `'denied'` ปุ่มมี `data-consent="granted"` และ `data-consent="denied"` เมื่อมี `locals.gaId` ไม่งั้นมีปุ่มเดียว `data-consent="denied"` ตัวห่อ `<div>` มี `data-consent-bar` ให้ `public/js/consent.js` หา ถูก include จาก `views/partials/footer.ejs` ด้วย `<%- include('consent') %>`
  - `views/privacy.ejs`: `render('privacy', { privacyBody, meta })` ตารางคุกกี้ 4 หรือ 5 แถว (แถว `_ga, _ga_*` แสดงเฉพาะเมื่อ `locals.gaId` มีค่า) และปุ่ม `data-consent-reset` ให้ `public/js/consent.js` หา
  - `views/partials/head.ejs`: `<script src="/js/consent.js?v=<%= v %>" defer data-ga-id="<%= locals.gaId || '' %>">` พิมพ์เฉพาะเมื่อ `locals.publicPage` เป็นจริง
  - `views/partials/footer.ejs`: ลิงก์ `/<%= lang %>/privacy` ในบรรทัด © และ `<%- include('consent') %>` ก่อน `</body>`
  - `public/js/consent.js`: อ่าน `data-ga-id` จาก `document.currentScript`, ฟังก์ชันภายใน `loadGa(id)`, `readCookie(name)`, `setConsent(value)` ทำงานกับปุ่มที่มี `[data-consent]` ในกล่อง `[data-consent-bar]` และปุ่ม `[data-consent-reset]` บนหน้า privacy
  - `src/routes/admin.js`: `LANG_SETTING_KEYS` มี `'privacy_body'` เพิ่มจาก Task 16 บันทึกผ่านฟอร์มเดิมโดยไม่ต้องแก้ `upsertSetting` หรือ `POST /settings`
  - `views/admin/settings.ejs`: ช่อง `th[privacy_body]` และ `en[privacy_body]` แบบเดียวกับ `about_body`
  - `.env.example`: บรรทัด `GA_MEASUREMENT_ID=` พร้อมคอมเมนต์อธิบาย

- [ ] **Step 1: เขียน test ที่ต้อง fail**

สร้าง `test/17-consent-privacy.test.js` ครอบ spec ข้อ 3.4 test 17 ทั้ง 4 ส่วน (คอมเมนต์ `spec test 17, part N`) และเพิ่มการตรวจ `privacy_body`, ช่องในหน้า settings และไฟล์ `public/js/consent.js` ที่ถูกเสิร์ฟจริง

```js
const test = require('node:test');
const assert = require('node:assert/strict');

// spec test 17: this file sets GA_MEASUREMENT_ID before requiring helpers.js, which never overwrites it
process.env.GA_MEASUREMENT_ID = 'G-TEST';

const { start, run } = require('./helpers');
const strings = require('../src/strings');

test('17 consent, analytics and privacy', async () => {
  const h = await start();
  try {
    // spec test 17, part 1: a page with no cookies at all shows the consent bar and carries the analytics id
    let r = await h.req('/th');
    assert.equal(r.status, 200);
    assert.ok(r.text.includes('data-consent-bar'), r.text);
    assert.ok(r.text.includes('data-ga-id="G-TEST"'), r.text);
    assert.ok(r.text.includes(strings.th.consentAccept), r.text);
    assert.ok(r.text.includes(strings.th.consentReject), r.text);

    // spec test 17, part 2: a reader who already said "denied" gets no bar; the script still loads either way,
    // because the reader can still change their mind later on the privacy page
    r = await h.req('/th', { jar: false, cookie: 'consent=denied' });
    assert.equal(r.status, 200);
    assert.ok(!r.text.includes('data-consent-bar'), r.text);
    assert.ok(r.text.includes('data-ga-id="G-TEST"'), r.text);

    // spec test 17, part 3: an admin preview never carries the bar or the analytics id, even with consent=granted
    await h.login();
    r = await h.req('/admin/posts/preview/th', {
      method: 'POST',
      cookie: 'consent=granted',
      form: { th: { status: 'draft', title: 'ตัวอย่างพรีวิว', slug: 'preview-post' } }
    });
    assert.equal(r.status, 200);
    assert.ok(!r.text.includes('G-TEST'), r.text);
    assert.ok(!r.text.includes('data-consent-bar'), r.text);

    // spec test 17, part 4: /th/privacy lists ta_admin, lang, consent and _ga (GA_MEASUREMENT_ID is set in this file)
    r = await h.req('/th/privacy');
    assert.equal(r.status, 200);
    assert.ok(r.text.includes('ta_admin'), r.text);
    assert.ok(r.text.includes('>lang<'), r.text);
    assert.ok(r.text.includes('>consent<'), r.text);
    assert.ok(r.text.includes('_ga'), r.text);

    // the footer's link to privacy is on every public page
    r = await h.req('/en/blog');
    assert.ok(r.text.includes('href="/en/privacy"'), r.text);

    // privacy_body is markdown the owner writes in admin settings (spec 4.2), rendered the same as about_body
    await run(`INSERT INTO settings (key, lang, value) VALUES ('privacy_body', 'th', ?)`, ['เว็บนี้ดูแลโดย **เจ้าของ**']);
    r = await h.req('/th/privacy');
    assert.equal(r.status, 200);
    assert.ok(r.text.includes('<strong>เจ้าของ</strong>'), r.text);
    // the settings page has textareas for both languages, the same convention as about_body
    r = await h.req('/admin/settings');
    assert.ok(r.text.includes('name="th[privacy_body]"'), r.text);
    assert.ok(r.text.includes('name="en[privacy_body]"'), r.text);
    assert.ok(r.text.includes('เว็บนี้ดูแลโดย **เจ้าของ**'), r.text);

    // public/js/consent.js is served as a real static file, and the tag that loads it carries the version query
    r = await h.req('/js/consent.js');
    assert.equal(r.status, 200);
    assert.match(r.headers.get('content-type') || '', /javascript/);
    assert.ok(r.text.includes('googletagmanager.com'), r.text);
    r = await h.req('/th');
    assert.ok(r.text.includes('<script src="/js/consent.js?v='), r.text);
  } finally {
    await h.stop();
  }
});
```

- [ ] **Step 2: รัน test ให้เห็นว่า fail**

`res.locals.publicPage` ยังไม่ถูกตั้งค่าที่ไหนเลย หน้า `/th` จึงไม่มีแถบ consent

Run: `node --test test/17-consent-privacy.test.js`
Expected: FAIL exit code 1 และ output

```
✖ 17 consent, analytics and privacy (111.0367ms)
ℹ tests 1
ℹ suites 0
ℹ pass 0
ℹ fail 1
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 758.4748

✖ failing tests:

test at test\17-consent-privacy.test.js:10:1
✖ 17 consent, analytics and privacy (111.0367ms)
  AssertionError [ERR_ASSERTION]: <!doctype html>
  ...
      at TestContext.<anonymous> (...\test\17-consent-privacy.test.js:16:12)
      at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
      at async Test.run (node:internal/test_runner/test:1409:7)
      at async startSubtestAfterBootstrap (node:internal/test_runner/harness:387:3) {
    generatedMessage: false,
    code: 'ERR_ASSERTION',
    actual: false,
    expected: true,
    operator: '==',
    diff: 'simple'
  }
```

- [ ] **Step 3: ตั้ง publicPage, consent, gaId และเพิ่ม route privacy ใน src/routes/public.js**

แก้ `src/routes/public.js` สองจุด ส่วนอื่นของไฟล์ไม่เปลี่ยนจาก Task 17

แทนที่ข้อความนี้

```js
router.use(async (req, res, next) => {
  res.locals.settings = await loadSettings(res.locals.lang);
  next();
});
```

ด้วยข้อความนี้

```js
router.use(async (req, res, next) => {
  res.locals.settings = await loadSettings(res.locals.lang);
  // spec 4.2: only the public router sets these three. Admin pages, the post/project preview route and the
  // generic 404/500 handler never run this middleware, so partials/consent.ejs and the analytics <script> tag
  // in partials/head.ejs stay off there with no extra locals to remember to set.
  res.locals.publicPage = true;
  res.locals.consent = req.cookies.consent;
  res.locals.gaId = process.env.GA_MEASUREMENT_ID || '';
  next();
});
```

แทนที่ท้ายไฟล์ ซึ่งตอนนี้คือ

```js
  res.render('search', {
    q,
    tooShort,
    projects,
    posts,
    meta: { title: t.navSearch, noindex: true }
  });
});

module.exports = router;
```

ด้วยข้อความนี้

```js
  res.render('search', {
    q,
    tooShort,
    projects,
    posts,
    meta: { title: t.navSearch, noindex: true }
  });
});

// Privacy (spec 4.2). privacy_body is markdown the owner writes in admin settings, one row per language with
// no cross-language fallback (unlike about_body) - the settings page just shows what is there for the current
// language. The cookie table itself lives in strings.js so both languages stay in sync automatically.
router.get('/privacy', async (req, res) => {
  const { lang, t } = res.locals;
  const row = await get("SELECT value FROM settings WHERE key = 'privacy_body' AND lang = ?", [lang]);
  res.render('privacy', {
    privacyBody: row ? row.value : '',
    meta: {
      title: t.navPrivacy,
      canonical: '/' + lang + '/privacy',
      alternates: [
        { lang: 'th', href: '/th/privacy' },
        { lang: 'en', href: '/en/privacy' }
      ],
      type: 'website'
    }
  });
});

module.exports = router;
```

- [ ] **Step 4: เพิ่มคีย์ของ privacy และ consent ใน src/strings.js**

แก้ `src/strings.js` สองจุด ต่อท้ายรายการคีย์ของแต่ละภาษา ส่วนอื่นของไฟล์ไม่เปลี่ยนจาก Task 17

แทนที่ (ในฝั่ง `th`)

```js
    searchProjectsHeading: 'โปรเจกต์ที่พบ',
    searchPostsHeading: 'บทความที่พบ',
    searchNoResults: 'ไม่พบผลลัพธ์สำหรับ'
  },
```

ด้วย

```js
    searchProjectsHeading: 'โปรเจกต์ที่พบ',
    searchPostsHeading: 'บทความที่พบ',
    searchNoResults: 'ไม่พบผลลัพธ์สำหรับ',
    navPrivacy: 'ความเป็นส่วนตัว',
    privacyCookieHeading: 'คุกกี้ที่เว็บนี้ใช้',
    privacyContactLabel: 'ติดต่อ',
    privacyResetButton: 'ตั้งค่า cookie ใหม่',
    cookieColName: 'ชื่อ',
    cookieColSetBy: 'ตั้งโดย',
    cookieColLifetime: 'อายุ',
    cookieColPurpose: 'ใช้ทำอะไร',
    cookieColCategory: 'ประเภท',
    cookieLifetime30d: '30 วัน',
    cookieLifetime1y: '1 ปี',
    cookieLifetime180d: '180 วัน',
    cookieLifetime2y: '2 ปี',
    cookieLifetimeNone: 'ไม่หมดอายุ',
    cookiePurposeAdmin: 'login ของผู้ดูแล ส่งเฉพาะ path /admin',
    cookiePurposeLang: 'จำภาษาล่าสุดที่อ่าน ใช้ตอนเข้า /',
    cookiePurposeConsent: 'จำว่าผู้อ่านยอมรับหรือปฏิเสธ cookie สถิติ',
    cookiePurposeGa: 'สถิติผู้เข้าชม มีเฉพาะหลังผู้อ่านกดยอมรับ',
    cookiePurposeTheme: 'จำธีมสว่างหรือมืด ไม่ถูกส่งไป server',
    cookieCategoryNecessary: 'จำเป็น',
    cookieCategoryFunctional: 'จำเป็นต่อการทำงาน',
    cookieCategoryAnalytics: 'สถิติ ต้องได้รับความยินยอม',
    consentAriaLabel: 'แถบแจ้งเรื่องคุกกี้',
    consentTextAnalytics: 'เว็บนี้ขอใช้คุกกี้เพื่อวัดผลการเข้าชมแบบไม่ระบุตัวตน อ่านรายละเอียดที่',
    consentTextEssential: 'เว็บนี้ใช้เฉพาะคุกกี้ที่จำเป็นต่อการทำงาน อ่านรายละเอียดที่',
    consentPrivacyLink: 'หน้าความเป็นส่วนตัว',
    consentAccept: 'ยอมรับ',
    consentReject: 'ปฏิเสธ',
    consentAcknowledge: 'รับทราบ'
  },
```

แทนที่ (ในฝั่ง `en`)

```js
    searchProjectsHeading: 'Matching projects',
    searchPostsHeading: 'Matching posts',
    searchNoResults: 'No results for'
  }
};
```

ด้วย

```js
    searchProjectsHeading: 'Matching projects',
    searchPostsHeading: 'Matching posts',
    searchNoResults: 'No results for',
    navPrivacy: 'Privacy',
    privacyCookieHeading: 'Cookies this site uses',
    privacyContactLabel: 'Contact',
    privacyResetButton: 'Update cookie settings',
    cookieColName: 'Name',
    cookieColSetBy: 'Set by',
    cookieColLifetime: 'Lifetime',
    cookieColPurpose: 'Purpose',
    cookieColCategory: 'Category',
    cookieLifetime30d: '30 days',
    cookieLifetime1y: '1 year',
    cookieLifetime180d: '180 days',
    cookieLifetime2y: '2 years',
    cookieLifetimeNone: 'Never expires',
    cookiePurposeAdmin: 'Admin login, sent only on path /admin',
    cookiePurposeLang: 'Remembers the last language read, used when visiting /',
    cookiePurposeConsent: 'Remembers whether the reader accepted or rejected analytics cookies',
    cookiePurposeGa: 'Visitor statistics, set only after the reader accepts',
    cookiePurposeTheme: 'Remembers light or dark theme, never sent to the server',
    cookieCategoryNecessary: 'Necessary',
    cookieCategoryFunctional: 'Necessary for the site to work',
    cookieCategoryAnalytics: 'Analytics, requires consent',
    consentAriaLabel: 'Cookie notice',
    consentTextAnalytics: 'This site would like to use cookies to measure anonymous visits. Read more on the',
    consentTextEssential: 'This site only uses cookies necessary for it to work. Read more on the',
    consentPrivacyLink: 'privacy page',
    consentAccept: 'Accept',
    consentReject: 'Reject',
    consentAcknowledge: 'Acknowledge'
  }
};
```

- [ ] **Step 5: เขียน views/partials/consent.ejs**

สร้าง `views/partials/consent.ejs`

```ejs
<%
// Cookie bar (spec 4.2). Rendered only on public pages, and only while the reader has not yet answered.
// locals.publicPage, locals.consent and locals.gaId all come from src/routes/public.js (Task 19) - admin pages,
// the preview route and the generic 404/500 handler never set them, so this partial is a no-op there.
const answered = locals.consent === 'granted' || locals.consent === 'denied';
-%>
<% if (locals.publicPage && !answered) { -%>
<div class="consent-bar" data-consent-bar role="region" aria-label="<%= t.consentAriaLabel %>">
  <p>
<% if (locals.gaId) { -%>
    <%= t.consentTextAnalytics %> <a href="/<%= lang %>/privacy"><%= t.consentPrivacyLink %></a>
<% } else { -%>
    <%= t.consentTextEssential %> <a href="/<%= lang %>/privacy"><%= t.consentPrivacyLink %></a>
<% } -%>
  </p>
  <div class="consent-actions">
<% if (locals.gaId) { -%>
    <button type="button" data-consent="granted"><%= t.consentAccept %></button>
    <button type="button" data-consent="denied"><%= t.consentReject %></button>
<% } else { -%>
    <button type="button" data-consent="denied"><%= t.consentAcknowledge %></button>
<% } -%>
  </div>
</div>
<% } -%>
```

- [ ] **Step 6: เขียน views/privacy.ejs**

สร้าง `views/privacy.ejs` ตารางคุกกี้ดึงข้อความจาก `strings.js` ทั้งหมด แถว `_ga, _ga_*` แสดงเฉพาะเมื่อ `locals.gaId` มีค่า ตรงตามข้อ 4.2 ของ spec ("แถว `_ga` ในตารางแสดงเฉพาะเมื่อมี `GA_MEASUREMENT_ID`")

```ejs
<%
// Cookie table (spec 4.2). The _ga row only shows when analytics can actually run - gaId is '' on a site
// that never set GA_MEASUREMENT_ID, and then there is nothing to disclose in that row.
const rows = [
  { name: 'ta_admin', setBy: 'server', lifetime: t.cookieLifetime30d, purpose: t.cookiePurposeAdmin, category: t.cookieCategoryNecessary },
  { name: 'lang', setBy: 'server', lifetime: t.cookieLifetime1y, purpose: t.cookiePurposeLang, category: t.cookieCategoryFunctional },
  { name: 'consent', setBy: 'browser', lifetime: t.cookieLifetime180d, purpose: t.cookiePurposeConsent, category: t.cookieCategoryNecessary }
];
if (locals.gaId) {
  rows.push({ name: '_ga, _ga_*', setBy: 'Google', lifetime: t.cookieLifetime2y, purpose: t.cookiePurposeGa, category: t.cookieCategoryAnalytics });
}
rows.push({ name: 'theme (localStorage)', setBy: 'browser', lifetime: t.cookieLifetimeNone, purpose: t.cookiePurposeTheme, category: t.cookieCategoryFunctional });
-%>
<%- include('partials/head') %>
<%- include('partials/header') %>
<main id="main" class="privacy">
  <h1><%= t.navPrivacy %></h1>
<% if (privacyBody) { -%>
  <div class="prose"><%- md.render(privacyBody) %></div>
<% } -%>
  <h2><%= t.privacyCookieHeading %></h2>
  <div class="table-wrap">
  <table class="cookie-table">
    <thead>
      <tr>
        <th><%= t.cookieColName %></th>
        <th><%= t.cookieColSetBy %></th>
        <th><%= t.cookieColLifetime %></th>
        <th><%= t.cookieColPurpose %></th>
        <th><%= t.cookieColCategory %></th>
      </tr>
    </thead>
    <tbody>
<% for (const row of rows) { -%>
      <tr>
        <td><%= row.name %></td>
        <td><%= row.setBy %></td>
        <td><%= row.lifetime %></td>
        <td><%= row.purpose %></td>
        <td><%= row.category %></td>
      </tr>
<% } -%>
    </tbody>
  </table>
  </div>
<% if (settings.email) { -%>
  <p><%= t.privacyContactLabel %>: <a href="mailto:<%= settings.email %>"><%= settings.email %></a></p>
<% } -%>
  <button type="button" data-consent-reset><%= t.privacyResetButton %></button>
</main>
<%- include('partials/footer') %>
```

- [ ] **Step 7: เพิ่ม script ของ consent.js ใน views/partials/head.ejs**

แก้ `views/partials/head.ejs` จุดเดียว ต่อจาก `<script>` ของ `theme.js` ส่วนอื่นของไฟล์ไม่เปลี่ยนจาก Task 5

แทนที่ข้อความนี้

```ejs
<link rel="stylesheet" href="/css/site.css?v=<%= v %>">
<script src="/js/theme.js?v=<%= v %>" defer></script>
</head>
<body>
```

ด้วยข้อความนี้

```ejs
<link rel="stylesheet" href="/css/site.css?v=<%= v %>">
<script src="/js/theme.js?v=<%= v %>" defer></script>
<% if (locals.publicPage) { -%>
<script src="/js/consent.js?v=<%= v %>" defer data-ga-id="<%= locals.gaId || '' %>"></script>
<% } -%>
</head>
<body>
```

- [ ] **Step 8: เพิ่มลิงก์ privacy และ include แถบ consent ใน views/partials/footer.ejs**

แก้ `views/partials/footer.ejs` สองจุด ส่วนอื่นของไฟล์ไม่เปลี่ยนจาก Task 16

แทนที่ข้อความนี้

```ejs
  <p>© <%= new Date().getFullYear() %> <%= settings.site_name || 'Portfolio' %></p>
</footer>
</body>
</html>
```

ด้วยข้อความนี้

```ejs
  <p class="footer-meta">© <%= new Date().getFullYear() %> <%= settings.site_name || 'Portfolio' %> · <a href="/<%= lang %>/privacy"><%= t.navPrivacy %></a></p>
</footer>
<%- include('consent') %>
</body>
</html>
```

- [ ] **Step 9: เขียน public/js/consent.js**

สร้าง `public/js/consent.js` ทำสี่อย่างตามข้อ 4.2 ของ spec ห่อทั้งไฟล์ด้วย `{ }` เหมือน `public/js/theme.js` และ `public/js/admin.js`

```js
{
  const script = document.currentScript;
  const gaId = script ? script.dataset.gaId : '';
  const bar = document.querySelector('[data-consent-bar]');

  // Loads GA only after the reader has agreed to it (spec 4.2). cookie_domain: 'none' ties the _ga cookie to
  // the exact host the page is served from, so the reset button below can delete it with just Path=/.
  function loadGa(id) {
    const tag = document.createElement('script');
    tag.async = true;
    tag.src = 'https://www.googletagmanager.com/gtag/js?id=' + id;
    document.head.appendChild(tag);
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', id, { cookie_domain: 'none' });
  }

  function readCookie(name) {
    const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return match ? match[1] : '';
  }

  function setConsent(value) {
    const secure = location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = 'consent=' + value + '; Max-Age=15552000; Path=/; SameSite=Lax' + secure;
    if (bar) bar.hidden = true;
    if (value === 'granted' && gaId) loadGa(gaId);
  }

  if (bar) {
    for (const button of bar.querySelectorAll('[data-consent]')) {
      button.addEventListener('click', () => setConsent(button.dataset.consent));
    }
  }

  if (gaId && readCookie('consent') === 'granted') loadGa(gaId);

  // "Update cookie settings" on the privacy page (spec 4.2): clears consent plus every GA cookie, then reloads
  // so the bar reappears.
  const resetButton = document.querySelector('[data-consent-reset]');
  if (resetButton) {
    resetButton.addEventListener('click', () => {
      document.cookie = 'consent=; Max-Age=0; Path=/';
      document.cookie = '_ga=; Max-Age=0; Path=/';
      for (const pair of document.cookie.split('; ')) {
        const name = pair.split('=')[0];
        if (name.indexOf('_ga_') === 0) document.cookie = name + '=; Max-Age=0; Path=/';
      }
      location.reload();
    });
  }
}
```

- [ ] **Step 10: ต่อ CSS ของแถบ consent และหน้า privacy ใน public/css/site.css**

แก้ `public/css/site.css` จุดเดียว ต่อท้ายไฟล์หลัง class ของ Task 17 ส่วนอื่นของไฟล์ไม่เปลี่ยน ไม่ประกาศ custom property ใหม่ และไม่เพิ่ม breakpoint ใหม่นอกจาก 40rem กับ 64rem ที่มีอยู่แล้ว

แทนที่บรรทัดสุดท้ายของไฟล์ ซึ่งตอนนี้คือ

```css
.search-section h2 { margin: 0 0 var(--sp-4); }
.search-section .post-list { max-width: var(--measure); }
```

ด้วยข้อความนี้

```css
.search-section h2 { margin: 0 0 var(--sp-4); }
.search-section .post-list { max-width: var(--measure); }

/* Footer credit line (Task 19), now carrying the privacy link next to the copyright text. */
.footer-meta { display: flex; flex-wrap: wrap; gap: 0 var(--sp-2); }

/* Cookie consent bar (Task 19). partials/consent.ejs renders it, public/js/consent.js wires the buttons.
   Fixed to the bottom edge, never a modal, so it never blocks the content behind it. */
.consent-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-4);
  padding: var(--sp-4) var(--gutter);
  background: var(--surface);
  border-top: 1px solid var(--border-strong);
}
.consent-bar p { margin: 0; max-width: 40rem; }
.consent-actions { display: flex; flex-wrap: wrap; gap: var(--sp-2); flex-shrink: 0; }

/* Privacy page (Task 19). The cookie table can be wider than --measure on a narrow screen, so it gets its own
   horizontal-scroll container instead of the page itself scrolling. */
.privacy > * { max-width: var(--measure); }
.privacy h1 { margin: 0 0 var(--sp-6); }
.privacy h2 { margin: var(--sp-8) 0 var(--sp-4); }
.privacy .prose { margin-bottom: var(--sp-8); }
.table-wrap { max-width: var(--measure); overflow-x: auto; }
.cookie-table { border-collapse: collapse; width: 100%; min-width: 32rem; }
.cookie-table th, .cookie-table td { text-align: left; padding: var(--sp-2) var(--sp-3); border-bottom: 1px solid var(--border); vertical-align: top; }
.cookie-table th { font-weight: 600; }
.privacy [data-consent-reset] { margin-top: var(--sp-6); }
```

- [ ] **Step 11: เพิ่ม privacy_body ใน src/routes/admin.js และ views/admin/settings.ejs**

แก้ `src/routes/admin.js` จุดเดียว ส่วนอื่นของไฟล์ไม่เปลี่ยนจาก Task 16 `upsertSetting` และ `POST /settings` เป็นโค้ดทั่วไปที่วนตาม `LANG_SETTING_KEYS` อยู่แล้ว จึงรองรับคีย์ใหม่ได้โดยไม่ต้องแก้จุดอื่น

แทนที่ข้อความนี้

```js
const GLOBAL_SETTING_KEYS = ['site_name', 'github_url', 'linkedin_url', 'x_url', 'email'];
const LANG_SETTING_KEYS = ['tagline', 'about_body'];
```

ด้วยข้อความนี้

```js
const GLOBAL_SETTING_KEYS = ['site_name', 'github_url', 'linkedin_url', 'x_url', 'email'];
const LANG_SETTING_KEYS = ['tagline', 'about_body', 'privacy_body'];
```

แก้ `views/admin/settings.ejs` จุดเดียว แทรกก่อนช่อง GitHub URL ส่วนอื่นของไฟล์ไม่เปลี่ยนจาก Task 16

แทนที่ข้อความนี้

```ejs
    <div class="field-pair">
      <label>GitHub URL
```

ด้วยข้อความนี้

```ejs
    <div class="field-pair">
      <label>Privacy ภาษาไทย (markdown)
        <textarea name="th[privacy_body]" rows="8" class="editor-body"><%= val('privacy_body', 'th') %></textarea>
      </label>
      <label>Privacy ภาษาอังกฤษ (markdown)
        <textarea name="en[privacy_body]" rows="8" class="editor-body" lang="en"><%= val('privacy_body', 'en') %></textarea>
      </label>
    </div>
    <div class="field-pair">
      <label>GitHub URL
```

- [ ] **Step 12: เพิ่ม GA_MEASUREMENT_ID ใน .env.example**

แก้ `.env.example` จุดเดียว ต่อท้ายไฟล์ ส่วนอื่นของไฟล์ไม่เปลี่ยนจาก Task 8

แทนที่ข้อความนี้

```
# Paste the hash without quotes. Node does not expand the $ signs in it.
ADMIN_PASSWORD_HASH=
```

ด้วยข้อความนี้

```
# Paste the hash without quotes. Node does not expand the $ signs in it.
ADMIN_PASSWORD_HASH=
# Google Analytics 4 Measurement ID (looks like G-XXXXXXXXXX). Leave empty to skip analytics entirely: no
# script ever loads, and the cookie bar only offers "รับทราบ" (acknowledge) instead of accept/reject.
GA_MEASUREMENT_ID=
```

- [ ] **Step 13: รัน test ให้เห็นว่าผ่าน**

Run: `node --test test/17-consent-privacy.test.js`
Expected: PASS exit code 0

```
✔ 17 consent, analytics and privacy (237.9919ms)
ℹ tests 1
ℹ suites 0
ℹ pass 1
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 811.2269
```

- [ ] **Step 14: ตรวจ <%- ในไฟล์ใหม่และ token ของ site.css**

คำสั่งแรกแสดง `<%-` ทุกตัวในไฟล์ใหม่หรือที่แก้ของ task นี้ ต้องเป็น `include(` หรือ `md.render(` เท่านั้น คำสั่งที่สองตรวจว่าไม่มี `<%-` หลุดไปที่อื่น คำสั่งที่สามตรวจว่าทุก `var()` ใน `site.css` มีอยู่ใน `:root` และไม่มี fallback เหมือนที่ Task 6 และ 17 ตรวจไว้

Run: `grep -n "<%-" views/privacy.ejs views/partials/consent.ejs views/partials/footer.ejs views/partials/head.ejs; bash -e -c 'if grep -rn "<%-" views/ | grep -v -e "md.render(" -e "include("; then echo "found <%- outside md.render or include"; exit 1; fi'; echo "guard exit=$?"; node -e 'const fs=require("fs");const site=fs.readFileSync("public/css/site.css","utf8");const defined=new Set(site.match(/^:root [{]([^}]*)[}]/)[1].match(/--[a-z0-9-]+(?=:)/g));const used=[...new Set(site.match(/var[(]--[a-z0-9-]+/g).map(s=>s.slice(4)))];console.log("used with var(): "+used.length);console.log("used but not defined: "+(used.filter(n=>!defined.has(n)).join(" ")||"none"));console.log("var() with fallback: "+((site.match(/var[(][^)]*,/g)||[]).join(" ")||"none"))'`
Expected:

```
views/privacy.ejs:14:<%- include('partials/head') %>
views/privacy.ejs:15:<%- include('partials/header') %>
views/privacy.ejs:19:  <div class="prose"><%- md.render(privacyBody) %></div>
views/privacy.ejs:51:<%- include('partials/footer') %>
views/partials/footer.ejs:24:<%- include('consent') %>
guard exit=0
used with var(): 35
used but not defined: none
var() with fallback: none
```

- [ ] **Step 15: รัน npm test ทั้งชุด**

Run: `npm test`
Expected: PASS exit code 0 และมี 17 tests (ครบตาม launch gate ของ spec ข้อ 3.4)

```
> talkalways@1.0.0 test
> node --test test/*.test.js

✔ 01 markdown (39.2104ms)
✔ 02 routing (282.2908ms)
✔ 03 publish per language (543.9155ms)
✔ 04 published at (727.5662ms)
✔ 05 blog hidden (656.6053ms)
✔ 06 delete cascade (758.3136ms)
✔ 07 admin guard (351.8452ms)
✔ 08 login cookie (496.748ms)
✔ 09 editor validation (686.8787ms)
✔ 10 preview (563.9442ms)
✔ 11 upload (675.222ms)
✔ 12 project order (505.96ms)
✔ 13 tag page (474.129ms)
✔ 14 settings and about (278.8813ms)
✔ 15 search (237.8676ms)
✔ 16 lang cookie (174.8918ms)
✔ 17 consent, analytics and privacy (262.8301ms)
ℹ tests 17
ℹ suites 0
ℹ pass 17
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2377.0007
```

- [ ] **Step 16: ตรวจแถบ consent, Google Analytics และหน้า privacy ในเบราว์เซอร์จริง**

**Owner:** ทำทุกข้อข้างล่างใน Chrome หรือ Edge บนเครื่องนี้ แล้วบอก executor ว่าผ่านครบหรือข้อไหนไม่ผ่าน executor ต้องหยุดรอคำตอบและห้าม commit ถ้ามีข้อที่ไม่ผ่าน ข้อ 5 ถึง 7 ต้องมี `GA_MEASUREMENT_ID` ของจริงหรือ ID ทดลองใน `.env` ถ้ายังไม่มี ให้ข้ามข้อ 5 ถึง 7 ไปก่อนได้ (ยังไม่บล็อกตามข้อ "สิ่งที่เจ้าของต้องทำหรือเลือก" ของ spec) แล้วค่อยตรวจ Realtime ของ GA จริงในขั้น launch checklist (Task 21)

1. ใน Git Bash ที่ root ของโปรเจกต์ ตรวจว่า `.env` ยังไม่มี `GA_MEASUREMENT_ID` (หรือค่าว่าง) แล้วรัน `npm start` ต้องเห็น `Listening on http://localhost:3000`
2. เปิด `http://localhost:3000/th` ต้องเห็นแถบที่ขอบล่างของหน้าจอมีข้อความว่าเว็บใช้เฉพาะคุกกี้ที่จำเป็น พร้อมปุ่ม รับทราบ ปุ่มเดียว และลิงก์ไปหน้าความเป็นส่วนตัว แถบไม่บังเนื้อหาและไม่ใช่ modal
3. กด รับทราบ แถบต้องหายไปทันทีโดยไม่ reload เปิด DevTools แท็บ Application > Cookies ต้องเห็น cookie `consent` ค่า `denied` reload หน้าอีกครั้งแถบต้องไม่กลับมา
4. ไปที่ `http://localhost:3000/th/privacy` เลื่อนลงไปดูตาราง ต้องเห็นแถว `ta_admin`, `lang`, `consent`, `theme (localStorage)` แต่ไม่มีแถว `_ga` (เพราะยังไม่ตั้ง `GA_MEASUREMENT_ID`) กด ตั้งค่า cookie ใหม่ หน้าต้อง reload แล้วแถบ consent กลับมา
5. หยุด server ด้วย Ctrl+C ใส่ `GA_MEASUREMENT_ID=G-XXXXXXXXXX` (ใช้ ID จริงถ้ามี ไม่งั้นใช้ค่าใดก็ได้ที่ขึ้นต้นด้วย `G-` เพื่อทดสอบ UI) ใน `.env` แล้ว `npm start` ใหม่ เปิด `http://localhost:3000/th` ต้องเห็นแถบที่มีปุ่ม ยอมรับ กับ ปฏิเสธ ขนาดและน้ำหนักเท่ากัน
6. กด ยอมรับ เปิด DevTools แท็บ Network ต้องเห็น request ไป `googletagmanager.com` และแท็บ Application > Cookies ต้องเห็น cookie `_ga` (ถ้าใช้ ID ทดลองที่ไม่มีจริง อาจเห็น request แล้ว error กลับมาแทน ถือว่าผ่านข้อนี้เพราะพิสูจน์ว่าโค้ดพยายามโหลดจริง) ไปที่ `/th/privacy` ตารางต้องมีแถว `_ga, _ga_*` เพิ่มขึ้นมา
7. กด ตั้งค่า cookie ใหม่ หน้า reload แล้ว cookie `consent` และ `_ga` ต้องหายไปจาก DevTools แถบ consent กลับมา กด ปฏิเสธ แล้ว reload หน้าอีกครั้ง ต้องไม่มี request ไป `googletagmanager.com` เลย
8. กด Ctrl+Shift+M ตั้งความกว้าง 400 ทั้งธีมสว่างและมืด หน้า `/th` ที่มีแถบ consent ต้องไม่มี scrollbar แนวนอน ปุ่มในแถบต้องขึ้นบรรทัดใหม่ได้โดยไม่ล้นจอ แล้วปิด device toolbar
9. คลิกลิงก์ ความเป็นส่วนตัว ที่ท้ายหน้าทุกหน้า (home, blog, projects, about, search) ต้องไปที่ `/th/privacy` ได้ทุกหน้า
10. กลับไปที่ Git Bash แล้วกด Ctrl+C เพื่อหยุด server แล้วเอาบรรทัด `GA_MEASUREMENT_ID` ที่ใส่ทดลองออกจาก `.env` ถ้ายังไม่มี property จริง

- [ ] **Step 17: ตรวจว่ามีแค่ไฟล์ของ task นี้ที่เปลี่ยน**

Run: `git status --short`
Expected:

```
 M .env.example
 M public/css/site.css
 M src/routes/admin.js
 M src/routes/public.js
 M src/strings.js
 M views/admin/settings.ejs
 M views/partials/footer.ejs
 M views/partials/head.ejs
?? public/js/consent.js
?? test/17-consent-privacy.test.js
?? views/partials/consent.ejs
?? views/privacy.ejs
```

ถ้ามีบรรทัดอื่นนอกจากนี้ เช่น `.env`, `data/` หรือ `.claude/` ห้าม add ไฟล์นั้นและให้หยุดถามเจ้าของ

- [ ] **Step 18: Commit**

```bash
git add src/routes/public.js src/strings.js views/partials/head.ejs views/partials/footer.ejs views/partials/consent.ejs views/privacy.ejs public/js/consent.js public/css/site.css src/routes/admin.js views/admin/settings.ejs .env.example
git add test/17-consent-privacy.test.js
git commit -m "feat: add cookie consent bar, Google Analytics loading and privacy page"
```

คำสั่งนี้ซ้อมใน repo ทิ้งที่มีไฟล์ของ Task 4 ถึง 18 commit ไว้แล้ว (เลข commit hash จึงไม่ตรงกับ repo จริง)

Expected:

```
[main 210d79d] feat: add cookie consent bar, Google Analytics loading and privacy page
 12 files changed, 339 insertions(+), 4 deletions(-)
 create mode 100644 public/js/consent.js
 create mode 100644 test/17-consent-privacy.test.js
 create mode 100644 views/partials/consent.ejs
 create mode 100644 views/privacy.ejs
```

Run: `git status --short | wc -l`
Expected: `0`

## Phase 7: Launch

Phase นี้ไม่เพิ่มโค้ดแอปอีกแล้ว (npm test ยังต้องผ่าน 17 tests เท่าเดิมทั้ง Task 20 และ 21) งานที่เหลือคือสคริปต์ backup, การไล่ manual checklist ของข้อ 3.4 ในสภาพ production จริง และการ deploy ตามข้อ 3.6 ทั้งสอง task ขึ้นกับ host ที่เจ้าของยังไม่ได้เลือก จึงเขียนไว้สำหรับตัวเลือก **VPS + Caddy** (ถูกที่สุดและไม่มีข้อจำกัดตามข้อ 3.6) แต่ละ task เริ่มด้วย **Owner:** ที่หยุดรอให้เจ้าของยืนยัน host ก่อน

- Step ที่ไม่ขึ้นต้นด้วย **Owner:** และไม่พูดถึง VPS หรือ GitHub รันใน Git Bash ที่ root ของโปรเจกต์ `/d/Ikkyusan/Downloads/TalkAlways_MVP/talkalways` เหมือน part ก่อนหน้า
- Step ที่มี **Owner:** และพูดถึง VPS รันบนเครื่อง VPS ที่เจ้าของเตรียมไว้ (SSH เข้าไปตามที่ตอบใน Step 1 ของ Task 21) ไม่ใช่เครื่อง Windows นี้
- คำสั่งที่พิสูจน์กลไกของ `scripts/backup.sh` ใน Task 20 ถูกซ้อมในเครื่องนี้ด้วยโฟลเดอร์ทดลองที่ลบทิ้งเองท้าย step (ไม่เหลือร่องรอยใน build dir หรือ repo) ผลจริงที่ได้ถูกคัดลอกมาใส่ Expected ตรงๆ ส่วนขั้นที่ต้องมี VPS จริงหรือ repo บน GitHub จริง (ยังไม่ถูกสร้างตอนเขียนแผนนี้ ตรวจแล้วด้วย `gh repo view` ว่ายังไม่มี) เขียนเป็นคำสั่งที่ executor ในอนาคตต้องรันจริง พร้อม Expected ที่อธิบายรูปแบบผลลัพธ์ที่ต้องเห็น ไม่ใช่ตัวเลขที่ต่างกันทุกครั้ง เช่น commit hash หรือ run id

### Task 20: สคริปต์ backup และซ้อม restore

**Phase:** 7 · **Gate tests:** ตรวจด้วยมือ (ต้องเลือก host ก่อน)

**Files:**
- Create: `scripts/backup.sh`
- Test: ไม่มีไฟล์ test กลไกทั้งหมดของสคริปต์ (`VACUUM INTO`, `tar`, เรียก `rclone`, การลบไฟล์เก่า) ถูกพิสูจน์ด้วยการซ้อมในเครื่องที่ Step 4 และ 5 โดยใช้ข้อมูลจริงในโฟลเดอร์ชั่วคราวที่ลบตัวเองท้าย step ส่วนการติดตั้ง cron จริงและการซ้อม restore จากไฟล์ backup จริงบน VPS อยู่ใน Task 21 Step 9 เพราะต้องมี VPS ก่อน

**Interfaces:**
- Consumes:
  - `src/db.js` จาก Task 5: `DATA_DIR = path.resolve(__dirname, '..', process.env.DATA_DIR || 'data')`, `UPLOAD_DIR = path.join(DATA_DIR, 'uploads')`, DB อยู่ที่ `DATA_DIR/site.db` สคริปต์นี้อ้างสอง path ตามชื่อไฟล์ตรงๆ ไม่ได้ `require('./src/db')` เพราะเป็นสคริปต์ `sh` แยกจาก process ของแอป
  - dependency `sqlite3 ^6.0.1` จาก Task 4 ซึ่งต้องมี `node_modules/` จาก `npm ci` ก่อนสคริปต์นี้จะรันได้ (ทั้งบนเครื่องพัฒนาและบน VPS)
  - ตัวสคริปต์ตัวอย่างและเหตุผลของแต่ละบรรทัด (VACUUM INTO ไม่ต้องหยุดแอป, เปิดแบบ OPEN_READONLY กัน sqlite3 สร้างไฟล์เปล่า, ห้าม copy `site.db` ตรงๆ เพราะมี `-wal`, ชื่อไฟล์ต้องมีเวลา) จากข้อ 3.6 ของ spec (Backup)
- Produces:
  - `scripts/backup.sh`: บังคับ `DATA_DIR` (ไม่มี default ตั้งใจให้ fail ทันทีถ้า cron ลืมตั้ง) และรับ override สองตัวใหม่คือ `BACKUP_DIR` (default `/var/backups` ตรงกับ path ที่ spec ข้อ 3.6 เขียนไว้ตรงๆ) และ `RCLONE_REMOTE` (default `remote:site-backups` ตรงกับตัวอย่างใน spec เช่นกัน) การมี override สองตัวนี้ทำให้ทดสอบ VACUUM INTO และ tar จริงในเครื่องพัฒนาได้โดยไม่ต้องแก้ไฟล์สคริปต์ และไม่กระทบพฤติกรรมบน production เพราะค่า default เหมือน spec ทุกตัวอักษร (ดู deviations ในสรุปท้ายงาน)

- [ ] **Step 1: ยืนยัน host ก่อนเริ่ม**

**Owner:** ตอบก่อน executor ทำ Step ถัดไป เพราะ Task 20 และ 21 ทั้งคู่เขียนไว้สำหรับ **VPS + Caddy** ตามข้อ 3.6 ของ spec เท่านั้น

1. ยืนยันว่าจะใช้ VPS + Caddy ใช่หรือไม่ ถ้าจะใช้ Render แบบเสียเงินหรือ Fly.io แทน ต้องหยุดที่นี่แล้วให้เขียน Task 20 และ 21 ใหม่ทั้งคู่สำหรับตัวเลือกนั้น เพราะ path อย่าง `/var/backups` และวิธีตั้ง cron ต่างกัน
2. ชื่อ remote ของ `rclone` ที่จะใช้จริง ถ้าไม่ตอบ executor จะใช้ `remote:site-backups` ตามค่า default ของสคริปต์ (มาจากตัวอย่างในข้อ 3.6 ของ spec) และเจ้าของต้องรัน `rclone config` ตั้ง remote ชื่อนี้บน VPS เองก่อนคืนแรกที่ cron ทำงานจริงใน Task 21 Step 9 มิฉะนั้น `rclone copy` จะ fail

executor ห้ามเดาและห้ามเริ่ม Step 2 จนกว่าจะได้คำตอบข้อ 1

- [ ] **Step 2: เขียน scripts/backup.sh**

สร้าง `scripts/backup.sh` โดยยึดสคริปต์ตัวอย่างในข้อ 3.6 ของ spec ทุกบรรทัด เพิ่มแค่ `mkdir -p "$BACKUP_DIR"` (กัน cron รันคืนแรกก่อนมีใครสร้างโฟลเดอร์นี้ fail) และเปลี่ยนสาม path ที่ spec เขียนตายตัวให้อ่านจากตัวแปรแทน (ค่า default เท่าเดิมทุกตัวอักษร) ตามที่อธิบายไว้ใน Produces ข้างบน

```sh
#!/bin/sh
# scripts/backup.sh runs nightly from a cron job, from the app folder (spec 3.6).
set -e
: "${DATA_DIR:?DATA_DIR must be set, because cron does not load .env}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups}"
RCLONE_REMOTE="${RCLONE_REMOTE:-remote:site-backups}"
mkdir -p "$BACKUP_DIR"
TS=$(date +%Y%m%d-%H%M%S)
# VACUUM INTO gets a consistent snapshot without stopping the app. Opening the source DB OPEN_READONLY, together
# with the DATA_DIR guard above, matters because a plain (non-readonly) open of a wrong path silently creates a
# fresh empty database file, and this script would then back up that empty file with exit 0 every night with
# nobody noticing. Never copy site.db directly either, because its -wal file lives next to it.
node -e "new (require('sqlite3').Database)(process.argv[1], require('sqlite3').OPEN_READONLY).run('VACUUM INTO ?', [process.argv[2]], e => { if (e) throw e })" "$DATA_DIR/site.db" "$BACKUP_DIR/site-$TS.db"
tar czf "$BACKUP_DIR/uploads-$TS.tgz" -C "$DATA_DIR" uploads
# The destination file name carries the timestamp because VACUUM INTO fails if the target already exists.
rclone copy "$BACKUP_DIR" "$RCLONE_REMOTE"
find "$BACKUP_DIR" -mtime +7 -delete
```

- [ ] **Step 3: ตรวจ syntax ของสคริปต์**

Run: `sh -n scripts/backup.sh; echo "exit=$?"`
Expected:

```
exit=0
```

- [ ] **Step 4: ซ้อม backup ในเครื่องด้วยข้อมูลจริง**

สร้างโฟลเดอร์ชั่วคราวที่มี DATA_DIR ของตัวเอง ใส่โพสต์จริง 2 โพสต์กับรูปอัปโหลดจริง 1 ไฟล์ (ผ่าน `src/db.js` ของ build dir ตรงๆ ไม่ใช่การ seed ข้อมูลปลอมลง production) แล้วรัน `scripts/backup.sh` จริงโดยตั้ง `BACKUP_DIR` และ `RCLONE_REMOTE` ชี้ไปที่โฟลเดอร์ทดลองแทน `/var/backups` และ `remote:site-backups` ตาม override ที่ Step 2 เพิ่มไว้ และใส่ fake `rclone` (แค่ `cp` ไฟล์ไปอีกโฟลเดอร์) ไว้หน้า `PATH` เพราะเครื่องนี้ไม่มี `rclone` จริงและไม่มี remote จริง ตัวสคริปต์ `scripts/backup.sh` เองไม่ถูกแก้เลย

Run:

```bash
T=$(mktemp -d)
mkdir -p "$T/data/uploads" "$T/backups" "$T/remote" "$T/restore" "$T/fakebin"

cat > "$T/fakebin/rclone" <<'EOF'
#!/bin/sh
if [ "$1" != "copy" ]; then echo "fake rclone: unsupported args: $*" >&2; exit 1; fi
mkdir -p "$3"
cp -r "$2"/. "$3"/
echo "fake rclone: copied $2 -> $3"
EOF
chmod +x "$T/fakebin/rclone"

cat > "$T/seed.js" <<'EOF'
const fs = require('fs');
const path = require('path');
const { ready, run, close, UPLOAD_DIR } = require(path.join(process.cwd(), 'src', 'db'));
const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');
async function main() {
  await ready;
  const now = new Date().toISOString();
  for (const slug of ['docker-notes', 'sqlite-wal']) {
    const r = await run('INSERT INTO posts (cover_image, created_at) VALUES (NULL, ?)', [now]);
    await run(
      `INSERT INTO post_translations (post_id, lang, status, slug, title, excerpt, body_markdown, cover_image_alt, seo_title, seo_description, published_at, updated_at)
       VALUES (?, 'th', 'published', ?, ?, '', '# ' || ?, '', '', '', ?, ?)`,
      [r.lastID, slug, slug, slug, now, now]
    );
  }
  fs.writeFileSync(path.join(UPLOAD_DIR, 'sample.png'), PNG);
  await close();
  console.log('seeded 2 posts + 1 upload');
}
main().catch((e) => { console.error(e); process.exit(1); });
EOF

DATA_DIR="$T/data" node "$T/seed.js"

echo "--- running scripts/backup.sh ---"
DATA_DIR="$T/data" BACKUP_DIR="$T/backups" RCLONE_REMOTE="$T/remote" PATH="$T/fakebin:$PATH" sh scripts/backup.sh
echo "backup.sh exit=$?"

echo "--- backups dir ---"
ls "$T/backups"
echo "--- remote dir (what rclone copy received) ---"
ls "$T/remote"

echo "$T" > /tmp/task20-sim-dir
```

Expected:

```
seeded 2 posts + 1 upload
--- running scripts/backup.sh ---
fake rclone: copied /tmp/tmp.XXXXXXXXXX/backups -> /tmp/tmp.XXXXXXXXXX/remote
backup.sh exit=0
--- backups dir ---
site-20260914-220358.db
uploads-20260914-220358.tgz
--- remote dir (what rclone copy received) ---
site-20260914-220358.db
uploads-20260914-220358.tgz
```

`/tmp/tmp.XXXXXXXXXX` คือ path ของ `$T` ที่ `mktemp -d` สุ่มมา และเลขเวลาในชื่อไฟล์ (`20260914-220358`) มาจาก `date` ตอนรันจริง ทั้งสองอย่างนี้ต่างกันได้ทุกครั้งที่รัน ส่วนโครงบรรทัดอื่นต้องตรงเป๊ะ `backups` กับ `remote` มีไฟล์ชุดเดียวกัน 2 ไฟล์เสมอ (`site-*.db` กับ `uploads-*.tgz`) พิสูจน์ว่า `VACUUM INTO`, `tar` และการเรียก `rclone copy` ทำงานถูกทั้งสามขั้น

- [ ] **Step 5: ซ้อม restore จากไฟล์ที่ backup ได้**

ดึงไฟล์ล่าสุดจากโฟลเดอร์ `remote` (จำลองการดาวน์โหลดจาก remote จริง) มาเปิดนับจำนวนโพสต์และแตก tar ดูไฟล์รูป ต้องได้ 2 โพสต์ตรงกับที่ seed ไว้ใน Step 4 และเห็น `sample.png`

Run:

```bash
T=$(cat /tmp/task20-sim-dir)
cd "$T/remote"
DB=$(ls site-*.db | sort | tail -1)
TGZ=$(ls uploads-*.tgz | sort | tail -1)
cp "$DB" "$T/restore/site.db"
tar xzf "$TGZ" -C "$T/restore"
cd - > /dev/null
find "$T/restore" -type f | sed "s#$T/restore/##"
node -e "
const sqlite3 = require('sqlite3');
const db = new sqlite3.Database(process.argv[1], sqlite3.OPEN_READONLY);
db.get('SELECT COUNT(*) c FROM posts', (e, row) => { if (e) throw e; console.log('restored posts:', row.c); db.close(); });
" "$T/restore/site.db"
rm -rf "$T"
rm -f /tmp/task20-sim-dir
echo "cleaned up"
```

Expected:

```
site.db
uploads/sample.png
restored posts: 2
cleaned up
```

`restored posts: 2` ตรงกับจำนวนโพสต์ที่ seed ไว้ใน Step 4 พอดี และ `uploads/sample.png` พิสูจน์ว่าไฟล์รูปรอดจากรอบ tar/untar ครบ โฟลเดอร์ `$T` ทั้งหมดถูกลบท้าย step จึงไม่เหลือร่องรอยในเครื่องหรือใน build dir

- [ ] **Step 6: ตรวจว่ามีแค่ scripts/backup.sh ที่เป็นไฟล์ใหม่ แล้ว Commit**

Run: `git status --short`
Expected:

```
?? scripts/backup.sh
```

```bash
git add scripts/backup.sh
git commit -m "chore: add nightly backup script (VACUUM INTO, uploads tar, rclone)"
```

คำสั่งนี้ซ้อมใน repo ทิ้งที่มีไฟล์ของ Task 4 ถึง 19 commit ไว้แล้ว (เลข commit hash จึงไม่ตรงกับ repo จริง)

Expected:

```
[main 966ed2f] chore: add nightly backup script (VACUUM INTO, uploads tar, rclone)
 1 file changed, 17 insertions(+)
 create mode 100644 scripts/backup.sh
```

Run: `git status --short | wc -l`
Expected: `0`

### Task 21: launch checklist และ deploy

**Phase:** 7 · **Gate tests:** ตรวจด้วยมือ (ต้องเลือก host ก่อน)

**Files:** ไม่มีไฟล์ในโปรเจกต์ที่ต้องสร้างหรือแก้ Task นี้ทำงานบน GitHub และบน VPS เท่านั้น systemd unit กับ Caddyfile ของ Step 7 และ 8 อยู่บน VPS ไม่ถูก commit เข้า repo (ไม่มีอยู่ใน File Structure ของสัญญา)

**Interfaces:**
- Consumes:
  - `.env.example` จาก Task 19 ครบทั้ง 8 ตัวตามข้อ 2.6 ของ spec: `PORT`, `NODE_ENV`, `DATA_DIR`, `SITE_URL`, `SESSION_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `GA_MEASUREMENT_ID`
  - `scripts/hash-password.js` จาก Task 8: `node scripts/hash-password.js '<passphrase อย่างน้อย 20 ตัว>'` พิมพ์ bcrypt hash cost 12
  - `scripts/backup.sh` และ override `DATA_DIR`, `BACKUP_DIR`, `RCLONE_REMOTE` จาก Task 20
  - `package.json` จาก Task 4: script `start` คือ `node --env-file-if-exists=.env server.js`, `engines.node >=24`
  - `.github/workflows/ci.yml` จาก Task 7: job `test` รันเมื่อ push ไป `main` และขั้นตรวจ `<%-`
  - ชื่อ repo `Su-Korawit/portfolio` (หรือชื่อที่เจ้าของเลือกใน Task 3 Step ยืนยัน) พร้อม branch `main` ที่ origin มี commit ของ Task 1 ถึง 7 อยู่แล้ว (Task 7 Step 11)
  - commit ของ Task 8 ถึง 20 ที่ยังไม่เคยถูก push (13 commit นับจาก Task 7 Step 10 เป็นต้นมา ไม่มี task ไหนหลังจากนั้น push อีกเลยจนถึง task นี้)
- Produces: เว็บที่ deploy จริงบน VPS หลัง domain ชี้มาแล้ว พร้อม TLS อัตโนมัติจาก Caddy, systemd service ที่ `Restart=always`, cron backup ที่ทำงานจริงคืนแรก และผลว่า manual checklist ข้อ 3.4 ผ่านครบทุกข้อ (task สุดท้าย ไม่มี export ให้ code อื่นใช้ต่อ)

- [ ] **Step 1: ยืนยัน domain และสิทธิ์เข้าถึง VPS**

**Owner:** ตอบให้ครบก่อน executor ทำ Step ถัดไป (ต่อจากการยืนยัน VPS + Caddy ใน Task 20 Step 1)

1. domain ที่จะใช้จริง และต้องตั้ง DNS A record ชี้ไปที่ IP ของ VPS ให้เรียบร้อย **ก่อน** เริ่ม Step 8 ไม่งั้น Caddy จะขอใบรับรอง TLS จาก Let's Encrypt ไม่ผ่าน
2. วิธี SSH เข้า VPS (user, IP หรือ hostname, private key หรือรหัสผ่าน) เพื่อให้ executor รันคำสั่งใน Step 5 ถึง 9 ได้
3. path ของโฟลเดอร์แอปบน VPS ถ้าไม่ตอบ executor จะใช้ `/opt/portfolio`
4. ชื่อ Linux user ที่จะรันแอป ถ้าไม่ตอบ executor จะสร้าง user ชื่อ `portfolio` แบบไม่มี login shell

executor ต้องหยุดรอจนครบ 4 ข้อ ห้ามเดา domain หรือ IP เอง

- [ ] **Step 2: automated checklist ในเครื่องก่อน push**

Run: `npm test`
Expected: PASS exit code 0 และ 17 tests (Task 20 ไม่เพิ่ม test ใหม่ ผลจึงเหมือน Task 19)

```
> talkalways@1.0.0 test
> node --test test/*.test.js

✔ 01 markdown (39.2104ms)
✔ 02 routing (282.2908ms)
✔ 03 publish per language (543.9155ms)
✔ 04 published at (727.5662ms)
✔ 05 blog hidden (656.6053ms)
✔ 06 delete cascade (758.3136ms)
✔ 07 admin guard (351.8452ms)
✔ 08 login cookie (496.748ms)
✔ 09 editor validation (686.8787ms)
✔ 10 preview (563.9442ms)
✔ 11 upload (675.222ms)
✔ 12 project order (505.96ms)
✔ 13 tag page (474.129ms)
✔ 14 settings and about (278.8813ms)
✔ 15 search (237.8676ms)
✔ 16 lang cookie (174.8918ms)
✔ 17 consent, analytics and privacy (262.8301ms)
ℹ tests 17
ℹ suites 0
ℹ pass 17
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2377.0007
```

Run: `npm ls socket.io stripe cors uuid dotenv nodemon`
Expected: exit code 1 (npm ls จบด้วย exit code ไม่ใช่ 0 เมื่อ package ที่ถามหาไม่มีสักตัว) และ output

```
talkalways@1.0.0 <path ของโปรเจกต์>
`-- (empty)
```

- [ ] **Step 3: ยืนยัน manual checklist ที่เช็กได้ก่อน deploy อีกครั้ง**

**Owner:** เปิด `http://localhost:3000` ด้วย `npm start` แล้วไล่ตามข้อ 3.4 ของ spec ให้ครบ ข้อเหล่านี้เคยผ่านมาแล้วในแต่ละ task ที่สร้างของนั้น แต่ spec บังคับให้ตรวจซ้ำครั้งสุดท้ายบนโค้ดรวมทั้งหมดก่อน launch บอก executor ว่าผ่านครบหรือข้อไหนไม่ผ่าน ห้าม push ถ้ามีข้อที่ไม่ผ่าน

1. ธีมตาม OS ถ้ายังไม่เคยกดสลับ กดสลับแล้ว reload หน้าไม่กะพริบและธีมคงอยู่ (ตรวจครั้งแรกที่ Task 6)
2. ความกว้าง 400px ทั้งสองธีม ทุกหน้ารวมหน้าที่มีแถบ consent ต้องไม่เลื่อนแนวนอน มีแค่ code block ที่เลื่อนแนวนอนในกรอบตัวเอง (ตรวจครั้งแรกที่ Task 6 และ 19)
3. เปิดโพสต์ไทยที่มีคำว่า ปั๊ก ที่ ญี่ปุ่น วรรณยุกต์ต้องไม่แตะบรรทัดบน และ `<em>` ภาษาไทยต้องเป็นตัวหนาไม่ใช่ตัวเอียง (ตรวจครั้งแรกที่ Task 9)
4. excerpt ไทยที่ถูก clamp ต้องไม่มีวรรณยุกต์บรรทัดแรกโดนตัด (ตรวจครั้งแรกที่ Task 9)
5. ใส่ `GA_MEASUREMENT_ID` จริงหรือ ID ทดลองใน `.env` กดยอมรับบนแถบ consent แล้ว DevTools ต้องเห็น request ไป `googletagmanager.com` และ cookie `_ga` กดตั้งค่า cookie ใหม่บนหน้า privacy แล้ว `_ga` กับ `consent` ต้องหายไป กดปฏิเสธแล้ว reload ต้องไม่มี request ไป Google เลย (ตรวจครั้งแรกที่ Task 19 Step 16)

ถ้าใส่ `GA_MEASUREMENT_ID` ทดลองไว้ใน `.env` ให้เอาออกก่อนทำ Step 6 เพราะ `.env` จริงจะถูกสร้างใหม่บน VPS ใน Step 6

- [ ] **Step 4: push commit ของ Task 8 ถึง 20 แล้วตรวจ CI**

Run: `git status -sb | head -1`
Expected: `## main...origin/main [ahead 13]`

Run: `git log --format=%s origin/main..HEAD`
Expected (เรียงจากใหม่ไปเก่า 13 บรรทัด):

```
chore: add nightly backup script (VACUUM INTO, uploads tar, rclone)
feat: add cookie consent bar, Google Analytics loading and privacy page
feat: remember the reader's language in a cookie
feat: add site search across posts and projects
feat: add settings, About page and sign-out-everywhere button
feat: add image upload with magic byte checks and editor upload buttons
feat: add tag management in admin and public tag pages
feat: add project editor with featured flag, sort order, preview and delete
feat: add public project pages and featured projects on the home page
feat: add post preview that renders the public page from the editor form
feat: add post editor with per-language status, slug rules, tags and delete
feat: add public blog index, post page, fallback cards and pagination
feat: add admin login, session guard, revoke-all and password hash script
```

Run: `git push origin main`
Expected: exit code 0 และสองบรรทัดแบบ

```
To https://github.com/Su-Korawit/portfolio.git
   <sha ของ commit สุดท้ายที่เคย push ใน Task 7>..<sha ของ commit Task 20>  main -> main
```

- ถ้าเจ้าของตั้งชื่อ repo อื่นใน Task 3 URL จะเป็นชื่อนั้น sha ทั้งสองฝั่งของ `..` เป็นเลข commit จริงในเครื่อง ไม่ใช่ตัวเลขในแผนนี้
- ถ้า exit code ไม่ใช่ 0 และ output มีข้อความ ``without `workflow` scope`` ให้ทำแบบ Task 7 Step 12: **Owner:** รัน `gh auth setup-git` แล้ว executor รัน `git push origin main` อีกครั้ง คำสั่งนี้แก้ credential helper ระดับ global จึงต้องให้เจ้าของรันเอง
- ถ้าถูกปฏิเสธด้วยสาเหตุอื่นให้หยุดแจ้งเจ้าของพร้อม output ทั้งหมด ห้ามใช้ `--force`

Run:

```bash
SHA=$(git rev-parse HEAD); RUN_ID=""; for i in $(seq 1 24); do RUN_ID=$(gh run list --workflow ci.yml --commit "$SHA" --json databaseId -q '.[0].databaseId'); [ -n "$RUN_ID" ] && break; sleep 5; done; echo "run=$RUN_ID"; gh run watch "$RUN_ID" --exit-status
```

Expected: exit code 0 บรรทัดแรกเป็น `run=` ตามด้วยเลข run บรรทัดสุดท้ายลงท้ายด้วย `completed with 'success'` รูปแบบเดียวกับที่ตรวจไว้แล้วใน Task 7 Step 14 ถึง 15 (คำสั่งเดียวกันทุกตัวอักษร) ถ้า exit code ไม่ใช่ 0 ให้รัน `gh run view <เลข run> --log-failed`, แก้, commit ด้วย `fix:`, push ใหม่ และห้ามไป Step 5 จนกว่าจะผ่าน

- [ ] **Step 5: Owner ติดตั้ง Node 24, Caddy และ clone repo บน VPS**

**Owner:** SSH เข้า VPS ตาม Step 1 แล้วรันตามลำดับ (ตัวอย่างสำหรับ Ubuntu ปรับคำสั่งติดตั้งตาม distro ถ้าไม่ใช่ Ubuntu)

1. ติดตั้ง Node 24 LTS: `curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash - && sudo apt-get install -y nodejs` แล้ว `node -v` ต้องขึ้นต้นด้วย `v24`
2. ติดตั้ง Caddy: `sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl && curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg && curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list && sudo apt-get update && sudo apt-get install -y caddy`
3. สร้าง user รันแอปแบบไม่มี login shell (ใช้ชื่อจาก Step 1 ข้อ 4): `sudo useradd --system --create-home --shell /usr/sbin/nologin portfolio`
4. สร้างโฟลเดอร์แอปและตั้งเจ้าของ (ใช้ path จาก Step 1 ข้อ 3): `sudo mkdir -p /opt/portfolio && sudo chown portfolio:portfolio /opt/portfolio`
5. หา URL สำหรับ clone จากเครื่องพัฒนา (ห้าม hardcode ชื่อ repo): บนเครื่อง Windows รัน `gh repo view --json sshUrl -q .sshUrl` แล้วคัดลอกค่าที่ได้
6. กลับไปที่ VPS clone ด้วย user `portfolio`: `sudo -u portfolio git clone <URL จากข้อ 5> /opt/portfolio` แล้ว `cd /opt/portfolio`
7. ถ้า VPS ไม่มี deploy key หรือ SSH key ของ GitHub ตั้งไว้ ข้อ 6 จะถาม password หรือ fail ให้ตั้ง deploy key แบบ read-only บน repo settings ของ GitHub ก่อน (เจ้าของเป็นคนเพิ่ม เพราะต้องมีสิทธิ์ settings ของ repo)

- [ ] **Step 6: Owner สร้าง .env จริงบน VPS**

**Owner:** ยังอยู่บน VPS ในโฟลเดอร์แอป

1. คัดลอกโครง: `cp .env.example .env`
2. สร้าง `SESSION_SECRET` ด้วย `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` ตัวอย่างผลลัพธ์จริงจากคำสั่งนี้ (รันบนเครื่องพัฒนาเพื่อตรวจรูปแบบ ค่าจริงสุ่มใหม่ทุกครั้งห้ามใช้ค่านี้ซ้ำ):

   ```
   x2-SEwqfPOxo9qw5Ml6RU2k_Due4Vdu262X8UGH11Ws
   ```

3. สร้าง `ADMIN_PASSWORD_HASH` **บนเครื่องพัฒนา** (ห้ามพิมพ์รหัสผ่านจริงบน VPS ผ่าน shell history) ด้วย `node scripts/hash-password.js '<passphrase อย่างน้อย 20 ตัว>'` ตัวอย่างผลลัพธ์จริงจากคำสั่งนี้กับ passphrase ตัวอย่าง (ค่าจริงต้องสร้างจาก passphrase ที่เจ้าของเลือกเอง ห้ามใช้ค่านี้จริง):

   ```
   $2b$12$cobLFb20KcgbelmAMc7YxOtQOMkc5doanl73fbJ79XfrDWNovNet6
   ```

4. แก้ `.env` ด้วย editor บน VPS (เช่น `nano .env`) ใส่ค่าทั้งหมด: `PORT=3000`, `NODE_ENV=production` (ข้อนี้พลาดไม่ได้ ไม่งั้น cookie ของ admin จะไม่มี `Secure`), `DATA_DIR=data`, `SITE_URL=https://<domain จาก Step 1>`, `SESSION_SECRET=<ค่าจากข้อ 2>`, `ADMIN_USERNAME=<ชื่อที่เจ้าของเลือก>`, `ADMIN_PASSWORD_HASH=<ค่าจากข้อ 3>`, `GA_MEASUREMENT_ID=<Measurement ID จริงถ้ามี ไม่งั้นเว้นว่าง>`
5. ตรวจว่าไม่มีช่องว่างเหลือ: `grep -c '=$' .env` ต้องได้ `0` (ยกเว้นตั้งใจเว้น `GA_MEASUREMENT_ID` ว่างจริงๆ ถ้าเว้นว่างให้ยอมรับว่าตัวเลขนี้เป็น 1)

- [ ] **Step 7: Owner npm ci และตั้ง systemd service**

**Owner:** ยังอยู่บน VPS ในโฟลเดอร์แอป ด้วย user ที่มีสิทธิ์เขียนโฟลเดอร์นี้ (หรือ `sudo -u portfolio`)

1. `npm ci` ถ้า `sqlite3` ติดตั้งไม่ผ่านเพราะดาวน์โหลด prebuilt binary ไม่ได้ ต้องติดตั้ง build tools (`sudo apt-get install -y build-essential python3`) แล้วรัน `npm ci` ใหม่
2. สร้างไฟล์ `/etc/systemd/system/portfolio.service` (path แอปและ user ต้องตรงกับ Step 1 และ 5):

   ```ini
   [Unit]
   Description=portfolio web app
   After=network.target

   [Service]
   Type=simple
   User=portfolio
   WorkingDirectory=/opt/portfolio
   ExecStart=/usr/bin/node --env-file-if-exists=.env server.js
   Restart=always
   RestartSec=5

   [Install]
   WantedBy=multi-user.target
   ```

3. เปิดใช้งานและสตาร์ท: `sudo systemctl daemon-reload && sudo systemctl enable --now portfolio`
4. ตรวจสถานะ: `sudo systemctl status portfolio --no-pager` ต้องเห็นบรรทัด `Active: active (running)` และใน log (`sudo journalctl -u portfolio -n 5 --no-pager`) ต้องเห็น `Listening on http://localhost:3000`
5. ตรวจว่า restart จริง: `sudo systemctl kill -s SIGKILL portfolio` แล้วรอ 6 วินาที `sudo systemctl status portfolio --no-pager` ต้องกลับมาเป็น `Active: active (running)` เองเพราะ `Restart=always`

- [ ] **Step 8: Owner ตั้ง Caddy แล้วตรวจ HTTPS**

**Owner:** ยังอยู่บน VPS domain ต้องชี้มาที่ IP นี้แล้วตาม Step 1

1. แก้ `/etc/caddy/Caddyfile` ให้มีแค่บล็อกนี้ (แทนที่เนื้อหาเดิมทั้งไฟล์ ใส่ domain จริงจาก Step 1):

   ```
   <domain จาก Step 1> {
       reverse_proxy localhost:3000
   }
   ```

2. โหลดค่าใหม่: `sudo systemctl reload caddy` (หรือ `sudo systemctl restart caddy` ถ้าเพิ่งติดตั้งครั้งแรก)
3. เปิด `https://<domain>` ในเบราว์เซอร์ ต้องเห็นหน้า `/th` โดยไม่มีคำเตือนใบรับรอง และ URL แถบที่อยู่มีรูปกุญแจ (Caddy ขอใบรับรองจาก Let's Encrypt อัตโนมัติในไม่กี่วินาทีถึงไม่กี่นาที)
4. ตรวจด้วย curl จากเครื่องพัฒนา: `curl -sI https://<domain>/th | head -1` ต้องได้ `HTTP/2 200`
5. ถ้าใบรับรองขอไม่ผ่าน ให้ตรวจ DNS ด้วย `dig +short <domain>` ต้องได้ IP ของ VPS ตรงกัน แล้วดู log ด้วย `sudo journalctl -u caddy -n 30 --no-pager`

- [ ] **Step 9: Owner เปิด cron backup จริงแล้วซ้อม restore จากไฟล์จริงครั้งแรก**

**Owner:** ยังอยู่บน VPS ทำหลัง Step 8 ผ่านแล้วเท่านั้น เพราะต้องมี `site.db` ที่มีข้อมูลจริงอย่างน้อยจากการ login เข้า `/admin` ครั้งแรก ถ้ายังไม่เคย `rclone config` ตั้ง remote ตามชื่อที่ตอบใน Task 20 Step 1 ให้ทำก่อนข้อ 1

1. ติดตั้ง cron entry รันทุกคืนตี 3 เวลาไทย (ใช้ path และชื่อ remote ตามที่ตอบใน Step 1 ของ task นี้และ Task 20 Step 1): `crontab -e` แล้วเพิ่มบรรทัด

   ```
   0 3 * * * cd /opt/portfolio && DATA_DIR=/opt/portfolio/data sh scripts/backup.sh >> /var/log/portfolio-backup.log 2>&1
   ```

2. ตรวจว่าบันทึกแล้ว: `crontab -l` ต้องเห็นบรรทัดข้างบนตรงตัว
3. รันเองทันทีหนึ่งครั้งแทนการรอถึงตี 3 (จำลองคืนแรก): `cd /opt/portfolio && sudo -u portfolio DATA_DIR=/opt/portfolio/data sh scripts/backup.sh` แล้วตรวจว่ามีไฟล์ใหม่: `ls -la /var/backups` ต้องเห็น `site-<เวลา>.db` กับ `uploads-<เวลา>.tgz`
4. ตรวจปลายทางนอกเครื่อง: `rclone ls remote:site-backups` ต้องเห็นไฟล์สองไฟล์เดียวกับข้อ 3
5. **ซ้อม restore จริงหนึ่งครั้ง (สเปกข้อ 3.6 บังคับ ถ้ายังไม่เคยทำถือว่ายังไม่มี backup):** สร้างโฟลเดอร์ทดลอง ดึงไฟล์ db และ tar ล่าสุดจาก remote มาไว้ในนั้น (`rclone copy remote:site-backups /tmp/restore-test`) เปิด DB ด้วย `sqlite3 /tmp/restore-test/site-<เวลา>.db "SELECT COUNT(*) FROM posts;"` ตัวเลขที่ได้ต้องเท่ากับจำนวนโพสต์ที่เห็นจริงในหน้า `/admin/posts` ตอนนี้ แตก tar (`tar xzf /tmp/restore-test/uploads-<เวลา>.tgz -C /tmp/restore-test`) แล้วต้องเห็นไฟล์รูปที่เคยอัปโหลดจริงอยู่ในนั้น
6. ลบโฟลเดอร์ทดลองทิ้ง: `rm -rf /tmp/restore-test`
7. บอก executor ว่าทุกข้อผ่านหรือข้อไหนไม่ผ่าน ห้ามข้อ 5 ไม่ผ่านแล้วไป Step 10

- [ ] **Step 10: ตรวจ checklist ที่ต้องมี production จริงเท่านั้น**

ข้อ sha256 รันได้ตอนนี้บนเครื่องพัฒนา (อ่านอย่างเดียว ไม่แก้ไฟล์ในโปรเจกต์จริง) ส่วนที่เหลือต้องมี URL production จริง

Run (บนเครื่องพัฒนา Git Bash ที่ root โปรเจกต์):

```bash
sha256sum data/talkalways.db
cat ../talkalways-backup/talkalways.db.sha256
```

Expected: hash สองบรรทัดตรงกันทุกตัวอักษร (คำนวณจริงกับไฟล์จริงตอนเขียนแผนนี้ ยังตรงกับที่จดไว้ใน Task 1 Step 5 แปลว่ายังไม่มีอะไรเผลอไปแก้ไฟล์นี้ตลอดการสร้าง 21 task):

```
a6728e7397006282fa80df2b840d7e33a1dd169f922abcad6e16dcfec2abb0bb *data/talkalways.db
a6728e7397006282fa80df2b840d7e33a1dd169f922abcad6e16dcfec2abb0bb *talkalways.db
```

ถ้า hash ไม่ตรงกัน ห้ามไปต่อ ให้หยุดแล้วแจ้งเจ้าของทันที เพราะแปลว่าไฟล์ DB เดิมถูกแก้หรือเสียหายระหว่างทาง

**Owner:** ทำที่เหลือกับเว็บ production จริงที่ `https://<domain>`

1. ตรวจ `Secure` บน cookie ของ admin: `curl -skI -X POST https://<domain>/admin/login --data 'username=<ADMIN_USERNAME>&password=<passphrase จริง>' | grep -i set-cookie` ต้องเห็น `Secure` ในบรรทัด `Set-Cookie` (ถ้าไม่เห็นแปลว่า `NODE_ENV=production` ไม่ถูกตั้งจริง ให้กลับไปตรวจ `.env` ใน Step 6)
2. ส่งลิงก์บทความที่ publish แล้วหนึ่งอันหาตัวเองใน LINE แล้วรอ preview ขึ้น ต้อง title, description และรูปปกครบ (พิสูจน์ `og:title`, `og:description`, `og:image` กับ `meta.image` ที่เป็น absolute URL ผ่าน `siteUrl` จาก Task 5)
3. ถ้าตั้ง `GA_MEASUREMENT_ID` จริงไว้: เปิดเว็บจริงในเบราว์เซอร์อื่นที่ไม่เคยเข้า กดยอมรับคุกกี้ แล้วดูหน้า Realtime ของ Google Analytics ต้องเห็นผู้ใช้ 1 คนภายในไม่กี่นาที

- [ ] **Step 11: สรุปว่า launch เสร็จตามนิยามของ spec**

Run: `git status`
Expected:

```
On branch main
Your branch is up to date with 'origin/main'.

nothing to commit, working tree clean
```

Task นี้ไม่มี commit เพราะไม่มีไฟล์ในโปรเจกต์เปลี่ยนหลัง Step 4 (ที่ push ของเดิมที่มีอยู่แล้ว) checklist ที่ต้องผ่านครบตาม "นิยามว่าเสร็จ" ในข้อ 3.4 ของ spec คือ

- `npm test` exit 0 พร้อม 17 tests: ผ่านที่ Step 2
- manual checklist ทั้งหมดของข้อ 3.4: ผ่านที่ Step 3, 4 (CI), 9 (backup/restore จริง) และ 10 (production จริง)

ถ้าทุกข้อใน Step ข้างบนผ่านครบ เว็บ production ที่ `https://<domain>` ถือว่า launch เสร็จสมบูรณ์ตามสเปกนี้

## สรุปท้ายแผน

แผนนี้เขียนครบ 21 task ใน 7 phase ตาม Task Index ของสัญญา (`00-contract.md`) พิสูจน์โค้ดทุก task ใน build dir จริงด้วย Node 24.21.0 จบด้วย `npm test` ผ่าน 17 tests ที่ตรงกับ launch gate ในข้อ 3.4 ของ spec Task 1 ถึง 19 อยู่ใน part-1.md ถึง part-11.md ตามลำดับ Task 20 และ 21 อยู่ใน part-12.md ฉบับนี้
