{
  // Each <input type="file" data-upload-target="<field name>"> in an editor sends the chosen image to
  // /admin/upload. Where the URL lands depends on the target: an <input> takes it as its value, a plain
  // <textarea> gets ![](url) at the cursor with the cursor left inside [] so the alt text can be typed next,
  // and data-upload-mode="lines" appends it on a line of its own - that is the about page's slideshow field,
  // where the picker also takes several files at once. The file input has no name, so the form never sends it.
  const UPLOAD_FAILED = 'อัปโหลดไม่สำเร็จ ถ้าออกจากระบบไปแล้ว ให้เข้าสู่ระบบในแท็บใหม่แล้วลองอีกครั้ง';

  async function upload(file) {
    const body = new FormData();
    body.append('image', file);
    const res = await fetch('/admin/upload', { method: 'POST', body });
    // a session that has ended is redirected to the HTML login page, so it ends up in the message above
    const data = await res.json().catch(() => ({}));
    if (!data.url) throw new Error(data.error || UPLOAD_FAILED);
    return data.url;
  }

  function place(target, url, mode) {
    if (mode === 'lines') {
      const lines = target.value.split('\n').map(line => line.trim()).filter(Boolean);
      lines.push(url);
      target.value = lines.join('\n') + '\n';
      target.dispatchEvent(new Event('input', { bubbles: true }));
    } else if (target.tagName === 'TEXTAREA') {
      const start = target.selectionStart;
      target.setRangeText('![](' + url + ')', start, target.selectionEnd);
      target.focus();
      target.setSelectionRange(start + 2, start + 2);
    } else {
      target.value = url;
    }
  }

  for (const picker of document.querySelectorAll('input[type="file"][data-upload-target]')) {
    picker.addEventListener('change', async () => {
      if (!picker.files.length) return;
      const target = picker.form.elements.namedItem(picker.dataset.uploadTarget);
      const mode = picker.dataset.uploadMode;
      // one at a time, so a file that fails stops the run with the ones before it already in the field
      const files = mode === 'lines' ? [...picker.files] : [picker.files[0]];
      picker.disabled = true;
      try {
        for (const file of files) place(target, await upload(file), mode);
      } catch (err) {
        alert(err.message || 'อัปโหลดไม่สำเร็จ ลองใหม่อีกครั้ง');
      } finally {
        picker.disabled = false;
        picker.value = '';
      }
    });
  }

  // The body field grows with what is typed, so a long post is written on the page instead of inside a small
  // scrolling box. A translation that is closed measures zero, so the fields inside it are measured again when
  // its <details> opens.
  const grow = area => {
    area.style.height = 'auto';
    area.style.height = area.scrollHeight + 'px';
  };
  for (const area of document.querySelectorAll('.write-field .editor-body')) {
    area.addEventListener('input', () => grow(area));
    if (area.offsetParent) grow(area);
  }
  for (const section of document.querySelectorAll('details.translation')) {
    section.addEventListener('toggle', () => {
      if (section.open) for (const area of section.querySelectorAll('.write-field .editor-body')) grow(area);
    });
  }
}
