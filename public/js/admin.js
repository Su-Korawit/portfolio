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
