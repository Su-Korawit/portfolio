// Rate-limit ในหน่วยความจำต่อ IP (spec docs/superpowers/specs/2026-09-22-comments-design.md ส่วนที่ 3).
// ไม่เก็บ IP ลง DB, ไม่มีการล้าง Map แบบ cron แยก เพราะ filter() ตอน allow() ทำหน้าที่นั้นอยู่แล้ว
// และ traffic ของเว็บนี้เล็กพอที่จำนวนคีย์ค้างจะไม่กลายเป็นปัญหาหน่วยความจำจริง
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;

const hits = new Map();

// `now` รับเข้ามาได้เพื่อให้เทสต์ไม่ต้องรอ 10 นาทีจริง production เรียกโดยไม่ส่ง now ก็ได้
function allow(ip, now = Date.now()) {
  const recent = (hits.get(ip) || []).filter(t => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length <= MAX_PER_WINDOW;
}

module.exports = { allow, WINDOW_MS, MAX_PER_WINDOW };
