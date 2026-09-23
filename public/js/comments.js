// Progressive enhancement เท่านั้น: ฟอร์ม comment ทำงานได้เต็มที่แม้ปิด JS (spec ส่วนที่ 6)
{
  const form = document.querySelector('.comment-form');
  if (form) {
    const textarea = form.querySelector('textarea[name="body"]');
    const counter = form.querySelector('.comment-counter');
    const max = Number(textarea.getAttribute('maxlength')) || 2000;

    const resize = () => {
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    };
    const updateCounter = () => {
      if (counter) counter.textContent = textarea.value.length + ' / ' + max;
    };

    textarea.addEventListener('input', () => {
      resize();
      updateCounter();
    });
    resize();
    updateCounter();
  }
}
