const express = require('express');
const { run, all } = require('../db');

const router = express.Router();

// :id ต้องเป็นเลขจำนวนเต็มบวก แบบเดียวกับ src/routes/admin-projects.js/admin.js
function parseId(value) {
  return /^[1-9][0-9]*$/.test(value) && Number.isSafeInteger(Number(value)) ? Number(value) : null;
}

// join กับ translation ทั้งสองภาษาของทั้งสองประเภทเนื้อหา: comment มีแค่ post_id หรือ project_id อย่างเดียว
// (CHECK constraint ของตาราง) จึงมีแค่ฝั่งเดียวที่ไม่เป็น NULL ทั้งหมด link_lang/slug เลือกเฉพาะ translation
// ที่ยังเผยแพร่อยู่ ส่วน title ใช้ translation ไหนก็ได้ที่มี (กันกรณีถูกเปลี่ยนกลับเป็นร่างแล้วไม่มีลิงก์ให้กด)
const LIST_SQL = `
  SELECT c.id, c.author_name, c.body, c.created_at,
         CASE WHEN c.post_id IS NOT NULL THEN 'post' ELSE 'project' END AS kind,
         COALESCE(pt_th.title, pt_en.title, pjt_th.title, pjt_en.title) AS title,
         CASE
           WHEN pt_th.status = 'published' THEN 'th' WHEN pt_en.status = 'published' THEN 'en'
           WHEN pjt_th.status = 'published' THEN 'th' WHEN pjt_en.status = 'published' THEN 'en'
           ELSE NULL
         END AS link_lang,
         CASE
           WHEN pt_th.status = 'published' THEN pt_th.slug WHEN pt_en.status = 'published' THEN pt_en.slug
           WHEN pjt_th.status = 'published' THEN pjt_th.slug WHEN pjt_en.status = 'published' THEN pjt_en.slug
           ELSE NULL
         END AS slug
  FROM comments c
  LEFT JOIN post_translations pt_th ON pt_th.post_id = c.post_id AND pt_th.lang = 'th'
  LEFT JOIN post_translations pt_en ON pt_en.post_id = c.post_id AND pt_en.lang = 'en'
  LEFT JOIN project_translations pjt_th ON pjt_th.project_id = c.project_id AND pjt_th.lang = 'th'
  LEFT JOIN project_translations pjt_en ON pjt_en.project_id = c.project_id AND pjt_en.lang = 'en'
  ORDER BY c.created_at DESC`;

router.get('/', async (req, res) => {
  const comments = await all(LIST_SQL);
  res.render('admin/comments', { comments });
});

router.post('/:id/delete', async (req, res, next) => {
  const id = parseId(req.params.id);
  if (!id) return next();
  const { changes } = await run('DELETE FROM comments WHERE id = ?', [id]);
  if (changes === 0) return next();
  res.redirect(303, '/admin/comments');
});

module.exports = router;
